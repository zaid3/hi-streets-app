import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('favicon and PWA assets use the HiStreets dark and orange brand', async () => {
  const html = await read('index.html')
  const manifest = await read('public/manifest.json')
  const icon = await read('public/icon.svg')
  const icon192 = await read('public/icon-192.svg')
  const icon512 = await read('public/icon-512.svg')

  assert.match(html, /theme-color" content="#0A0A0A"/)
  assert.match(html, /rel="icon" href="\/icon\.svg"/)
  assert.match(html, /apple-touch-icon[\s\S]*\/apple-touch-icon\.png/)
  assert.match(manifest, /"background_color": "#0A0A0A"/)
  assert.match(manifest, /"theme_color": "#0A0A0A"/)

  for (const source of [icon, icon192, icon512]) {
    assert.match(source, /#0A0A0A/)
    assert.match(source, /#FF681F/)
    assert.match(source, /#FFFFFF/)
    assert.doesNotMatch(source, /#0F6E6B|#F2762E/)
  }
})
