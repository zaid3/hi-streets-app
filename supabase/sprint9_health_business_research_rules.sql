-- HiStreets Sprint 9 — Health-business research rules
-- Purpose: keep HiStreets focused on local/private/NHS-contracted high-street services,
-- not major public hospitals or emergency hospital departments.
--
-- Include examples: pharmacy, dentist, optician, GP practice, medical centre, private clinic,
-- physiotherapy, therapy, hearing clinic, aesthetic clinic, care clinic.
-- Exclude examples: large NHS hospitals, A&E, emergency departments, NHS Trust hospital sites.

create or replace function public.is_histreets_research_business(
  p_name text,
  p_category text
) returns boolean
language sql
immutable
as $$
  select case
    when lower(coalesce(p_name, '') || ' ' || coalesce(p_category, '')) ~ '(hospital|a&e|accident.?and.?emergency|emergency department|nhs trust|university hospital|general hospital|hospital department)'
      and lower(coalesce(p_name, '') || ' ' || coalesce(p_category, '')) !~ '(pharmacy|chemist|dentist|dental|optician|optical|clinic|gp|general practice|medical centre|medical center|practice|physio|physiotherapy|therapy|hearing|aesthetic|private|care)'
      then false
    else true
  end;
$$;

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
    and public.is_histreets_research_business(b.name, b.category)
    and (
      not exists (select 1 from public.boundaries where name='Newham')
      or st_contains((select geom from public.boundaries where name='Newham'), b.geom)
    )
  order by data_score asc, b.name asc;
$$;

create or replace function public.business_research_export_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.businesses b
  where b.verification_status in ('unclaimed','pending','verified','contested')
    and public.is_histreets_research_business(b.name, b.category)
    and (
      not exists (select 1 from public.boundaries where name='Newham')
      or st_contains((select geom from public.boundaries where name='Newham'), b.geom)
    );
$$;

create or replace function public.business_research_export_csv()
returns text
language sql
stable
security definer
set search_path = public
as $$
  with rows as (
    select
      b.id::text as business_id,
      coalesce(b.name, '') as business_name,
      coalesce(b.address, '') as address,
      coalesce((regexp_match(coalesce(b.address, ''), '([A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2})'))[1], '') as postcode,
      coalesce(b.category, '') as category,
      coalesce(b.source, '') as source,
      coalesce(b.lat::text, '') as lat,
      coalesce(b.lng::text, '') as lng,
      case when coalesce(nullif(trim(b.phone), ''), '') <> '' then 'true' else 'false' end as has_phone,
      case when coalesce(nullif(trim(b.website), ''), '') <> '' then 'true' else 'false' end as has_website,
      case when coalesce(nullif(trim(b.opening_hours), ''), '') <> '' then 'true' else 'false' end as has_opening_hours,
      case when coalesce(nullif(trim(b.email), ''), '') <> '' then 'true' else 'false' end as has_email,
      (
        case when coalesce(nullif(trim(b.address), ''), '') <> '' then 1 else 0 end +
        case when coalesce(nullif(trim(b.phone), ''), '') <> '' then 3 else 0 end +
        case when coalesce(nullif(trim(b.website), ''), '') <> '' then 2 else 0 end +
        case when coalesce(nullif(trim(b.opening_hours), ''), '') <> '' then 3 else 0 end +
        case when coalesce(nullif(trim(b.email), ''), '') <> '' then 1 else 0 end
      ) as data_score
    from public.businesses b
    where b.verification_status in ('unclaimed','pending','verified','contested')
      and public.is_histreets_research_business(b.name, b.category)
      and (
        not exists (select 1 from public.boundaries where name='Newham')
        or st_contains((select geom from public.boundaries where name='Newham'), b.geom)
      )
  ), csv_rows as (
    select
      data_score,
      business_name,
      '"' || replace(business_id, '"', '""') || '",' ||
      '"' || replace(business_name, '"', '""') || '",' ||
      '"' || replace(address, '"', '""') || '",' ||
      '"' || replace(postcode, '"', '""') || '",' ||
      '"' || replace(category, '"', '""') || '",' ||
      '"' || replace(source, '"', '""') || '",' ||
      '"' || replace(lat, '"', '""') || '",' ||
      '"' || replace(lng, '"', '""') || '",' ||
      '"' || replace(has_phone, '"', '""') || '",' ||
      '"' || replace(has_website, '"', '""') || '",' ||
      '"' || replace(has_opening_hours, '"', '""') || '",' ||
      '"' || replace(has_email, '"', '""') || '",' ||
      '"' || replace(data_score::text, '"', '""') || '"' as line
    from rows
  )
  select
    'business_id,business_name,address,postcode,category,source,lat,lng,has_phone,has_website,has_opening_hours,has_email,data_score' || E'\n' ||
    coalesce(string_agg(line, E'\n' order by data_score asc, business_name asc), '')
  from csv_rows;
$$;

grant execute on function public.is_histreets_research_business(text,text) to authenticated;
grant execute on function public.business_research_export() to authenticated;
grant execute on function public.business_research_export_count() to authenticated;
grant execute on function public.business_research_export_csv() to authenticated;

notify pgrst, 'reload schema';
