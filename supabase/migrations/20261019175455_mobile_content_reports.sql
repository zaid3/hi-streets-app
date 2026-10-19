-- Review and test before production. Reporting is available to signed-out residents.
begin;
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('business','post','ai')),
  target_id uuid,
  reporter_id uuid references auth.users(id) on delete set null,
  reporter_hash text not null,
  reason text not null check (reason in ('misleading','unsafe','abuse','sexual','privacy','spam','other')),
  details text not null default '' check (length(details) <= 1500),
  snapshot text not null default '' check (length(snapshot) <= 6000),
  status text not null default 'open' check (status in ('open','reviewed','removed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  check ((kind = 'ai' and target_id is null) or (kind <> 'ai' and target_id is not null))
);
create index content_reports_queue on public.content_reports (status,created_at);
create index content_reports_quota on public.content_reports (reporter_hash,created_at);
create index content_reports_target on public.content_reports (kind,target_id,status);
create index content_reports_reporter on public.content_reports (reporter_id);
create index content_reports_reviewer on public.content_reports (reviewed_by);
alter table public.content_reports enable row level security;
revoke all on public.content_reports from public,anon,authenticated;
grant select on public.content_reports to authenticated;
grant all on public.content_reports to service_role;
create policy content_reports_admin_read on public.content_reports for select to authenticated
using (auth.uid() is not null and coalesce((select public.current_user_role()),'') in ('admin','super_admin'));

create function public.submit_content_report(p_kind text,p_target_id uuid,p_reason text,p_details text default '',p_snapshot text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare v_snapshot text; v_headers jsonb; v_hash text; v_business uuid;
begin
  if p_kind is null or p_kind not in ('post','business','ai') or p_reason is null or p_reason not in ('misleading','unsafe','abuse','sexual','privacy','spam','other')
    or length(coalesce(p_details,'')) > 1500 or length(coalesce(p_snapshot,'')) > 6000 then raise exception 'Invalid report'; end if;
  if p_kind='business' then
    v_snapshot := public.business_detail(p_target_id)::text;
    if v_snapshot is null then raise exception 'Content unavailable'; end if;
  elsif p_kind='post' then
    select p.business_id, left(p.title || E'\n' || p.body,6000) into v_business,v_snapshot from public.posts p
      where p.id=p_target_id and p.status='live' and p.expires_at>now();
    if v_snapshot is null or public.business_detail(v_business) is null then raise exception 'Content unavailable'; end if;
  else
    if p_target_id is not null or length(trim(coalesce(p_snapshot,'')))=0 then raise exception 'Invalid AI report'; end if;
    v_snapshot := p_snapshot;
  end if;
  v_headers := coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  -- Short-lived network fingerprint for abuse limits; raw network addresses are not stored.
  v_hash := md5(coalesce(auth.uid()::text,split_part(coalesce(v_headers->>'x-forwarded-for',v_headers->>'x-real-ip','unknown'),',',1)) || current_date::text);
  perform pg_advisory_xact_lock(hashtextextended('histreets-report-'||v_hash,0));
  if (select count(*) from public.content_reports where reporter_hash=v_hash and created_at >= current_date) >= 10 then raise exception 'Report limit reached'; end if;
  insert into public.content_reports(kind,target_id,reporter_id,reporter_hash,reason,details,snapshot)
    values(p_kind,p_target_id,auth.uid(),v_hash,p_reason,coalesce(p_details,''),left(v_snapshot,6000));
end; $$;
revoke all on function public.submit_content_report(text,uuid,text,text,text) from public;
grant execute on function public.submit_content_report(text,uuid,text,text,text) to anon,authenticated;

create function public.resolve_content_report(p_report_id uuid,p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_report public.content_reports;
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid())
    or coalesce(public.current_user_role(),'') not in ('admin','super_admin') then raise exception 'Admin only'; end if;
  if p_action is null or p_action not in ('dismiss','remove') then raise exception 'Invalid action'; end if;
  select * into v_report from public.content_reports where id=p_report_id and status='open' for update;
  if not found then raise exception 'Report unavailable'; end if;
  if p_action='remove' then
    if v_report.kind='post' then update public.posts set status='removed',updated_at=now() where id=v_report.target_id;
    elsif v_report.kind='business' then
      update public.businesses set verification_status='revoked' where id=v_report.target_id;
      update public.posts set status='removed',updated_at=now() where business_id=v_report.target_id;
    else raise exception 'AI reports require review'; end if;
  end if;
  update public.content_reports set status=case when p_action='remove' then 'removed' else 'reviewed' end,
    reviewed_at=now(),reviewed_by=auth.uid() where id=p_report_id;
end; $$;
revoke all on function public.resolve_content_report(uuid,text) from public,anon;
grant execute on function public.resolve_content_report(uuid,text) to authenticated;

-- Existing owner/admin updates cannot accidentally republish removed content.
create function public.guard_reported_content() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='businesses' then
    if new.verification_status in ('unclaimed','pending','verified','contested') and exists (
      select 1 from public.content_reports where kind='business' and target_id=new.id and status='removed'
    ) then raise exception 'This listing requires a moderation review before republication'; end if;
  else
    if new.status='live' and exists (
      select 1 from public.content_reports where status='removed' and
      ((kind='post' and target_id=new.id) or (kind='business' and target_id=new.business_id))
    ) then raise exception 'This post requires a moderation review before republication'; end if;
  end if;
  return new;
end; $$;
revoke all on function public.guard_reported_content() from public,anon,authenticated;
create trigger prevent_reported_business_republication before insert or update on public.businesses
  for each row execute function public.guard_reported_content();
create trigger prevent_reported_post_republication before insert or update on public.posts
  for each row execute function public.guard_reported_content();
commit;
