import test from 'node:test'
import assert from 'node:assert/strict'
import { nativeDestination } from '../src/lib/nativeNavigation'
import { readFile } from 'node:fs/promises'
const origin = 'https://localhost'
test('native links keep only app routes inside the WebView', () => {
  assert.deepEqual(nativeDestination('/business?mode=recovery', origin), { kind:'internal', url:'/business?mode=recovery' })
  assert.equal(nativeDestination('/privacy.html', origin).url, 'https://app.histreets.uk/privacy.html')
  for (const url of ['javascript:alert(1)','data:text/html,Hello','file:///tmp/key','intent://test','https://user:pass@example.com','https://localhost/unknown']) assert.equal(nativeDestination(url,origin).kind,'blocked')
  assert.equal(nativeDestination('https://example.com/listing',origin).kind,'external')
  assert.equal(nativeDestination('tel:+442000000000',origin).kind,'system')
  assert.equal(nativeDestination('mailto:help@example.com',origin).kind,'system')
})
test('native origins are added without changing backend authorization logic', async () => {
  const { execFileSync } = await import('node:child_process')
  for (const name of ['histreets-ai','histreets-team','histreets-admin-users','histreets-opportunity']) {
    const path = `supabase/functions/${name}/index.ts`
    const original = execFileSync('git',['show',`f61e557f3a227a78088fe192f3b12b16e94843a1:${path}`],{encoding:'utf8'})
    const current = await readFile(path,'utf8')
    const normalize = (text:string) => text.replace(/"https:\/\/localhost",\s*/g,'').replace(/"capacitor:\/\/localhost",\s*/g,'').replace(/\s/g,'')
    assert.equal(normalize(current), normalize(original))
    assert.match(current,/const ALLOWED_ORIGINS = new Set\(\[[\s\S]*?"https:\/\/localhost"[\s\S]*?"capacitor:\/\/localhost"/)
  }
})
test('production config rejects missing, local and privileged keys', async () => {
  const { validateMobileConfig } = await import('../scripts/mobile-config.mjs')
  const url = 'https://example.supabase.co'
  for (const key of ['', 'sb_secret_example', 'service-role']) assert.throws(() => validateMobileConfig({VITE_SUPABASE_URL:url,VITE_SUPABASE_ANON_KEY:key}))
  assert.throws(() => validateMobileConfig({VITE_SUPABASE_URL:'http://localhost',VITE_SUPABASE_ANON_KEY:'sb_publishable_test'}))
  const jwt = (role:string) => 'header.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.signature'
  assert.throws(() => validateMobileConfig({VITE_SUPABASE_URL:url,VITE_SUPABASE_ANON_KEY:jwt('service_role')}))
  assert.equal(validateMobileConfig({VITE_SUPABASE_URL:url,VITE_SUPABASE_ANON_KEY:jwt('anon')}).VITE_SUPABASE_URL,url)
  assert.equal(validateMobileConfig({VITE_SUPABASE_URL:url,VITE_SUPABASE_ANON_KEY:'sb_publishable_test'}).VITE_SUPABASE_ANON_KEY,'sb_publishable_test')
})
