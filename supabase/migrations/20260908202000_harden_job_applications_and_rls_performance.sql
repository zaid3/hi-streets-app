-- Preserve anonymous job applications while validating every submitted value,
-- reduce per-row RLS function calls, and index foreign-key access paths.

alter policy profiles_self_read on public.profiles
  using ((select auth.uid()) = id);
alter policy profiles_self_update on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy users_manage_saved_places on public.saved_places
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy claimants_insert_own_claims on public.business_claims
  with check (claimant_id = (select auth.uid()));
alter policy claimants_read_own_claims on public.business_claims
  using (
    claimant_id = (select auth.uid())
    or (select public.current_user_role()) in ('admin', 'super_admin')
  );

alter policy owners_read_own_businesses on public.businesses
  using (claimed_by = (select auth.uid()));
alter policy owners_update_own_businesses on public.businesses
  using (claimed_by = (select auth.uid()))
  with check (claimed_by = (select auth.uid()));

alter policy job_applications_owner_read on public.job_applications
  using (
    (select public.current_user_role()) in ('admin', 'super_admin')
    or exists (
      select 1 from public.businesses b
      where b.id = job_applications.business_id
        and b.claimed_by = (select auth.uid())
    )
  );
alter policy job_applications_owner_update on public.job_applications
  using (
    (select public.current_user_role()) in ('admin', 'super_admin')
    or exists (
      select 1 from public.businesses b
      where b.id = job_applications.business_id
        and b.claimed_by = (select auth.uid())
    )
  )
  with check (
    (select public.current_user_role()) in ('admin', 'super_admin')
    or exists (
      select 1 from public.businesses b
      where b.id = job_applications.business_id
        and b.claimed_by = (select auth.uid())
    )
  );

alter policy verified_claimed_business_insert_posts on public.posts
  with check (
    (select auth.uid()) = author_id
    and business_id is not null
    and exists (
      select 1 from public.profiles pr
      where pr.id = (select auth.uid())
        and pr.role in ('business', 'charity', 'admin', 'super_admin')
    )
    and exists (
      select 1 from public.businesses b
      where b.id = posts.business_id
        and b.verification_status = 'verified'
        and (
          b.claimed_by = (select auth.uid())
          or (select public.current_user_role()) in ('admin', 'super_admin')
        )
    )
  );
alter policy verified_claimed_business_update_posts on public.posts
  using (
    author_id = (select auth.uid())
    or (select public.current_user_role()) in ('admin', 'super_admin')
  )
  with check (
    business_id is not null
    and exists (
      select 1 from public.businesses b
      where b.id = posts.business_id
        and b.verification_status = 'verified'
        and (
          b.claimed_by = (select auth.uid())
          or (select public.current_user_role()) in ('admin', 'super_admin')
        )
    )
  );

create index if not exists admin_audit_log_admin_id_idx on public.admin_audit_log(admin_id);
create index if not exists blue_badge_bays_created_by_idx on public.blue_badge_bays(created_by);
create index if not exists business_claims_decided_by_idx on public.business_claims(decided_by);
create index if not exists business_manual_updates_business_id_idx on public.business_manual_updates(business_id);
create index if not exists business_manual_updates_updated_by_idx on public.business_manual_updates(updated_by);
create index if not exists business_ownership_requests_decided_by_idx on public.business_ownership_requests(decided_by);
create index if not exists businesses_manual_verified_by_idx on public.businesses(manual_verified_by);
create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists reports_reporter_id_idx on public.reports(reporter_id);
create index if not exists verification_events_business_id_idx on public.verification_events(business_id);
create index if not exists verification_events_claim_id_idx on public.verification_events(claim_id);

-- These PostGIS helpers have no application RPC use and should not be exposed.
revoke execute on function public.st_estimatedextent(text, text) from public, anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text) from public, anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text, boolean) from public, anon, authenticated;

create or replace function public.submit_job_application(
  p_post_id uuid,
  p_applicant_name text,
  p_applicant_email text,
  p_applicant_phone text,
  p_cover_note text default '',
  p_cv_url text default ''
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.posts%rowtype;
  v_business public.businesses%rowtype;
  v_id uuid;
  v_email text := lower(trim(coalesce(p_applicant_email, '')));
  v_cv_path text := trim(coalesce(p_cv_url, ''));
  v_cv_required boolean;
begin
  if length(trim(coalesce(p_applicant_name, ''))) < 2 then raise exception 'name required'; end if;
  if length(trim(coalesce(p_applicant_name, ''))) > 120 then raise exception 'name too long'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'valid email required'; end if;
  if length(trim(coalesce(p_applicant_phone, ''))) < 6 then raise exception 'valid phone required'; end if;
  if length(trim(coalesce(p_applicant_phone, ''))) > 50 then raise exception 'phone too long'; end if;
  if length(coalesce(p_cover_note, '')) > 1500 then raise exception 'note too long'; end if;

  select * into v_post from public.posts
  where id = p_post_id and type = 'job' and status = 'live' and expires_at > now();
  if not found then raise exception 'job is not live'; end if;

  v_cv_required := coalesce((v_post.details->>'cv_required')::boolean, true);
  if v_cv_required and v_cv_path = '' then raise exception 'CV is required'; end if;
  if v_cv_path <> '' then
    if v_cv_path not like ('applications/' || p_post_id::text || '/%') then raise exception 'invalid CV path'; end if;
    if not exists (select 1 from storage.objects where bucket_id = 'job-cvs' and name = v_cv_path) then
      raise exception 'CV upload not found';
    end if;
  end if;

  select * into v_business from public.businesses
  where id = v_post.business_id
    and public.is_public_histreets_business(verification_status, source, claimed_by);
  if not found then raise exception 'verified business required'; end if;

  if exists (
    select 1 from public.job_applications
    where post_id = p_post_id
      and lower(applicant_email) = v_email
      and created_at > now() - interval '24 hours'
  ) then raise exception 'an application from this email was already submitted for this job'; end if;

  insert into public.job_applications(
    post_id, business_id, applicant_name, applicant_email,
    applicant_phone, cover_note, cv_url
  ) values (
    p_post_id, v_business.id, trim(p_applicant_name), v_email,
    trim(p_applicant_phone), nullif(trim(coalesce(p_cover_note, '')), ''), nullif(v_cv_path, '')
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_job_application(uuid,text,text,text,text,text) from public;
grant execute on function public.submit_job_application(uuid,text,text,text,text,text) to anon, authenticated, service_role;
