import assert from 'node:assert/strict'
import test from 'node:test'
import { groqJson } from '../supabase/functions/histreets-ai/groq.ts'

const completion = (content: string, finish_reason = 'stop') => new Response(JSON.stringify({
  choices: [{ finish_reason, message: { content } }],
}), { headers: { 'Content-Type': 'application/json' } })

test('Groq adapter uses the supported model, JSON output, bounded tokens and header-only credentials', async () => {
  let calls = 0
  const result = await groqJson('Return JSON only', 'coffee in E6', 'test-key', async (url, init) => {
    calls++
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions')
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-key')
    const body = JSON.parse(String(init?.body))
    assert.equal(body.model, 'openai/gpt-oss-20b')
    assert.deepEqual(body.response_format, { type: 'json_object' })
    assert.equal(body.max_completion_tokens, 1024)
    assert.equal(body.reasoning_effort, 'low')
    assert.equal(body.stream, false)
    assert.equal(body.tools, undefined)
    assert.ok(!String(init?.body).includes('test-key'))
    return completion('{"area":"E6","business_terms":["coffee"]}')
  })
  assert.equal(calls, 1)
  assert.deepEqual(result, { area: 'E6', business_terms: ['coffee'] })
})

test('missing credentials fail without making a provider request', async () => {
  await assert.rejects(groqJson('JSON', 'test', '', async () => {
    assert.fail('A request must not be made without credentials')
  }), /not configured/)
})

test('provider errors fail once without exposing response content or retrying a paid service', async () => {
  for (const status of [401, 403, 429, 500, 503]) {
    let calls = 0
    await assert.rejects(groqJson('JSON', 'test', 'test-key', async () => {
      calls++
      return new Response('private prompt echoed by provider', { status })
    }), (error: Error) => !error.message.includes('private prompt') && /allowance|unavailable/.test(error.message))
    assert.equal(calls, 1)
  }
})

test('malformed, empty, non-object and truncated responses are rejected for local fallback', async () => {
  for (const value of ['invalid', '[]', 'null', '{}', '"text"']) {
    await assert.rejects(groqJson('JSON', 'test', 'test-key', async () => completion(value)))
  }
  await assert.rejects(groqJson('JSON', 'test', 'test-key', async () => completion('{"title":"x"}', 'length')), /incomplete/)
})

test('slow requests abort at eight seconds so the local fallback can respond', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const pending = groqJson('JSON', 'test', 'test-key', async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
  }))
  const rejected = assert.rejects(pending, /timed out/)
  t.mock.timers.tick(8000)
  await rejected
})
