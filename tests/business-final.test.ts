import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('business access uses first-time email link and keeps password sign-in separate', async () => {
  const profile = await read('src/components/Profile.tsx')
  assert.match(profile, /signInWithOtp/)
  assert.match(profile, /shouldCreateUser: true/)
  assert.match(profile, /emailRedirectTo: `\$\{window\.location\.origin\}\/business`/)
  assert.match(profile, /signInWithPassword/)
  assert.match(profile, /No separate sign-up form is needed/)
})

test('Super Admin management is server-side and blocks self-demotion', async () => {
  const component = await read('src/components/AdminUserManagement.tsx')
  const edge = await read('supabase/functions/histreets-admin-users/index.ts')
  assert.match(component, /histreets-admin-users/)
  assert.match(edge, /profile\?\.role !== 'super_admin'/)
  assert.match(edge, /targetId === user\.id && nextRole !== 'super_admin'/)
  assert.match(edge, /admin\.auth\.admin\.listUsers/)
  assert.match(edge, /profiles.*upsert/s)
})

test('bootstrap admin identity is private and not committed to source', async () => {
  const migration = await read('supabase/migrations/20260824_private_super_admin_bootstrap_registry.sql')
  const profile = await read('src/components/Profile.tsx')
  const edge = await read('supabase/functions/histreets-admin-users/index.ts')
  const source = `${migration}\n${profile}\n${edge}`
  assert.match(migration, /platform_super_admin_bootstrap/)
  assert.match(migration, /revoke all on table public\.platform_super_admin_bootstrap from anon, authenticated/)
  assert.doesNotMatch(source, /zaid39@atomicmai\.io/i)
})

test('final business database contract includes registration, ownership and Super Admin moderation', async () => {
  const migration = await read('supabase/migrations/20260824_final_business_admin_contract_and_private_storage.sql')
  assert.match(migration, /profiles_role_check[\s\S]*super_admin/)
  assert.match(migration, /function public\.register_my_business/)
  assert.match(migration, /function public\.admin_moderate_business_registration/)
  assert.match(migration, /function public\.admin_dashboard_overview/)
  assert.match(migration, /function public\.admin_business_verification_evidence/)
  assert.match(migration, /function public\.request_business_ownership/)
  assert.match(migration, /function public\.admin_moderate_ownership_request/)
  assert.match(migration, /current_user_role\(\) not in \('admin','super_admin'\)/)
})

test('job CVs and verification evidence are private and browser access is least-privilege', async () => {
  const migration = await read('supabase/migrations/20260824_final_business_admin_contract_and_private_storage.sql')
  assert.match(migration, /update storage\.buckets set public=false where id='job-cvs'/)
  assert.match(migration, /business-verification','business-verification',false/)
  assert.match(migration, /drop policy if exists public_read_job_cvs/)
  assert.match(migration, /authenticated_read_job_cvs/)
  assert.match(migration, /can_read_job_cv/)
  assert.match(migration, /can_manage_business_evidence/)
})

test('dangerous maintenance and import operations are not executable by browser roles', async () => {
  const migration = await read('supabase/migrations/20260824_final_business_admin_contract_and_private_storage.sql')
  const hardening = await read('supabase/migrations/20260824_final_rpc_execution_hardening.sql')
  assert.match(migration, /businesses_backup enable row level security/)
  assert.match(migration, /filter_businesses_to_newham\(\) from public,anon,authenticated/)
  assert.match(migration, /upsert_boundary\(text,jsonb,text\) from public,anon,authenticated/)
  assert.match(migration, /business_research_export\(\) from public,anon,authenticated/)
  assert.match(hardening, /apply_overture_business_enrichment[\s\S]*from public,anon,authenticated/)
  assert.match(hardening, /upsert_osm_business[\s\S]*from public,anon,authenticated/)
  assert.match(hardening, /upsert_overture_place[\s\S]*from public,anon,authenticated/)
  assert.match(hardening, /handle_new_user\(\) from public,anon,authenticated/)
})

test('final business CSS preserves user zoom and mobile-safe input sizing', async () => {
  const css = await read('src/final-business.css')
  const html = await read('index.html')
  assert.match(css, /profile-screen input.*font-size:16px!important/s)
  assert.match(css, /auth-hero-title/)
  assert.match(css, /@media\(min-width:760px\)/)
  assert.match(css, /bottom-tabs.*width:min\(728px/s)
  assert.doesNotMatch(html, /user-scalable=no/)
  assert.doesNotMatch(html, /maximum-scale=1/)
})

test('Business owns vertical scrolling and keeps content clear of fixed navigation', async () => {
  const css = await read('src/business-scroll-fix.css')
  const main = await read('src/main.tsx')
  assert.match(main, /import '\.\/business-scroll-fix\.css'/)
  assert.match(css, /profile-screen\.business-shell/)
  assert.match(css, /overflow-y:auto!important/)
  assert.match(css, /overflow-x:hidden!important/)
  assert.match(css, /padding-bottom:calc\(168px \+ env\(safe-area-inset-bottom\)\)!important/)
  assert.match(css, /scroll-padding-bottom:calc\(168px \+ env\(safe-area-inset-bottom\)\)/)
})
