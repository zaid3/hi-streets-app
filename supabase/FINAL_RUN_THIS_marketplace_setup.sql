-- HiStreets FINAL marketplace setup
-- Run this one file after deploying the latest app.
-- Purpose:
-- 1) Public map shows only approved self/admin-registered businesses, not old imported OSM data.
-- 2) Business owners can register their business and fill details.
-- 3) Admin approves/rejects business registrations.
-- 4) Approved businesses can post offers/jobs/free meals/community support.
-- 5) Jobs require easy apply link or phone/WhatsApp.
-- 6) Blue Badge bays can be added by admin only with real photo evidence.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ---------- Roles ----------
create or replace function public.current_user_role() returns text
language sql
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user')
$$;

grant execute on function public.current_user_role() to anon, authenticated;

-- ---------- Business columns ----------
alter table public.businesses add column if not exists email text;
alter table public.businesses add column if not exists opening_hours text;
alter table public.businesses add column if not exists opening_hours_json jsonb;
alter table public.businesses add column if not exists photo_url text;
alter table public.businesses add column if not exists verified_via text;
alter table public.businesses add column if not exists owner_edited_fields text[];
alter table public.businesses add column if not exists registration_note text;
alter table public.businesses add column if not exists cuisine text;
alter table public.businesses add column if not exists wheelchair text;
alter table public.businesses add column if not exists brand text;
alter table public.businesses add column if not exists operator text;
alter table public.businesses add column if not exists fsa_fhrsid text;
alter table public.businesses add column if not exists fsa_rating integer;
alter table public.businesses add column if not exists fsa_rating_date date;
alter table public.businesses add column if not exists fsa_match_confidence numeric;
alter table public.businesses add column if not exists companies_house_number text;
alter table public.businesses add column if not exists incorporation_date date;
alter table public.businesses add column if not exists company_status text;

update public.businesses set owner_edited_fields = '{}'::text[] where owner_edited_fields is null;
alter table public.businesses alter column owner_edited_fields set default '{}'::text[];

-- Public businesses must be verified AND intentionally registered/claimed.
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

alter table public.businesses enable row level security;

drop policy if exists public_read_verified_businesses on public.businesses;
drop policy if exists public_read_verified_registered_businesses on public.businesses;
create policy public_read_verified_registered_businesses
on public.businesses
for select
using (public.is_public_histreets_business(verification_status, source, claimed_by));

drop policy if exists owners_read_own_businesses on public.businesses;
create policy owners_read_own_businesses
on public.businesses
for select
using (claimed_by = auth.uid());

drop policy if exists owners_update_own_businesses on public.businesses;
create policy owners_update_own_businesses
on public.businesses
for update
using (claimed_by = auth.uid())
with check (claimed_by = auth.uid());

-- Public business view: approved self/admin-registered businesses only.
drop view if exists public.businesses_public cascade;
create view public.businesses_public with (security_invoker=true) as
select
  id, osm_id, name, category, description, address, phone, website, whatsapp,
  email, opening_hours, opening_hours_json, cuisine, wheelchair, brand, operator,
  verification_status, verified_at, verified_via, (claimed_by is not null) as is_claimed,
  photo_url, source, lat, lng, fsa_fhrsid, fsa_rating, fsa_rating_date, fsa_match_confidence,
  companies_house_number, incorporation_date, company_status
from public.businesses
where public.is_public_histreets_business(verification_status, source, claimed_by);

grant select on public.businesses_public to anon, authenticated;

