-- HiStreets one-go current database repair/update bundle.
-- Run this once in Supabase SQL Editor before the one-go data script.
-- Keeps all real Newham businesses visible, keeps posting verified-only, and enables business detail + Overture enrichment.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- Rich business columns.
alter table public.businesses add column if not exists email text;
alter table public.businesses add column if not exists opening_hours text;
alter table public.businesses add column if not exists opening_hours_json jsonb default '{}'::jsonb;
alter table public.businesses add column if not exists cuisine text;
alter table public.businesses add column if not exists wheelchair text;
alter table public.businesses add column if not exists brand text;
alter table public.businesses add column if not exists operator text;
alter table public.businesses add column if not exists owner_edited_fields text[] not null default '{}';
alter table public.businesses add column if not exists verified_via text;
alter table public.businesses add column if not exists fsa_fhrsid text;
alter table public.businesses add column if not exists fsa_rating int;
alter table public.businesses add column if not exists fsa_rating_date date;
alter table public.businesses add column if not exists fsa_match_confidence numeric;
alter table public.businesses add column if not exists companies_house_number text;
alter table public.businesses add column if not exists incorporation_date date;
alter table public.businesses add column if not exists company_status text;
alter table public.businesses add column if not exists overture_id text;
alter table public.businesses add column if not exists overture_confidence numeric;
alter table public.businesses add column if not exists overture_match_score numeric;
alter table public.businesses add column if not exists overture_categories text[] default '{}';
alter table public.businesses add column if not exists data_sources text[] not null default array['osm'];

alter table public.businesses drop constraint if exists businesses_verification_status_check;
alter table public.businesses add constraint businesses_verification_status_check
check (verification_status in ('unclaimed','pending','verified','contested','revoked','rejected'));

-- Correct earlier mistake: imported OSM listings are not owner-verified.
update public.businesses
set verification_status = 'unclaimed',
    verified_at = null,
    verified_via = null,
    updated_at = now()
where source = 'osm'
  and claimed_by is null
  and verification_status = 'verified';

create index if not exists businesses_fsa_idx on public.businesses(fsa_fhrsid, fsa_rating);
create index if not exists businesses_claim_status_idx on public.businesses(claimed_by, verification_status);
create index if not exists businesses_overture_idx on public.businesses(overture_id, overture_match_score);

-- Claim table.
create table if not exists public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  method text not null check (method in ('phone_otp','domain_email','website_code','document')),
  status text not null default 'started' check (status in ('started','proof_sent','passed','failed','under_review','approved','rejected','revoked')),
  evidence_channel text,
  document_url text,
  ai_notes jsonb default '{}'::jsonb,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists business_claims_business_idx on public.business_claims(business_id, created_at desc);
create index if not exists business_claims_claimant_idx on public.business_claims(claimant_id, status, created_at desc);
create unique index if not exists one_open_claim_per_user_idx
on public.business_claims(claimant_id)
where status in ('started','proof_sent','under_review');

alter table public.business_claims enable row level security;
drop policy if exists claimants_read_own_claims on public.business_claims;
create policy claimants_read_own_claims on public.business_claims
for select using (claimant_id = auth.uid() or public.current_user_role() = 'admin');
drop policy if exists claimants_insert_own_claims on public.business_claims;
create policy claimants_insert_own_claims on public.business_claims
for insert with check (claimant_id = auth.uid());
drop policy if exists admins_update_claims on public.business_claims;
create policy admins_update_claims on public.business_claims
for update using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

alter table public.verification_events add column if not exists claim_id uuid references public.business_claims(id) on delete set null;
alter table public.verification_events add column if not exists domain text;
alter table public.verification_events add column if not exists ip text;
alter table public.verification_events add column if not exists user_agent text;

drop policy if exists admin_read_verification_events on public.verification_events;
create policy admin_read_verification_events on public.verification_events
for select using (public.current_user_role() = 'admin');

insert into storage.buckets(id, name, public)
values ('claim-documents', 'claim-documents', false)
on conflict (id) do update set public = false;

