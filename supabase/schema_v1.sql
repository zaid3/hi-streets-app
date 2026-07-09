create extension if not exists pgcrypto;

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

create index if not exists parking_segments_location_idx on public.parking_segments(lat,lng);
create index if not exists parking_segments_verified_idx on public.parking_segments(is_verified,source,council);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category text default 'other',
  address text default '',
  lat double precision not null,
  lng double precision not null,
  phone text default '',
  whatsapp_phone text,
  website text default '',
  google_place_id text default '',
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists businesses_owner_idx on public.businesses(owner_user_id);
create index if not exists businesses_verified_location_idx on public.businesses(is_verified,lat,lng);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  title text not null,
  short_label text,
  description text,
  discount text,
  category text default 'other',
  expires_at timestamptz not null,
  is_active boolean default true,
  source text default 'portal',
  created_at timestamptz default now()
);

create index if not exists offers_live_idx on public.offers(is_active,expires_at,created_at desc);
create index if not exists offers_business_idx on public.offers(business_id);

alter table public.parking_segments enable row level security;
alter table public.businesses enable row level security;
alter table public.offers enable row level security;

drop policy if exists "public read verified parking segments" on public.parking_segments;
create policy "public read verified parking segments" on public.parking_segments for select using (is_verified = true);

drop policy if exists "public read verified businesses" on public.businesses;
create policy "public read verified businesses" on public.businesses for select using (is_verified = true);

drop policy if exists "owners read own businesses" on public.businesses;
create policy "owners read own businesses" on public.businesses for select using (auth.uid() = owner_user_id);

drop policy if exists "owners insert own businesses" on public.businesses;
create policy "owners insert own businesses" on public.businesses for insert with check (auth.uid() = owner_user_id);

drop policy if exists "owners update own businesses" on public.businesses;
create policy "owners update own businesses" on public.businesses for update using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "public read live verified offers" on public.offers;
create policy "public read live verified offers" on public.offers for select using (
  is_active = true
  and expires_at > now()
  and exists (select 1 from public.businesses b where b.id = business_id and b.is_verified = true)
);

drop policy if exists "business owners insert offers" on public.offers;
create policy "business owners insert offers" on public.offers for insert with check (
  exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid() and b.is_verified = true)
);

drop policy if exists "business owners read own offers" on public.offers;
create policy "business owners read own offers" on public.offers for select using (
  exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
);

notify pgrst, 'reload schema';
