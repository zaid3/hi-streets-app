import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('returning businesses skip repetitive onboarding by default', async () => {
  const source = await read('src/components/BusinessOnboarding.tsx')
  assert.match(source, /Promise\.all\(\[loadMyBusinesses\(\), loadMyOwnershipRequests\(\)\]\)/)
  assert.match(source, /setShowTools\(businessRows\.length === 0 && requestRows\.length === 0\)/)
  assert.match(source, /Connected to HiStreets/)
  assert.match(source, /Your local business workspace is ready/)
  assert.match(source, /Claim or add another business/)
  assert.match(source, /Back to Manage & grow/)
})

test('first-time and fallback users retain the existing claim and registration flows', async () => {
  const source = await read('src/components/BusinessOnboarding.tsx')
  assert.match(source, /<BusinessOwnershipRequestForm \/>/)
  assert.match(source, /<BusinessRegistration \/>/)
  assert.match(source, /setLoadFailed\(true\)/)
  assert.match(source, /setShowTools\(true\)/)
})

test('returning business summary remains responsive and touch-friendly', async () => {
  const css = await read('src/returning-business.css')
  const main = await read('src/main.tsx')
  assert.match(css, /connection-summary-row/)
  assert.match(css, /@media\(max-width:520px\)/)
  assert.match(css, /min-height:42px!important/)
  assert.match(main, /returning-business\.css/)
})
