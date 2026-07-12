-- Sprint 3 helper: rich OSM upsert RPC.
-- Run after supabase/sprint3_claims_rich_business.sql.

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
    osm_id,
    name,
    category,
    geom,
    address,
    phone,
    website,
    email,
    opening_hours,
    cuisine,
    wheelchair,
    brand,
    operator,
    verification_status,
    source
  ) values (
    p_osm_id,
    trim(p_name),
    coalesce(nullif(trim(p_category),''),'other'),
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
    'verified',
    'osm'
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
    source = case when public.businesses.source = 'owner' then public.businesses.source else 'osm' end,
    updated_at = now()
  returning id into v_id;

  return v_id;
end $$;

grant execute on function public.upsert_osm_business_rich(bigint,text,text,double precision,double precision,text,text,text,text,text,text,text,text,text) to service_role;

notify pgrst, 'reload schema';
