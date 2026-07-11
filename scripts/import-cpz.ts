import { createClient } from '@supabase/supabase-js'
import proj4 from 'proj4'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Set VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

const CPZ_ENDPOINTS = [
  'https://mapping.newham.gov.uk/ArcGIS/rest/services/CPZ/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson',
  'https://mapping.newham.gov.uk/arcgis/rest/services/CPZ/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson',
]

proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs')

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchGeoJson() {
  let lastError = ''
  for (const endpoint of CPZ_ENDPOINTS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(endpoint, {
        headers: {
          accept: 'application/json, application/geo+json,*/*',
          'user-agent': 'HiStreets CPZ importer (community project)',
        },
      })
      if (res.ok) return res.json()
      const body = await res.text().catch(() => '')
      lastError = `${res.status} ${res.statusText} ${body.slice(0, 180)}`.trim()
      console.warn(`Newham ArcGIS attempt ${attempt} failed: ${lastError}`)
      await sleep(1500 * attempt)
    }
  }
  throw new Error(`Newham ArcGIS is not returning CPZ GeoJSON right now. Last response: ${lastError}. Try again later; the database/app are OK.`)
}

function transformCoords(coords: any): any {
  if (typeof coords?.[0] === 'number' && typeof coords?.[1] === 'number') {
    const [lng, lat] = proj4('EPSG:27700', 'EPSG:4326', coords)
    return [lng, lat]
  }
  return coords.map(transformCoords)
}

function looksLikeWgs84(geometry: any) {
  const coords = geometry?.coordinates
  let point: any = coords
  while (Array.isArray(point?.[0])) point = point[0]
  return Array.isArray(point) && Math.abs(Number(point[0])) < 1 && Number(point[1]) > 50 && Number(point[1]) < 52
}

function to4326Geometry(geometry: any) {
  if (looksLikeWgs84(geometry)) return geometry
  return { ...geometry, coordinates: transformCoords(geometry.coordinates) }
}

function prop(props: Record<string, any>, names: string[], fallback: string) {
  for (const name of names) if (props?.[name] !== undefined && props?.[name] !== null && String(props[name]).trim()) return String(props[name]).trim()
  return fallback
}

const geojson = await fetchGeoJson()
if (!Array.isArray(geojson.features)) throw new Error('Newham ArcGIS response did not contain GeoJSON features')

let count = 0
for (const feature of geojson.features) {
  const props = feature.properties || {}
  if (!feature.geometry) continue
  const name = prop(props, ['zone', 'Zone', 'ZONE', 'CPZ', 'Name', 'NAME', 'OBJECTID'], `CPZ ${count + 1}`)
  const geometry = to4326Geometry(feature.geometry)
  const { error } = await supabase.rpc('upsert_cpz_zone', {
    p_name: name,
    p_geojson: geometry,
    p_hours: {},
    p_event_day_hours: {},
    p_source: 'Newham Council ArcGIS CPZ',
  })
  if (error) throw error
  count += 1
}
console.log(`Imported ${count} Newham CPZ zones`)