-- ---------- Business registration ----------
create or replace function public.register_my_business(
  p_name text,
  p_category text,
  p_description text default '',
  p_address text default '',
  p_phone text default '',
  p_website text default '',
  p_whatsapp text default '',
  p_email text default '',
  p_opening_hours text default '',
  p_lat double precision default null,
  p_lng double precision default null,
  p_evidence_note text default ''
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_geom geometry(Point,4326);
  v_fields text[] := array['name','category','description','address','phone','website','whatsapp','email','opening_hours'];
begin
  if v_uid is null then raise exception 'sign in required'; end if;

  insert into public.profiles(id, display_name, role)
  values (v_uid, split_part(coalesce((select email from auth.users where id = v_uid), ''), '@', 1), 'user')
  on conflict(id) do nothing;

  if nullif(trim(coalesce(p_name,'')), '') is null then raise exception 'business name required'; end if;
  if nullif(trim(coalesce(p_category,'')), '') is null then raise exception 'category required'; end if;
  if nullif(trim(coalesce(p_address,'')), '') is null then raise exception 'address required'; end if;
  if nullif(trim(coalesce(p_evidence_note,'')), '') is null then raise exception 'evidence note required'; end if;
  if p_lat is null or p_lng is null then raise exception 'business location required'; end if;

  v_geom := st_setsrid(st_makepoint(p_lng, p_lat), 4326);

  if exists (select 1 from public.boundaries where name='Newham')
     and not st_contains((select geom from public.boundaries where name='Newham'), v_geom) then
    raise exception 'business must be inside Newham';
  end if;

  insert into public.businesses(
    name, category, description, geom, address, phone, website, whatsapp, email,
    opening_hours, claimed_by, verification_status, source, owner_edited_fields,
    registration_note, updated_at
  ) values (
    trim(p_name), trim(p_category), nullif(trim(coalesce(p_description,'')), ''), v_geom,
    trim(p_address), nullif(trim(coalesce(p_phone,'')), ''), nullif(trim(coalesce(p_website,'')), ''),
    nullif(trim(coalesce(p_whatsapp,'')), ''), nullif(trim(coalesce(p_email,'')), ''),
    nullif(trim(coalesce(p_opening_hours,'')), ''), v_uid, 'pending', 'owner_registration',
    v_fields, trim(p_evidence_note), now()
  ) returning id into v_id;

  insert into public.verification_events(business_id, method, outcome)
  values (v_id, 'owner_registration', 'pending_admin_review');

  return v_id;
end;
$$;

grant execute on function public.register_my_business(text,text,text,text,text,text,text,text,text,double precision,double precision,text) to authenticated;

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
  if public.current_user_role() <> 'admin' then raise exception 'admin only'; end if;
  if p_status not in ('verified','rejected') then raise exception 'invalid status'; end if;

  select * into v_business from public.businesses where id = p_business_id for update;
  if not found then raise exception 'business not found'; end if;

  if p_status = 'verified' then
    update public.businesses
    set verification_status = 'verified', verified_at = now(), verified_via = 'admin_registration',
        source = 'owner_registration', updated_at = now()
    where id = p_business_id;

    if v_business.claimed_by is not null then
      update public.profiles set role = 'business' where id = v_business.claimed_by and role = 'user';
    end if;
  else
    update public.businesses set verification_status = 'rejected', updated_at = now() where id = p_business_id;
  end if;

  insert into public.verification_events(business_id, method, outcome)
  values (p_business_id, 'admin_registration_review', p_status);

  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values(auth.uid(), 'moderate_business_registration', 'business', p_business_id, jsonb_build_object('status', p_status));
end;
$$;

grant execute on function public.admin_moderate_business_registration(uuid,text) to authenticated;

-- ---------- Public map/detail ----------
create or replace function public.businesses_geojson() returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'type','FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type','Feature',
        'id', b.id,
        'properties', jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'category', b.category,
          'category_group', public.business_category_group(b.category),
          'verification_status', b.verification_status,
          'is_claimed', b.claimed_by is not null,
          'source', b.source,
          'has_offer', exists (select 1 from public.posts p where p.business_id = b.id and p.status='live' and p.expires_at > now() and p.type='offer'),
          'has_job', exists (select 1 from public.posts p where p.business_id = b.id and p.status='live' and p.expires_at > now() and p.type='job'),
          'has_community', exists (select 1 from public.posts p where p.business_id = b.id and p.status='live' and p.expires_at > now() and p.type in ('free_meal','community'))
        ),
        'geometry', st_asgeojson(b.geom)::jsonb
      )
    ), '[]'::jsonb)
  )
  from public.businesses b
  where public.is_public_histreets_business(b.verification_status, b.source, b.claimed_by)
    and (
      not exists (select 1 from public.boundaries where name='Newham')
      or st_contains((select geom from public.boundaries where name='Newham'), b.geom)
    );
