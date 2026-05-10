
const OVERPASS = 'https://overpass-api.de/api/interpreter'
export async function getPlacesByViewport(bounds, limit=60) {
  const { south, west, north, east } = bounds
  const bbox = `${south},${west},${north},${east}`
  const filter = 'restaurant|cafe|pub|fast_food|bank|pharmacy|supermarket|convenience|doctors|post_office|hairdresser|beauty|bakery|electronics'
  const query = `[out:json][timeout:15];(node["amenity"~"${filter}"](${bbox});node["shop"](${bbox}););out body ${limit};`
  try {
    const r = await fetch(`${OVERPASS}?data=${encodeURIComponent(query)}`)
    const data = await r.json()
    return (data.elements||[]).map(el => {
      if (!el.lat||!el.lon) return null
      const tags = el.tags||{}, cat = tags.amenity||tags.shop||'other'
      return { id:`osm-${el.id}`, name:tags.name||formatCat(cat), category:cat, lat:el.lat, lng:el.lon, address:[tags['addr:housenumber'],tags['addr:street']].filter(Boolean).join(' '), icon:getCatIcon(cat) }
    }).filter(Boolean)
  } catch(e) { return [] }
}
function formatCat(c) { return c.replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase()) }
export function getCatIcon(cat) {
  const m = { restaurant:'🍽️', cafe:'☕', pub:'🍺', fast_food:'🍔', bank:'🏦', pharmacy:'💊', supermarket:'🛒', convenience:'🏪', doctors:'👨‍⚕️', hairdresser:'💇', beauty:'💅', bakery:'🍞', electronics:'📱' }
  return m[cat]||'🏪'
}
