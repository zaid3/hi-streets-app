import{NextResponse}from'next/server'
import{NEWHAM_BOUNDS,boundsIntersect}from'../../../../lib/newhamSeedData'

export const dynamic='force-dynamic'
export const runtime='nodejs'

const OVERPASS='https://overpass-api.de/api/interpreter'

function num(v,fallback){const n=Number(v);return Number.isFinite(n)?n:fallback}
function clampBounds(input){
  const b={south:num(input.get('south'),51.52),west:num(input.get('west'),0.02),north:num(input.get('north'),51.55),east:num(input.get('east'),0.06)}
  return{south:Math.max(b.south,NEWHAM_BOUNDS.south),west:Math.max(b.west,NEWHAM_BOUNDS.west),north:Math.min(b.north,NEWHAM_BOUNDS.north),east:Math.min(b.east,NEWHAM_BOUNDS.east)}
}
function colorFor(type){if(type==='paid'||type==='carpark')return'#0b73d9';if(type==='disabled')return'#8E44AD';if(type==='loading')return'#ff681f';if(['no_parking','yellow_double','red_route'].includes(type))return'#9d9da5';return'#078d16'}
function itemFromWay(el,i){
  const tags=el.tags||{},coords=el.geometry?.length?el.geometry.map(g=>[g.lat,g.lon]):null
  if(!coords?.length)return null
  const highway=tags.highway||'road',name=tags.name||tags['addr:street']||'Newham road'
  const lane=[tags['parking:lane:both'],tags['parking:lane:left'],tags['parking:lane:right'],tags.parking].filter(Boolean).join(' ')
  const parkingTagged=Boolean(lane||tags.parking)
  let type='resident',restriction='Residential road guide: Newham CPZ/permit or controlled parking may apply. Check entry signs.',hours='Commonly Mon-Sat daytime controlled',source='road_guide',sourceName='Newham road guide',confidence='low',dataNote='Estimated street-level guide from OpenStreetMap road geometry. This is not exact council bay geometry. Always check road signs, bay plates and road markings.'
  if(/disabled/i.test(lane)){type='disabled';restriction='Blue badge parking indicated in map tags. Check bay plate and time limit.'}
  else if(/loading/i.test(lane)){type='loading';restriction='Loading restriction or loading bay indicated nearby. Check plate times.'}
  else if(/no_parking|no_stopping/i.test(lane)){type='no_parking';restriction='No parking/no stopping indicated in map tags. Check signs.'}
  else if(/permit|residents?/i.test(lane)){type='resident';restriction='Resident permit parking indicated in map tags. Check CPZ signs.'}
  else if(parkingTagged){type='paid';restriction='Parking indicated nearby. Check if paid, permit-only or limited stay.'}
  else if(/secondary|tertiary/.test(highway)){type='no_parking';restriction='Main road guide: likely yellow line/loading/bus restrictions. Check signs before stopping.';hours='Check signs'}
  else if(/service|living_street/.test(highway)){type='paid';restriction='Service/local access road guide: parking may be private, paid or time-limited. Check signs.';hours='Check signs'}
  return{id:`newham-road-${el.id||i}`,type,color:colorFor(type),coords,name,restriction,hours,maxStay:null,isCarPark:false,source,sourceName,confidence,dataNote}
}
function point(id,type,lat,lng,name,restriction){return{id,type,color:colorFor(type),lat,lng,coords:[[lat,lng]],name,restriction,hours:'Check signs',maxStay:null,isCarPark:type==='carpark',source:'local_guide',sourceName:'Newham local guide',confidence:'low',dataNote:'Local Newham parking guide marker. Not exact bay geometry. Always check the road sign, bay plate and road markings before parking.'}}
function fallback(bounds){
  const pts=[
    point('newham-guide-green-street','paid',51.5360,0.0312,'Green Street parking area','Paid, limited-stay and permit bays nearby. Check signs.'),
    point('newham-guide-upton-park','resident',51.5351,0.0346,'Upton Park residential streets','Resident permit and controlled parking nearby. Check CPZ signs.'),
    point('newham-guide-east-ham','paid',51.5399,0.0507,'East Ham parking area','Paid and limited-stay parking around East Ham shops. Check signs.'),
    point('newham-guide-forest-gate','paid',51.5494,0.0243,'Forest Gate parking area','Short-stay, paid and permit restrictions nearby. Check signs.'),
    point('newham-guide-stratford','carpark',51.5418,-0.0030,'Stratford parking area','Major car parks and controlled streets nearby. Check operator rules.'),
    point('newham-guide-canning-town','paid',51.5141,0.0084,'Canning Town parking area','Controlled parking and off-street parking nearby. Check signs.'),
    point('newham-guide-beckton','free',51.5155,0.0584,'Beckton local parking area','Parking availability varies by retail/residential area. Check signs.'),
  ]
  return pts.filter(p=>p.lat>=bounds.south&&p.lat<=bounds.north&&p.lng>=bounds.west&&p.lng<=bounds.east)
}
export async function GET(req){
  const url=new URL(req.url)
  const bounds=clampBounds(url.searchParams)
  if(!boundsIntersect(bounds,NEWHAM_BOUNDS))return NextResponse.json({ok:true,items:[],source:'outside-newham'})
  const bbox=`${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
  const q=`[out:json][timeout:14];(
    way["highway"~"^(residential|unclassified|tertiary|secondary|service|living_street)$"](${bbox});
    way["parking"="lane"](${bbox});
    way["parking:lane:both"](${bbox});
    way["parking:lane:left"](${bbox});
    way["parking:lane:right"](${bbox});
  );out geom qt 320;`
  try{
    const res=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Hi-Streets Newham parking guide'},cache:'no-store'})
    if(!res.ok)throw new Error(`Overpass ${res.status}`)
    const json=await res.json()
    const items=(json.elements||[]).slice(0,320).map(itemFromWay).filter(Boolean)
    return NextResponse.json({ok:true,bounds,items:items.length?items:fallback(bounds),source:items.length?'overpass-road-guide':'fallback'},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=1800'}})
  }catch(error){
    return NextResponse.json({ok:true,bounds,items:fallback(bounds),source:'fallback',warning:error?.message||String(error)},{headers:{'Cache-Control':'public, s-maxage=120'}})
  }
}
