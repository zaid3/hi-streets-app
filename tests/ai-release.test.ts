import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('Gemini secret stays server-side and frontend uses only the HiStreets function', async () => {
  const client = await read('src/lib/ai.ts')
  const edge = await read('supabase/functions/histreets-ai/index.ts')
  const allFrontend = [
    await read('src/lib/ai.ts'),
    await read('src/components/SmartMapSearch.tsx'),
    await read('src/components/PostComposer.tsx'),
  ].join('\n')

  assert.match(client, /functions\.invoke\('histreets-ai'/)
  assert.match(edge, /Deno\.env\.get\("GEMINI_API_KEY"\)/)
  assert.doesNotMatch(allFrontend, /GEMINI_API_KEY/)
  assert.doesNotMatch(allFrontend, /generativelanguage\.googleapis\.com/)
  assert.doesNotMatch(allFrontend, /VITE_GEMINI/)
})

test('resident AI can only return database-backed local results and has a no-invention fallback', async () => {
  const edge = await read('supabase/functions/histreets-ai/index.ts')
  const search = await read('src/components/SmartMapSearch.tsx')
  assert.match(edge, /from\("businesses_public"\)/)
  assert.match(edge, /from\("posts_public"\)/)
  assert.match(edge, /I won't invent a local listing/)
  assert.match(search, /Results come from verified HiStreets data/)
  assert.match(search, /Ask HiStreets AI/)
})

test('sensitive resident requests bypass external AI and cannot create commercial opportunity signals', async () => {
  const edge = await read('supabase/functions/histreets-ai/index.ts')
  assert.match(edge, /const isSensitive=SENSITIVE_TERMS\.test\(prompt\)/)
  assert.match(edge, /if\(isSensitive\)\{ intent=privateIntent\(prompt\); \}/)
  assert.match(edge, /commercial_signal_category:null/)
  assert.match(edge, /local_private_fallback/)
  assert.match(edge, /immigration\|visa\|asylum/)
  assert.match(edge, /food bank\|free meal/)
})

test('opportunity gap stores aggregate category counts only behind service-role access', async () => {
  const migration = await read('supabase/migrations/20260824_ai_rate_limits_and_opportunity_signals.sql')
  assert.match(migration, /create table if not exists public\.ai_opportunity_daily/)
  assert.match(migration, /food_drink.*jobs.*retail.*beauty.*local_services.*leisure/s)
  assert.doesNotMatch(migration, /prompt\s+text/i)
  assert.doesNotMatch(migration, /email\s+text/i)
  assert.match(migration, /revoke all on table public\.ai_opportunity_daily from anon, authenticated/)
  assert.match(migration, /grant select, insert, update, delete on table public\.ai_opportunity_daily to service_role/)
})

test('Business Copilot is authenticated, factual and cannot auto-publish', async () => {
  const edge = await read('supabase/functions/histreets-ai/index.ts')
  const composer = await read('src/components/PostComposer.tsx')
  assert.match(edge, /db\.auth\.getUser\(token\)/)
  assert.match(edge, /eq\("verification_status","verified"\)/)
  assert.match(edge, /Do not invent prices, pay, dates, opening hours/)
  assert.match(edge, /requires_owner_review:true,published:false/)
  assert.match(composer, /Use this draft/)
  assert.match(composer, /Submit post/)
  assert.match(composer, /It cannot publish without your review/)
})

test('iPhone search fields stay at 16px and keyboard state protects mobile navigation', async () => {
  const css = await read('src/smart-search.css')
  const businessCss = await read('src/business-copilot.css')
  const search = await read('src/components/SmartMapSearch.tsx')
  assert.match(css, /smart-search-field input[^}]*font-size:16px!important/)
  assert.doesNotMatch(css, /smart-search-field input\{[^}]*font-size:1[0-5]px/i)
  assert.match(search, /window\.visualViewport/)
  assert.match(search, /histreets-keyboard-open/)
  assert.match(css, /histreets-keyboard-open \.bottom-tabs/)
  assert.match(css, /histreets-keyboard-open \.hipulse-fab/)
  assert.match(businessCss, /post-composer input.*font-size:16px!important/s)
})
