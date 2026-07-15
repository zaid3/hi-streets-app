-- Sprint 11: Self-service marketplace mode
-- Goal: stop showing unconfirmed imported businesses publicly.
-- Public map/feed now shows only approved owner/admin-registered businesses, their offers/jobs, and photo-evidenced Blue Badge bays.

create extension if not exists pgcrypto;
create extension if not exists postgis;

alter table public.businesses add column if not exists email text;
alter table public.businesses add column if not exists opening_hours text;
alter table public.businesses add column if not exists opening_hours_json jsonb;
alter table public.businesses add column if not exists photo_url text;
alter table public.businesses add column if not exists verified_via text;
alter table public.businesses add column if not exists owner_edited_fields text[] not null default '{}'::text[];
alter table public.businesses add column if not exists registration_note text;

-- Public businesses must be verified AND intentionally registered/claimed.
-- This prevents old OSM/imported points being shown as current businesses.
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

-- Replace the broad public-read policy that exposed all verified imported businesses.
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

-- Public business view: only approved self/admin-registered businesses.
drop view if exists public.businesses_public cascade;
create view public.businesses_public with (security_invoker=true) as
select
  id,
  osm_id,
  name,
  category,
  description,
  address,
  phone,
  website,
  whatsapp,
  email,
  opening_hours,
  opening_hours_json,
  verification_status,
  verified_at,
  verified_via,
  (claimed_by is not null) as is_claimed,
  photo_url,
  source,
  lat,
  lng
from public.businesses
where public.is_public_histreets_business(verification_status, source, claimed_by);

-- User-facing registration. The business is pending until admin approves.
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
  if v_uid is null then
    raise exception 'sign in required';
  end if;

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
    name,
    category,
    description,
    geom,
    address,
    phone,
    website,
    whatsapp,
    email,
    opening_hours,
    claimed_by,
    verification_status,
    source,
    owner_edited_fields,
    registration_note,
    updated_at
  ) values (
    trim(p_name),
    trim(p_category),
    nullif(trim(coalesce(p_description,'')), ''),
    v_geom,
    trim(p_address),
    nullif(trim(coalesce(p_phone,'')), ''),
    nullif(trim(coalesce(p_website,'')), ''),
    nullif(trim(coalesce(p_whatsapp,'')), ''),
    nullif(trim(coalesce(p_email,'')), ''),
    nullif(trim(coalesce(p_opening_hours,'')), ''),
    v_uid,
    'pending',
    'owner_registration',
    v_fields,
    trim(p_evidence_note),
    now()
  ) returning id into v_id;

  insert into public.verification_events(business_id, method, outcome)
  values (v_id, 'owner_registration', 'pending_admin_review');

  return v_id;
end;
$$;

grant execute on function public.register_my_business(text,text,text,text,text,text,text,text,text,double precision,double precision,text) to authenticated;

-- Admin approves/rejects a registered business. Approved businesses become public and can post.
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
  if public.current_user_role() <> 'admin' then
    raise exception 'admin only';
  end if;

  if p_status not in ('verified','rejected') then
    raise exception 'invalid status';
  end if;

  select * into v_business
  from public.businesses
  where id = p_business_id
  for update;

  if not found then
    raise exception 'business not found';
  end if;

  if p_status = 'verified' then
    update public.businesses
    set verification_status = 'verified',
        verified_at = now(),
        verified_via = 'admin_registration',
        source = 'owner_registration',
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

-- Map source now exposes approved registered businesses only.
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
          'has_offer', exists (
            select 1 from public.posts p
            where p.business_id = b.id
              and p.status='live'
              and p.expires_at > now()
              and p.type='offer'
          ),
          'has_job', exists (
            select 1 from public.posts p
            where p.business_id = b.id
              and p.status='live'
              and p.expires_at > now()
              and p.type='job'
          ),
          'has_community', exists (
            select 1 from public.posts p
            where p.business_id = b.id
              and p.status='live'
              and p.expires_at > now()
              and p.type in ('free_meal','community')
          )
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

-- Public posts only for approved registered businesses.
drop view if exists public.posts_public cascade;
create view public.posts_public with (security_invoker=true) as
select
  p.id,
  p.business_id,
  p.author_id,
  p.type,
  p.title,
  p.body,
  p.category,
  p.lat,
  p.lng,
  p.starts_at,
  p.expires_at,
  p.recurrence,
  p.apply_url,
  p.apply_phone,
  p.status,
  p.source,
  p.created_at,
  b.name as business_name,
  b.category as business_category,
  b.address as business_address,
  b.source as business_source,
  b.lat as business_lat,
  b.lng as business_lng
from public.posts p
join public.businesses b on b.id = p.business_id
where p.status = 'live'
  and p.expires_at > now()
  and public.is_public_histreets_business(b.verification_status, b.source, b.claimed_by);

-- Keep posting strict: approved registered business only.
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
  if p_type = 'job' and nullif(trim(coalesce(p_apply_url,'')),'') is null and nullif(trim(coalesce(p_apply_phone,'')),'') is null then raise exception 'jobs need an apply link or phone number'; end if;

  insert into public.posts(
    business_id, author_id, type, title, body, category, geom, expires_at, apply_url, apply_phone, recurrence, status, source
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
