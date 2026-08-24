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

test('final business CSS preserves user zoom and mobile-safe input sizing', async () => {
  const css = await read('src/final-business.css')
  const html = await read('index.html')
  assert.match(css, /profile-screen input.*font-size:16px!important/s)
  assert.match(css, /@media\(min-width:760px\)/)
  assert.match(css, /bottom-tabs.*width:min\(728px/s)
  assert.doesNotMatch(html, /user-scalable=no/)
  assert.doesNotMatch(html, /maximum-scale=1/)
})
