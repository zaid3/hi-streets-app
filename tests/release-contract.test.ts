import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('PWA manifest launches the Newham map as a standalone app', async () => {
  const manifest = JSON.parse(await read('public/manifest.json'))
  assert.equal(manifest.id, '/')
  assert.equal(manifest.start_url, '/map')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.orientation, 'any')
  assert.equal(manifest.name, 'HiStreets')
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0)
})

test('mobile viewport and iPhone standalone metadata are present', async () => {
  const html = await read('index.html')
  assert.match(html, /name="viewport"[^>]*viewport-fit=cover/)
  assert.match(html, /rel="manifest" href="\/manifest\.json"/)
  assert.match(html, /apple-mobile-web-app-capable/)
  assert.match(html, /apple-mobile-web-app-title/)
})

test('map location flow is user initiated, progressive and HTTPS aware', async () => {
  const mapView = await read('src/components/MapView.tsx')
  assert.match(mapView, /Use your location\?/)
  assert.match(mapView, /onClick=\{requestUserLocation\}/)
  assert.match(mapView, /window\.isSecureContext/)
  assert.match(mapView, /geolocation\.getCurrentPosition/)
  assert.match(mapView, /getReliablePosition\(navigator\.geolocation\)/)
  assert.match(mapView, /enableHighAccuracy:\s*false/)
  assert.match(mapView, /enableHighAccuracy:\s*true/)
  assert.match(mapView, /LOCATION_PROMPT_KEY/)
  assert.match(mapView, /geoError\?\.code === 1/)
  assert.match(mapView, /geoError\?\.code === 3/)
  assert.match(mapView, /aria-live="polite"/)
})

test('feed location sorting uses the mobile reliability helper', async () => {
  const feeds = await read('src/components/Feeds.tsx')
  const geolocation = await read('src/lib/geolocation.ts')
  assert.match(feeds, /getReliableUserPosition\(\)/)
  assert.match(feeds, /disabled=\{locating\}/)
  assert.match(feeds, /aria-live="polite"/)
  assert.match(geolocation, /enableHighAccuracy:\s*false/)
  assert.match(geolocation, /enableHighAccuracy:\s*true/)
  assert.match(geolocation, /timeout:\s*15000/)
})

test('business portal returns magic links to the business route', async () => {
  const profile = await read('src/components/Profile.tsx')
  assert.match(profile, /emailRedirectTo:\s*`\$\{window\.location\.origin\}\/business`/)
  assert.match(profile, /signInWithOtp/)
  assert.match(profile, /signInWithPassword/)
})

test('job applications require a private CV-compatible flow', async () => {
  const data = await read('src/lib/data.ts')
  const feeds = await read('src/components/Feeds.tsx')
  assert.match(data, /storage\.from\('job-cvs'\)\.createSignedUrl/)
  assert.match(data, /CV is required/)
  assert.match(data, /10 \* 1024 \* 1024/)
  assert.match(feeds, /CV is mandatory/)
  assert.match(feeds, /\.pdf.*\.doc.*\.docx/)
})

test('service worker has a navigation-safe offline fallback', async () => {
  const serviceWorker = await read('public/sw.js')
  assert.match(serviceWorker, /request\.mode === 'navigate'/)
  assert.match(serviceWorker, /HiStreets is offline/)
  assert.match(serviceWorker, /status:\s*503/)
})

test('release keeps parking disabled until reliable data exists', async () => {
  const readme = await read('README.md')
  const data = await read('src/lib/data.ts')
  assert.match(readme, /Parking section kept as coming soon/i)
  assert.match(readme, /No fake businesses, jobs, offers, meals or parking/i)
  assert.match(data, /Parking is not active in this version/)
})
