import test from 'node:test'
import assert from 'node:assert/strict'
import { requireAiConsent } from '../src/lib/ai-consent'

test('AI sharing requires an affirmative boolean choice', () => {
  for (const value of [undefined, null, false, 1, 'true']) {
    assert.throws(() => requireAiConsent(value as boolean), /agree to share/)
  }
  assert.doesNotThrow(() => requireAiConsent(true))
})
