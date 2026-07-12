-- Sprint 5: verified owner business profile completion.
-- Purpose: after a business is genuinely verified, the owner can complete missing details.
-- This does not verify businesses, does not use Google data, and does not overwrite owner-edited fields via imports.

create or replace function public.update_my_business_profile(
  p_business_id uuid,
  p_name text default null,
  p_category text default null,
  p_description text default null,
  p_address text default null,
  p_phone text default null,
  p_website text default null,
  p_whatsapp text default null,
  p_email text default null,
  p_opening_hours text default null,
  p_photo_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := public.current_user_role();
  v_fields text[] := '{}'::text[];
  v_name text := nullif(trim(coalesce(p_name,'')), '');
  v_category text := nullif(trim(coalesce(p_category,'')), '');
  v_description text := nullif(trim(coalesce(p_description,'')), '');
  v_address text := nullif(trim(coalesce(p_address,'')), '');
  v_phone text := nullif(trim(coalesce(p_phone,'')), '');
  v_website text := nullif(trim(coalesce(p_website,'')), '');
  v_whatsapp text := nullif(trim(coalesce(p_whatsapp,'')), '');
  v_email text := nullif(trim(coalesce(p_email,'')), '');
  v_opening_hours text := nullif(trim(coalesce(p_opening_hours,'')), '');
  v_photo_url text := nullif(trim(coalesce(p_photo_url,'')), '');
  v_row public.businesses%rowtype;
begin
  if v_uid is null then
    raise exception 'sign in required';
  end if;

  select * into v_row
  from public.businesses
  where id = p_business_id
    and verification_status = 'verified'
    and (
      claimed_by = v_uid
      or v_role = 'admin'
    )
  for update;

  if not found then
    raise exception 'verified business ownership required';
  end if;

  if v_name is not null then v_fields := array_append(v_fields, 'name'); end if;
  if v_category is not null then v_fields := array_append(v_fields, 'category'); end if;
  if v_description is not null then v_fields := array_append(v_fields, 'description'); end if;
  if v_address is not null then v_fields := array_append(v_fields, 'address'); end if;
  if v_phone is not null then v_fields := array_append(v_fields, 'phone'); end if;
  if v_website is not null then v_fields := array_append(v_fields, 'website'); end if;
  if v_whatsapp is not null then v_fields := array_append(v_fields, 'whatsapp'); end if;
  if v_email is not null then v_fields := array_append(v_fields, 'email'); end if;
  if v_opening_hours is not null then v_fields := array_append(v_fields, 'opening_hours'); end if;
  if v_photo_url is not null then v_fields := array_append(v_fields, 'photo_url'); end if;

  if array_length(v_fields, 1) is null then
    raise exception 'enter at least one business detail';
  end if;

  update public.businesses b
  set
    name = coalesce(v_name, b.name),
    category = coalesce(v_category, b.category),
    description = coalesce(v_description, b.description),
    address = coalesce(v_address, b.address),
    phone = coalesce(v_phone, b.phone),
    website = coalesce(v_website, b.website),
    whatsapp = coalesce(v_whatsapp, b.whatsapp),
    email = coalesce(v_email, b.email),
    opening_hours = coalesce(v_opening_hours, b.opening_hours),
    photo_url = coalesce(v_photo_url, b.photo_url),
    owner_edited_fields = (
      select array_agg(distinct field order by field)
      from unnest(coalesce(b.owner_edited_fields, '{}'::text[]) || v_fields) as field
    ),
    updated_at = now()
  where b.id = p_business_id;

  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values (
    case when v_role = 'admin' then v_uid else null end,
    'business_profile_updated',
    'business',
    p_business_id,
    jsonb_build_object('updated_by', v_uid, 'fields', v_fields)
  );

  return public.business_detail(p_business_id);
end $$;

grant execute on function public.update_my_business_profile(uuid,text,text,text,text,text,text,text,text,text,text) to authenticated;

notify pgrst, 'reload schema';
