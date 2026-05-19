-- Run this in your Supabase SQL editor
-- https://bbfmrxefabmhtlshgemu.supabase.co

-- Businesses table
create table if not exists businesses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  whatsapp_number text,
  lat float,
  lng float,
  place_id text,
  category text default 'other',
  verified boolean default false,
  google_maps_url text,
  created_at timestamptz default now()
);

-- Offers table
create table if not exists offers (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade,
  title text not null,
  short_label text,
  description text,
  discount text,
  is_active boolean default true,
  expires_at timestamptz,
  source text default 'portal',
  created_at timestamptz default now()
);

-- Enable realtime on offers
alter publication supabase_realtime add table offers;

-- Row level security
alter table businesses enable row level security;
alter table offers enable row level security;

-- Policies: anyone can read active offers
create policy "Public offers" on offers for select using (is_active = true);
-- Businesses can manage their own offers
create policy "Own offers" on offers for all using (
  business_id in (select id from businesses where user_id = auth.uid())
);
-- Users manage their own business
create policy "Own business" on businesses for all using (user_id = auth.uid());
