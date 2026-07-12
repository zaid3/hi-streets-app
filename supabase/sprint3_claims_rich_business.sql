-- Sprint 3: Rich business fields + claim/verification foundation.
-- Source of truth: MapLibre + Supabase only, Newham only, no fake data.
-- Run after sprint1_map_finish.sql and sprint2_verified_posting.sql.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ---------- Business data enrichment ----------
alter table public.businesses add column if not exists email text;
alter table public.businesses add column if not exists opening_hours text;
alter table public.businesses add column if not exists opening_hours_json jsonb default '{}'::jsonb;
alter table public.businesses add column if not exists cuisine text;
alter table public.businesses add column if not exists wheelchair text;
alter table public.businesses add column if not exists brand text;
alter table public.businesses add column if not exists operator text;
alter table public.businesses add column if not exists owner_edited_fields text[] not null default '{}';
alter table public.businesses add column if not exists verified_via text;
alter table public.businesses add column if not exists fsa_fhrsid text;
alter table public.businesses add column if not exists fsa_rating int;
alter table public.businesses add column if not exists fsa_rating_date date;
alter table public.businesses add column if not exists fsa_match_confidence numeric;
alter table public.businesses add column if not exists companies_house_number text;
alter table public.businesses add column if not exists incorporation_date date;
alter table public.businesses add column if not exists company_status text;

-- Existing check constraints may not include contested/revoked from older migrations.
alter table public.businesses drop constraint if exists businesses_verification_status_check;
alter table public.businesses add constraint businesses_verification_status_check
check (verification_status in ('unclaimed','pending','verified','contested','revoked','rejected'));

create index if not exists businesses_fsa_idx on public.businesses(fsa_fhrsid, fsa_rating);
create index if not exists businesses_claim_status_idx on public.businesses(claimed_by, verification_status);

-- ---------- Claim + verification ----------
create table if not exists public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  method text not null check (method in ('phone_otp','domain_email','website_code','document')),
  status text not null default 'started' check (status in ('started','proof_sent','passed','failed','under_review','approved','rejected','revoked')),
  evidence_channel text,
  document_url text,
  ai_notes jsonb default '{}'::jsonb,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists business_claims_business_idx on public.business_claims(business_id, created_at desc);
create index if not exists business_claims_claimant_idx on public.business_claims(claimant_id, status, created_at desc);
create unique index if not exists one_open_claim_per_user_idx
on public.business_claims(claimant_id)
where status in ('started','proof_sent','under_review');

alter table public.business_claims enable row level security;

