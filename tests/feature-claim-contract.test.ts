import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('public feature claims have implementation entry points rather than placeholder-only UI', async () => {
  const app = await read('src/App.tsx')
  const map = await read('src/components/MapView.tsx')
  const feeds = await read('src/components/Feeds.tsx')
  const search = await read('src/components/SmartMapSearch.tsx')
  const hipulse = await read('src/components/HiPulse.tsx')
  const ai = await read('src/lib/ai.ts')
  const profile = await read('src/components/Profile.tsx')

  assert.match(app, /MapView/)
  assert.match(app, /Feeds/)
  assert.match(app, /Profile/)
  assert.match(map, /SmartMapSearch/)
  assert.match(search, /Ask HiStreets AI/)
  assert.match(ai, /functions\.invoke\('histreets-ai'/)
  assert.match(hipulse, /buildHiPulseSnapshot/)
  assert.match(feeds, /job/)
  assert.match(feeds, /offer/)
  assert.match(feeds, /community/)
  assert.match(profile, /signInWithPassword/)
  assert.match(profile, /signUp/)
  assert.match(profile, /resetPasswordForEmail/)
})

test('parking remains explicitly unavailable instead of being falsely presented as live', async () => {
  const data = await read('src/lib/data.ts')
  const readme = await read('README.md')
  assert.match(data, /Parking is not active in this version/)
  assert.match(readme, /Parking section kept as coming soon/i)
})