$$;

grant execute on function public.businesses_geojson() to anon, authenticated;

create or replace function public.business_detail(p_business_id uuid) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(row) from (
    select
      b.id, b.osm_id, b.name, b.category, b.description, b.address, b.phone,
      b.website, b.whatsapp, b.email, b.opening_hours, b.opening_hours_json,
      b.cuisine, b.wheelchair, b.brand, b.operator, b.verification_status,
      b.verified_at, b.verified_via, b.photo_url, b.source, b.lat, b.lng,
      b.fsa_fhrsid, b.fsa_rating, b.fsa_rating_date, b.fsa_match_confidence,
      b.companies_house_number, b.incorporation_date, b.company_status,
      (b.claimed_by is not null) as is_claimed
    from public.businesses b
    where b.id = p_business_id
      and public.is_public_histreets_business(b.verification_status, b.source, b.claimed_by)
      and (
        not exists (select 1 from public.boundaries where name='Newham')
        or st_contains((select geom from public.boundaries where name='Newham'), b.geom)
      )
    limit 1
  ) row;
$$;

grant execute on function public.business_detail(uuid) to anon, authenticated;

-- ---------- Posts / offers / jobs ----------
alter table public.posts enable row level security;

drop policy if exists public_read_live_posts on public.posts;
create policy public_read_live_posts
on public.posts
for select
using (status='live' and expires_at > now());

drop view if exists public.posts_public cascade;
create view public.posts_public with (security_invoker=true) as
select
  p.id, p.business_id, p.author_id, p.type, p.title, p.body, p.category, p.lat, p.lng,
  p.starts_at, p.expires_at, p.recurrence, p.apply_url, p.apply_phone, p.status,
  p.source, p.created_at, b.name as business_name, b.category as business_category,
  b.address as business_address, b.source as business_source, b.lat as business_lat, b.lng as business_lng
from public.posts p
join public.businesses b on b.id = p.business_id
where p.status = 'live'
  and p.expires_at > now()
  and public.is_public_histreets_business(b.verification_status, b.source, b.claimed_by);

grant select on public.posts_public to anon, authenticated;

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

  select * into v_business from public.businesses
  where id = p_business_id and public.is_public_histreets_business(verification_status, source, claimed_by);

  if not found then raise exception 'approved registered business required'; end if;
  if v_role <> 'admin' and v_business.claimed_by is distinct from v_uid then raise exception 'you can only post from your own approved business'; end if;
  if v_role not in ('business','charity','admin') then raise exception 'approved business account required'; end if;
  if p_type = 'job' and nullif(trim(coalesce(p_apply_url,'')),'') is null and nullif(trim(coalesce(p_apply_phone,'')),'') is null then raise exception 'jobs need an apply link or phone number'; end if;

  insert into public.posts(business_id, author_id, type, title, body, category, geom, expires_at, apply_url, apply_phone, recurrence, status, source)
  values (p_business_id, v_uid, p_type, trim(p_title), trim(p_body), nullif(trim(coalesce(p_category,'')),''), v_business.geom,
          p_expires_at, nullif(trim(coalesce(p_apply_url,'')),''), nullif(trim(coalesce(p_apply_phone,'')),''), nullif(trim(coalesce(p_recurrence,'')),''),
          'pending', case when v_role = 'admin' then 'admin' else 'web' end)
  returning id into v_id;
  return v_id;
end;
$$;

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
  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values(auth.uid(), 'moderate_post', 'post', p_post_id, jsonb_build_object('status', p_status));
end;
$$;

grant execute on function public.admin_moderate_post(uuid,text) to authenticated;

