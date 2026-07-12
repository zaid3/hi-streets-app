-- Sprint 8: Export exact HiStreets business list for manual/Claude research
-- Purpose: Give researchers exact business_id/name/address/category so enrichment matches our records.

create or replace function public.business_research_export()
returns table (
  business_id uuid,
  business_name text,
  address text,
  postcode text,
  category text,
  source text,
  lat double precision,
  lng double precision,
  has_phone boolean,
  has_website boolean,
  has_opening_hours boolean,
  has_email boolean,
  data_score integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id as business_id,
    b.name as business_name,
    coalesce(b.address, '') as address,
    coalesce((regexp_match(coalesce(b.address, ''), '([A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2})'))[1], '') as postcode,
    coalesce(b.category, '') as category,
    coalesce(b.source, '') as source,
    b.lat,
    b.lng,
    coalesce(nullif(trim(b.phone), ''), '') <> '' as has_phone,
    coalesce(nullif(trim(b.website), ''), '') <> '' as has_website,
    coalesce(nullif(trim(b.opening_hours), ''), '') <> '' as has_opening_hours,
    coalesce(nullif(trim(b.email), ''), '') <> '' as has_email,
    (
      case when coalesce(nullif(trim(b.address), ''), '') <> '' then 1 else 0 end +
      case when coalesce(nullif(trim(b.phone), ''), '') <> '' then 3 else 0 end +
      case when coalesce(nullif(trim(b.website), ''), '') <> '' then 2 else 0 end +
      case when coalesce(nullif(trim(b.opening_hours), ''), '') <> '' then 3 else 0 end +
      case when coalesce(nullif(trim(b.email), ''), '') <> '' then 1 else 0 end
    ) as data_score
  from public.businesses b
  where b.verification_status in ('unclaimed','pending','verified','contested')
    and (
      not exists (select 1 from public.boundaries where name='Newham')
      or st_contains((select geom from public.boundaries where name='Newham'), b.geom)
    )
  order by data_score asc, b.name asc;
$$;

grant execute on function public.business_research_export() to authenticated;

notify pgrst, 'reload schema';
