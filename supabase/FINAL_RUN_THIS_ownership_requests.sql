-- HiStreets ownership requests for existing approved, unclaimed businesses.
-- Run after FINAL_RUN_THIS_release_hardening.sql and before FINAL_RUN_THIS_disable_parking.sql.

create table if not exists public.business_ownership_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists business_ownership_one_pending_idx
on public.business_ownership_requests(business_id, requester_id)
where status = 'pending';

alter table public.business_ownership_requests enable row level security;

drop policy if exists ownership_request_owner_read on public.business_ownership_requests;
create policy ownership_request_owner_read
on public.business_ownership_requests
for select
to authenticated
using (requester_id = auth.uid() or public.current_user_is_admin());

create or replace function public.request_business_ownership(
  p_business_id uuid,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business public.businesses%rowtype;
  v_id uuid;
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  if length(trim(coalesce(p_note,''))) < 10 then raise exception 'add a short verification note'; end if;
  if length(trim(coalesce(p_note,''))) > 700 then raise exception 'verification note too long'; end if;

  insert into public.profiles(id, display_name, role)
  values (v_uid, split_part(coalesce((select email from auth.users where id = v_uid), ''), '@', 1), 'user')
  on conflict(id) do nothing;

  select * into v_business
  from public.businesses
  where id = p_business_id
    and verification_status = 'verified'
    and claimed_by is null
    and public.is_public_histreets_business(verification_status, source, claimed_by)
  for update;

  if not found then raise exception 'business is not available for ownership request'; end if;

  if exists (
    select 1 from public.business_ownership_requests
    where business_id = p_business_id
      and requester_id = v_uid
      and status = 'pending'
  ) then raise exception 'ownership request already pending'; end if;

  insert into public.business_ownership_requests(business_id, requester_id, note)
  values (p_business_id, v_uid, trim(p_note))
  returning id into v_id;

  insert into public.verification_events(business_id, method, outcome)
  values (p_business_id, 'ownership_request', 'pending_admin_review');

  return v_id;
end;
$$;

grant execute on function public.request_business_ownership(uuid,text) to authenticated;

create or replace function public.my_business_ownership_requests()
returns table (
  id uuid,
  business_id uuid,
  business_name text,
  business_address text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.business_id, b.name, b.address, r.status, r.created_at
  from public.business_ownership_requests r
  join public.businesses b on b.id = r.business_id
  where r.requester_id = auth.uid()
  order by r.created_at desc
  limit 50;
$$;

grant execute on function public.my_business_ownership_requests() to authenticated;

create or replace function public.admin_business_ownership_requests()
returns table (
  id uuid,
  business_id uuid,
  business_name text,
  business_address text,
  business_category text,
  requester_id uuid,
  requester_email text,
  note text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.business_id,
    b.name,
    b.address,
    b.category,
    r.requester_id,
    (select u.email from auth.users u where u.id = r.requester_id),
    r.note,
    r.status,
    r.created_at
  from public.business_ownership_requests r
  join public.businesses b on b.id = r.business_id
  where public.current_user_is_admin()
    and r.status = 'pending'
  order by r.created_at asc;
$$;

grant execute on function public.admin_business_ownership_requests() to authenticated;

create or replace function public.admin_moderate_ownership_request(
  p_request_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.business_ownership_requests%rowtype;
  v_business public.businesses%rowtype;
begin
  if not public.current_user_is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('approved','rejected') then raise exception 'invalid status'; end if;

  select * into v_request
  from public.business_ownership_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then raise exception 'ownership request not found'; end if;

  select * into v_business
  from public.businesses
  where id = v_request.business_id
  for update;

  if not found then raise exception 'business not found'; end if;

  if p_status = 'approved' then
    if v_business.verification_status <> 'verified' then raise exception 'business is not verified'; end if;
    if v_business.claimed_by is not null and v_business.claimed_by <> v_request.requester_id then
      raise exception 'business already belongs to another account';
    end if;

    update public.businesses
    set claimed_by = v_request.requester_id,
        verified_at = coalesce(verified_at, now()),
        verified_via = 'ownership_request',
        updated_at = now()
    where id = v_request.business_id;

    update public.profiles
    set role = 'business'
    where id = v_request.requester_id
      and role = 'user';

    update public.business_ownership_requests
    set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
    where business_id = v_request.business_id
      and status = 'pending'
      and id <> v_request.id;
  end if;

  update public.business_ownership_requests
  set status = p_status,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = v_request.id;

  insert into public.verification_events(business_id, method, outcome)
  values (v_request.business_id, 'ownership_request_review', p_status);

  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'moderate_ownership_request',
    'business',
    v_request.business_id,
    jsonb_build_object('request_id', v_request.id, 'status', p_status, 'requester_id', v_request.requester_id)
  );
end;
$$;

grant execute on function public.admin_moderate_ownership_request(uuid,text) to authenticated;

notify pgrst, 'reload schema';
