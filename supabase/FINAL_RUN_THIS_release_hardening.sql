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

-- Convert old public URLs to private storage paths.
update public.job_applications
set cv_url = regexp_replace(
  cv_url,
  '^https?://[^/]+/storage/v1/object/public/job-cvs/',
  ''
)
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
  if coalesce(p_name,'') !~ '^applications/[0-9a-fA-F-]{36}/[A-Za-z0-9._-]+\.(pdf|doc|docx)$' then
    return false;
  end if;

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
  select auth.uid() is not null
    and (
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
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'job-cvs'
  and public.can_upload_job_cv(name)
);

create policy job_cv_owner_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'job-cvs'
  and public.can_access_job_cv(name)
);

create policy job_cv_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'job-cvs'
  and public.current_user_is_admin()
);

-- ---------- Job application RLS ----------
alter table public.job_applications enable row level security;

drop policy if exists job_applications_owner_read on public.job_applications;
create policy job_applications_owner_read
on public.job_applications
for select
to authenticated
using (
  public.current_user_is_admin()
  or exists (
    select 1
    from public.businesses b
    where b.id = business_id
      and b.claimed_by = auth.uid()
  )
);

drop policy if exists job_applications_owner_update on public.job_applications;
create policy job_applications_owner_update
on public.job_applications
for update
to authenticated
using (
  public.current_user_is_admin()
  or exists (
    select 1
    from public.businesses b
    where b.id = business_id
      and b.claimed_by = auth.uid()
  )
)
with check (
  public.current_user_is_admin()
  or exists (
    select 1
    from public.businesses b
    where b.id = business_id
      and b.claimed_by = auth.uid()
  )
);

-- Public applicants can submit only to a currently live approved job and only
-- with a CV path that belongs to that job and exists in the private bucket.
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

  select * into v_post
  from public.posts
  where id = p_post_id
    and type = 'job'
    and status = 'live'
    and expires_at > now();

  if not found then raise exception 'job is not live'; end if;

  select * into v_business
  from public.businesses
  where id = v_post.business_id
    and public.is_public_histreets_business(verification_status, source, claimed_by);

  if not found then raise exception 'approved business required'; end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'job-cvs'
      and name = p_cv_url
  ) then
    raise exception 'CV upload not found';
  end if;

  if exists (
    select 1
    from public.job_applications
    where post_id = p_post_id
      and applicant_email = v_email
      and created_at > now() - interval '1 minute'
  ) then
    raise exception 'application already submitted recently';
  end if;

  insert into public.job_applications(
    post_id,
    business_id,
    applicant_name,
    applicant_email,
    applicant_phone,
    cover_note,
    cv_url
  ) values (
    p_post_id,
    v_business.id,
    trim(p_applicant_name),
    v_email,
    trim(p_applicant_phone),
    nullif(trim(coalesce(p_cover_note,'')), ''),
    trim(p_cv_url)
  ) returning id into v_id;

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
  select
    ja.id,
    ja.post_id,
    ja.business_id,
    p.title as job_title,
    b.name as business_name,
    ja.applicant_name,
    ja.applicant_email,
    ja.applicant_phone,
    ja.cover_note,
    ja.cv_url,
    ja.created_at
  from public.job_applications ja
  join public.posts p on p.id = ja.post_id
  join public.businesses b on b.id = ja.business_id
  where public.current_user_is_admin()
     or b.claimed_by = auth.uid()
  order by ja.created_at desc
  limit 100;
$$;

grant execute on function public.my_job_applications() to authenticated;

notify pgrst, 'reload schema';
