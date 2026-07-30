-- HiStreets final release hardening
-- Run LAST, after:
-- 1) FINAL_RUN_THIS_marketplace_setup.sql
-- 2) FINAL_RUN_THIS_jobs_offers_applications_no_parking.sql
-- 3) FINAL_RUN_THIS_safe_auto_approval.sql
-- 4) FINAL_RUN_THIS_super_admin_dashboard.sql

-- ---------- Admin helper ----------
create or replace function public.current_user_is_admin() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin','super_admin')
$$;

grant execute on function public.current_user_is_admin() to authenticated;

-- ---------- Private business verification evidence ----------
create table if not exists public.business_verification_evidence (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('shopfront','inside')),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  unique (business_id, kind)
);

alter table public.business_verification_evidence enable row level security;

drop policy if exists business_evidence_owner_read on public.business_verification_evidence;
create policy business_evidence_owner_read
on public.business_verification_evidence
for select
to authenticated
using (
  submitted_by = auth.uid()
  or public.current_user_is_admin()
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-verification',
  'business-verification',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_upload_business_evidence(p_name text) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if auth.uid() is null then return false; end if;
  if coalesce(p_name,'') !~ '^business/[0-9a-fA-F-]{36}/(shopfront|inside)-[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp|heic)$' then
    return false;
  end if;

  begin
    v_business_id := split_part(p_name, '/', 2)::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1
    from public.businesses b
    where b.id = v_business_id
      and b.claimed_by = auth.uid()
      and b.verification_status = 'pending'
  );
end;
$$;

grant execute on function public.can_upload_business_evidence(text) to authenticated;

drop policy if exists business_evidence_upload on storage.objects;
drop policy if exists business_evidence_owner_delete on storage.objects;
drop policy if exists business_evidence_admin_read on storage.objects;
drop policy if exists business_evidence_admin_delete on storage.objects;

create policy business_evidence_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-verification'
  and public.can_upload_business_evidence(name)
);

create policy business_evidence_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-verification'
  and public.can_upload_business_evidence(name)
);

create policy business_evidence_admin_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'business-verification'
  and public.current_user_is_admin()
);

create policy business_evidence_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-verification'
  and public.current_user_is_admin()
);

create or replace function public.record_business_verification_evidence(
  p_business_id uuid,
  p_kind text,
  p_storage_path text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  if p_kind not in ('shopfront','inside') then raise exception 'invalid evidence type'; end if;
  if p_storage_path not like ('business/' || p_business_id::text || '/' || p_kind || '-%') then raise exception 'invalid evidence path'; end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.claimed_by = auth.uid()
      and b.verification_status = 'pending'
  ) then raise exception 'pending business registration required'; end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'business-verification'
      and name = p_storage_path
  ) then raise exception 'evidence upload not found'; end if;

  insert into public.business_verification_evidence(business_id, submitted_by, kind, storage_path)
  values (p_business_id, auth.uid(), p_kind, p_storage_path)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.record_business_verification_evidence(uuid,text,text) to authenticated;

