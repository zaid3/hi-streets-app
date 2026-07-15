-- FINAL: Jobs, offers, community posts + no-sign-in job applications with mandatory CV
-- Parking/Blue Badge is intentionally not part of this live version.
-- Run after the previous marketplace setup. Safe to run more than once.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- Make sure the public-business gate exists.
create or replace function public.is_public_histreets_business(
  p_status text,
  p_source text,
  p_claimed_by uuid
) returns boolean
language sql
stable
as $$
  select coalesce(p_status, '') = 'verified'
    and (
      p_claimed_by is not null
      or coalesce(p_source, '') in ('owner_registration','admin_registration','admin_manual','manual')
    );
$$;

grant execute on function public.is_public_histreets_business(text,text,uuid) to anon, authenticated;

-- ---------- Job applications ----------
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  applicant_name text not null,
  applicant_email text not null,
  applicant_phone text not null,
  cover_note text,
  cv_url text not null,
  status text not null default 'new' check (status in ('new','reviewed','shortlisted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_applications_post_idx on public.job_applications(post_id, created_at desc);
create index if not exists job_applications_business_idx on public.job_applications(business_id, created_at desc);

alter table public.job_applications enable row level security;

drop policy if exists job_applications_owner_read on public.job_applications;
create policy job_applications_owner_read
on public.job_applications
for select
using (
  public.current_user_role() = 'admin'
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
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1
    from public.businesses b
    where b.id = business_id
      and b.claimed_by = auth.uid()
  )
)
with check (
  public.current_user_role() = 'admin'
  or exists (
    select 1
    from public.businesses b
    where b.id = business_id
      and b.claimed_by = auth.uid()
  )
);

-- CV storage bucket. Public read is used for a simple working MVP with randomised file paths.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-cvs',
  'job-cvs',
  true,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists public_read_job_cvs on storage.objects;
create policy public_read_job_cvs
on storage.objects
for select
using (bucket_id = 'job-cvs');

drop policy if exists anon_upload_job_cvs on storage.objects;
create policy anon_upload_job_cvs
on storage.objects
for insert
with check (bucket_id = 'job-cvs');

-- Public/anonymous applicant flow. No user account required.
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
begin
  if nullif(trim(coalesce(p_applicant_name,'')), '') is null then raise exception 'name required'; end if;
  if nullif(trim(coalesce(p_applicant_email,'')), '') is null then raise exception 'email required'; end if;
  if nullif(trim(coalesce(p_applicant_phone,'')), '') is null then raise exception 'phone required'; end if;
  if nullif(trim(coalesce(p_cv_url,'')), '') is null then raise exception 'CV is required'; end if;

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
    lower(trim(p_applicant_email)),
    trim(p_applicant_phone),
    nullif(trim(coalesce(p_cover_note,'')), ''),
    trim(p_cv_url)
  ) returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_job_application(uuid,text,text,text,text,text) to anon, authenticated;

-- Business owner/admin inbox.
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
  where public.current_user_role() = 'admin'
     or b.claimed_by = auth.uid()
  order by ja.created_at desc;
$$;

grant execute on function public.my_job_applications() to authenticated;

-- Replace post creation so jobs do NOT need external apply link/phone.
-- Applications happen inside HiStreets with mandatory CV.
create or replace function public.create_verified_business_post(
  p_business_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_category text,
  p_expires_at timestamptz,
  p_apply_url text default null,
  p_apply_phone text default null,
  p_recurrence text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := public.current_user_role();
  v_business public.businesses%rowtype;
  v_id uuid;
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  if p_type not in ('offer','job','free_meal','community') then raise exception 'invalid post type'; end if;
  if nullif(trim(coalesce(p_title,'')),'') is null then raise exception 'title required'; end if;
  if nullif(trim(coalesce(p_body,'')),'') is null then raise exception 'description required'; end if;
  if p_expires_at is null or p_expires_at <= now() then raise exception 'future expiry date required'; end if;

  select * into v_business
  from public.businesses
  where id = p_business_id
    and public.is_public_histreets_business(verification_status, source, claimed_by);

  if not found then raise exception 'approved registered business required'; end if;
  if v_role <> 'admin' and v_business.claimed_by is distinct from v_uid then raise exception 'you can only post from your own approved business'; end if;
  if v_role not in ('business','charity','admin') then raise exception 'approved business account required'; end if;

  insert into public.posts(
    business_id, author_id, type, title, body, category, geom, expires_at,
    apply_url, apply_phone, recurrence, status, source
  ) values (
    p_business_id,
    v_uid,
    p_type,
    trim(p_title),
    trim(p_body),
    nullif(trim(coalesce(p_category,'')),''),
    v_business.geom,
    p_expires_at,
    nullif(trim(coalesce(p_apply_url,'')),''),
    nullif(trim(coalesce(p_apply_phone,'')),''),
    nullif(trim(coalesce(p_recurrence,'')),''),
    'pending',
    case when v_role = 'admin' then 'admin' else 'web' end
  ) returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_verified_business_post(uuid,text,text,text,text,timestamptz,text,text,text) to authenticated;

notify pgrst, 'reload schema';