-- Public views: show real unclaimed businesses too.
drop view if exists public.businesses_public cascade;
create or replace view public.businesses_public with (security_invoker=true) as
select
  id, osm_id, name, category, description, address, phone, website, whatsapp,
  email, opening_hours, opening_hours_json, cuisine, wheelchair, brand, operator,
  verification_status, verified_at, verified_via, photo_url, source, lat, lng,
  fsa_fhrsid, fsa_rating, fsa_rating_date, fsa_match_confidence,
  companies_house_number, incorporation_date, company_status,
  overture_id, overture_confidence, overture_match_score, overture_categories,
  data_sources,
  (claimed_by is not null) as is_claimed
from public.businesses
where verification_status in ('unclaimed','pending','verified','contested');
grant select on public.businesses_public to anon, authenticated;

create or replace view public.business_claim_options_public with (security_invoker=true) as
select
  id,
  name,
  category,
  address,
  phone is not null and phone <> '' as can_phone_otp,
  website is not null and website <> '' as can_website_code,
  case
    when website is null or website = '' then null
    else regexp_replace(regexp_replace(lower(website), '^https?://', ''), '^www\\.', '')
  end as website_domain,
  verification_status,
  claimed_by is not null as is_claimed
from public.businesses
where verification_status in ('unclaimed','verified','pending','contested');
grant select on public.business_claim_options_public to anon, authenticated;

create or replace function public.histreets_domain_from_url(p_url text)
returns text
language sql
immutable
as $$
  select nullif(split_part(regexp_replace(regexp_replace(lower(coalesce(p_url,'')), '^https?://', ''), '^www\\.', ''), '/', 1), '')
$$;

create or replace function public.mask_phone_last4(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(p_phone,''), '\\D', '', 'g') = '' then null
    else right(regexp_replace(coalesce(p_phone,''), '\\D', '', 'g'), 4)
  end
$$;

-- Map must show all real Newham businesses; offers are attached separately.
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
          'has_offer', exists (
            select 1 from public.posts p
            where p.business_id = b.id
              and p.status='live'
              and p.expires_at > now()
              and p.type='offer'
          )
        ),
        'geometry', st_asgeojson(b.geom)::jsonb
      )
    ), '[]'::jsonb)
  )
  from public.businesses b
  where b.verification_status in ('unclaimed','pending','verified','contested')
    and (
      not exists (select 1 from public.boundaries where name='Newham')
      or st_contains((select geom from public.boundaries where name='Newham'), b.geom)
    );
$$;
grant execute on function public.businesses_geojson() to anon, authenticated;

-- Business detail from base table, not fragile view.
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
      b.overture_id, b.overture_confidence, b.overture_match_score,
      b.overture_categories, b.data_sources,
      (b.claimed_by is not null) as is_claimed
    from public.businesses b
    where b.id = p_business_id
      and b.verification_status in ('unclaimed','pending','verified','contested')
      and (
        not exists (select 1 from public.boundaries where name='Newham')
        or st_contains((select geom from public.boundaries where name='Newham'), b.geom)
      )
    limit 1
  ) row;
$$;
grant execute on function public.business_detail(uuid) to anon, authenticated;