-- ---------- Blue Badge bays: admin only, photo required ----------
create table if not exists public.blue_badge_bays (
  id uuid primary key default gen_random_uuid(),
  geom geometry(Point,4326) not null,
  road_name text not null,
  notes text,
  photo_url text,
  confidence text default 'verified',
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
alter table public.blue_badge_bays add column if not exists confidence text default 'verified';
alter table public.blue_badge_bays add column if not exists source text default 'survey';
alter table public.blue_badge_bays add column if not exists last_verified_at timestamptz default now();
alter table public.blue_badge_bays add column if not exists is_published boolean default true;
alter table public.blue_badge_bays add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.blue_badge_bays add column if not exists created_at timestamptz default now();
alter table public.blue_badge_bays add column if not exists updated_at timestamptz default now();

update public.blue_badge_bays set confidence = coalesce(confidence, 'verified'), source = coalesce(source, 'survey');
delete from public.blue_badge_bays where photo_url is null or road_name is null;
alter table public.blue_badge_bays alter column road_name set not null;
alter table public.blue_badge_bays alter column photo_url set not null;
alter table public.blue_badge_bays alter column confidence set default 'verified';
alter table public.blue_badge_bays alter column source set default 'survey';
alter table public.blue_badge_bays alter column is_published set default true;

create index if not exists blue_badge_bays_geom_idx on public.blue_badge_bays using gist(geom);
create index if not exists blue_badge_bays_published_idx on public.blue_badge_bays(is_published,last_verified_at desc);

alter table public.blue_badge_bays enable row level security;

drop policy if exists public_read_verified_blue_badge on public.blue_badge_bays;
drop policy if exists public_read_published_blue_badge on public.blue_badge_bays;
create policy public_read_published_blue_badge on public.blue_badge_bays for select using (is_published = true);

drop policy if exists admin_insert_blue_badge_bays on public.blue_badge_bays;
create policy admin_insert_blue_badge_bays on public.blue_badge_bays for insert with check (public.current_user_role() = 'admin');

drop policy if exists admin_update_blue_badge_bays on public.blue_badge_bays;
create policy admin_update_blue_badge_bays on public.blue_badge_bays for update using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists admin_delete_blue_badge_bays on public.blue_badge_bays;
create policy admin_delete_blue_badge_bays on public.blue_badge_bays for delete using (public.current_user_role() = 'admin');

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
  if public.current_user_role() <> 'admin' then raise exception 'admin only'; end if;
  if nullif(trim(p_road_name),'') is null then raise exception 'road name required'; end if;
  if nullif(trim(p_photo_url),'') is null then raise exception 'photo required'; end if;
  if exists (select 1 from public.boundaries where name='Newham') and not st_contains((select geom from public.boundaries where name='Newham'), v_geom) then
    raise exception 'point outside Newham boundary';
  end if;

  insert into public.blue_badge_bays(geom, road_name, notes, photo_url, confidence, source, is_published, created_by, last_verified_at)
  values(v_geom, trim(p_road_name), nullif(trim(coalesce(p_notes,'')),''), trim(p_photo_url), 'verified', 'survey', true, auth.uid(), now())
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.add_blue_badge_bay(double precision,double precision,text,text,text) to authenticated;

drop view if exists public.blue_badge_bays_public cascade;
create view public.blue_badge_bays_public with (security_invoker=true) as
select id, st_y(geom) as lat, st_x(geom) as lng, road_name, notes, photo_url, source, last_verified_at, is_published
from public.blue_badge_bays
where is_published = true;

grant select on public.blue_badge_bays_public to anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('bay-photos', 'bay-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists public_read_bay_photos on storage.objects;
create policy public_read_bay_photos on storage.objects for select using (bucket_id = 'bay-photos');

drop policy if exists admin_upload_bay_photos on storage.objects;
create policy admin_upload_bay_photos on storage.objects for insert with check (bucket_id = 'bay-photos' and public.current_user_role() = 'admin');

drop policy if exists admin_update_bay_photos on storage.objects;
create policy admin_update_bay_photos on storage.objects for update using (bucket_id = 'bay-photos' and public.current_user_role() = 'admin') with check (bucket_id = 'bay-photos' and public.current_user_role() = 'admin');

drop policy if exists admin_delete_bay_photos on storage.objects;
create policy admin_delete_bay_photos on storage.objects for delete using (bucket_id = 'bay-photos' and public.current_user_role() = 'admin');

notify pgrst, 'reload schema';
