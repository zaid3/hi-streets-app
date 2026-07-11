import { createClient } from '@supabase/supabase-js'
import proj4 from 'proj4'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Set VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const CPZ_URL = 'https://mapping.newham.gov.uk/ArcGIS/rest/services/CPZ/MapServer/0/query?where=1=1&outFields=*&f=geojson'

proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs')

function transformCoords(coords: any): any {
  if (typeof coords?.[0] === 'number' && typeof coords?.[1] === 'number') {
    const [lng, lat] = proj4('EPSG:27700', 'EPSG:4326', coords)
    return [lng, lat]
  }
  return coords.map(transformCoords)
}

function to4326Geometry(geometry: any) {
  return { ...geometry, coordinates: transformCoords(geometry.coordinates) }
}

function prop(props: Record<string, any>, names: string[], fallback: string) {
  for (const name of names) if (props?.[name] !== undefined && props?.[name] !== null && String(props[name]).trim()) return String(props[name]).trim()
  return fallback
}

const res = await fetch(CPZ_URL)
if (!res.ok) throw new Error(`Newham ArcGIS failed ${res.status}`)
const geojson = await res.json()
let count = 0
for (const feature of geojson.features || []) {
  const props = feature.properties || {}
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
