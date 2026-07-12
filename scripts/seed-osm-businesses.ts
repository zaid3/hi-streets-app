import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Set VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const query = `
[out:json][timeout:120];
area["ref:gss"="E09000025"]->.newham;
(
  nwr["shop"](area.newham);
  nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|pharmacy|bank|dentist|doctors|clinic|post_office|marketplace|childcare|community_centre|place_of_worship|library)$"](area.newham);
  nwr["office"](area.newham);
  nwr["craft"](area.newham);
  nwr["healthcare"](area.newham);
);
out center tags;
`

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchOverpass() {
  let lastError = ''
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: new URLSearchParams({ data: query }).toString(),
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          accept: 'application/json',
          'user-agent': 'HiStreets OSM business seed (contact: app.histreets.uk)',
        },
      })
      if (res.ok) return res.json()
      const body = await res.text().catch(() => '')
      lastError = `${endpoint} ${res.status} ${res.statusText} ${body.slice(0, 180)}`.trim()
      console.warn(`Overpass attempt ${attempt} failed: ${lastError}`)
      await sleep(2000 * attempt)
    }
  }
  throw new Error(`Overpass did not return OSM data. Last response: ${lastError}. Try again later or run the script from another network.`)
}

function normalisePhone(raw?: string | null) {
  if (!raw) return null
  const cleaned = raw.replace(/[^+\d]/g, '')
  if (!cleaned) return null
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`
  if (cleaned.startsWith('0')) return `+44${cleaned.slice(1)}`
  return cleaned.length >= 10 ? `+${cleaned}` : cleaned
}

function category(tags: Record<string, string>) {
  if (/^(restaurant|cafe|fast_food|bar|pub)$/.test(tags.amenity || '')) return 'food'
  if (tags.shop) return 'shop'
  if (/^(pharmacy|dentist|doctors|clinic)$/.test(tags.amenity || '') || tags.healthcare) return 'health'
  if (tags.office || tags.craft || /^(bank|post_office)$/.test(tags.amenity || '')) return 'service'
  return 'other'
}

function address(tags: Record<string, string>) {
  const line1 = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  return [line1, tags['addr:postcode']].filter(Boolean).join(', ')
}

function firstTag(tags: Record<string, string>, keys: string[]) {
  for (const key of keys) if (tags[key]) return tags[key]
  return null
}

const json = await fetchOverpass()
let count = 0
let skipped = 0

for (const el of json.elements || []) {
  const tags = el.tags || {}
  if (!tags.name) {
    skipped += 1
    continue
  }
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    skipped += 1
    continue
  }

  const { error } = await supabase.rpc('upsert_osm_business_rich', {
    p_osm_id: Number(el.id),
    p_name: tags.name,
    p_category: category(tags),
    p_lat: lat,
    p_lng: lng,
    p_address: address(tags) || null,
    p_phone: normalisePhone(firstTag(tags, ['phone', 'contact:phone', 'mobile', 'contact:mobile'])),
    p_website: firstTag(tags, ['website', 'contact:website', 'url']),
    p_email: firstTag(tags, ['email', 'contact:email']),
    p_opening_hours: tags.opening_hours || null,
    p_cuisine: tags.cuisine || null,
    p_wheelchair: tags.wheelchair || null,
    p_brand: tags.brand || null,
    p_operator: tags.operator || null,
  })
  if (error) throw error
  count += 1
}

console.log(`Seeded/upserted ${count} rich OSM businesses/services inside Newham. Skipped ${skipped}. Attribution required: © OpenStreetMap contributors.`)
