-- Sprint 3 fix: public business detail view must include unclaimed businesses so users can open details and claim them.
-- Posting remains gated by verified ownership through create_verified_business_post and RLS.

create or replace view public.businesses_public with (security_invoker=true) as
select
  id,
  osm_id,
  name,
  category,
  description,
  address,
  phone,
  website,
  whatsapp,
  email,
  opening_hours,
  opening_hours_json,
  cuisine,
  wheelchair,
  brand,
  operator,
  verification_status,
  verified_at,
  verified_via,
  photo_url,
  source,
  lat,
  lng,
  fsa_fhrsid,
  fsa_rating,
  fsa_rating_date,
  fsa_match_confidence,
  companies_house_number,
  incorporation_date,
  company_status,
  (claimed_by is not null) as is_claimed
from public.businesses
where verification_status in ('unclaimed','pending','verified','contested');

grant select on public.businesses_public to anon, authenticated;

notify pgrst, 'reload schema';
