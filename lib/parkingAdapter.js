// Parking data adapter.
// Priority:
// 1) verified imported parking segments from Supabase
// 2) council open parking bay data where available
// 3) OSM/Overpass where parking tags exist
// 4) Newham local fallback markers so the borough map is never empty
import{supabase}from'./supabase'
import{NEWHAM_BOUNDS,boundsIntersect}from'./newhamSeedData'
const OVERPASS='https://overpass-api.de/api/interpreter'
export function isLondon(lat,lng){return lat>51.28&&lat<51.7&&lng>-0.51&&lng<0.34}
export async function getParkingData(bounds){
  const[curated,council,osm]=await Promise.all([fetchCuratedParking(bounds),fetchCouncilParking(bounds),fetchOverpassSafe(bounds)])
  const live=mergeById([...curated,...council,...osm])
  return live.length?live:fetchNewhamFallback(bounds)
}
async function fetchCuratedParking(bounds){
  if(!bounds)return[]
  try{
    const{data,error}=await supabase
      .from('parking_segments')
      .select('*')
      .eq('is_verified',true)
      .gte('lat',bounds.south)
      .lte('lat',bounds.north)
      .gte('lng',bounds.west)
      .lte('lng',bounds.east)
      .limit(5000)
    if(error)return[]
    return(data||[]).filter(usableCuratedRow).map(row=>({
      id:row.external_id||row.id,
      type:row.type,
      color:row.color||colorFor(row.type),
      coords:Array.isArray(row.coords)?row.coords:[[row.lat,row.lng]],
      lat:row.lat,
      lng:row.lng,
      name:row.name||'Parking bay',
      restriction:row.restriction||'Check signs',
      hours:row.hours||'Check signs',
      maxStay:row.max_stay||null,
      tariff:row.tariff||'',
      cpz:row.cpz||'',
      spaces:row.spaces||'',
      length:row.length||'',
      isCarPark:!!row.is_car_park,
      source:row.source||'curated',
      sourceName:row.source_name||'Verified parking data',
      council:row.council||'',
      confidence:row.confidence||'high',
      dataNote:row.data_note||'Verified parking data. Always check the roadside sign before parking.',
    }))
  }catch{return[]}
}
async function fetchCouncilParking(bounds){
  if(!bounds)return[]
  try{
    const q=new URLSearchParams({south:String(bounds.south),west:String(bounds.west),north:String(bounds.north),east:String(bounds.east)})
    const res=await fetch(`/api/parking/council?${q.toString()}`,{cache:'no-store'})
    if(!res.ok)return[]
    const json=await res.json()
    return json.items||[]
  }catch{return[]}
}
async function fetchOverpassSafe(bounds){try{return await fetchOverpass(bounds)}catch{return[]}}
async function fetchOverpass(bounds){if(!bounds)throw new Error('Missing bounds');const{south,west,north,east}=bounds;const bbox=`${south},${west},${north},${east}`;const q=`[out:json][timeout:10];(
  way["parking"="lane"](${bbox});
  way["parking:lane:both"](${bbox});
  way["parking:lane:left"](${bbox});
  way["parking:lane:right"](${bbox});
  way["amenity"="parking"](${bbox});
  node["amenity"="parking"](${bbox});
);out geom qt 80;`;const res=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q),signal:AbortSignal.timeout(8000)});if(!res.ok)throw new Error('Overpass failed');const json=await res.json();return processOverpass(json.elements||[])}
function processOverpass(elements){const now=new Date(),h=now.getHours(),dow=now.getDay(),isPaid=h>=8&&h<18&&dow>=1&&dow<=6;return elements.slice(0,80).map((el,i)=>{const tags=el.tags||{};const isCarPark=tags.amenity==='parking';const coords=el.geometry?.length?el.geometry.map(g=>[g.lat,g.lon]):(el.lat&&el.lon?[[el.lat,el.lon]]:null);if(!coords?.length)return null;const lane=[tags['parking:lane:both'],tags['parking:lane:left'],tags['parking:lane:right'],tags.parking].filter(Boolean).join(' ');const permit=/permit|residents?/i.test(lane),disabled=/disabled/i.test(tags.parking||tags.capacity?.disabled||''),loading=/loading/i.test(lane),nopark=/no_parking|no_stopping/i.test(lane);let type,color;if(isCarPark){type='carpark';color='#0b73d9'}else if(disabled){type='disabled';color='#8E44AD'}else if(loading){type='loading';color='#ff681f'}else if(nopark){type='no_parking';color='#9d9da5'}else if(permit){type='resident';color='#078d16'}else if(isPaid){type='paid';color='#0b73d9'}else{type='free';color='#078d16'}const lat=el.lat||coords[0]?.[0],lng=el.lon||coords[0]?.[1];return{id:`osm-${el.id||i}`,type,color,coords,name:tags.name||tags['addr:street']||(isCarPark?'Parking':'Parking place'),restriction:permit?'Resident permit holders only':nopark?'No parking':isPaid?'Paid parking during controlled hours':'Check local signs',hours:isPaid?'Mon-Sat daytime controlled':'Check local signs',maxStay:tags.maxstay||null,isCarPark,lat:isCarPark?lat:undefined,lng:isCarPark?lng:undefined,source:'osm',sourceName:'OpenStreetMap',confidence:'medium',dataNote:'Community map data. Check signs before parking.'}}).filter(Boolean)}
function fetchNewhamFallback(bounds){
  if(bounds&&!boundsIntersect(bounds,NEWHAM_BOUNDS))return[]
  const now=new Date(),h=now.getHours(),dow=now.getDay(),controlled=h>=8&&h<18.5&&dow>=1&&dow<=6
  const base=[
    {id:'newham-fallback-east-ham-carpark',type:'carpark',lat:51.5397,lng:0.0529,name:'East Ham town centre parking',restriction:'Town centre parking nearby. Check machine, app or signs.',hours:'Usually daytime/evening controlled',sourceName:'Newham local guide'},
    {id:'newham-fallback-green-street-parking',type:'paid',lat:51.5360,lng:0.0312,name:'Green Street parking area',restriction:'Busy shopping area. Paid, limited stay and permit bays nearby. Check signs.',hours:'Commonly Mon-Sat daytime controlled',sourceName:'Newham local guide'},
    {id:'newham-fallback-upton-park-parking',type:'resident',lat:51.5351,lng:0.0346,name:'Upton Park residential streets',restriction:'Resident permit and controlled parking zones nearby. Check zone signs.',hours:'Commonly Mon-Sat daytime controlled',sourceName:'Newham local guide'},
    {id:'newham-fallback-forest-gate-parking',type:'paid',lat:51.5494,lng:0.0243,name:'Forest Gate station parking area',restriction:'Short-stay, paid and permit restrictions nearby. Check signs.',hours:'Commonly Mon-Sat daytime controlled',sourceName:'Newham local guide'},
    {id:'newham-fallback-stratford-parking',type:'carpark',lat:51.5418,lng:-0.0030,name:'Stratford parking area',restriction:'Major car parks and controlled streets nearby. Check operator rules.',hours:'Car parks vary; street parking controlled',sourceName:'Newham local guide'},
    {id:'newham-fallback-canning-town-parking',type:'paid',lat:51.5141,lng:0.0084,name:'Canning Town parking area',restriction:'Controlled parking and off-street parking nearby. Check signs.',hours:'Commonly Mon-Sat daytime controlled',sourceName:'Newham local guide'},
    {id:'newham-fallback-beckton-parking',type:'free',lat:51.5155,lng:0.0584,name:'Beckton local parking area',restriction:'Parking availability varies by retail/residential area. Check local signs.',hours:'Check signs',sourceName:'Newham local guide'},
    {id:'newham-fallback-disabled-town-centres',type:'disabled',lat:51.5366,lng:0.0516,name:'Blue badge parking around Newham town centres',restriction:'Blue badge bays exist around town centres. Check bay plate and time limit.',hours:'Check bay signs',sourceName:'Newham local guide'},
    {id:'newham-fallback-loading-green-street',type:'loading',lat:51.5352,lng:0.0308,name:'Green Street loading restrictions',restriction:'Loading bays and loading restrictions operate around shops. Check plate times.',hours:'Check loading signs',sourceName:'Newham local guide'},
    {id:'newham-fallback-no-parking-high-street',type:'no_parking',lat:51.5360,lng:0.0508,name:'High Street no-waiting restrictions',restriction:'Yellow lines and busier junction restrictions nearby. Do not park unless signs allow.',hours:'Check signs / lines',sourceName:'Newham local guide'},
  ]
  return base.filter(item=>!bounds||(item.lat>=bounds.south&&item.lat<=bounds.north&&item.lng>=bounds.west&&item.lng<=bounds.east)).map(item=>({
    ...item,
    color:colorFor(item.type),
    coords:[[item.lat,item.lng]],
    maxStay:null,
    isCarPark:item.type==='carpark',
    source:'local_guide',
    confidence:'low',
    dataNote:'Local Newham parking guide marker. Not exact bay geometry. Always check the road sign, bay plate and road markings before parking.',
    restriction:item.restriction+(controlled&&['paid','resident'].includes(item.type)?' Controlled time likely active now.':''),
  }))
}
function rad(x){return x*Math.PI/180}
function lineLengthMetres(coords){
  if(!Array.isArray(coords)||coords.length<2)return 0
  const R=6371000
  let total=0
  for(let i=1;i<coords.length;i++){
    const[lat1,lng1]=coords[i-1],[lat2,lng2]=coords[i]
    const dLat=rad(lat2-lat1),dLng=rad(lng2-lng1)
    const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)**2
    total+=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
  }
  return Math.round(total)
}
function badDtroText(value){
  const text=String(value||'').trim()
  return !text||/\*\*NOT PROVIDED\*\*|not provided|unknown|unnamed|example|^d-tro parking restriction$/i.test(text)
}
function usableCuratedRow(row){
  if(row?.source!=='dtro')return true
  const coords=Array.isArray(row.coords)?row.coords:[]
  if(coords.length<2)return false
  if(badDtroText(row.name)||badDtroText(row.restriction))return false
  const length=lineLengthMetres(coords)
  if(!length||length>1500)return false
  return true
}
function colorFor(type){if(type==='paid'||type==='carpark')return'#0b73d9';if(type==='disabled')return'#8E44AD';if(type==='loading')return'#ff681f';if(type==='ev')return'#29c9b2';if(['no_parking','yellow_double','red_route'].includes(type))return'#9d9da5';return'#078d16'}
function priority(item){return item.source==='curated'||item.source==='dtro'?0:item.source==='council'?1:item.source==='osm'?2:3}
function mergeById(items){
  return Array.from(new Map(items.filter(Boolean).sort((a,b)=>priority(a)-priority(b)).map(item=>[item.id,item])).values())
}
export function getMockSegments(){return[]}
