import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('favicon, PWA and app theme use the exact histreets.uk design system', async () => {
  const html = await read('index.html')
  const manifest = await read('public/manifest.json')
  const icon = await read('public/icon.svg')
  const icon192 = await read('public/icon-192.svg')
  const icon512 = await read('public/icon-512.svg')
  const theme = await read('src/exact-website-theme.css')
  const main = await read('src/main.tsx')

  assert.match(html, /theme-color" content="#0A3B39"/)
  assert.match(html, /Fraunces/)
  assert.match(html, /Instrument\+Sans/)
  assert.match(html, /Space\+Grotesk/)
  assert.match(html, /stop-color='%23EF6C34'/)
  assert.match(html, /stop-color='%23F4A24C'/)
  assert.match(html, /font-family='Georgia,serif'/)

  assert.match(manifest, /"background_color": "#062B2A"/)
  assert.match(manifest, /"theme_color": "#0A3B39"/)

  for (const source of [icon, icon192, icon512]) {
    assert.match(source, /#EF6C34/)
    assert.match(source, /#F4A24C/)
    assert.match(source, />H<\/text>/)
    assert.doesNotMatch(source, /#0A0A0A|#FF681F/)
  }

  assert.match(theme, /--ink:#062B2A/)
  assert.match(theme, /--teal:#0F6E6B/)
  assert.match(theme, /--teal-deep:#0A3B39/)
  assert.match(theme, /--teal-bright:#28B9AF/)
  assert.match(theme, /--amber:#F4A24C/)
  assert.match(theme, /--orange:#EF6C34/)
  assert.match(theme, /--sand:#F3EEE3/)
  assert.match(theme, /--cream:#FBF7EF/)
  assert.match(theme, /--paper:#FFFDF8/)
  assert.match(theme, /font-family:'Fraunces'/)
  assert.match(theme, /font-family:'Instrument Sans'/)
  assert.match(theme, /font-family:'Space Grotesk'/)
  assert.match(main, /import '\.\/exact-website-theme\.css'/)
})
