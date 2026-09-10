-- Separate platform authority from business-workspace membership and add
-- privacy-preserving engagement analytics for owner and platform dashboards.

alter table public.profiles
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','manager','editor','viewer')),
  status text not null default 'active' check (status in ('active','removed')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null check (email = lower(email)),
  role text not null check (role in ('manager','editor','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists business_invitations_one_pending_email
  on public.business_invitations (business_id, email)
  where status = 'pending';
create index if not exists business_memberships_user_active_idx
  on public.business_memberships (user_id, business_id) where status = 'active';
create index if not exists business_memberships_business_active_idx
  on public.business_memberships (business_id, role) where status = 'active';
create index if not exists business_invitations_email_pending_idx
  on public.business_invitations (email, expires_at) where status = 'pending';

create table if not exists public.business_analytics_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  event_type text not null check (event_type in (
    'listing_view','content_view','phone_click','website_click','directions_click',
    'whatsapp_click','save','apply_start'
  )),
  occurred_at timestamptz not null default now()
);

create index if not exists business_analytics_events_business_time_idx
  on public.business_analytics_events (business_id, occurred_at desc);
create index if not exists business_analytics_events_post_time_idx
  on public.business_analytics_events (post_id, occurred_at desc) where post_id is not null;

alter table public.business_memberships enable row level security;
alter table public.business_invitations enable row level security;
alter table public.business_analytics_events enable row level security;

revoke all on table public.business_memberships from public, anon, authenticated;
revoke all on table public.business_invitations from public, anon, authenticated;
revoke all on table public.business_analytics_events from public, anon, authenticated;
grant select on table public.business_memberships to authenticated;
grant select on table public.business_invitations to authenticated;
grant insert on table public.business_analytics_events to service_role;
grant select, update, delete on table public.business_memberships to service_role;
grant select, insert, update, delete on table public.business_invitations to service_role;
grant select, update, delete on table public.business_analytics_events to service_role;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.suspended_at is not null
    ) then 'suspended'
    else coalesce((
      select p.role from public.profiles p
      where p.id = (select auth.uid())
    ), 'user')
  end
$$;
revoke all on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;

create or replace function public.business_membership_role(p_business_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select public.current_user_role()) in ('admin','super_admin') then 'platform'
    when b.claimed_by = (select auth.uid()) then 'owner'
    else (
      select m.role from public.business_memberships m
      where m.business_id = p_business_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
      limit 1
    )
  end
  from public.businesses b
  where b.id = p_business_id
$$;
revoke all on function public.business_membership_role(uuid) from public, anon;
grant execute on function public.business_membership_role(uuid) to authenticated, service_role;

drop policy if exists business_memberships_read_authorised on public.business_memberships;
create policy business_memberships_read_authorised
on public.business_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.business_membership_role(business_id)) in ('owner','manager','platform')
);

drop policy if exists business_invitations_read_authorised on public.business_invitations;
create policy business_invitations_read_authorised
on public.business_invitations for select to authenticated
using (
  lower(email) = lower(coalesce((select auth.jwt()->>'email'), ''))
  or (select public.business_membership_role(business_id)) in ('owner','manager','platform')
);

drop policy if exists business_members_can_read_business on public.businesses;
create policy business_members_can_read_business
on public.businesses for select to authenticated
using ((select public.business_membership_role(id)) is not null);

insert into public.business_memberships (business_id, user_id, role, status)
select b.id, b.claimed_by, 'owner', 'active'
from public.businesses b
where b.claimed_by is not null
on conflict (business_id, user_id) do update set role = 'owner', status = 'active', updated_at = now();

create or replace function public.sync_business_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.claimed_by is not null and (tg_op = 'INSERT' or new.claimed_by is distinct from old.claimed_by) then
    insert into public.business_memberships (business_id, user_id, role, status)
    values (new.id, new.claimed_by, 'owner', 'active')
    on conflict (business_id, user_id) do update
      set role = 'owner', status = 'active', updated_at = now();
  end if;
  return new;
