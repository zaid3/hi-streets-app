-- HiStreets Newham boundary support.
-- Run after the marketplace/schema setup and before FINAL_RUN_THIS_duplicate_guard.sql.
-- Then run `npm run seed:boundary` with the Supabase service-role key.

create extension if not exists postgis;

create table if not exists public.boundaries (
  name text primary key,
  geom geometry(MultiPolygon,4326) not null,
  source text,
  updated_at timestamptz not null default now()
);

alter table public.boundaries add column if not exists source text;
alter table public.boundaries add column if not exists updated_at timestamptz not null default now();
create unique index if not exists boundaries_name_idx on public.boundaries(name);
create index if not exists boundaries_geom_idx on public.boundaries using gist(geom);

alter table public.boundaries enable row level security;

-- Do not expose direct table access. The public app reads only the GeoJSON RPC.
revoke all on table public.boundaries from anon, authenticated;

create or replace function public.upsert_boundary(
  p_name text,
  p_geojson jsonb,
  p_source text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_geom geometry(MultiPolygon,4326);
begin
  if nullif(trim(coalesce(p_name,'')), '') is null then raise exception 'boundary name required'; end if;
  if p_geojson is null then raise exception 'boundary GeoJSON required'; end if;

  v_geom := st_multi(st_setsrid(st_geomfromgeojson(p_geojson::text),4326))::geometry(MultiPolygon,4326);
  if st_isempty(v_geom) or not st_isvalid(v_geom) then raise exception 'invalid boundary geometry'; end if;

  insert into public.boundaries(name, geom, source, updated_at)
  values(trim(p_name), v_geom, nullif(trim(coalesce(p_source,'')), ''), now())
  on conflict(name) do update
  set geom = excluded.geom,
      source = excluded.source,
      updated_at = now();
end;
$$;

revoke all on function public.upsert_boundary(text,jsonb,text) from public, anon, authenticated;
grant execute on function public.upsert_boundary(text,jsonb,text) to service_role;

create or replace function public.filter_businesses_to_newham() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boundary geometry(MultiPolygon,4326);
  v_deleted integer := 0;
begin
  select geom into v_boundary from public.boundaries where name = 'Newham' limit 1;
  if v_boundary is null then raise exception 'Newham boundary is not installed'; end if;

  -- Imported, unclaimed rows can be safely re-imported. Never delete claimed or
  -- owner/admin registrations here; public RPCs and registration validation still
  -- keep every visible row inside the installed boundary.
  delete from public.businesses
  where source = 'osm'
    and claimed_by is null
    and not st_covers(v_boundary, geom);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.filter_businesses_to_newham() from public, anon, authenticated;
grant execute on function public.filter_businesses_to_newham() to service_role;

create or replace function public.newham_boundary_geojson() returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'properties', jsonb_build_object('name', b.name, 'source', b.source),
        'geometry', st_asgeojson(b.geom)::jsonb
      )
    ), '[]'::jsonb)
  )
  from public.boundaries b
  where b.name = 'Newham';
$$;

grant execute on function public.newham_boundary_geojson() to anon, authenticated;

notify pgrst, 'reload schema';
