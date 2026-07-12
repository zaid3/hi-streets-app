-- Sprint 3 pre-fix: remove the old businesses_public view so the richer Sprint 3 view can be recreated with new columns.
-- PostgreSQL cannot reorder existing view columns through CREATE OR REPLACE VIEW.
-- Safe to run before supabase/sprint3_claims_rich_business.sql.

drop view if exists public.businesses_public cascade;

notify pgrst, 'reload schema';
