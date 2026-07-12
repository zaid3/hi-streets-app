-- Sprint 3 correction: imported OSM listings are not owner-verified businesses.
-- Keep real claimed/verified rows verified. Reset only unclaimed imported OSM rows.

update public.businesses
set verification_status = 'unclaimed',
    verified_at = null,
    verified_via = null,
    updated_at = now()
where source = 'osm'
  and claimed_by is null
  and verification_status = 'verified';

-- Harden the old legacy importer too, in case it is accidentally called again.
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
  values(p_osm_id,p_name,coalesce(p_category,'other'),st_setsrid(st_makepoint(p_lng,p_lat),4326),p_address,p_phone,p_website,'unclaimed','osm')
  on conflict(osm_id) do update set
    name=excluded.name,
    category=excluded.category,
    geom=excluded.geom,
    address=coalesce(excluded.address,public.businesses.address),
    phone=coalesce(excluded.phone,public.businesses.phone),
    website=coalesce(excluded.website,public.businesses.website),
    verification_status = case
      when public.businesses.claimed_by is not null and public.businesses.verification_status = 'verified' then 'verified'
      when public.businesses.verification_status in ('pending','contested','revoked','rejected') then public.businesses.verification_status
      else 'unclaimed'
    end,
    updated_at=now()
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.upsert_osm_business(bigint,text,text,double precision,double precision,text,text,text) to service_role;

notify pgrst, 'reload schema';
