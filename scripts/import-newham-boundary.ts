import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Set VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

const ONS_CANDIDATES = [
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2024_Boundaries_UK_BFC/FeatureServer/0/query',
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2023_Boundaries_UK_BFC/FeatureServer/0/query',
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2022_UK_BFC/FeatureServer/0/query',
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function tryFetchBoundary(endpoint: string) {
  const params = new URLSearchParams({
    where: "LAD24CD='E09000025' OR LAD23CD='E09000025' OR LAD22CD='E09000025' OR LAD21CD='E09000025'",
    outFields: '*',
    outSR: '4326',
    f: 'geojson',
  })
  const target = `${endpoint}?${params.toString()}`
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(target, { headers: { Accept: 'application/geo+json, application/json', 'User-Agent': 'HiStreets Newham boundary importer' } })
      const body = await res.text()
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${body.slice(0, 180)}`)
      const json = JSON.parse(body)
      if (json?.features?.length) return { geojson: json, source: endpoint }
      throw new Error('No E09000025 feature returned')
    } catch (error) {
      console.warn(`Boundary source failed attempt ${attempt}: ${endpoint} — ${error instanceof Error ? error.message : String(error)}`)
      await sleep(700 * attempt)
    }
  }
  return null
}

function normaliseToMultiPolygon(geometry: any) {
  if (!geometry) throw new Error('Missing boundary geometry')
  if (geometry.type === 'MultiPolygon') return geometry
  if (geometry.type === 'Polygon') return { type: 'MultiPolygon', coordinates: [geometry.coordinates] }
  throw new Error(`Unsupported boundary geometry type: ${geometry.type}`)
}

let boundary: { geojson: any; source: string } | null = null
for (const endpoint of ONS_CANDIDATES) {
  boundary = await tryFetchBoundary(endpoint)
  if (boundary) break
}

if (!boundary) {
  throw new Error('Could not load the official Newham boundary from the configured ONS ArcGIS endpoints. Try again later or add a fresh ONS endpoint to scripts/import-newham-boundary.ts.')
}

const feature = boundary.geojson.features[0]
const geom = normaliseToMultiPolygon(feature.geometry)

const { error: upsertError } = await supabase
  .from('boundaries')
  .upsert({ name: 'Newham', geom: geom as any, source: `ONS Open Geography ArcGIS: ${boundary.source}` }, { onConflict: 'name' })

if (upsertError) throw upsertError

const { data: deleted, error: filterError } = await supabase.rpc('filter_businesses_to_newham')
if (filterError) throw filterError

console.log(`Imported official Newham boundary and removed ${deleted ?? 0} businesses outside the borough.`)
