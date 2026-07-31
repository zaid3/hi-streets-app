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
  assert.ok(manifest.icons.some((icon: { sizes?: string }) => icon.sizes === '192x192'))
  assert.ok(manifest.icons.some((icon: { sizes?: string }) => icon.sizes === '512x512'))
  assert.ok(manifest.icons.some((icon: { purpose?: string }) => String(icon.purpose || '').includes('maskable')))
})

test('mobile viewport and iPhone standalone metadata are present', async () => {
  const html = await read('index.html')
  const polish = await read('src/release-polish.css')
  assert.match(html, /name="viewport"[^>]*viewport-fit=cover/)
  assert.match(html, /rel="manifest" href="\/manifest\.json"/)
  assert.match(html, /apple-mobile-web-app-capable/)
  assert.match(html, /apple-mobile-web-app-title/)
  assert.match(polish, /height:100vh;height:100dvh/)
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

test('business location has a precise mobile path and postcode fallback', async () => {
  const registration = await read('src/components/BusinessRegistration.tsx')
  const geolocation = await read('src/lib/geolocation.ts')
  assert.match(registration, /getPreciseBusinessPosition\(\)/)
  assert.match(registration, /disabled=\{locating\}/)
  assert.match(registration, /postcodeMapPoint\(\)/)
  assert.match(geolocation, /maximumAge:\s*30000/)
})

test('six navigation destinations remain on one mobile tab row', async () => {
  const tabs = await read('src/components/BottomTabs.tsx')
  const polish = await read('src/release-polish.css')
  assert.equal((tabs.match(/key:\s*'/g) || []).length, 6)
  assert.match(polish, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/)
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

test('service worker has a navigation-safe offline fallback and caches install icons', async () => {
  const serviceWorker = await read('public/sw.js')
  assert.match(serviceWorker, /request\.mode === 'navigate'/)
  assert.match(serviceWorker, /HiStreets is offline/)
  assert.match(serviceWorker, /status:\s*503/)
  assert.match(serviceWorker, /icon-192\.svg/)
  assert.match(serviceWorker, /icon-512\.svg/)
})

test('release keeps parking disabled until reliable data exists', async () => {
  const readme = await read('README.md')
  const data = await read('src/lib/data.ts')
  assert.match(readme, /Parking section kept as coming soon/i)
  assert.match(readme, /No fake businesses, jobs, offers, meals or parking/i)
  assert.match(data, /Parking is not active in this version/)
})
