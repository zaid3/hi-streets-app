-- HiStreets Sprint 7 — Manual listing completion with evidence trail
-- Purpose: allow admin/manual verified updates for missing business details without faking data.
-- Source examples: owner_confirmed, official_website, shop_window_photo, phone_call, admin_verified.

alter table public.businesses
  add column if not exists manual_verification_source text,
  add column if not exists manual_verification_note text,
  add column if not exists manual_verified_at timestamptz,
  add column if not exists manual_verified_by uuid references auth.users(id);

create table if not exists public.business_manual_updates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  updated_by uuid references auth.users(id),
  source_type text not null check (source_type in ('owner_confirmed','official_website','shop_window_photo','phone_call','admin_verified','other')),
  evidence_note text not null default '',
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.business_manual_updates enable row level security;

drop policy if exists business_manual_updates_admin_read on public.business_manual_updates;
create policy business_manual_updates_admin_read
on public.business_manual_updates
for select
using (public.current_user_role() = 'admin');

create or replace function public.admin_update_business_listing(
  p_business_id uuid,
  p_phone text default '',
  p_website text default '',
  p_whatsapp text default '',
  p_email text default '',
  p_opening_hours text default '',
  p_address text default '',
  p_category text default '',
  p_description text default '',
  p_photo_url text default '',
  p_source_type text default 'admin_verified',
  p_evidence_note text default ''
) returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.businesses%rowtype;
  v_new public.businesses%rowtype;
  v_source text := coalesce(nullif(trim(p_source_type), ''), 'admin_verified');
  v_note text := trim(coalesce(p_evidence_note, ''));
  v_owner_fields text[] := array[]::text[];
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Admin only';
  end if;

  if v_source not in ('owner_confirmed','official_website','shop_window_photo','phone_call','admin_verified','other') then
    raise exception 'Invalid source type';
  end if;

  if v_note = '' then
    raise exception 'Evidence note is required';
  end if;

  select * into v_old
  from public.businesses
  where id = p_business_id
  for update;

  if not found then
    raise exception 'Business not found';
  end if;

  v_owner_fields := coalesce(v_old.owner_edited_fields, array[]::text[]);

  if trim(coalesce(p_phone, '')) <> '' then v_owner_fields := array(select distinct unnest(v_owner_fields || array['phone'])); end if;
  if trim(coalesce(p_website, '')) <> '' then v_owner_fields := array(select distinct unnest(v_owner_fields || array['website'])); end if;
  if trim(coalesce(p_whatsapp, '')) <> '' then v_owner_fields := array(select distinct unnest(v_owner_fields || array['whatsapp'])); end if;
  if trim(coalesce(p_email, '')) <> '' then v_owner_fields := array(select distinct unnest(v_owner_fields || array['email'])); end if;
  if trim(coalesce(p_opening_hours, '')) <> '' then v_owner_fields := array(select distinct unnest(v_owner_fields || array['opening_hours'])); end if;
  if trim(coalesce(p_address, '')) <> '' then v_owner_fields := array(select distinct unnest(v_owner_fields || array['address'])); end if;
  if trim(coalesce(p_category, '')) <> '' then v_owner_fields := array(select distinct unnest(v_owner_fields || array['category'])); end if;
  if trim(coalesce(p_description, '')) <> '' then v_owner_fields := array(select distinct unnest(v_owner_fields || array['description'])); end if;
  if trim(coalesce(p_photo_url, '')) <> '' then v_owner_fields := array(select distinct unnest(v_owner_fields || array['photo_url'])); end if;

  update public.businesses
  set
    phone = coalesce(nullif(trim(p_phone), ''), phone),
    website = coalesce(nullif(trim(p_website), ''), website),
    whatsapp = coalesce(nullif(trim(p_whatsapp), ''), whatsapp),
    email = coalesce(nullif(trim(p_email), ''), email),
    opening_hours = coalesce(nullif(trim(p_opening_hours), ''), opening_hours),
    address = coalesce(nullif(trim(p_address), ''), address),
    category = coalesce(nullif(trim(p_category), ''), category),
    description = coalesce(nullif(trim(p_description), ''), description),
    photo_url = coalesce(nullif(trim(p_photo_url), ''), photo_url),
    owner_edited_fields = v_owner_fields,
    manual_verification_source = v_source,
    manual_verification_note = v_note,
    manual_verified_at = now(),
    manual_verified_by = auth.uid(),
    updated_at = now()
  where id = p_business_id
  returning * into v_new;

  insert into public.business_manual_updates (business_id, updated_by, source_type, evidence_note, old_values, new_values)
  values (
    p_business_id,
    auth.uid(),
    v_source,
    v_note,
    jsonb_build_object(
      'phone', v_old.phone,
      'website', v_old.website,
      'whatsapp', v_old.whatsapp,
      'email', v_old.email,
      'opening_hours', v_old.opening_hours,
      'address', v_old.address,
      'category', v_old.category,
      'description', v_old.description,
      'photo_url', v_old.photo_url
    ),
    jsonb_build_object(
      'phone', v_new.phone,
      'website', v_new.website,
      'whatsapp', v_new.whatsapp,
      'email', v_new.email,
      'opening_hours', v_new.opening_hours,
      'address', v_new.address,
      'category', v_new.category,
      'description', v_new.description,
      'photo_url', v_new.photo_url,
      'source_type', v_source,
      'evidence_note', v_note
    )
  );

  return v_new;
end;
$$;

grant execute on function public.admin_update_business_listing(uuid,text,text,text,text,text,text,text,text,text,text,text) to authenticated;

notify pgrst, 'reload schema';
