create index if not exists business_invitations_invited_by_idx
  on public.business_invitations (invited_by);

create index if not exists business_memberships_invited_by_idx
  on public.business_memberships (invited_by);

drop policy if exists business_invitations_read_authorised on public.business_invitations;
create policy business_invitations_read_authorised
on public.business_invitations for select to authenticated
using (
  lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  or (select public.business_membership_role(business_id)) in ('owner','manager','platform')
);
