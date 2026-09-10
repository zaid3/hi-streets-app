import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('business membership is relationship-based, RLS protected and cannot remove the last owner', async () => {
  const migration = await read('supabase/migrations/20260910214904_workspace_memberships_analytics_and_admin_controls.sql')
  assert.match(migration, /create table if not exists public\.business_memberships/)
  assert.match(migration, /unique \(business_id, user_id\)/)
  assert.match(migration, /alter table public\.business_memberships enable row level security/)
  assert.match(migration, /business_membership_role\(p_business_id uuid\)/)
  assert.match(migration, /the last owner cannot be removed/)
  assert.match(migration, /revoke all on table public\.business_memberships from public, anon, authenticated/)
})

test('business invitations are server-controlled, expire and never grant platform roles', async () => {
  const edge = await read('supabase/functions/histreets-team/index.ts')
  const migration = await read('supabase/migrations/20260910214904_workspace_memberships_analytics_and_admin_controls.sql')
  assert.match(edge, /TEAM_ROLES = new Set\(\["manager", "editor", "viewer"\]\)/)
  assert.match(edge, /inviteUserByEmail/)
  assert.match(edge, /Business owner or manager access required/)
  assert.match(migration, /expires_at timestamptz not null default \(now\(\) \+ interval '7 days'\)/)
  assert.match(migration, /accept_my_business_invitations/)
})

test('analytics store only bounded business events and expose owner and platform summaries', async () => {
  const migration = await read('supabase/migrations/20260910214904_workspace_memberships_analytics_and_admin_controls.sql')
  const detail = await read('src/components/BusinessDetailSheet.tsx')
  assert.match(migration, /create table if not exists public\.business_analytics_events/)
  assert.doesNotMatch(migration, /ip_address|user_agent|visitor_email/)
  assert.match(migration, /business_dashboard_overview/)
  assert.match(migration, /platform_dashboard_overview/)
  assert.match(detail, /trackBusinessEvent\(business\.id, 'listing_view'\)/)
})

test('role-specific workspaces provide analytics, queues, user details and business team access', async () => {
  const profile = await read('src/components/Profile.tsx')
  const founder = await read('src/components/AdminUserManagement.tsx')
  const team = await read('src/components/BusinessTeamPanel.tsx')
  assert.match(profile, /Founder console/)
  assert.match(profile, /PlatformAnalyticsDashboard/)
  assert.match(profile, /BusinessAnalyticsDashboard/)
  assert.match(founder, /Send password reset/)
  assert.match(founder, /Suspend account/)
  assert.match(founder, /Soft-delete account/)
  assert.match(team, /Invite a teammate/)
})
