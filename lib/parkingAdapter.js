// Parking data adapter.
// Priority:
// 1) verified imported parking segments from Supabase
// 2) council open parking bay data where available
// 3) verified Newham seed data for the MVP area
// 4) OSM/Overpass where parking tags exist
// 5) no fake street bays outside reliable data coverage
import{supabase}from'./supabase'
import{boundsIntersect,newhamParkingSegments}from'./newhamSeedData'
const OVERPASS='https://overpass-api.de/api/interpreter'
export function isLondon(lat,lng){return lat>51.28&&lat<51.7&&lng>-0.51&&lng<0.34}
export async function getParkingData(bounds){
  const seed=boundsIntersect(bounds)?newhamParkingSegments.map(s=>({...s,source:s.source||'verified_seed',sourceName:s.sourceName||'Newham starter coverage',confidence:s.confidence||'medium',dataNote:s.dataNote||'Starter coverage for the MVP area. Check the roadside sign before parking.'})):[]
  const[curated,council,osm]=await Promise.all([fetchCuratedParking(bounds),fetchCouncilParking(bounds),fetchOverpassSafe(bounds)])
  return mergeById([...curated,...council,...seed,...osm])
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
    return(data||[]).map(row=>({
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
function colorFor(type){if(type==='paid'||type==='carpark')return'#0b73d9';if(type==='disabled')return'#8E44AD';if(type==='loading')return'#ff681f';if(type==='ev')return'#29c9b2';if(['no_parking','yellow_double','red_route'].includes(type))return'#9d9da5';return'#078d16'}
function priority(item){return item.source==='curated'||item.source==='dtro'?0:item.source==='council'?1:item.source==='verified_seed'?2:item.source==='osm'?3:4}
function mergeById(items){
  return Array.from(new Map(items.filter(Boolean).sort((a,b)=>priority(a)-priority(b)).map(item=>[item.id,item])).values())
}
export function getMockSegments(){return[]}
