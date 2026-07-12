-- Sprint 6: expose safe contact completeness fields to the public map GeoJSON.
-- This does not change posting rules. It only helps the UI prioritise listings
-- that already have phone, website or opening-hours data.

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
          'has_phone', coalesce(nullif(trim(b.phone), ''), '') <> '',
          'has_website', coalesce(nullif(trim(b.website), ''), '') <> '',
          'has_opening_hours', coalesce(nullif(trim(b.opening_hours), ''), '') <> '',
          'has_address', coalesce(nullif(trim(b.address), ''), '') <> '',
          'data_score',
            (case when coalesce(nullif(trim(b.address), ''), '') <> '' then 1 else 0 end) +
            (case when coalesce(nullif(trim(b.phone), ''), '') <> '' then 3 else 0 end) +
            (case when coalesce(nullif(trim(b.website), ''), '') <> '' then 2 else 0 end) +
            (case when coalesce(nullif(trim(b.opening_hours), ''), '') <> '' then 3 else 0 end),
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
  where b.verification_status in ('unclaimed','pending','verified','contested')
    and (
      not exists (select 1 from public.boundaries where name='Newham')
      or st_contains((select geom from public.boundaries where name='Newham'), b.geom)
    );
$$;

grant execute on function public.businesses_geojson() to anon, authenticated;

notify pgrst, 'reload schema';
