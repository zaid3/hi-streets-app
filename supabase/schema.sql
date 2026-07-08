-- Hi-Streets production-ready starting schema
-- Run in Supabase SQL editor before connecting real business accounts.

create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text default 'other',
  address text,
  lat double precision,
  lng double precision,
  phone text,
  whatsapp_phone text unique,
  website text,
  google_place_id text,
  is_verified boolean default false,
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  short_label text,
  description text not null,
  discount text,
  category text default 'other',
  expires_at timestamptz not null,
  is_active boolean default true,
  source text default 'portal' check (source in ('portal','whatsapp','admin','seed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.parking_segments (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  type text not null default 'free',
  color text default '#078d16',
  coords jsonb not null,
  lat double precision not null,
  lng double precision not null,
  name text,
  restriction text,
  hours text,
  max_stay text,
  tariff text,
  cpz text,
  spaces text,
  length text,
  is_car_park boolean default false,
  source text not null default 'curated',
  source_name text,
  council text,
  confidence text default 'high',
  data_note text,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists businesses_location_idx on public.businesses(lat,lng);
create index if not exists businesses_owner_idx on public.businesses(owner_user_id);
create index if not exists offers_live_idx on public.offers(is_active,expires_at);
create index if not exists offers_business_idx on public.offers(business_id);
create index if not exists parking_segments_location_idx on public.parking_segments(lat,lng);
create index if not exists parking_segments_verified_idx on public.parking_segments(is_verified,source,council);

create or replace function public.prevent_self_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = new.owner_user_id and new.is_verified is distinct from old.is_verified then
    raise exception 'Only an admin can change business verification status';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_self_verification_trigger on public.businesses;
create trigger prevent_self_verification_trigger
before update on public.businesses
for each row execute function public.prevent_self_verification();

alter table public.businesses enable row level security;
alter table public.offers enable row level security;
alter table public.parking_segments enable row level security;

drop policy if exists "public read verified parking segments" on public.parking_segments;
create policy "public read verified parking segments" on public.parking_segments
for select using (is_verified = true);

drop policy if exists "public read verified businesses" on public.businesses;
create policy "public read verified businesses" on public.businesses
for select using (is_verified = true);

drop policy if exists "owners read businesses" on public.businesses;
create policy "owners read businesses" on public.businesses
for select using (auth.uid() = owner_user_id);

drop policy if exists "owners create businesses" on public.businesses;
create policy "owners create businesses" on public.businesses
for insert with check (auth.uid() = owner_user_id and is_verified = false);

drop policy if exists "owners update businesses" on public.businesses;
create policy "owners update businesses" on public.businesses
for update using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "owners manage businesses" on public.businesses;

drop policy if exists "public read live offers" on public.offers;
create policy "public read live offers" on public.offers
for select using (
  is_active = true
  and expires_at > now()
  and exists (
    select 1 from public.businesses b
    where b.id = offers.business_id and b.is_verified = true
  )
);

drop policy if exists "owners read offers" on public.offers;
create policy "owners read offers" on public.offers
for select using (
  exists(select 1 from public.businesses b where b.id = offers.business_id and b.owner_user_id = auth.uid())
);

drop policy if exists "owners create offers" on public.offers;
create policy "owners create offers" on public.offers
for insert with check (
  exists(select 1 from public.businesses b where b.id = offers.business_id and b.owner_user_id = auth.uid() and b.is_verified = true)
);

drop policy if exists "owners update offers" on public.offers;
create policy "owners update offers" on public.offers
for update using (
  exists(select 1 from public.businesses b where b.id = offers.business_id and b.owner_user_id = auth.uid())
)
with check (
  exists(select 1 from public.businesses b where b.id = offers.business_id and b.owner_user_id = auth.uid())
);

drop policy if exists "owners manage offers" on public.offers;
