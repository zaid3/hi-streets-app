-- Sprint 4: Overture Places enrichment foundation.
-- Purpose: improve missing business details using legal/open Overture Places data.
-- Rules:
-- - OSM remains the base business listing source.
-- - Overture can fill missing fields only when match confidence is high.
-- - Never mark an imported/enriched listing as verified.
-- - Never overwrite owner-edited fields.

create extension if not exists pgcrypto;
create extension if not exists postgis;

alter table public.businesses add column if not exists overture_id text;
alter table public.businesses add column if not exists overture_match_confidence numeric;
alter table public.businesses add column if not exists overture_updated_at timestamptz;
alter table public.businesses add column if not exists data_sources jsonb not null default '{}'::jsonb;

create table if not exists public.overture_places (
  id text primary key,
  name text not null,
  category text,
  confidence numeric,
  address text,
  phone text,
  website text,
  email text,
  brand text,
  geom geometry(Point,4326) not null,
  lat double precision generated always as (st_y(geom)) stored,
  lng double precision generated always as (st_x(geom)) stored,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists overture_places_geom_idx on public.overture_places using gist(geom);
create index if not exists overture_places_confidence_idx on public.overture_places(confidence desc);

alter table public.overture_places enable row level security;
drop policy if exists admin_read_overture_places on public.overture_places;
create policy admin_read_overture_places on public.overture_places
for select using (public.current_user_role() = 'admin');

create or replace function public.upsert_overture_place(
  p_id text,
  p_name text,
  p_category text,
  p_confidence numeric,
  p_lat double precision,
  p_lng double precision,
  p_address text default null,
  p_phone text default null,
  p_website text default null,
  p_email text default null,
  p_brand text default null,
  p_raw jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_geom geometry(Point,4326) := st_setsrid(st_makepoint(p_lng, p_lat), 4326);
begin
  if nullif(trim(coalesce(p_id,'')),'') is null then raise exception 'Overture id required'; end if;
  if nullif(trim(coalesce(p_name,'')),'') is null then raise exception 'Overture name required'; end if;

  if exists (select 1 from public.boundaries where name='Newham')
     and not st_contains((select geom from public.boundaries where name='Newham'), v_geom) then
    return;
  end if;

  insert into public.overture_places(id,name,category,confidence,geom,address,phone,website,email,brand,raw,updated_at)
  values (
    p_id,
    trim(p_name),
    nullif(trim(coalesce(p_category,'')),''),
    p_confidence,
    v_geom,
    nullif(trim(coalesce(p_address,'')),''),
    nullif(trim(coalesce(p_phone,'')),''),
    nullif(trim(coalesce(p_website,'')),''),
    nullif(trim(coalesce(p_email,'')),''),
    nullif(trim(coalesce(p_brand,'')),''),
    coalesce(p_raw,'{}'::jsonb),
    now()
  )
  on conflict(id) do update set
    name = excluded.name,
    category = excluded.category,
    confidence = excluded.confidence,
    geom = excluded.geom,
    address = excluded.address,
    phone = excluded.phone,
    website = excluded.website,
    email = excluded.email,
    brand = excluded.brand,
    raw = excluded.raw,
    updated_at = now();
end $$;

grant execute on function public.upsert_overture_place(text,text,text,numeric,double precision,double precision,text,text,text,text,text,jsonb) to service_role;

create or replace function public.apply_overture_business_enrichment(
  p_business_id uuid,
  p_overture_id text,
  p_match_confidence numeric,
  p_address text default null,
  p_phone text default null,
  p_website text default null,
  p_email text default null,
  p_brand text default null,
  p_category text default null,
  p_raw jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fields text[];
begin
  if p_match_confidence < 0.78 then
    raise exception 'match confidence too low';
  end if;

  select coalesce(owner_edited_fields, '{}'::text[]) into v_fields
  from public.businesses
  where id = p_business_id;

  if not found then raise exception 'business not found'; end if;

  update public.businesses
  set
    address = case
      when 'address' = any(v_fields) then address
      when nullif(trim(coalesce(address,'')),'') is null then nullif(trim(coalesce(p_address,'')),'')
      else address
    end,
    phone = case
      when 'phone' = any(v_fields) then phone
      when nullif(trim(coalesce(phone,'')),'') is null then nullif(trim(coalesce(p_phone,'')),'')
      else phone
    end,
    website = case
      when 'website' = any(v_fields) then website
      when nullif(trim(coalesce(website,'')),'') is null then nullif(trim(coalesce(p_website,'')),'')
      else website
    end,
    email = case
      when 'email' = any(v_fields) then email
      when nullif(trim(coalesce(email,'')),'') is null then nullif(trim(coalesce(p_email,'')),'')
      else email
    end,
    brand = case
      when 'brand' = any(v_fields) then brand
      when nullif(trim(coalesce(brand,'')),'') is null then nullif(trim(coalesce(p_brand,'')),'')
      else brand
    end,
    category = case
      when 'category' = any(v_fields) then category
      when category is null or category = '' or category = 'other' then coalesce(nullif(trim(coalesce(p_category,'')),''), category)
      else category
    end,
    overture_id = p_overture_id,
    overture_match_confidence = p_match_confidence,
    overture_updated_at = now(),
    data_sources = coalesce(data_sources, '{}'::jsonb) || jsonb_build_object(
      'overture', jsonb_build_object(
        'id', p_overture_id,
        'match_confidence', p_match_confidence,
        'updated_at', now(),
        'raw_sample', coalesce(p_raw,'{}'::jsonb)
      )
    ),
    updated_at = now()
  where id = p_business_id
    and verification_status in ('unclaimed','pending','verified','contested')
    and (claimed_by is null or verification_status <> 'verified');
end $$;

grant execute on function public.apply_overture_business_enrichment(uuid,text,numeric,text,text,text,text,text,text,jsonb) to service_role;

notify pgrst, 'reload schema';
