-- Keep privileged role checks away from anonymous requests.
-- Public read policies remain available, while ownership/admin policies only
-- run for authenticated sessions that may execute current_user_role().

alter policy admin_delete_blue_badge_bays on public.blue_badge_bays to authenticated;
alter policy admin_insert_blue_badge_bays on public.blue_badge_bays to authenticated;
alter policy admin_update_blue_badge_bays on public.blue_badge_bays to authenticated;
alter policy admins_update_claims on public.business_claims to authenticated;
alter policy claimants_read_own_claims on public.business_claims to authenticated;
alter policy admin_read_all_businesses on public.businesses to authenticated;
alter policy admin_update_all_businesses on public.businesses to authenticated;
alter policy owners_read_own_businesses on public.businesses to authenticated;
alter policy owners_update_own_businesses on public.businesses to authenticated;
alter policy job_applications_owner_read on public.job_applications to authenticated;
alter policy job_applications_owner_update on public.job_applications to authenticated;
alter policy admin_read_overture_places on public.overture_places to authenticated;
alter policy admin_read_all_posts on public.posts to authenticated;
alter policy admin_update_all_posts on public.posts to authenticated;
alter policy verified_claimed_business_insert_posts on public.posts to authenticated;
alter policy verified_claimed_business_update_posts on public.posts to authenticated;
alter policy admin_read_profiles on public.profiles to authenticated;
alter policy admin_read_reports on public.reports to authenticated;
alter policy admin_update_reports on public.reports to authenticated;
alter policy admin_read_verification_events on public.verification_events to authenticated;

drop policy admin_read_all_businesses on public.businesses;
create policy admin_read_all_businesses on public.businesses for select to authenticated
using ((select public.current_user_role()) in ('admin','super_admin'));

drop policy admin_update_all_businesses on public.businesses;
create policy admin_update_all_businesses on public.businesses for update to authenticated
using ((select public.current_user_role()) in ('admin','super_admin'))
with check ((select public.current_user_role()) in ('admin','super_admin'));

drop policy admin_read_all_posts on public.posts;
create policy admin_read_all_posts on public.posts for select to authenticated
using ((select public.current_user_role()) in ('admin','super_admin'));

drop policy admin_update_all_posts on public.posts;
create policy admin_update_all_posts on public.posts for update to authenticated
using ((select public.current_user_role()) in ('admin','super_admin'))
with check ((select public.current_user_role()) in ('admin','super_admin'));
