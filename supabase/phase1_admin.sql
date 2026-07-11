-- Run after schema_v1.sql. Adds profile trigger and admin moderation policies/RPCs.

create or replace function public.current_user_role() returns text
language sql
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user')
$$;

grant execute on function public.current_user_role() to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name, role)
  values(new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 'user')
  on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop policy if exists admin_read_profiles on public.profiles;
create policy admin_read_profiles on public.profiles for select using (public.current_user_role() = 'admin');

drop policy if exists admin_read_all_businesses on public.businesses;
create policy admin_read_all_businesses on public.businesses for select using (public.current_user_role() = 'admin');
drop policy if exists admin_update_all_businesses on public.businesses;
create policy admin_update_all_businesses on public.businesses for update using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists admin_read_all_posts on public.posts;
create policy admin_read_all_posts on public.posts for select using (public.current_user_role() = 'admin');
drop policy if exists admin_update_all_posts on public.posts;
create policy admin_update_all_posts on public.posts for update using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists admin_read_reports on public.reports;
create policy admin_read_reports on public.reports for select using (public.current_user_role() = 'admin');
drop policy if exists admin_update_reports on public.reports;
create policy admin_update_reports on public.reports for update using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

create or replace function public.admin_moderate_post(p_post_id uuid, p_status text) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'admin only';
  end if;
  if p_status not in ('live','rejected','removed') then
    raise exception 'invalid status';
  end if;
  update public.posts set status = p_status, updated_at = now() where id = p_post_id;
  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values(auth.uid(), 'moderate_post', 'post', p_post_id, jsonb_build_object('status', p_status));
end $$;

grant execute on function public.admin_moderate_post(uuid,text) to authenticated;

notify pgrst, 'reload schema';
