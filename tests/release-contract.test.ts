import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('PWA manifest launches the Newham map as a standalone app', async () => {
  const manifest = JSON.parse(await read('public/manifest.json'))
  assert.equal(manifest.start_url, '/map')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.name, 'HiStreets')
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0)
})

test('mobile viewport supports safe-area devices', async () => {
  const html = await read('index.html')
  assert.match(html, /name="viewport"[^>]*viewport-fit=cover/)
  assert.match(html, /rel="manifest" href="\/manifest\.json"/)
})

test('map location flow is user initiated and HTTPS aware', async () => {
  const mapView = await read('src/components/MapView.tsx')
  assert.match(mapView, /Use your location\?/)
  assert.match(mapView, /onClick=\{requestUserLocation\}/)
  assert.match(mapView, /window\.isSecureContext/)
  assert.match(mapView, /navigator\.geolocation\.getCurrentPosition/)
  assert.match(mapView, /enableHighAccuracy:\s*true/)
  assert.match(mapView, /PERMISSION_DENIED/)
  assert.match(mapView, /TIMEOUT/)
})

test('service worker has a navigation-safe offline fallback', async () => {
  const serviceWorker = await read('public/sw.js')
  assert.match(serviceWorker, /request\.mode === 'navigate'/)
  assert.match(serviceWorker, /HiStreets is offline/)
  assert.match(serviceWorker, /status:\s*503/)
})

test('release keeps parking disabled until reliable data exists', async () => {
  const readme = await read('README.md')
  assert.match(readme, /Parking section kept as coming soon/i)
  assert.match(readme, /No fake businesses, jobs, offers, meals or parking/i)
})
