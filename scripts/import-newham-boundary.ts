import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Set VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

const FEATURE_LAYERS = [
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2024_Boundaries_UK_BFC/FeatureServer/0',
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2023_Boundaries_UK_BFC/FeatureServer/0',
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2022_UK_BFC/FeatureServer/0',
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/geo+json, application/json',
      'User-Agent': 'HiStreets Newham boundary importer',
    },
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${body.slice(0, 220)}`)
  return JSON.parse(body)
}

async function getFieldNames(layerUrl: string) {
  try {
    const metadata = await fetchJson(`${layerUrl}?f=json`)
    const fields = Array.isArray(metadata?.fields) ? metadata.fields : []
    return fields.map((field: any) => String(field.name || '')).filter(Boolean)
  } catch (error) {
    console.warn(`Could not inspect fields for ${layerUrl}: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

function quoted(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

function buildWhere(fields: string[]) {
  const upper = new Map(fields.map(name => [name.toUpperCase(), name]))
  const possibleCodeFields = ['LAD24CD', 'LAD23CD', 'LAD22CD', 'LAD21CD', 'LAD20CD', 'LAD19CD', 'LAD18CD', 'LAD17CD', 'LADCD', 'GSS_CODE', 'GSSCODE', 'CODE']
  const possibleNameFields = ['LAD24NM', 'LAD23NM', 'LAD22NM', 'LAD21NM', 'LAD20NM', 'LAD19NM', 'LAD18NM', 'LAD17NM', 'LADNM', 'NAME', 'NAME_LONG', 'AREA_NAME']

  const clauses: string[] = []
  for (const key of possibleCodeFields) {
    const field = upper.get(key)
    if (field) clauses.push(`${field} = ${quoted('E09000025')}`)
  }
  for (const key of possibleNameFields) {
    const field = upper.get(key)
    if (field) {
      clauses.push(`${field} = ${quoted('Newham')}`)
      clauses.push(`${field} = ${quoted('London Borough of Newham')}`)
      clauses.push(`${field} = ${quoted('Newham London Boro')}`)
    }
  }

  // Fallback where older services do not expose metadata cleanly. Each query is tried independently.
  return clauses.length ? clauses : [
    "LAD24CD = 'E09000025'",
    "LAD23CD = 'E09000025'",
    "LAD22CD = 'E09000025'",
    "LAD21CD = 'E09000025'",
    "LAD24NM = 'Newham'",
    "LAD23NM = 'Newham'",
    "LAD22NM = 'Newham'",
    "LAD21NM = 'Newham'",
    "NAME = 'Newham'",
  ]
}

async function queryLayer(layerUrl: string, where: string) {
  const params = new URLSearchParams({
    where,
    outFields: '*',
    outSR: '4326',
    returnGeometry: 'true',
    f: 'geojson',
  })
  return fetchJson(`${layerUrl}/query?${params.toString()}`)
}

async function tryFetchBoundary(layerUrl: string) {
  const fields = await getFieldNames(layerUrl)
  const clauses = buildWhere(fields)

  for (const where of clauses) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const json = await queryLayer(layerUrl, where)
        if (json?.features?.length) return { geojson: json, source: `${layerUrl}/query`, where }
        console.warn(`Boundary source returned no feature: ${layerUrl} where ${where}`)
      } catch (error) {
        console.warn(`Boundary source failed attempt ${attempt}: ${layerUrl} where ${where} — ${error instanceof Error ? error.message : String(error)}`)
      }
      await sleep(500 * attempt)
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

let boundary: { geojson: any; source: string; where: string } | null = null
for (const layerUrl of FEATURE_LAYERS) {
  boundary = await tryFetchBoundary(layerUrl)
  if (boundary) break
}

if (!boundary) {
  throw new Error('Could not load the official Newham boundary from the configured ONS ArcGIS layers after field inspection. The script is safe to rerun; add a fresh ONS/London Datastore layer URL if ONS changes the service again.')
}

const feature = boundary.geojson.features[0]
const geom = normaliseToMultiPolygon(feature.geometry)

const { error: upsertError } = await supabase.rpc('upsert_boundary', {
  p_name: 'Newham',
  p_geojson: geom,
  p_source: `ONS Open Geography ArcGIS: ${boundary.source} (${boundary.where})`,
})
if (upsertError) throw upsertError

const { data: deleted, error: filterError } = await supabase.rpc('filter_businesses_to_newham')
if (filterError) throw filterError

console.log(`Imported official Newham boundary and removed ${deleted ?? 0} businesses outside the borough.`)