drop policy if exists claimants_read_own_claims on public.business_claims;
create policy claimants_read_own_claims on public.business_claims
for select using (claimant_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists claimants_insert_own_claims on public.business_claims;
create policy claimants_insert_own_claims on public.business_claims
for insert with check (claimant_id = auth.uid());

drop policy if exists admins_update_claims on public.business_claims;
create policy admins_update_claims on public.business_claims
for update using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- verification_events already exists; extend it safely.
alter table public.verification_events add column if not exists claim_id uuid references public.business_claims(id) on delete set null;
alter table public.verification_events add column if not exists domain text;
alter table public.verification_events add column if not exists ip text;
alter table public.verification_events add column if not exists user_agent text;

-- Admin-only verification events. Insert is allowed to authenticated through RPC/logging only; direct insert policy is deliberately narrow.
drop policy if exists admin_read_verification_events on public.verification_events;
create policy admin_read_verification_events on public.verification_events
for select using (public.current_user_role() = 'admin');

-- Private proof documents bucket. Do not make it public.
insert into storage.buckets(id, name, public)
values ('claim-documents', 'claim-documents', false)
on conflict (id) do update set public = false;

-- ---------- Public views updated with richer fields ----------
create or replace view public.businesses_public with (security_invoker=true) as
select
  id,
  osm_id,
  name,
  category,
  description,
  address,
  phone,
  website,
  whatsapp,
  email,
  opening_hours,
  opening_hours_json,
  cuisine,
  wheelchair,
  brand,
  operator,
  verification_status,
  verified_at,
  verified_via,
  photo_url,
  source,
  lat,
  lng,
  fsa_fhrsid,
  fsa_rating,
  fsa_rating_date,
  fsa_match_confidence,
  companies_house_number,
  incorporation_date,
  company_status,
  (claimed_by is not null) as is_claimed
from public.businesses
where verification_status = 'verified';

-- Claimable public view exposes enough to display possible methods, but not private claim data.
create or replace view public.business_claim_options_public with (security_invoker=true) as
select
  id,
  name,
  category,
  address,
  phone is not null and phone <> '' as can_phone_otp,
  website is not null and website <> '' as can_website_code,
  case
    when website is null or website = '' then null
    else regexp_replace(regexp_replace(lower(website), '^https?://', ''), '^www\\.', '')
  end as website_domain,
  verification_status,
  claimed_by is not null as is_claimed
from public.businesses
where verification_status in ('unclaimed','verified','pending','contested');

grant select on public.business_claim_options_public to anon, authenticated;

-- ---------- Helpers ----------
create or replace function public.histreets_domain_from_url(p_url text)
returns text
language sql
immutable
as $$
  select nullif(split_part(regexp_replace(regexp_replace(lower(coalesce(p_url,'')), '^https?://', ''), '^www\\.', ''), '/', 1), '')
$$;

create or replace function public.mask_phone_last4(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(p_phone,''), '\\D', '', 'g') = '' then null
    else right(regexp_replace(coalesce(p_phone,''), '\\D', '', 'g'), 4)
  end
$$;

-- Start a claim. This enforces the core security rule:
-- automated methods only use phone/domain that already exists on the business row before the claim starts.
create or replace function public.start_business_claim(
  p_business_id uuid,
  p_method text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business public.businesses%rowtype;
  v_claim_id uuid;
  v_domain text;
  v_last4 text;
  v_recent_attempts int;
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  if p_method not in ('phone_otp','domain_email','website_code','document') then raise exception 'invalid claim method'; end if;

  select * into v_business from public.businesses where id = p_business_id;
  if not found then raise exception 'business not found'; end if;

  select count(*) into v_recent_attempts
  from public.business_claims
  where business_id = p_business_id
    and created_at > now() - interval '7 days';
  if v_recent_attempts >= 3 then raise exception 'too many recent claim attempts for this business'; end if;

  if exists (
    select 1 from public.business_claims
    where claimant_id = v_uid
      and status in ('started','proof_sent','under_review')
  ) then
    raise exception 'you already have a pending claim';
  end if;

  if v_business.verification_status = 'verified' and v_business.claimed_by is not null and v_business.claimed_by is distinct from v_uid then
    update public.businesses set verification_status = 'contested', updated_at = now() where id = p_business_id;
  end if;

  if p_method = 'phone_otp' then
    if nullif(trim(coalesce(v_business.phone,'')),'') is null then raise exception 'this listing has no pre-existing phone number for OTP'; end if;
    v_last4 := public.mask_phone_last4(v_business.phone);
    insert into public.business_claims(business_id, claimant_id, method, status, evidence_channel)
    values (p_business_id, v_uid, 'phone_otp', 'proof_sent', concat('phone_last4:', v_last4))
    returning id into v_claim_id;

    insert into public.verification_events(business_id, claim_id, method, phone_last4, outcome, created_at)
    values (p_business_id, v_claim_id, 'phone_otp', v_last4, 'otp_requested_not_sent_until_provider_configured', now());

    return v_claim_id;
  end if;

  if p_method = 'domain_email' then
    v_domain := public.histreets_domain_from_url(v_business.website);
    if v_domain is null then raise exception 'this listing has no pre-existing website domain'; end if;
    if v_domain ~ '(gmail|googlemail|outlook|hotmail|yahoo|icloud|aol|live)\\.' then raise exception 'public email domains cannot verify a business'; end if;
    insert into public.business_claims(business_id, claimant_id, method, status, evidence_channel)
    values (p_business_id, v_uid, 'domain_email', 'started', concat('domain:', v_domain))
    returning id into v_claim_id;

    insert into public.verification_events(business_id, claim_id, method, domain, outcome, created_at)
    values (p_business_id, v_claim_id, 'domain_email', v_domain, 'domain_claim_started', now());

    return v_claim_id;
  end if;

  if p_method = 'website_code' then
    v_domain := public.histreets_domain_from_url(v_business.website);
    if v_domain is null then raise exception 'this listing has no pre-existing website domain'; end if;
    insert into public.business_claims(business_id, claimant_id, method, status, evidence_channel)
    values (p_business_id, v_uid, 'website_code', 'started', concat('domain:', v_domain))
    returning id into v_claim_id;

    insert into public.verification_events(business_id, claim_id, method, domain, outcome, created_at)
    values (p_business_id, v_claim_id, 'website_code', v_domain, 'website_code_claim_started', now());

    return v_claim_id;
  end if;

  -- Document fallback. User uploads document through private bucket, then calls attach_claim_document.
  insert into public.business_claims(business_id, claimant_id, method, status, evidence_channel)
  values (p_business_id, v_uid, 'document', 'started', 'document')
  returning id into v_claim_id;

  insert into public.verification_events(business_id, claim_id, method, outcome, created_at)
  values (p_business_id, v_claim_id, 'document', 'document_claim_started', now());

  return v_claim_id;
end $$;

grant execute on function public.start_business_claim(uuid,text) to authenticated;

create or replace function public.attach_claim_document(
  p_claim_id uuid,
  p_document_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_claim public.business_claims%rowtype;
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  select * into v_claim from public.business_claims where id = p_claim_id and claimant_id = v_uid;
  if not found then raise exception 'claim not found'; end if;
  if v_claim.method <> 'document' then raise exception 'document can only be attached to document claims'; end if;
  if v_claim.status not in ('started','proof_sent') then raise exception 'claim is not editable'; end if;
  update public.business_claims
  set document_url = p_document_url, status = 'under_review'
  where id = p_claim_id;

  insert into public.verification_events(business_id, claim_id, method, outcome, created_at)
  values (v_claim.business_id, v_claim.id, 'document', 'document_uploaded_under_review', now());
end $$;

grant execute on function public.attach_claim_document(uuid,text) to authenticated;

create or replace function public.admin_decide_business_claim(
  p_claim_id uuid,
  p_approved boolean,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_claim public.business_claims%rowtype;
begin
  if public.current_user_role() <> 'admin' then raise exception 'admin only'; end if;
  select * into v_claim from public.business_claims where id = p_claim_id;
  if not found then raise exception 'claim not found'; end if;

  update public.business_claims
  set status = case when p_approved then 'approved' else 'rejected' end,
      decided_by = v_admin,
      decided_at = now(),
      ai_notes = coalesce(ai_notes, '{}'::jsonb) || jsonb_build_object('admin_reason', coalesce(p_reason,''))
  where id = p_claim_id;

  if p_approved then
    update public.businesses
    set claimed_by = v_claim.claimant_id,
        verification_status = 'verified',
        verified_via = v_claim.method,
        verified_at = now(),
        updated_at = now()
    where id = v_claim.business_id;
  end if;

  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values (v_admin, case when p_approved then 'approve_business_claim' else 'reject_business_claim' end, 'business_claim', p_claim_id, jsonb_build_object('reason', coalesce(p_reason,'')));
end $$;

grant execute on function public.admin_decide_business_claim(uuid,boolean,text) to authenticated;

notify pgrst, 'reload schema';
