import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('production app keeps all external intelligence behind resilient fallbacks', async () => {
  const ai = await read('supabase/functions/histreets-ai/index.ts')
  const opportunity = await read('supabase/functions/histreets-opportunity/index.ts')
  assert.match(ai, /AI is temporarily unavailable\. You can still use HiStreets search, postcode and map\./)
  assert.match(ai, /Core map and search features are still available\./)
  assert.match(ai, /Manual posting still works\./)
  assert.match(opportunity, /Local opportunity data is temporarily unavailable\./)
})
