const OV='https://overpass-api.de/api/interpreter'
export async function getPlacesByViewport(bounds,limit=80){
  const{south,west,north,east}=bounds
  const bbox=`${south},${west},${north},${east}`
  const cats='restaurant|cafe|pub|fast_food|bank|pharmacy|supermarket|convenience|doctors|post_office|hairdresser|beauty|bakery|electronics|fuel|library'
  const q=`[out:json][timeout:15];(node["amenity"~"${cats}"](${bbox});node["shop"](${bbox}););out body ${limit};`
  try{
    const r=await fetch(`${OV}?data=${encodeURIComponent(q)}`)
    const data=await r.json()
    return(data.elements||[]).map(el=>{
      if(!el.lat||!el.lon)return null
      const tags=el.tags||{},cat=tags.amenity||tags.shop||'other'
      return{id:`place-${el.id}`,name:tags.name||fmt(cat),category:cat,lat:el.lat,lng:el.lon,address:[tags['addr:housenumber'],tags['addr:street']].filter(Boolean).join(' '),icon:catIcon(cat),phone:tags.phone||null,hours:tags.opening_hours||null}
    }).filter(Boolean)
  }catch{return[]}
}
function fmt(c){return c.replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase())}
export function catIcon(cat){
  const m={restaurant:'🍽️',cafe:'☕',pub:'🍺',fast_food:'🍔',bank:'🏦',pharmacy:'💊',supermarket:'🛒',convenience:'🏪',doctors:'👨‍⚕️',hairdresser:'💇',beauty:'💅',bakery:'🍞',electronics:'📱',fuel:'⛽',library:'📚'}
  return m[cat]||'🏪'
}
