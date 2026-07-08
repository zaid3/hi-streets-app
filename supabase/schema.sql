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

create index if not exists businesses_location_idx on public.businesses(lat,lng);
create index if not exists offers_live_idx on public.offers(is_active,expires_at);
create index if not exists offers_business_idx on public.offers(business_id);

alter table public.businesses enable row level security;
alter table public.offers enable row level security;

drop policy if exists "public read verified businesses" on public.businesses;
create policy "public read verified businesses" on public.businesses
for select using (is_verified = true);

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

drop policy if exists "owners manage businesses" on public.businesses;
create policy "owners manage businesses" on public.businesses
for all using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "owners manage offers" on public.offers;
create policy "owners manage offers" on public.offers
for all using (
  exists(select 1 from public.businesses b where b.id = offers.business_id and b.owner_user_id = auth.uid())
)
with check (
  exists(select 1 from public.businesses b where b.id = offers.business_id and b.owner_user_id = auth.uid())
);
