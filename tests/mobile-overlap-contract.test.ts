import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('mobile auth overlap guard is loaded after the website theme and resets legacy positioning', async () => {
  const main = await read('src/main.tsx')
  const css = await read('src/final-mobile-overlap-fix.css')
  const themePos = main.indexOf("import './exact-website-theme.css'")
  const guardPos = main.indexOf("import './final-mobile-overlap-fix.css'")
  assert.ok(themePos >= 0)
  assert.ok(guardPos > themePos)
  assert.match(css, /\.profile-screen\.business-shell\.auth-screen/)
  assert.match(css, /gap:16px!important/)
  assert.match(css, /\.auth-screen \.auth-card-final[\s\S]*transform:none!important/)
  assert.match(css, /\.auth-screen \.auth-card-final[\s\S]*inset:auto!important/)
})
