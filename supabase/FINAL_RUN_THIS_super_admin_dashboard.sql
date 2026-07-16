-- HiStreets Super Admin dashboard setup
-- Run this after the marketplace setup and safe auto approval SQL.

create or replace function public.current_user_is_admin() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin','super_admin')
$$;

grant execute on function public.current_user_is_admin() to authenticated;

create or replace function public.admin_dashboard_overview()
returns table (
  total_businesses bigint,
  pending_businesses bigint,
  verified_businesses bigint,
  live_posts bigint,
  pending_posts bigint,
  job_applications bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then raise exception 'admin only'; end if;

  return query
  select
    (select count(*) from public.businesses where coalesce(source,'') <> 'osm') as total_businesses,
    (select count(*) from public.businesses where verification_status = 'pending' and coalesce(source,'') <> 'osm') as pending_businesses,
    (select count(*) from public.businesses where verification_status = 'verified' and coalesce(source,'') <> 'osm') as verified_businesses,
    (select count(*) from public.posts where status = 'live' and expires_at > now()) as live_posts,
    (select count(*) from public.posts where status = 'pending') as pending_posts,
    (select count(*) from public.job_applications) as job_applications;
end;
$$;

grant execute on function public.admin_dashboard_overview() to authenticated;

create or replace function public.admin_dashboard_businesses(p_status text default null)
returns table (
  id uuid,
  name text,
  category text,
  address text,
  phone text,
  website text,
  email text,
  verification_status text,
  source text,
  registration_note text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then raise exception 'admin only'; end if;

  return query
  select b.id, b.name, b.category, b.address, b.phone, b.website, b.email,
         b.verification_status, b.source, b.registration_note, b.created_at
  from public.businesses b
  where coalesce(b.source,'') <> 'osm'
    and (p_status is null or b.verification_status = p_status)
  order by
    case when b.verification_status = 'pending' then 0 else 1 end,
    b.created_at desc
  limit 100;
end;
$$;

grant execute on function public.admin_dashboard_businesses(text) to authenticated;

create or replace function public.admin_dashboard_posts(p_status text default null)
returns table (
  id uuid,
  type text,
  title text,
  body text,
  status text,
  business_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then raise exception 'admin only'; end if;

  return query
  select p.id, p.type, p.title, p.body, p.status, b.name as business_name, p.created_at
  from public.posts p
  left join public.businesses b on b.id = p.business_id
  where p_status is null or p.status = p_status
  order by
    case when p.status = 'pending' then 0 else 1 end,
    p.created_at desc
  limit 100;
end;
$$;

grant execute on function public.admin_dashboard_posts(text) to authenticated;

-- Allow super_admin to moderate businesses.
create or replace function public.admin_moderate_business_registration(
  p_business_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
begin
  if not public.current_user_is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('verified','rejected') then raise exception 'invalid status'; end if;

  select * into v_business from public.businesses where id = p_business_id for update;
  if not found then raise exception 'business not found'; end if;

  if p_status = 'verified' then
    update public.businesses
    set verification_status = 'verified', verified_at = now(), verified_via = public.current_user_role(),
        source = case when coalesce(source,'') = 'osm' then 'admin_registration' else source end,
        updated_at = now()
    where id = p_business_id;

    if v_business.claimed_by is not null then
      update public.profiles set role = 'business' where id = v_business.claimed_by and role = 'user';
    end if;
  else
    update public.businesses set verification_status = 'rejected', updated_at = now() where id = p_business_id;
  end if;

  insert into public.verification_events(business_id, method, outcome)
  values (p_business_id, 'admin_registration_review', p_status);

  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values(auth.uid(), 'moderate_business_registration', 'business', p_business_id, jsonb_build_object('status', p_status, 'role', public.current_user_role()));
end;
$$;

grant execute on function public.admin_moderate_business_registration(uuid,text) to authenticated;

-- Allow super_admin to moderate posts.
create or replace function public.admin_moderate_post(p_post_id uuid, p_status text) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('live','rejected','removed') then raise exception 'invalid status'; end if;
  update public.posts set status = p_status, updated_at = now() where id = p_post_id;
  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values(auth.uid(), 'moderate_post', 'post', p_post_id, jsonb_build_object('status', p_status, 'role', public.current_user_role()));
end;
$$;

grant execute on function public.admin_moderate_post(uuid,text) to authenticated;

notify pgrst, 'reload schema';

-- After running this file, set yourself as super admin with:
-- update public.profiles
-- set role = 'super_admin'
-- where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');