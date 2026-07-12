-- Sprint 3 fix: public business detail RPC for map sheet clicks.
-- Purpose: every real Newham business dot can open a detail sheet,
-- while posting remains restricted to verified claimed businesses only.

create or replace function public.business_detail(p_business_id uuid) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(row) from (
    select
      b.id,
      b.osm_id,
      b.name,
      b.category,
      b.description,
      b.address,
      b.phone,
      b.website,
      b.whatsapp,
      b.email,
      b.opening_hours,
      b.opening_hours_json,
      b.cuisine,
      b.wheelchair,
      b.brand,
      b.operator,
      b.verification_status,
      b.verified_at,
      b.verified_via,
      b.photo_url,
      b.source,
      b.lat,
      b.lng,
      b.fsa_fhrsid,
      b.fsa_rating,
      b.fsa_rating_date,
      b.fsa_match_confidence,
      b.companies_house_number,
      b.incorporation_date,
      b.company_status,
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

notify pgrst, 'reload schema';
