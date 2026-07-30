-- HiStreets current release: parking is not live.
-- Run this LAST after FINAL_RUN_THIS_release_hardening.sql.

-- Hide any old published parking rows and remove all direct table policies.
do $$
begin
  if to_regclass('public.blue_badge_bays') is not null then
    execute 'update public.blue_badge_bays set is_published = false where coalesce(is_published, false) = true';
    execute 'drop policy if exists public_read_verified_blue_badge on public.blue_badge_bays';
    execute 'drop policy if exists public_read_published_blue_badge on public.blue_badge_bays';
    execute 'drop policy if exists admin_insert_blue_badge_bays on public.blue_badge_bays';
    execute 'drop policy if exists admin_update_blue_badge_bays on public.blue_badge_bays';
    execute 'drop policy if exists admin_delete_blue_badge_bays on public.blue_badge_bays';
  end if;
end $$;

-- Remove the public parking view if an older setup created it.
drop view if exists public.blue_badge_bays_public cascade;

-- Make legacy parking photos private and remove all client access policies.
update storage.buckets set public = false where id = 'bay-photos';

drop policy if exists public_read_bay_photos on storage.objects;
drop policy if exists admin_upload_bay_photos on storage.objects;
drop policy if exists admin_update_bay_photos on storage.objects;
drop policy if exists admin_delete_bay_photos on storage.objects;

-- Disable the legacy parking RPC for client roles.
do $$
begin
  if to_regprocedure('public.add_blue_badge_bay(double precision,double precision,text,text,text)') is not null then
    revoke execute on function public.add_blue_badge_bay(double precision,double precision,text,text,text) from anon, authenticated;
  end if;
end $$;

notify pgrst, 'reload schema';
