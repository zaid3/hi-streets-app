-- Sprint 10 — Blue Badge bay + local jobs setup
-- Purpose: finalise practical app setup for:
-- 1) admin-added Blue Badge bays with required photo evidence
-- 2) verified-business local job posts with admin moderation
-- Safe to run more than once.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ---------- Blue Badge bays ----------
create table if not exists public.blue_badge_bays (
  id uuid primary key default gen_random_uuid(),
  geom geometry(Point,4326) not null,
  road_name text not null,
  notes text,
  photo_url text not null,
  source text not null default 'survey',
  last_verified_at timestamptz default now(),
  is_published boolean default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.blue_badge_bays add column if not exists road_name text;
alter table public.blue_badge_bays add column if not exists notes text;
alter table public.blue_badge_bays add column if not exists photo_url text;
alter table public.blue_badge_bays add column if not exists source text default 'survey';
alter table public.blue_badge_bays add column if not exists last_verified_at timestamptz default now();
alter table public.blue_badge_bays add column if not exists is_published boolean default true;
alter table public.blue_badge_bays add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.blue_badge_bays add column if not exists created_at timestamptz default now();
alter table public.blue_badge_bays add column if not exists updated_at timestamptz default now();

update public.blue_badge_bays set source = coalesce(source, 'survey');
delete from public.blue_badge_bays where photo_url is null or road_name is null;

alter table public.blue_badge_bays alter column road_name set not null;
alter table public.blue_badge_bays alter column photo_url set not null;
alter table public.blue_badge_bays alter column source set default 'survey';
alter table public.blue_badge_bays alter column is_published set default true;

create index if not exists blue_badge_bays_geom_idx on public.blue_badge_bays using gist(geom);
create index if not exists blue_badge_bays_published_idx on public.blue_badge_bays(is_published,last_verified_at desc);

alter table public.blue_badge_bays enable row level security;

drop policy if exists public_read_published_blue_badge on public.blue_badge_bays;
create policy public_read_published_blue_badge on public.blue_badge_bays
for select using (is_published = true);

drop policy if exists admin_insert_blue_badge_bays on public.blue_badge_bays;
create policy admin_insert_blue_badge_bays on public.blue_badge_bays
for insert with check (public.current_user_role() = 'admin');

drop policy if exists admin_update_blue_badge_bays on public.blue_badge_bays;
create policy admin_update_blue_badge_bays on public.blue_badge_bays
for update using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists admin_delete_blue_badge_bays on public.blue_badge_bays;
create policy admin_delete_blue_badge_bays on public.blue_badge_bays
for delete using (public.current_user_role() = 'admin');

create or replace function public.add_blue_badge_bay(
  p_lat double precision,
  p_lng double precision,
  p_road_name text,
  p_notes text,
  p_photo_url text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_geom geometry(Point,4326) := st_setsrid(st_makepoint(p_lng, p_lat),4326);
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'admin only';
  end if;
  if nullif(trim(p_road_name),'') is null then
    raise exception 'road name required';
  end if;
  if nullif(trim(p_photo_url),'') is null then
    raise exception 'photo required';
  end if;
  if exists (select 1 from public.boundaries where name='Newham')
     and not st_contains((select geom from public.boundaries where name='Newham'), v_geom) then
    raise exception 'point outside Newham boundary';
  end if;

  insert into public.blue_badge_bays(geom, road_name, notes, photo_url, source, is_published, created_by, last_verified_at)
  values(v_geom, trim(p_road_name), nullif(trim(coalesce(p_notes,'')),''), trim(p_photo_url), 'survey', true, auth.uid(), now())
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.add_blue_badge_bay(double precision,double precision,text,text,text) to authenticated;

drop view if exists public.blue_badge_bays_public cascade;
create view public.blue_badge_bays_public with (security_invoker=true) as
select id,
       st_y(geom) as lat,
       st_x(geom) as lng,
       road_name,
       notes,
       photo_url,
       source,
       last_verified_at,
       is_published
from public.blue_badge_bays
where is_published = true;

-- Required photo bucket. Public read, admin write only.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('bay-photos', 'bay-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists public_read_bay_photos on storage.objects;
create policy public_read_bay_photos on storage.objects
for select using (bucket_id = 'bay-photos');

drop policy if exists admin_upload_bay_photos on storage.objects;
create policy admin_upload_bay_photos on storage.objects
for insert with check (bucket_id = 'bay-photos' and public.current_user_role() = 'admin');

drop policy if exists admin_update_bay_photos on storage.objects;
create policy admin_update_bay_photos on storage.objects
for update using (bucket_id = 'bay-photos' and public.current_user_role() = 'admin')
with check (bucket_id = 'bay-photos' and public.current_user_role() = 'admin');

drop policy if exists admin_delete_bay_photos on storage.objects;
create policy admin_delete_bay_photos on storage.objects
for delete using (bucket_id = 'bay-photos' and public.current_user_role() = 'admin');

-- ---------- Jobs / local posts ----------
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
  where id = p_business_id and verification_status = 'verified';

  if not found then raise exception 'verified business required'; end if;
  if v_role <> 'admin' and v_business.claimed_by is distinct from v_uid then
    raise exception 'you can only post from your own verified business';
  end if;
  if v_role not in ('business','charity','admin') then
    raise exception 'verified business account required';
  end if;
  if p_type = 'job' and nullif(trim(coalesce(p_apply_url,'')),'') is null and nullif(trim(coalesce(p_apply_phone,'')),'') is null then
    raise exception 'jobs need an apply link or phone number';
  end if;

  insert into public.posts(
    business_id, author_id, type, title, body, category, geom, expires_at,
    apply_url, apply_phone, recurrence, status, source
  ) values (
    p_business_id, v_uid, p_type, trim(p_title), trim(p_body), nullif(trim(coalesce(p_category,'')),''),
    v_business.geom, p_expires_at, nullif(trim(coalesce(p_apply_url,'')),''), nullif(trim(coalesce(p_apply_phone,'')),''),
    nullif(trim(coalesce(p_recurrence,'')),''), 'pending', case when v_role = 'admin' then 'admin' else 'web' end
  ) returning id into v_id;

  return v_id;
end $$;

grant execute on function public.create_verified_business_post(uuid,text,text,text,text,timestamptz,text,text,text) to authenticated;

create or replace function public.admin_moderate_post(p_post_id uuid, p_status text) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then raise exception 'admin only'; end if;
  if p_status not in ('live','rejected','removed') then raise exception 'invalid status'; end if;
  update public.posts set status = p_status, updated_at = now() where id = p_post_id;
end $$;

grant execute on function public.admin_moderate_post(uuid,text) to authenticated;

notify pgrst, 'reload schema';
