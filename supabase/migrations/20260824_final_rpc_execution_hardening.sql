-- Browser roles should never execute maintenance/import procedures.
revoke execute on function public.apply_overture_business_enrichment(uuid,text,numeric,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_overture_business_enrichment(uuid,text,numeric,text,text,text,text,text,text,jsonb) to service_role;
revoke execute on function public.enrich_business_from_overture(uuid,text,numeric) from public,anon,authenticated;
grant execute on function public.enrich_business_from_overture(uuid,text,numeric) to service_role;
revoke execute on function public.upsert_osm_business(bigint,text,text,double precision,double precision,text,text,text) from public,anon,authenticated;
grant execute on function public.upsert_osm_business(bigint,text,text,double precision,double precision,text,text,text) to service_role;
revoke execute on function public.upsert_osm_business_rich(bigint,text,text,double precision,double precision,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.upsert_osm_business_rich(bigint,text,text,double precision,double precision,text,text,text,text,text,text,text,text,text) to service_role;
revoke execute on function public.upsert_overture_place(text,text,text,text[],numeric,double precision,double precision,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.upsert_overture_place(text,text,text,text[],numeric,double precision,double precision,text,text,text,text,text,text,jsonb) to service_role;
revoke execute on function public.upsert_overture_place(text,text,text,numeric,double precision,double precision,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.upsert_overture_place(text,text,text,numeric,double precision,double precision,text,text,text,text,text,jsonb) to service_role;

-- Signed-in account/claim actions only.
revoke execute on function public.attach_claim_document(uuid,text) from public,anon;
grant execute on function public.attach_claim_document(uuid,text) to authenticated,service_role;
revoke execute on function public.start_business_claim(uuid,text) from public,anon;
grant execute on function public.start_business_claim(uuid,text) to authenticated,service_role;
revoke execute on function public.delete_my_account() from public,anon;
grant execute on function public.delete_my_account() to authenticated,service_role;
revoke execute on function public.export_my_data() from public,anon;
grant execute on function public.export_my_data() to authenticated,service_role;

-- Trigger-only function must not be directly callable by PostgREST users.
revoke execute on function public.handle_new_user() from public,anon,authenticated;
grant execute on function public.handle_new_user() to service_role;

-- Pin helper search paths.
alter function public.get_nearby_offers(double precision,double precision,integer) set search_path=public;
alter function public.business_category_group(text) set search_path=public;
alter function public.histreets_domain_from_url(text) set search_path=public;
alter function public.mask_phone_last4(text) set search_path=public;
alter function public.is_histreets_research_business(text,text) set search_path=public;
alter function public.is_public_histreets_business(text,text,uuid) set search_path=public;
