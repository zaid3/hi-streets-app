create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user','business','charity','admin')),
  created_at timestamptz default now()
);

-- ---------- Businesses from OSM / claims ----------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  osm_id bigint unique,
  name text not null,
  category text not null default 'other',
  description text,
  geom geometry(Point,4326) not null,
  lat double precision generated always as (st_y(geom)) stored,
  lng double precision generated always as (st_x(geom)) stored,
  address text,
  phone text,
  website text,
  whatsapp text,
  claimed_by uuid references public.profiles(id) on delete set null,
  verification_status text not null default 'unclaimed' check (verification_status in ('unclaimed','pending','verified','rejected')),
  verified_at timestamptz,
  photo_url text,
  source text not null default 'osm',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists businesses_geom_idx on public.businesses using gist(geom);
create index if not exists businesses_status_idx on public.businesses(verification_status,category);
create index if not exists businesses_owner_idx on public.businesses(claimed_by);

-- ---------- Posts: offers/jobs/free meals/community ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('offer','job','free_meal','community')),
  title text not null,
  body text not null,
  category text,
  geom geometry(Point,4326),
  lat double precision generated always as (case when geom is null then null else st_y(geom) end) stored,
  lng double precision generated always as (case when geom is null then null else st_x(geom) end) stored,
  starts_at timestamptz,
  expires_at timestamptz not null,
  recurrence text,
  apply_url text,
  apply_phone text,
  status text not null default 'pending' check (status in ('pending','live','expired','rejected','removed')),
  source text not null default 'web' check (source in ('web','whatsapp','admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists posts_live_idx on public.posts(status,type,expires_at,created_at desc);
create index if not exists posts_business_idx on public.posts(business_id);
create index if not exists posts_geom_idx on public.posts using gist(geom);

-- ---------- Parking Phase 1 ----------
create table if not exists public.cpz_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  geom geometry(MultiPolygon,4326) not null,
  hours jsonb default '{}'::jsonb,
  event_day_hours jsonb default '{}'::jsonb,
  source text not null default 'Newham Council ArcGIS CPZ',
  last_verified_at timestamptz default now()
);
create index if not exists cpz_zones_geom_idx on public.cpz_zones using gist(geom);

create table if not exists public.paid_bays (
  id uuid primary key default gen_random_uuid(),
  geom geometry(Point,4326) not null,
  lat double precision generated always as (st_y(geom)) stored,
  lng double precision generated always as (st_x(geom)) stored,
  paybyphone_code text,
  tariff jsonb default '{}'::jsonb,
  max_stay_mins int,
  source text not null default 'manual_paybyphone_transcription',
  last_verified_at timestamptz default now()
);
create index if not exists paid_bays_geom_idx on public.paid_bays using gist(geom);

-- Phase 3 only: never display anything below official/photo-verified confidence.
create table if not exists public.blue_badge_bays (
  id uuid primary key default gen_random_uuid(),
  geom geometry(Point,4326) not null,
  lat double precision generated always as (st_y(geom)) stored,
  lng double precision generated always as (st_x(geom)) stored,
  road_name text not null,
  side_of_road text,
  confidence text not null check (confidence in ('official','verified')),
  evidence_photo_url text,
  source text not null,
  last_verified_at timestamptz default now()
);
create index if not exists blue_badge_bays_geom_idx on public.blue_badge_bays using gist(geom);
create index if not exists blue_badge_confidence_idx on public.blue_badge_bays(confidence);

-- ---------- Engagement & safety ----------
create table if not exists public.saved_places (
  user_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz default now(),
  primary key(user_id,business_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz default now()
);

create table if not exists public.verification_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  method text not null,
  phone_last4 text,
  outcome text not null,
  created_at timestamptz default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- Public read views for frontend ----------
create or replace view public.businesses_public with (security_invoker=true) as
select id, osm_id, name, category, description, address, phone, website, whatsapp, verification_status, photo_url, source, lat, lng
from public.businesses
where verification_status = 'verified';

create or replace view public.posts_public with (security_invoker=true) as
select p.id,p.business_id,p.author_id,p.type,p.title,p.body,p.category,p.lat,p.lng,p.starts_at,p.expires_at,p.recurrence,p.apply_url,p.apply_phone,p.status,p.source,p.created_at,
       b.name as business_name,b.category as business_category,b.address as business_address,b.lat as business_lat,b.lng as business_lng
from public.posts p
left join public.businesses b on b.id = p.business_id
where p.status = 'live' and p.expires_at > now();

create or replace view public.cpz_zones_public with (security_invoker=true) as
select id,name,hours,event_day_hours,source,last_verified_at,st_asgeojson(geom)::jsonb as geom_json
from public.cpz_zones;

create or replace view public.paid_bays_public with (security_invoker=true) as
select id,lat,lng,paybyphone_code,tariff,max_stay_mins,source,last_verified_at
from public.paid_bays;

create or replace view public.blue_badge_bays_public with (security_invoker=true) as
select id,lat,lng,road_name,side_of_road,confidence,evidence_photo_url,source,last_verified_at
from public.blue_badge_bays
where confidence in ('official','verified');

-- ---------- Import RPCs for free official/community data ----------
create or replace function public.upsert_osm_business(
  p_osm_id bigint,
  p_name text,
  p_category text,
  p_lat double precision,
  p_lng double precision,
  p_address text default null,
  p_phone text default null,
  p_website text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.businesses(osm_id,name,category,geom,address,phone,website,verification_status,source)
  values(p_osm_id,p_name,coalesce(p_category,'other'),st_setsrid(st_makepoint(p_lng,p_lat),4326),p_address,p_phone,p_website,'verified','osm')
  on conflict(osm_id) do update set
    name=excluded.name, category=excluded.category, geom=excluded.geom, address=coalesce(excluded.address,public.businesses.address), phone=coalesce(excluded.phone,public.businesses.phone), website=coalesce(excluded.website,public.businesses.website), updated_at=now()
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.upsert_osm_business(bigint,text,text,double precision,double precision,text,text,text) to service_role;

create or replace function public.upsert_cpz_zone(
  p_name text,
  p_geojson jsonb,
  p_hours jsonb default '{}'::jsonb,
  p_event_day_hours jsonb default '{}'::jsonb,
  p_source text default 'Newham Council ArcGIS CPZ'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.cpz_zones(name,geom,hours,event_day_hours,source,last_verified_at)
  values(p_name,st_multi(st_setsrid(st_geomfromgeojson(p_geojson::text),4326))::geometry(MultiPolygon,4326),coalesce(p_hours,'{}'::jsonb),coalesce(p_event_day_hours,'{}'::jsonb),p_source,now())
  on conflict(name) do update set geom=excluded.geom,hours=excluded.hours,event_day_hours=excluded.event_day_hours,source=excluded.source,last_verified_at=now()
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.upsert_cpz_zone(text,jsonb,jsonb,jsonb,text) to service_role;

-- ---------- GDPR RPCs ----------
create or replace function public.export_my_data() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  return jsonb_build_object(
    'profile',(select to_jsonb(p) from public.profiles p where p.id=uid),
    'saved_places',coalesce((select jsonb_agg(to_jsonb(s)) from public.saved_places s where s.user_id=uid),'[]'::jsonb),
    'posts',coalesce((select jsonb_agg(to_jsonb(p)) from public.posts p where p.author_id=uid),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(to_jsonb(r)) from public.reports r where r.reporter_id=uid),'[]'::jsonb),
    'exported_at',now()
  );
end $$;

grant execute on function public.export_my_data() to authenticated;

create or replace function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.posts set author_id=null where author_id=uid;
  update public.reports set reporter_id=null where reporter_id=uid;
  delete from public.saved_places where user_id=uid;
  delete from public.profiles where id=uid;
  delete from auth.users where id=uid;
end $$;

grant execute on function public.delete_my_account() to authenticated;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.posts enable row level security;
alter table public.cpz_zones enable row level security;
alter table public.paid_bays enable row level security;
alter table public.blue_badge_bays enable row level security;
alter table public.saved_places enable row level security;
alter table public.reports enable row level security;
alter table public.verification_events enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists public_read_verified_businesses on public.businesses;
create policy public_read_verified_businesses on public.businesses for select using (verification_status = 'verified');
drop policy if exists owners_read_own_businesses on public.businesses;
create policy owners_read_own_businesses on public.businesses for select using (claimed_by = auth.uid());
drop policy if exists owners_update_own_businesses on public.businesses;
create policy owners_update_own_businesses on public.businesses for update using (claimed_by = auth.uid()) with check (claimed_by = auth.uid());

drop policy if exists public_read_live_posts on public.posts;
create policy public_read_live_posts on public.posts for select using (status='live' and expires_at > now());
drop policy if exists verified_business_insert_posts on public.posts;
create policy verified_business_insert_posts on public.posts for insert with check (
  auth.uid() = author_id and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('business','charity','admin'))
  and (business_id is null or exists (select 1 from public.businesses b where b.id=business_id and b.claimed_by=auth.uid() and b.verification_status='verified'))
);
drop policy if exists owners_update_own_posts on public.posts;
create policy owners_update_own_posts on public.posts for update using (author_id = auth.uid());

drop policy if exists public_read_cpz on public.cpz_zones;
create policy public_read_cpz on public.cpz_zones for select using (true);
drop policy if exists public_read_paid_bays on public.paid_bays;
create policy public_read_paid_bays on public.paid_bays for select using (true);
drop policy if exists public_read_verified_blue_badge on public.blue_badge_bays;
create policy public_read_verified_blue_badge on public.blue_badge_bays for select using (confidence in ('official','verified'));

drop policy if exists users_manage_saved_places on public.saved_places;
create policy users_manage_saved_places on public.saved_places for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists anyone_insert_reports on public.reports;
create policy anyone_insert_reports on public.reports for insert with check (true);

notify pgrst, 'reload schema';
