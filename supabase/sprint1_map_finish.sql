-- Sprint 1: map finish
-- Run after supabase/schema_v1.sql and supabase/phase1_admin.sql.
-- This migration intentionally contains no fake/sample data.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ---------- Newham boundary ----------
create table if not exists public.boundaries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  geom geometry(MultiPolygon,4326) not null,
  source text not null default 'ONS Open Geography / London borough boundary',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists boundaries_geom_idx on public.boundaries using gist(geom);

alter table public.boundaries enable row level security;
drop policy if exists public_read_boundaries on public.boundaries;
create policy public_read_boundaries on public.boundaries for select using (true);

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='businesses_backup') then
    execute 'create table public.businesses_backup as table public.businesses with data';
  end if;
end $$;

-- Run this manually after the Newham boundary has been inserted.
create or replace function public.filter_businesses_to_newham() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  if not exists (select 1 from public.boundaries where name='Newham') then
    raise exception 'Newham boundary missing. Run seed:newham-boundary first.';
  end if;

  delete from public.businesses b
  where not st_contains((select geom from public.boundaries where name='Newham'), b.geom);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end $$;

grant execute on function public.filter_businesses_to_newham() to service_role;

-- One full GeoJSON FeatureCollection for clustered map rendering.
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
          'has_offer', exists (
            select 1 from public.posts p
            where p.business_id = b.id and p.status='live' and p.expires_at > now() and p.type='offer'
          )
        ),
        'geometry', st_asgeojson(b.geom)::jsonb
      )
    ), '[]'::jsonb)
  )
  from public.businesses b
  where b.verification_status='verified'
    and (
      not exists (select 1 from public.boundaries where name='Newham')
      or st_contains((select geom from public.boundaries where name='Newham'), b.geom)
    );
$$;

grant execute on function public.businesses_geojson() to anon, authenticated;

create or replace function public.newham_boundary_geojson() returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
      'type','FeatureCollection',
      'features', jsonb_build_array(jsonb_build_object(
        'type','Feature',
        'id', id,
        'properties', jsonb_build_object('id', id, 'name', name, 'source', source),
        'geometry', st_asgeojson(geom)::jsonb
      ))
    ) from public.boundaries where name='Newham'),
    jsonb_build_object('type','FeatureCollection','features',jsonb_build_array())
  );
$$;

grant execute on function public.newham_boundary_geojson() to anon, authenticated;

-- ---------- Blue Badge parking only ----------
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
alter table public.blue_badge_bays add column if not exists is_published boolean default true;
alter table public.blue_badge_bays add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.blue_badge_bays add column if not exists created_at timestamptz default now();
alter table public.blue_badge_bays add column if not exists updated_at timestamptz default now();

update public.blue_badge_bays set source = coalesce(source, 'survey');

alter table public.blue_badge_bays alter column road_name set not null;
alter table public.blue_badge_bays alter column photo_url set not null;
alter table public.blue_badge_bays alter column source set default 'survey';
alter table public.blue_badge_bays alter column is_published set default true;

create index if not exists blue_badge_bays_geom_idx on public.blue_badge_bays using gist(geom);
create index if not exists blue_badge_bays_published_idx on public.blue_badge_bays(is_published,last_verified_at desc);

alter table public.blue_badge_bays enable row level security;

drop policy if exists public_read_verified_blue_badge on public.blue_badge_bays;
drop policy if exists public_read_published_blue_badge on public.blue_badge_bays;
create policy public_read_published_blue_badge on public.blue_badge_bays for select using (is_published = true);

drop policy if exists admin_insert_blue_badge_bays on public.blue_badge_bays;
create policy admin_insert_blue_badge_bays on public.blue_badge_bays for insert
with check (public.current_user_role() = 'admin');

drop policy if exists admin_update_blue_badge_bays on public.blue_badge_bays;
create policy admin_update_blue_badge_bays on public.blue_badge_bays for update
using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists admin_delete_blue_badge_bays on public.blue_badge_bays;
create policy admin_delete_blue_badge_bays on public.blue_badge_bays for delete
using (public.current_user_role() = 'admin');

create or replace view public.blue_badge_bays_public with (security_invoker=true) as
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

-- Storage bucket for required bay evidence photos.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('bay-photos', 'bay-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS for bay photos. Public read, admin writes only.
drop policy if exists public_read_bay_photos on storage.objects;
create policy public_read_bay_photos on storage.objects for select
using (bucket_id = 'bay-photos');

drop policy if exists admin_upload_bay_photos on storage.objects;
create policy admin_upload_bay_photos on storage.objects for insert
with check (bucket_id = 'bay-photos' and public.current_user_role() = 'admin');

drop policy if exists admin_update_bay_photos on storage.objects;
create policy admin_update_bay_photos on storage.objects for update
using (bucket_id = 'bay-photos' and public.current_user_role() = 'admin')
with check (bucket_id = 'bay-photos' and public.current_user_role() = 'admin');

drop policy if exists admin_delete_bay_photos on storage.objects;
create policy admin_delete_bay_photos on storage.objects for delete
using (bucket_id = 'bay-photos' and public.current_user_role() = 'admin');

notify pgrst, 'reload schema';
