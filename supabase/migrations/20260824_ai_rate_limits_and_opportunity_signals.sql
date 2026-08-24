create table if not exists public.ai_request_buckets (
  key_hash text not null,
  bucket_date date not null default (timezone('utc', now())::date),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (key_hash, bucket_date)
);

alter table public.ai_request_buckets enable row level security;
revoke all on table public.ai_request_buckets from anon, authenticated;
grant select, insert, update, delete on table public.ai_request_buckets to service_role;

create table if not exists public.ai_opportunity_daily (
  area text not null check (char_length(area) between 2 and 16),
  category text not null check (category in ('food_drink','jobs','retail','beauty','local_services','leisure')),
  signal_date date not null default (timezone('utc', now())::date),
  signal_count integer not null default 0 check (signal_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (area, category, signal_date)
);

alter table public.ai_opportunity_daily enable row level security;
revoke all on table public.ai_opportunity_daily from anon, authenticated;
grant select, insert, update, delete on table public.ai_opportunity_daily to service_role;

create or replace function public.consume_ai_quota(p_key_hash text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_key_hash is null or length(p_key_hash) < 8 or p_limit < 1 then
    return false;
  end if;

  insert into public.ai_request_buckets(key_hash, bucket_date, request_count, updated_at)
  values (p_key_hash, timezone('utc', now())::date, 1, now())
  on conflict (key_hash, bucket_date)
  do update set request_count = public.ai_request_buckets.request_count + 1,
                updated_at = now()
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_ai_quota(text, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(text, integer) to service_role;

create or replace function public.record_ai_opportunity_signal(p_area text, p_category text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_category not in ('food_drink','jobs','retail','beauty','local_services','leisure') then
    return;
  end if;

  insert into public.ai_opportunity_daily(area, category, signal_date, signal_count, updated_at)
  values (upper(trim(p_area)), p_category, timezone('utc', now())::date, 1, now())
  on conflict (area, category, signal_date)
  do update set signal_count = public.ai_opportunity_daily.signal_count + 1,
                updated_at = now();
end;
$$;

revoke all on function public.record_ai_opportunity_signal(text, text) from public, anon, authenticated;
grant execute on function public.record_ai_opportunity_signal(text, text) to service_role;

create index if not exists ai_request_buckets_updated_at_idx on public.ai_request_buckets(updated_at);
create index if not exists ai_opportunity_daily_date_idx on public.ai_opportunity_daily(signal_date desc, area, category);
