import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const INPUT_PATH = process.env.OVERTURE_GEOJSON_PATH || 'data/overture-newham-places.geojson'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!fs.existsSync(INPUT_PATH)) {
  console.error(`Missing Overture GeoJSON file: ${INPUT_PATH}`)
  console.error('Create it with Overture Explorer or DuckDB, then rerun this script.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

type BusinessRow = {
  id: string
  name: string
  category: string | null
  address: string | null
  phone: string | null
  website: string | null
  email: string | null
  brand: string | null
  owner_edited_fields: string[] | null
  lat: number
  lng: number
}

type Place = {
  id: string
  name: string
  category: string | null
  confidence: number | null
  lat: number
  lng: number
  address: string | null
  phone: string | null
  website: string | null
  email: string | null
  brand: string | null
  raw: Record<string, unknown>
}

function normalise(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(ltd|limited|uk|the|shop|store|restaurant|cafe|newham)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(value: string) {
  return new Set(normalise(value).split(' ').filter(Boolean))
}

function tokenSimilarity(a: string, b: string) {
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.size || !tb.size) return 0
  let overlap = 0
  for (const t of ta) if (tb.has(t)) overlap += 1
  return overlap / Math.max(ta.size, tb.size)
}

function haversineMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const lat1 = a.lat * rad
  const lat2 = b.lat * rad
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function postcode(value: string | null | undefined) {
  const match = (value || '').toUpperCase().match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/)
  return match ? match[0].replace(/\s+/g, '') : ''
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      const v = firstString(item)
      if (v) return v
    }
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ['primary', 'value', 'url', 'label', 'freeform', 'locality', 'postcode']) {
      const v = firstString(obj[key])
      if (v) return v
    }
  }
  return null
}

function getName(props: Record<string, unknown>) {
  const names = props.names as Record<string, unknown> | undefined
  return firstString(names?.primary) || firstString(props.name) || firstString(props.names)
}

function getCategory(props: Record<string, unknown>) {
  const categories = props.categories as Record<string, unknown> | undefined
  return firstString(categories?.primary) || firstString(categories?.main) || firstString(props.categories) || firstString(props.basic_category)
}

function getBrand(props: Record<string, unknown>) {
  const brand = props.brand as Record<string, unknown> | undefined
  const names = brand?.names as Record<string, unknown> | undefined
  return firstString(names?.primary) || firstString(brand?.name) || firstString(props.brand)
}

function getAddress(props: Record<string, unknown>) {
  const addresses = props.addresses
  const first = Array.isArray(addresses) ? addresses[0] : addresses
  if (!first || typeof first !== 'object') return null
  const obj = first as Record<string, unknown>
  const freeform = firstString(obj.freeform)
  const locality = firstString(obj.locality)
  const pc = firstString(obj.postcode)
  return [freeform, locality, pc].filter(Boolean).join(', ') || null
}

function getPoint(feature: any): { lat: number; lng: number } | null {
  const coords = feature?.geometry?.coordinates
  if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    return { lng: coords[0], lat: coords[1] }
  }
  const props = feature?.properties || {}
  if (typeof props.lng === 'number' && typeof props.lat === 'number') return { lng: props.lng, lat: props.lat }
  return null
}

function toPlace(feature: any): Place | null {
  const props = (feature?.properties || {}) as Record<string, unknown>
  const point = getPoint(feature)
  const id = firstString(props.id) || firstString(feature?.id)
  const name = getName(props)
  if (!id || !name || !point) return null
  return {
    id,
    name,
    category: getCategory(props),
    confidence: typeof props.confidence === 'number' ? props.confidence : null,
    lat: point.lat,
    lng: point.lng,
    address: getAddress(props),
    phone: firstString(props.phones),
    website: firstString(props.websites),
    email: firstString(props.emails),
    brand: getBrand(props),
    raw: props,
  }
}

async function loadBusinesses(): Promise<BusinessRow[]> {
  const rows: BusinessRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id,name,category,address,phone,website,email,brand,owner_edited_fields,lat,lng')
      .in('verification_status', ['unclaimed', 'pending', 'verified', 'contested'])
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data || []) as BusinessRow[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

function bestBusinessMatch(place: Place, businesses: BusinessRow[]) {
  let best: { business: BusinessRow; score: number; distance: number; nameScore: number } | null = null
  for (const business of businesses) {
    const distance = haversineMetres(place, business)
    if (distance > 90) continue
    const nameScore = tokenSimilarity(place.name, business.name)
    const placePc = postcode(place.address)
    const businessPc = postcode(business.address)
    const postcodeBoost = placePc && businessPc && placePc === businessPc ? 0.16 : 0
    const distanceScore = distance <= 20 ? 1 : distance <= 45 ? 0.75 : distance <= 70 ? 0.45 : 0.25
    const confidenceScore = typeof place.confidence === 'number' ? Math.max(0, Math.min(1, place.confidence)) : 0.7
    const score = nameScore * 0.58 + distanceScore * 0.20 + confidenceScore * 0.06 + postcodeBoost
    if (score >= 0.78 && (!best || score > best.score)) best = { business, score, distance, nameScore }
  }
  return best
}

function hasNewInfo(place: Place, business: BusinessRow) {
  return Boolean(
    (!business.address && place.address) ||
    (!business.phone && place.phone) ||
    (!business.website && place.website) ||
    (!business.email && place.email) ||
    (!business.brand && place.brand) ||
    ((business.category === 'other' || !business.category) && place.category),
  )
}

const geojson = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'))
const features = Array.isArray(geojson.features) ? geojson.features : []
const places = features.map(toPlace).filter(Boolean) as Place[]
const businesses = await loadBusinesses()

let staged = 0
let matched = 0
let enriched = 0
let skippedLowConfidence = 0

for (const place of places) {
  const overtureConfidence = typeof place.confidence === 'number' ? place.confidence : 0.7
  if (overtureConfidence < 0.55) {
    skippedLowConfidence += 1
    continue
  }

  const upsert = await supabase.rpc('upsert_overture_place', {
    p_id: place.id,
    p_name: place.name,
    p_category: place.category || '',
    p_confidence: place.confidence,
    p_lat: place.lat,
    p_lng: place.lng,
    p_address: place.address || '',
    p_phone: place.phone || '',
    p_website: place.website || '',
    p_email: place.email || '',
    p_brand: place.brand || '',
    p_raw: place.raw,
  })
  if (upsert.error) throw upsert.error
  staged += 1

  const best = bestBusinessMatch(place, businesses)
  if (!best) continue
  matched += 1
  if (!hasNewInfo(place, best.business)) continue

  const apply = await supabase.rpc('apply_overture_business_enrichment', {
    p_business_id: best.business.id,
    p_overture_id: place.id,
    p_match_confidence: Number(best.score.toFixed(4)),
    p_address: place.address || '',
    p_phone: place.phone || '',
    p_website: place.website || '',
    p_email: place.email || '',
    p_brand: place.brand || '',
    p_category: place.category || '',
    p_raw: {
      name: place.name,
      confidence: place.confidence,
      distance_m: Math.round(best.distance),
      name_score: Number(best.nameScore.toFixed(3)),
    },
  })
  if (apply.error) throw apply.error
  enriched += 1
}

console.log(`Overture enrichment complete. Places staged: ${staged}. Matched: ${matched}. Enriched businesses: ${enriched}. Skipped low confidence: ${skippedLowConfidence}.`)
console.log('Attribution required: © Overture Maps Foundation and contributors.')
