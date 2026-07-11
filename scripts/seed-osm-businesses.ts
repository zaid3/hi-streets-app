import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Set VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const bbox = '51.490,-0.030,51.565,0.100'
const query = `[out:json][timeout:45];(
  node["shop"](${bbox});
  node["amenity"~"^(restaurant|cafe|fast_food|pharmacy|bank|clinic|dentist|doctors|community_centre|library|place_of_worship)$"](${bbox});
  node["office"](${bbox});
  node["craft"](${bbox});
  way["shop"](${bbox});
  way["amenity"~"^(restaurant|cafe|fast_food|pharmacy|bank|clinic|dentist|doctors|community_centre|library|place_of_worship)$"](${bbox});
  way["office"](${bbox});
  way["craft"](${bbox});
);out center tags qt 1000;`

function category(tags: Record<string,string>) {
  return tags.shop || tags.amenity || tags.office || tags.craft || 'other'
}
function address(tags: Record<string,string>) {
  return [tags['addr:housenumber'], tags['addr:street'], tags['addr:postcode']].filter(Boolean).join(', ')
}

const res = await fetch(OVERPASS, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
if (!res.ok) throw new Error(`Overpass failed ${res.status}`)
const json = await res.json()
let count = 0
for (const el of json.elements || []) {
  const tags = el.tags || {}
  if (!tags.name) continue
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (typeof lat !== 'number' || typeof lng !== 'number') continue
  const { error } = await supabase.rpc('upsert_osm_business', {
    p_osm_id: Number(el.id),
    p_name: tags.name,
    p_category: category(tags),
    p_lat: lat,
    p_lng: lng,
    p_address: address(tags) || null,
    p_phone: tags.phone || tags['contact:phone'] || null,
    p_website: tags.website || tags['contact:website'] || null,
  })
  if (error) throw error
  count += 1
}
console.log(`Seeded ${count} OSM businesses/services for Newham`) 
