const OVERPASS='https://overpass-api.de/api/interpreter'

const TAGS=[
  'node["amenity"~"restaurant|cafe|fast_food|pharmacy|fuel|bar|pub|bank"]',
  'node["shop"]',
  'node["tourism"="hotel"]',
]

function category(tags={}){
  if(tags.amenity==='restaurant'||tags.amenity==='fast_food')return'restaurant'
  if(tags.amenity==='cafe')return'coffee'
  if(tags.amenity==='pharmacy')return'pharmacy'
  if(tags.amenity==='fuel')return'fuel'
  if(tags.shop==='supermarket'||tags.shop==='convenience'||tags.shop==='greengrocer')return'grocery'
  if(tags.shop)return'shop'
  return'place'
}

export async function getPlacesData(bounds){
  const{south,west,north,east}=bounds
  const bbox=`${south},${west},${north},${east}`
  const query=`[out:json][timeout:10];(${TAGS.map(t=>`${t}(${bbox});`).join('')});out body 250;`
  try{
    const res=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(query),signal:AbortSignal.timeout(9000)})
    if(!res.ok)throw new Error('places fetch fail')
    const json=await res.json()
    return (json.elements||[])
      .filter(el=>el.lat&&el.lon)
      .slice(0,200)
      .map((el,i)=>({
        id:`poi-${el.id||i}`,
        name:el.tags?.name||el.tags?.brand||'Local business',
        category:category(el.tags),
        lat:el.lat,
        lng:el.lon,
      }))
  }catch{return[]}
}
