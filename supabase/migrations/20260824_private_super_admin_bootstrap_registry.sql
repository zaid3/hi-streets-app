create table if not exists public.platform_super_admin_bootstrap (
  email text primary key,
  created_at timestamptz not null default now(),
  check (email = lower(email))
);

alter table public.platform_super_admin_bootstrap enable row level security;
revoke all on table public.platform_super_admin_bootstrap from anon, authenticated;
grant select, insert, update, delete on table public.platform_super_admin_bootstrap to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bootstrap_admin boolean := false;
begin
  select exists(
    select 1 from public.platform_super_admin_bootstrap b
    where b.email = lower(coalesce(new.email,''))
  ) into v_bootstrap_admin;

  insert into public.profiles(id, display_name, role)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    case when v_bootstrap_admin then 'super_admin' else 'user' end
  )
  on conflict(id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name),
        role = case when v_bootstrap_admin then 'super_admin' else public.profiles.role end;
  return new;
end
$$;

-- Production bootstrap identities are inserted separately through a secure
-- service/admin operation and are intentionally not committed to source.
