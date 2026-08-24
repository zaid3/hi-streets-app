-- HiStreets duplicate-registration guard.
-- Run after FINAL_RUN_THIS_ownership_requests.sql and before FINAL_RUN_THIS_disable_parking.sql.
-- The Newham boundary must already be installed before this function is used.

create or replace function public.register_my_business(
  p_name text,
  p_category text,
  p_description text default '',
  p_address text default '',
  p_phone text default '',
  p_website text default '',
  p_whatsapp text default '',
  p_email text default '',
  p_opening_hours text default '',
  p_lat double precision default null,
  p_lng double precision default null,
  p_evidence_note text default ''
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_geom geometry(Point,4326);
  v_fields text[] := array['name','category','description','address','phone','website','whatsapp','email','opening_hours'];
  v_existing public.businesses%rowtype;
  v_newham geometry;
begin
  if v_uid is null then raise exception 'sign in required'; end if;

  insert into public.profiles(id, display_name, role)
  values (v_uid, split_part(coalesce((select email from auth.users where id = v_uid), ''), '@', 1), 'user')
  on conflict(id) do nothing;

  if nullif(trim(coalesce(p_name,'')), '') is null then raise exception 'business name required'; end if;
  if nullif(trim(coalesce(p_category,'')), '') is null then raise exception 'category required'; end if;
  if nullif(trim(coalesce(p_address,'')), '') is null then raise exception 'address required'; end if;
  if nullif(trim(coalesce(p_evidence_note,'')), '') is null then raise exception 'verification note required'; end if;
  if p_lat is null or p_lng is null then raise exception 'business location required'; end if;

  select geom into v_newham
  from public.boundaries
  where name = 'Newham'
  limit 1;

  if v_newham is null then
    raise exception 'Newham boundary is not installed. An administrator must run the boundary import before accepting business registrations.';
  end if;

  v_geom := st_setsrid(st_makepoint(p_lng, p_lat), 4326);

  if not st_covers(v_newham, v_geom) then
    raise exception 'business must be inside Newham';
  end if;

  -- Exact public identity match. This prevents a user from bypassing the
  -- ownership-request flow and creating a duplicate listing.
  select * into v_existing
  from public.businesses b
  where lower(trim(coalesce(b.name,''))) = lower(trim(p_name))
    and lower(trim(coalesce(b.address,''))) = lower(trim(p_address))
    and b.verification_status in ('verified','pending')
  order by case when b.verification_status = 'verified' then 0 else 1 end, b.created_at asc
  limit 1;

  if found then
    if v_existing.verification_status = 'verified' and v_existing.claimed_by is null then
      raise exception 'This business already exists on HiStreets. Use the ownership request above instead of registering it again.';
    elsif v_existing.verification_status = 'verified' then
      raise exception 'This business already exists on HiStreets and is already connected to an account.';
    elsif v_existing.claimed_by = v_uid then
      raise exception 'You already submitted this business and it is waiting for review.';
    else
      raise exception 'A registration for this business is already under review.';
    end if;
  end if;

  insert into public.businesses(
    name, category, description, geom, address, phone, website, whatsapp, email,
    opening_hours, claimed_by, verification_status, source, owner_edited_fields,
    registration_note, updated_at
  ) values (
    trim(p_name), trim(p_category), nullif(trim(coalesce(p_description,'')), ''), v_geom,
    trim(p_address), nullif(trim(coalesce(p_phone,'')), ''), nullif(trim(coalesce(p_website,'')), ''),
    nullif(trim(coalesce(p_whatsapp,'')), ''), nullif(trim(coalesce(p_email,'')), ''),
    nullif(trim(coalesce(p_opening_hours,'')), ''), v_uid, 'pending', 'owner_registration',
    v_fields, trim(p_evidence_note), now()
  ) returning id into v_id;

  insert into public.verification_events(business_id, method, outcome)
  values (v_id, 'owner_registration', 'pending_admin_review');

  return v_id;
end;
$$;

grant execute on function public.register_my_business(text,text,text,text,text,text,text,text,text,double precision,double precision,text) to authenticated;

notify pgrst, 'reload schema';
