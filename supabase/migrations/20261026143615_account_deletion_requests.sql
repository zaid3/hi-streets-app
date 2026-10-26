-- A private intake queue. This does not delete accounts or send email.
-- The operator completes the existing account/data removal procedure.
create table public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  contact_email text not null default (auth.jwt() ->> 'email')
    check (char_length(contact_email) between 3 and 254),
  requested_at timestamptz not null default now(),
  notice_version text not null default '2026-10-26-v1'
);

alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from public, anon, authenticated;
grant select on public.account_deletion_requests to authenticated;
grant insert (user_id) on public.account_deletion_requests to authenticated;
grant select, insert, update, delete on public.account_deletion_requests to service_role;

create policy "Request deletion of own account"
  on public.account_deletion_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'false'
  );

create policy "Read own deletion request or founder queue"
  on public.account_deletion_requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.current_user_role()) = 'super_admin'
  );

comment on table public.account_deletion_requests is
  'Pending account/data deletion requests. Founder monitors daily and follows ACCOUNT-DELETION-OPERATIONS.md. Removal of Auth account removes the completed intake row.';