end $$;
revoke all on function public.sync_business_owner_membership() from public, anon, authenticated;
grant execute on function public.sync_business_owner_membership() to service_role;

drop trigger if exists sync_business_owner_membership on public.businesses;
create trigger sync_business_owner_membership
after insert or update of claimed_by on public.businesses
for each row execute function public.sync_business_owner_membership();

create or replace function public.accept_my_business_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  if v_email is null then return 0; end if;

  insert into public.business_memberships (business_id, user_id, role, status, invited_by)
  select i.business_id, v_uid, i.role, 'active', i.invited_by
  from public.business_invitations i
  where i.email = v_email and i.status = 'pending' and i.expires_at > now()
  on conflict (business_id, user_id) do update
    set role = excluded.role, status = 'active', invited_by = excluded.invited_by, updated_at = now();

  get diagnostics v_count = row_count;
  update public.business_invitations
  set status = 'accepted', accepted_at = now()
  where email = v_email and status = 'pending' and expires_at > now();
  return v_count;
end $$;
revoke all on function public.accept_my_business_invitations() from public, anon;
grant execute on function public.accept_my_business_invitations() to authenticated, service_role;

create or replace function public.my_business_workspace_ids()
returns table (business_id uuid, membership_role text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id,
    case
      when b.claimed_by = (select auth.uid()) then 'owner'
      else m.role
    end
  from public.businesses b
  left join public.business_memberships m
    on m.business_id = b.id and m.user_id = (select auth.uid()) and m.status = 'active'
  where (b.claimed_by = (select auth.uid()) or m.user_id is not null)
    and (select public.current_user_role()) <> 'suspended'
  order by b.name
$$;
revoke all on function public.my_business_workspace_ids() from public, anon;
grant execute on function public.my_business_workspace_ids() to authenticated, service_role;

create or replace function public.business_team_overview(p_business_id uuid)
returns table (
  kind text, record_id uuid, user_id uuid, display_name text, email text,
  member_role text, status text, created_at timestamptz, expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select public.business_membership_role(p_business_id)) not in ('owner','manager','platform') then
    raise exception 'team access required';
  end if;
  return query
    select 'member'::text, m.id, m.user_id, coalesce(p.display_name, ''), coalesce(u.email, ''),
      m.role, m.status, m.created_at, null::timestamptz
    from public.business_memberships m
    join public.profiles p on p.id = m.user_id
    left join auth.users u on u.id = m.user_id
    where m.business_id = p_business_id and m.status = 'active'
    union all
    select 'invitation'::text, i.id, null::uuid, ''::text, i.email,
      i.role, i.status, i.created_at, i.expires_at
    from public.business_invitations i
    where i.business_id = p_business_id and i.status = 'pending'
    order by created_at;
end $$;
revoke all on function public.business_team_overview(uuid) from public, anon;
grant execute on function public.business_team_overview(uuid) to authenticated, service_role;

create or replace function public.update_business_member_role(p_business_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.business_membership_role(p_business_id)) not in ('owner','platform') then
    raise exception 'owner access required';
  end if;
  if p_role not in ('owner','manager','editor','viewer') then raise exception 'invalid team role'; end if;
  if p_user_id = (select auth.uid()) and p_role <> 'owner'
     and (select count(*) from public.business_memberships where business_id = p_business_id and role = 'owner' and status = 'active') <= 1 then
    raise exception 'transfer ownership before changing the last owner';
  end if;
  update public.business_memberships
  set role = p_role, updated_at = now()
  where business_id = p_business_id and user_id = p_user_id and status = 'active';
  if not found then raise exception 'team member not found'; end if;
end $$;
revoke all on function public.update_business_member_role(uuid,uuid,text) from public, anon;
grant execute on function public.update_business_member_role(uuid,uuid,text) to authenticated, service_role;

create or replace function public.remove_business_member(p_business_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_target_role text;
begin
  if (select public.business_membership_role(p_business_id)) not in ('owner','platform') then
    raise exception 'owner access required';
  end if;
  select role into v_target_role from public.business_memberships
    where business_id = p_business_id and user_id = p_user_id and status = 'active';
  if v_target_role is null then raise exception 'team member not found'; end if;
  if v_target_role = 'owner'
     and (select count(*) from public.business_memberships where business_id = p_business_id and role = 'owner' and status = 'active') <= 1 then
    raise exception 'the last owner cannot be removed';
  end if;
  update public.business_memberships set status = 'removed', updated_at = now()
  where business_id = p_business_id and user_id = p_user_id;
end $$;
revoke all on function public.remove_business_member(uuid,uuid) from public, anon;
grant execute on function public.remove_business_member(uuid,uuid) to authenticated, service_role;

create or replace function public.track_business_event(
  p_business_id uuid,
  p_event_type text,
  p_post_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_type not in ('listing_view','content_view','phone_click','website_click','directions_click','whatsapp_click','save','apply_start') then
    raise exception 'unsupported analytics event';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and public.is_public_histreets_business(b.verification_status, b.source, b.claimed_by)
  ) then raise exception 'business not available'; end if;
  if p_post_id is not null and not exists (
    select 1 from public.posts p where p.id = p_post_id and p.business_id = p_business_id and p.status = 'live'
  ) then raise exception 'post not available'; end if;
  insert into public.business_analytics_events (business_id, post_id, event_type)
  values (p_business_id, p_post_id, p_event_type);
end $$;
revoke all on function public.track_business_event(uuid,text,uuid) from public;
grant execute on function public.track_business_event(uuid,text,uuid) to anon, authenticated, service_role;

create or replace function public.business_dashboard_overview(p_business_id uuid, p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_business public.businesses%rowtype;
begin
  if (select public.business_membership_role(p_business_id)) is null then raise exception 'business access required'; end if;
  select * into v_business from public.businesses where id = p_business_id;
  return jsonb_build_object(
    'business_id', p_business_id,
    'business_name', v_business.name,
    'period_days', greatest(7, least(coalesce(p_days,30), 90)),
    'listing_views', (select count(*) from public.business_analytics_events where business_id=p_business_id and event_type='listing_view' and occurred_at >= now() - make_interval(days => greatest(7, least(coalesce(p_days,30),90)))),
    'action_clicks', (select count(*) from public.business_analytics_events where business_id=p_business_id and event_type in ('phone_click','website_click','directions_click','whatsapp_click','save','apply_start') and occurred_at >= now() - make_interval(days => greatest(7, least(coalesce(p_days,30),90)))),
    'content_views', (select count(*) from public.business_analytics_events where business_id=p_business_id and event_type='content_view' and occurred_at >= now() - make_interval(days => greatest(7, least(coalesce(p_days,30),90)))),
    'applications', (select count(*) from public.job_applications where business_id=p_business_id and created_at >= now() - make_interval(days => greatest(7, least(coalesce(p_days,30),90)))),
    'live_posts', (select count(*) from public.posts where business_id=p_business_id and status='live'),
    'pending_posts', (select count(*) from public.posts where business_id=p_business_id and status='pending'),
    'team_members', (select count(*) from public.business_memberships where business_id=p_business_id and status='active'),
    'profile_completeness', (
      ((v_business.phone is not null)::int + (v_business.website is not null)::int +
       (v_business.whatsapp is not null)::int + (v_business.opening_hours is not null)::int +
       (v_business.description is not null)::int + (v_business.photo_url is not null)::int) * 100 / 6
    )
  );
end $$;
revoke all on function public.business_dashboard_overview(uuid,integer) from public, anon;
grant execute on function public.business_dashboard_overview(uuid,integer) to authenticated, service_role;

create or replace function public.business_analytics_series(p_business_id uuid, p_days integer default 30)
returns table(day date, listing_views bigint, action_clicks bigint, content_views bigint, applicants bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select public.business_membership_role(p_business_id)) is null then raise exception 'business access required'; end if;
  return query
    with days as (
      select generate_series(current_date - (greatest(7,least(coalesce(p_days,30),90)) - 1), current_date, interval '1 day')::date as day
    ), events as (
      select e.occurred_at::date as day,
        count(*) filter (where e.event_type='listing_view') as listing_views,
        count(*) filter (where e.event_type in ('phone_click','website_click','directions_click','whatsapp_click','save','apply_start')) as action_clicks,
        count(*) filter (where e.event_type='content_view') as content_views
      from public.business_analytics_events e
      where e.business_id=p_business_id and e.occurred_at >= current_date - (greatest(7,least(coalesce(p_days,30),90)) - 1)
      group by e.occurred_at::date
    ), applications as (
      select a.created_at::date as day, count(*) as applicants
      from public.job_applications a
      where a.business_id=p_business_id and a.created_at >= current_date - (greatest(7,least(coalesce(p_days,30),90)) - 1)
      group by a.created_at::date
    )
    select d.day, coalesce(e.listing_views,0), coalesce(e.action_clicks,0),
      coalesce(e.content_views,0), coalesce(a.applicants,0)
    from days d left join events e using(day) left join applications a using(day)
    order by d.day;
end $$;
revoke all on function public.business_analytics_series(uuid,integer) from public, anon;
grant execute on function public.business_analytics_series(uuid,integer) to authenticated, service_role;

create or replace function public.platform_dashboard_overview(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select public.current_user_role()) not in ('admin','super_admin') then raise exception 'platform staff access required'; end if;
  return jsonb_build_object(
    'auth_users', (select count(*) from auth.users where deleted_at is null),
    'directory_businesses', (select count(*) from public.businesses),
    'claimed_businesses', (select count(*) from public.businesses where claimed_by is not null),
    'verified_businesses', (select count(*) from public.businesses where verification_status='verified'),
    'pending_businesses', (select count(*) from public.businesses where verification_status='pending'),
    'pending_ownership', (select count(*) from public.business_ownership_requests where status='pending'),
    'live_posts', (select count(*) from public.posts where status='live'),
    'pending_posts', (select count(*) from public.posts where status='pending'),
    'job_applications', (select count(*) from public.job_applications),
    'engagement_events', (select count(*) from public.business_analytics_events where occurred_at >= now() - make_interval(days => greatest(7,least(coalesce(p_days,30),90))))
  );
end $$;
revoke all on function public.platform_dashboard_overview(integer) from public, anon;
grant execute on function public.platform_dashboard_overview(integer) to authenticated, service_role;

create or replace function public.platform_analytics_series(p_days integer default 30)
returns table(day date, new_users bigint, claims bigint, posts bigint, applications bigint, engagement bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select public.current_user_role()) not in ('admin','super_admin') then raise exception 'platform staff access required'; end if;
  return query
    with days as (
      select generate_series(current_date - (greatest(7,least(coalesce(p_days,30),90)) - 1), current_date, interval '1 day')::date as day
    )
    select d.day,
      (select count(*) from auth.users u where u.created_at::date=d.day and u.deleted_at is null),
      (select count(*) from public.business_ownership_requests r where r.created_at::date=d.day),
      (select count(*) from public.posts p where p.created_at::date=d.day),
      (select count(*) from public.job_applications a where a.created_at::date=d.day),
      (select count(*) from public.business_analytics_events e where e.occurred_at::date=d.day)
    from days d order by d.day;
end $$;
revoke all on function public.platform_analytics_series(integer) from public, anon;
grant execute on function public.platform_analytics_series(integer) to authenticated, service_role;