create or replace function public.admin_business_verification_evidence(p_business_id uuid)
returns table (
  id uuid,
  business_id uuid,
  kind text,
  storage_path text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.business_id, e.kind, e.storage_path, e.created_at
  from public.business_verification_evidence e
  where public.current_user_is_admin()
    and e.business_id = p_business_id
  order by case e.kind when 'shopfront' then 1 else 2 end, e.created_at;
$$;

grant execute on function public.admin_business_verification_evidence(uuid) to authenticated;

create or replace function public.delete_business_verification_evidence(p_business_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then raise exception 'admin only'; end if;
  delete from public.business_verification_evidence where business_id = p_business_id;
end;
$$;

grant execute on function public.delete_business_verification_evidence(uuid) to authenticated;

-- Clear the written evidence note after the decision. Photo objects are removed
-- through the Storage API by the admin UI immediately after moderation.
create or replace function public.admin_moderate_business_registration(
  p_business_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
begin
  if not public.current_user_is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('verified','rejected') then raise exception 'invalid status'; end if;

  select * into v_business from public.businesses where id = p_business_id for update;
  if not found then raise exception 'business not found'; end if;

  if p_status = 'verified' then
    update public.businesses
    set verification_status = 'verified',
        verified_at = now(),
        verified_via = 'admin_registration',
        source = case when source = 'osm' then 'owner_registration' else coalesce(source,'owner_registration') end,
        registration_note = null,
        updated_at = now()
    where id = p_business_id;

    if v_business.claimed_by is not null then
      update public.profiles
      set role = 'business'
      where id = v_business.claimed_by
        and role = 'user';
    end if;
  else
    update public.businesses
    set verification_status = 'rejected',
        registration_note = null,
        updated_at = now()
    where id = p_business_id;
  end if;

  insert into public.verification_events(business_id, method, outcome)
  values (p_business_id, 'admin_registration_review', p_status);

  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values(auth.uid(), 'moderate_business_registration', 'business', p_business_id, jsonb_build_object('status', p_status));
end;
$$;

grant execute on function public.admin_moderate_business_registration(uuid,text) to authenticated;

-- ---------- Post source compatibility ----------
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.posts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%source%'
  loop
    execute format('alter table public.posts drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table public.posts
  add constraint posts_source_check
  check (source in ('web','web_auto_checked','whatsapp','admin'))
  not valid;

alter table public.posts validate constraint posts_source_check;

-- ---------- Private CV storage ----------
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-cvs',
  'job-cvs',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

update public.job_applications
set cv_url = regexp_replace(cv_url, '^https?://[^/]+/storage/v1/object/public/job-cvs/', '')
where cv_url ~ '^https?://[^/]+/storage/v1/object/public/job-cvs/';

create or replace function public.can_upload_job_cv(p_name text) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_post_id uuid;
begin
  if coalesce(p_name,'') !~ '^applications/[0-9a-fA-F-]{36}/[A-Za-z0-9._-]+\.(pdf|doc|docx)$' then return false; end if;
  begin
    v_post_id := split_part(p_name, '/', 2)::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1
    from public.posts p
    join public.businesses b on b.id = p.business_id
    where p.id = v_post_id
      and p.type = 'job'
      and p.status = 'live'
      and p.expires_at > now()
      and public.is_public_histreets_business(b.verification_status, b.source, b.claimed_by)
  );
end;
$$;

grant execute on function public.can_upload_job_cv(text) to anon, authenticated;

create or replace function public.can_access_job_cv(p_name text) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.current_user_is_admin()
    or exists (
      select 1
      from public.job_applications ja
      join public.businesses b on b.id = ja.business_id
      where ja.cv_url = p_name
        and b.claimed_by = auth.uid()
    )
  )
$$;

grant execute on function public.can_access_job_cv(text) to authenticated;

drop policy if exists public_read_job_cvs on storage.objects;
drop policy if exists anon_upload_job_cvs on storage.objects;
drop policy if exists job_cv_applicant_upload on storage.objects;
drop policy if exists job_cv_owner_read on storage.objects;
drop policy if exists job_cv_admin_delete on storage.objects;

create policy job_cv_applicant_upload
on storage.objects for insert to anon, authenticated
with check (bucket_id = 'job-cvs' and public.can_upload_job_cv(name));

create policy job_cv_owner_read
on storage.objects for select to authenticated
using (bucket_id = 'job-cvs' and public.can_access_job_cv(name));

create policy job_cv_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'job-cvs' and public.current_user_is_admin());

-- ---------- Job application RLS ----------
alter table public.job_applications enable row level security;

drop policy if exists job_applications_owner_read on public.job_applications;
create policy job_applications_owner_read
on public.job_applications for select to authenticated
using (
  public.current_user_is_admin()
  or exists (select 1 from public.businesses b where b.id = business_id and b.claimed_by = auth.uid())
);

drop policy if exists job_applications_owner_update on public.job_applications;
create policy job_applications_owner_update
on public.job_applications for update to authenticated
using (
  public.current_user_is_admin()
  or exists (select 1 from public.businesses b where b.id = business_id and b.claimed_by = auth.uid())
)
with check (
  public.current_user_is_admin()
  or exists (select 1 from public.businesses b where b.id = business_id and b.claimed_by = auth.uid())
);

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
  v_email text := lower(trim(coalesce(p_applicant_email,'')));
begin
  if length(trim(coalesce(p_applicant_name,''))) < 2 then raise exception 'name required'; end if;
  if length(trim(coalesce(p_applicant_name,''))) > 120 then raise exception 'name too long'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'valid email required'; end if;
  if length(trim(coalesce(p_applicant_phone,''))) < 6 then raise exception 'valid phone required'; end if;
  if length(trim(coalesce(p_applicant_phone,''))) > 50 then raise exception 'phone too long'; end if;
  if length(coalesce(p_cover_note,'')) > 1500 then raise exception 'note too long'; end if;
  if nullif(trim(coalesce(p_cv_url,'')), '') is null then raise exception 'CV is required'; end if;
  if p_cv_url not like ('applications/' || p_post_id::text || '/%') then raise exception 'invalid CV path'; end if;

  select * into v_post from public.posts
  where id = p_post_id and type = 'job' and status = 'live' and expires_at > now();
  if not found then raise exception 'job is not live'; end if;

  select * into v_business from public.businesses
  where id = v_post.business_id
    and public.is_public_histreets_business(verification_status, source, claimed_by);
  if not found then raise exception 'approved business required'; end if;

  if not exists (select 1 from storage.objects where bucket_id = 'job-cvs' and name = p_cv_url) then
    raise exception 'CV upload not found';
  end if;

  if exists (
    select 1 from public.job_applications
    where post_id = p_post_id and applicant_email = v_email and created_at > now() - interval '1 minute'
  ) then raise exception 'application already submitted recently'; end if;

  insert into public.job_applications(post_id,business_id,applicant_name,applicant_email,applicant_phone,cover_note,cv_url)
  values (p_post_id,v_business.id,trim(p_applicant_name),v_email,trim(p_applicant_phone),nullif(trim(coalesce(p_cover_note,'')), ''),trim(p_cv_url))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.submit_job_application(uuid,text,text,text,text,text) to anon, authenticated;

create or replace function public.my_job_applications()
returns table (
  id uuid,
  post_id uuid,
  business_id uuid,
  job_title text,
  business_name text,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  cover_note text,
  cv_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select ja.id, ja.post_id, ja.business_id, p.title, b.name,
         ja.applicant_name, ja.applicant_email, ja.applicant_phone,
         ja.cover_note, ja.cv_url, ja.created_at
  from public.job_applications ja
  join public.posts p on p.id = ja.post_id
  join public.businesses b on b.id = ja.business_id
  where public.current_user_is_admin() or b.claimed_by = auth.uid()
  order by ja.created_at desc
  limit 100;
$$;

grant execute on function public.my_job_applications() to authenticated;

notify pgrst, 'reload schema';
