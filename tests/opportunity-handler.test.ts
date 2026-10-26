import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../supabase/functions/histreets-opportunity/index.ts', import.meta.url), 'utf8')
// Execute the real handler with an isolated database; no network or production data.
const executable = ts.transpileModule(source.replace(/^import .+;\s*$/gm, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

async function requestOpportunity(offers: { count: number | null; error: unknown }, signalCount = 5) {
  let handler: (request: Request) => Promise<Response>
  const reads: string[] = []
  const fixtures: Record<string, unknown> = {
    profiles: { data: { role: 'user' }, error: null },
    businesses: { data: { id: 'business-1', name: 'Local Cafe', address: 'Newham E15 1AA', category: 'cafe', verification_status: 'verified', claimed_by: 'owner-1' }, error: null },
    ai_opportunity_daily: { data: [{ signal_count: signalCount }], error: null },
    posts_public: offers,
  }
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: 'owner-1' } } }) },
    from(table: string) {
      reads.push(table)
      assert.ok(Object.hasOwn(fixtures, table), `Unexpected table: ${table}`)
      const result = fixtures[table]
      const query: Record<string, any> = {
        maybeSingle: async () => result,
        then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
      }
      for (const method of ['select', 'eq', 'gte', 'ilike']) query[method] = () => query
      return query
    },
  }
  vm.runInNewContext(executable, {
    Deno: { env: { get: () => 'test-only' }, serve: (callback: typeof handler) => { handler = callback } },
    createClient: () => db,
    Response,
    exports: {},
  })
  const response = await handler!(new Request('https://example.invalid/opportunity', {
    method: 'POST',
    headers: { origin: 'https://app.histreets.uk', authorization: 'Bearer test-only', 'content-type': 'application/json' },
    body: JSON.stringify({ business_id: 'business-1' }),
  }))
  return { response, body: await response.json(), reads }
}

test('an offer lookup failure does not become a zero-supply opportunity', async () => {
  const { response, body } = await requestOpportunity({ count: null, error: { message: 'private database detail' } })
  assert.equal(response.status, 503)
  assert.equal(body.error, 'Local opportunity data is temporarily unavailable.')
  assert.equal(body.live_offer_count, undefined)
  assert.equal(body.suggestion, undefined)
  assert.doesNotMatch(JSON.stringify(body), /private database detail/)
})

test('a missing exact count is unavailable rather than zero', async () => {
  const { response, body } = await requestOpportunity({ count: null, error: null })
  assert.equal(response.status, 503)
  assert.equal(body.eligible, undefined)
})

test('a successful zero count remains a valid opportunity result', async () => {
  const { response, body } = await requestOpportunity({ count: 0, error: null })
  assert.equal(response.status, 200)
  assert.equal(body.eligible, true)
  assert.equal(body.live_offer_count, 0)
  assert.equal(body.signal_count, 5)
  assert.match(body.suggestion, /only 0 live offers/)
})

test('a successful positive count is preserved', async () => {
  const { response, body } = await requestOpportunity({ count: 7, error: null }, 15)
  assert.equal(response.status, 200)
  assert.equal(body.live_offer_count, 7)
  assert.equal(body.level, 'strong')
  assert.doesNotMatch(body.suggestion, /only 0/)
})

test('signals below the threshold do not query or expose offer counts', async () => {
  const { response, body, reads } = await requestOpportunity({ count: 0, error: null }, 4)
  assert.equal(response.status, 200)
  assert.equal(body.eligible, false)
  assert.equal(body.live_offer_count, undefined)
  assert.equal(reads.includes('posts_public'), false)
})
