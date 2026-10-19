-- User-supplied feedback is private. This does not verify a respondent's identity.
create schema if not exists feedback_private;
revoke all on schema feedback_private from public, anon, authenticated;

create table public.user_feedback (
  id uuid primary key,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  organisation text not null default '' check (char_length(organisation) <= 160),
  role text not null default '' check (char_length(role) <= 100),
  started_on date check (started_on >= date '2020-01-01'),
  features_used text[] not null default '{}' check (cardinality(features_used) <= 8 and array_position(features_used, null) is null and features_used <@ array['Business listings and map','Offers','Jobs','Community support','Ask HiStreets AI','Business Copilot','Business workspace','Other']::text[]),
  experience text not null check (char_length(btrim(experience)) between 10 and 2000),
  improvements text not null default '' check (char_length(improvements) <= 1500),
  planned_use text not null default '' check (char_length(planned_use) <= 1500),
  quote_consent boolean not null default false,
  consent_version text not null default '2026-10-20-v1',
  created_at timestamptz not null default now()
);
create index user_feedback_created_at_idx on public.user_feedback(created_at desc);
alter table public.user_feedback enable row level security;
revoke all on public.user_feedback from public, anon, authenticated;
grant insert (id,name,email,organisation,role,started_on,features_used,experience,improvements,planned_use,quote_consent) on public.user_feedback to anon, authenticated;
grant select on public.user_feedback to authenticated;
grant all on public.user_feedback to service_role;
create policy feedback_submit on public.user_feedback for insert to anon, authenticated with check (true);
create policy feedback_founder_read on public.user_feedback for select to authenticated using ((select public.current_user_role()) = 'super_admin');

create table feedback_private.user_feedback_limits (
  key text primary key,
  hits integer not null,
  window_start timestamptz not null
);
alter table feedback_private.user_feedback_limits enable row level security;
revoke all on feedback_private.user_feedback_limits from public, anon, authenticated;

-- Only a table trigger can call this function. Elevated access is confined to
-- the private quota table; it is not a callable public RPC or admin operation.
create function feedback_private.guard_user_feedback() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  network text;
  quota integer;
begin
  new.email := lower(btrim(new.email));
  new.name := btrim(new.name);
  new.created_at := now();
  new.consent_version := '2026-10-20-v1';
  if new.started_on > (now() at time zone 'Europe/London')::date then
    raise exception 'Start date cannot be in the future' using errcode = '22023';
  end if;
  -- Email and gateway network limits are basic abuse controls, not identity verification.
  network := btrim(split_part(coalesce(nullif(headers->>'x-forwarded-for',''), 'unknown'), ',', 1));
  insert into feedback_private.user_feedback_limits as q (key,hits,window_start)
  values ('network:' || md5(network),1,now())
  on conflict (key) do update set
    hits = case when q.window_start < now() - interval '1 hour' then 1 else q.hits + 1 end,
    window_start = case when q.window_start < now() - interval '1 hour' then now() else q.window_start end
  returning hits into quota;
  if quota > 20 then raise exception 'Feedback limit reached' using errcode = 'P0001'; end if;
  insert into feedback_private.user_feedback_limits as q (key,hits,window_start)
  values ('email:' || md5(new.email),1,now())
  on conflict (key) do update set
    hits = case when q.window_start < now() - interval '1 day' then 1 else q.hits + 1 end,
    window_start = case when q.window_start < now() - interval '1 day' then now() else q.window_start end
  returning hits into quota;
  if quota > 3 then raise exception 'Feedback limit reached' using errcode = 'P0001'; end if;
  delete from feedback_private.user_feedback_limits where window_start < now() - interval '2 days';
  return new;
end
$$;
revoke all on function feedback_private.guard_user_feedback() from public, anon, authenticated;
create trigger guard_user_feedback before insert on public.user_feedback
for each row execute function feedback_private.guard_user_feedback();
comment on table public.user_feedback is 'Private user feedback. Respondent identities, email addresses and usage dates are self-reported. Consent permits quotations in HiStreets project materials; email addresses are never included in public quotes.';
