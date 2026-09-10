import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('public listing failures remain visible and the map has a no-WebGL directory fallback', async () => {
  const app = await read('src/App.tsx')
  const data = await read('src/lib/data.ts')
  const map = await read('src/components/MapView.tsx')
  const css = await read('src/reliability-upgrades.css')

  assert.match(data, /if \(error\) throw error/)
  assert.match(app, /Live posts could not be loaded/)
  assert.match(app, /role="alert"/)
  assert.match(map, /map = new maplibregl\.Map/)
  assert.match(map, /setMapUnavailable\(true\)/)
  assert.match(map, /Explore Newham businesses/)
  assert.match(css, /\.map-fallback/)
})

test('business trust labels distinguish verified and unclaimed listings', async () => {
  const sheet = await read('src/components/BusinessDetailSheet.tsx')

  assert.match(sheet, /business\.verification_status === 'verified'/)
  assert.match(sheet, /Verified business/)
  assert.match(sheet, /Unclaimed listing/)
  assert.match(sheet, /Claim this listing/)
  assert.doesNotMatch(sheet, />Approved business</)
})

test('profile images use controlled storage uploads rather than pasted URLs', async () => {
  const data = await read('src/lib/data.ts')
  const profile = await read('src/components/OwnerBusinessProfile.tsx')

  assert.match(data, /storage\.from\('business-assets'\)\.upload/)
  assert.match(data, /5 \* 1024 \* 1024/)
  assert.match(profile, /uploadBusinessProfilePhoto/)
  assert.match(profile, /type="file"/)
  assert.doesNotMatch(profile, /update\('photo_url'/)
})

test('anonymous public reads do not evaluate privileged role policies', async () => {
  const migration = await read('supabase/migrations/20260908193514_fix_public_rls_role_evaluation.sql')

  assert.match(migration, /admin_read_all_businesses on public\.businesses for select to authenticated/)
  assert.match(migration, /admin_read_all_posts on public\.posts for select to authenticated/)
  assert.match(migration, /\(select public\.current_user_role\(\)\)/)
  assert.doesNotMatch(migration, /grant execute on function public\.current_user_role[^;]*anon/i)
})

test('structured posts and business assets preserve server-side ownership controls', async () => {
  const migration = await read('supabase/migrations/20260908194533_add_structured_posts_and_business_assets.sql')
  const hardening = await read('supabase/migrations/20260908202000_harden_job_applications_and_rls_performance.sql')
  const publishing = await read('supabase/migrations/20260908204000_restore_safe_post_auto_approval_v2.sql')
  const composer = await read('src/components/PostComposer.tsx')

  assert.match(migration, /posts add column if not exists details jsonb/)
  assert.match(migration, /business-assets/)
  assert.match(migration, /b\.claimed_by=\(select auth\.uid\(\)\)/)
  assert.match(migration, /security_invoker=true/)
  assert.match(migration, /already submitted for this job/)
  assert.match(hardening, /invalid CV path/)
  assert.match(hardening, /CV upload not found/)
  assert.match(publishing, /histreets_post_auto_approval_reason/)
  assert.match(publishing, /v_status := 'live'/)
  assert.match(publishing, /post_needs_review/)
  assert.match(composer, /cv_required/)
  assert.match(composer, /employment_type/)
  assert.match(composer, /redemption/)
})
