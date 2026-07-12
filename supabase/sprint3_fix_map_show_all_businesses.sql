-- Sprint 3 fix: the map must show all real Newham businesses, not only verified/claimed ones.
-- Verification controls posting rights only. It must not hide unclaimed imported businesses from the map.

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

notify pgrst, 'reload schema';