-- Rich OSM import: never auto-verifies OSM rows.
create or replace function public.upsert_osm_business_rich(
  p_osm_id bigint,
  p_name text,
  p_category text,
  p_lat double precision,
  p_lng double precision,
  p_address text default null,
  p_phone text default null,
  p_website text default null,
  p_email text default null,
  p_opening_hours text default null,
  p_cuisine text default null,
  p_wheelchair text default null,
  p_brand text default null,
  p_operator text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.businesses(
    osm_id, name, category, geom, address, phone, website, email, opening_hours,
    cuisine, wheelchair, brand, operator, verification_status, source, data_sources
  ) values (
    p_osm_id, trim(p_name), coalesce(nullif(trim(p_category),''),'other'),
    st_setsrid(st_makepoint(p_lng,p_lat),4326),
    nullif(trim(coalesce(p_address,'')),''),
    nullif(trim(coalesce(p_phone,'')),''),
    nullif(trim(coalesce(p_website,'')),''),
    nullif(trim(coalesce(p_email,'')),''),
    nullif(trim(coalesce(p_opening_hours,'')),''),
    nullif(trim(coalesce(p_cuisine,'')),''),
    nullif(trim(coalesce(p_wheelchair,'')),''),
    nullif(trim(coalesce(p_brand,'')),''),
    nullif(trim(coalesce(p_operator,'')),''),
    'unclaimed', 'osm', array['osm']
  )
  on conflict(osm_id) do update set
    name = case when 'name' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.name else excluded.name end,
    category = case when 'category' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.category else excluded.category end,
    geom = excluded.geom,
    address = case when 'address' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.address else coalesce(excluded.address, public.businesses.address) end,
    phone = case when 'phone' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.phone else coalesce(excluded.phone, public.businesses.phone) end,
    website = case when 'website' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.website else coalesce(excluded.website, public.businesses.website) end,
    email = case when 'email' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.email else coalesce(excluded.email, public.businesses.email) end,
    opening_hours = case when 'opening_hours' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.opening_hours else coalesce(excluded.opening_hours, public.businesses.opening_hours) end,
    cuisine = case when 'cuisine' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.cuisine else coalesce(excluded.cuisine, public.businesses.cuisine) end,
    wheelchair = case when 'wheelchair' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.wheelchair else coalesce(excluded.wheelchair, public.businesses.wheelchair) end,
    brand = case when 'brand' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.brand else coalesce(excluded.brand, public.businesses.brand) end,
    operator = case when 'operator' = any(coalesce(public.businesses.owner_edited_fields,'{}'::text[])) then public.businesses.operator else coalesce(excluded.operator, public.businesses.operator) end,
    verification_status = case when public.businesses.claimed_by is null and public.businesses.verification_status = 'verified' then 'unclaimed' else public.businesses.verification_status end,
    source = case when public.businesses.source = 'owner' then public.businesses.source else 'osm' end,
    data_sources = array(select distinct unnest(coalesce(public.businesses.data_sources,'{}'::text[]) || array['osm'])),
    updated_at = now()
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.upsert_osm_business_rich(bigint,text,text,double precision,double precision,text,text,text,text,text,text,text,text,text) to service_role;

-- Overture staging/enrichment.
create table if not exists public.overture_places_staging (
  id text primary key,
  name text not null,
  category text,
  categories text[] default '{}',
  confidence numeric,
  geom geometry(Point,4326) not null,
  lat double precision generated always as (st_y(geom)) stored,
  lng double precision generated always as (st_x(geom)) stored,
  address text,
  postcode text,
  phone text,
  website text,
  email text,
  brand text,
  raw jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now()
);
create index if not exists overture_places_geom_idx on public.overture_places_staging using gist(geom);
create index if not exists overture_places_name_idx on public.overture_places_staging using gin(to_tsvector('simple', name));

create or replace function public.upsert_overture_place(
  p_id text,
  p_name text,
  p_category text,
  p_categories text[],
  p_confidence numeric,
  p_lat double precision,
  p_lng double precision,
  p_address text,
  p_postcode text,
  p_phone text,
  p_website text,
  p_email text,
  p_brand text,
  p_raw jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(coalesce(p_id,'')),'') is null then raise exception 'overture id required'; end if;
  if nullif(trim(coalesce(p_name,'')),'') is null then return; end if;
  insert into public.overture_places_staging(id,name,category,categories,confidence,geom,address,postcode,phone,website,email,brand,raw,imported_at)
  values(
    p_id, trim(p_name), nullif(trim(coalesce(p_category,'')),''), coalesce(p_categories,'{}'::text[]), p_confidence,
    st_setsrid(st_makepoint(p_lng,p_lat),4326), nullif(trim(coalesce(p_address,'')),''), upper(nullif(trim(coalesce(p_postcode,'')),'')),
    nullif(trim(coalesce(p_phone,'')),''), nullif(trim(coalesce(p_website,'')),''), nullif(trim(coalesce(p_email,'')),''), nullif(trim(coalesce(p_brand,'')),''), coalesce(p_raw,'{}'::jsonb), now()
  )
  on conflict(id) do update set
    name=excluded.name, category=excluded.category, categories=excluded.categories, confidence=excluded.confidence, geom=excluded.geom,
    address=excluded.address, postcode=excluded.postcode, phone=excluded.phone, website=excluded.website, email=excluded.email, brand=excluded.brand, raw=excluded.raw, imported_at=now();
end $$;
grant execute on function public.upsert_overture_place(text,text,text,text[],numeric,double precision,double precision,text,text,text,text,text,text,jsonb) to service_role;

create or replace function public.enrich_business_from_overture(
  p_business_id uuid,
  p_overture_id text,
  p_match_score numeric
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_place public.overture_places_staging%rowtype;
  v_business public.businesses%rowtype;
begin
  if p_match_score < 0.82 then return false; end if;
  select * into v_place from public.overture_places_staging where id = p_overture_id;
  if not found then return false; end if;
  select * into v_business from public.businesses where id = p_business_id;
  if not found then return false; end if;
  if v_business.claimed_by is not null or v_business.source = 'owner' then return false; end if;

  update public.businesses b
  set
    address = case when 'address' = any(coalesce(b.owner_edited_fields,'{}'::text[])) then b.address else coalesce(b.address, v_place.address) end,
    phone = case when 'phone' = any(coalesce(b.owner_edited_fields,'{}'::text[])) then b.phone else coalesce(b.phone, v_place.phone) end,
    website = case when 'website' = any(coalesce(b.owner_edited_fields,'{}'::text[])) then b.website else coalesce(b.website, v_place.website) end,
    email = case when 'email' = any(coalesce(b.owner_edited_fields,'{}'::text[])) then b.email else coalesce(b.email, v_place.email) end,
    brand = case when 'brand' = any(coalesce(b.owner_edited_fields,'{}'::text[])) then b.brand else coalesce(b.brand, v_place.brand) end,
    overture_id = v_place.id,
    overture_confidence = v_place.confidence,
    overture_match_score = p_match_score,
    overture_categories = v_place.categories,
    data_sources = array(select distinct unnest(coalesce(b.data_sources,'{}'::text[]) || array['overture'])),
    updated_at = now()
  where b.id = p_business_id;
  return true;
end $$;
grant execute on function public.enrich_business_from_overture(uuid,text,numeric) to service_role;

-- Claim functions.
create or replace function public.start_business_claim(p_business_id uuid, p_method text) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business public.businesses%rowtype;
  v_claim_id uuid;
  v_domain text;
  v_last4 text;
  v_recent_attempts int;
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  if p_method not in ('phone_otp','domain_email','website_code','document') then raise exception 'invalid claim method'; end if;
  select * into v_business from public.businesses where id = p_business_id;
  if not found then raise exception 'business not found'; end if;
  select count(*) into v_recent_attempts from public.business_claims where business_id = p_business_id and created_at > now() - interval '7 days';
  if v_recent_attempts >= 3 then raise exception 'too many recent claim attempts for this business'; end if;
  if exists (select 1 from public.business_claims where claimant_id = v_uid and status in ('started','proof_sent','under_review')) then raise exception 'you already have a pending claim'; end if;
  if v_business.verification_status = 'verified' and v_business.claimed_by is not null and v_business.claimed_by is distinct from v_uid then
    update public.businesses set verification_status = 'contested', updated_at = now() where id = p_business_id;
  end if;
  if p_method = 'phone_otp' then
    if nullif(trim(coalesce(v_business.phone,'')),'') is null then raise exception 'this listing has no pre-existing phone number for OTP'; end if;
    v_last4 := public.mask_phone_last4(v_business.phone);
    insert into public.business_claims(business_id, claimant_id, method, status, evidence_channel)
    values (p_business_id, v_uid, 'phone_otp', 'proof_sent', concat('phone_last4:', v_last4)) returning id into v_claim_id;
    insert into public.verification_events(business_id, claim_id, method, phone_last4, outcome, created_at)
    values (p_business_id, v_claim_id, 'phone_otp', v_last4, 'otp_requested_not_sent_until_provider_configured', now());
    return v_claim_id;
  end if;
  if p_method = 'domain_email' then
    v_domain := public.histreets_domain_from_url(v_business.website);
    if v_domain is null then raise exception 'this listing has no pre-existing website domain'; end if;
    if v_domain ~ '(gmail|googlemail|outlook|hotmail|yahoo|icloud|aol|live)\\.' then raise exception 'public email domains cannot verify a business'; end if;
    insert into public.business_claims(business_id, claimant_id, method, status, evidence_channel)
    values (p_business_id, v_uid, 'domain_email', 'started', concat('domain:', v_domain)) returning id into v_claim_id;
    insert into public.verification_events(business_id, claim_id, method, domain, outcome, created_at)
    values (p_business_id, v_claim_id, 'domain_email', v_domain, 'domain_claim_started', now());
    return v_claim_id;
  end if;
  if p_method = 'website_code' then
    v_domain := public.histreets_domain_from_url(v_business.website);
    if v_domain is null then raise exception 'this listing has no pre-existing website domain'; end if;
    insert into public.business_claims(business_id, claimant_id, method, status, evidence_channel)
    values (p_business_id, v_uid, 'website_code', 'started', concat('domain:', v_domain)) returning id into v_claim_id;
    insert into public.verification_events(business_id, claim_id, method, domain, outcome, created_at)
    values (p_business_id, v_claim_id, 'website_code', v_domain, 'website_code_claim_started', now());
    return v_claim_id;
  end if;
  insert into public.business_claims(business_id, claimant_id, method, status, evidence_channel)
  values (p_business_id, v_uid, 'document', 'started', 'document') returning id into v_claim_id;
  insert into public.verification_events(business_id, claim_id, method, outcome, created_at)
  values (p_business_id, v_claim_id, 'document', 'document_claim_started', now());
  return v_claim_id;
end $$;
grant execute on function public.start_business_claim(uuid,text) to authenticated;

create or replace function public.attach_claim_document(p_claim_id uuid, p_document_url text) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_claim public.business_claims%rowtype;
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  select * into v_claim from public.business_claims where id = p_claim_id and claimant_id = v_uid;
  if not found then raise exception 'claim not found'; end if;
  if v_claim.method <> 'document' then raise exception 'document can only be attached to document claims'; end if;
  if v_claim.status not in ('started','proof_sent') then raise exception 'claim is not editable'; end if;
  update public.business_claims set document_url = p_document_url, status = 'under_review' where id = p_claim_id;
  insert into public.verification_events(business_id, claim_id, method, outcome, created_at)
  values (v_claim.business_id, v_claim.id, 'document', 'document_uploaded_under_review', now());
end $$;
grant execute on function public.attach_claim_document(uuid,text) to authenticated;

create or replace function public.admin_decide_business_claim(p_claim_id uuid, p_approved boolean, p_reason text default null) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_claim public.business_claims%rowtype;
begin
  if public.current_user_role() <> 'admin' then raise exception 'admin only'; end if;
  select * into v_claim from public.business_claims where id = p_claim_id;
  if not found then raise exception 'claim not found'; end if;
  update public.business_claims
  set status = case when p_approved then 'approved' else 'rejected' end,
      decided_by = v_admin,
      decided_at = now(),
      ai_notes = coalesce(ai_notes, '{}'::jsonb) || jsonb_build_object('admin_reason', coalesce(p_reason,''))
  where id = p_claim_id;
  if p_approved then
    update public.businesses
    set claimed_by = v_claim.claimant_id,
        verification_status = 'verified',
        verified_via = v_claim.method,
        verified_at = now(),
        updated_at = now()
    where id = v_claim.business_id;
  end if;
  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values (v_admin, case when p_approved then 'approve_business_claim' else 'reject_business_claim' end, 'business_claim', p_claim_id, jsonb_build_object('reason', coalesce(p_reason,'')));
end $$;
grant execute on function public.admin_decide_business_claim(uuid,boolean,text) to authenticated;

notify pgrst, 'reload schema';
