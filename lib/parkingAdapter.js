// Parking data adapter.
// Priority:
// 1) verified imported parking segments from Supabase
// 2) council open parking bay data where available
// 3) OSM/Overpass where parking tags exist
// 4) Newham local guide markers so the borough map is useful while exact bay data is incomplete
import{supabase}from'./supabase'
import{NEWHAM_BOUNDS,boundsIntersect}from'./newhamSeedData'
const OVERPASS='https://overpass-api.de/api/interpreter'
export function isLondon(lat,lng){return lat>51.28&&lat<51.7&&lng>-0.51&&lng<0.34}
export async function getParkingData(bounds){
  const[curated,council,osm]=await Promise.all([fetchCuratedParking(bounds),fetchCouncilParking(bounds),fetchOverpassSafe(bounds)])
  const live=mergeById([...curated,...council,...osm])
  const guide=fetchNewhamFallback(bounds)
  return mergeById([...live,...guide])
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
function guide(id,type,lat,lng,name,restriction,hours='Check signs'){return{id:`newham-guide-${id}`,type,lat,lng,name,restriction,hours,sourceName:'Newham local guide'}}
function fetchNewhamFallback(bounds){
  if(bounds&&!boundsIntersect(bounds,NEWHAM_BOUNDS))return[]
  const now=new Date(),h=now.getHours(),dow=now.getDay(),controlled=h>=8&&h<18.5&&dow>=1&&dow<=6
  const base=[
    guide('green-street-1','paid',51.5360,0.0312,'Green Street parking area','Busy shopping area. Paid, limited stay and permit bays nearby. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('green-street-2','loading',51.5352,0.0308,'Green Street loading restrictions','Loading bays and loading restrictions operate around shops. Check plate times.'),
    guide('green-street-3','resident',51.5374,0.0338,'Upton Park side streets','Resident permit and controlled parking zones nearby. Check zone signs.','Commonly Mon-Sat daytime controlled'),
    guide('green-street-4','paid',51.5344,0.0296,'Queen’s Market parking area','Market area with controlled parking nearby. Check machine/app and bay signs.','Commonly Mon-Sat daytime controlled'),
    guide('green-street-5','disabled',51.5358,0.0325,'Green Street blue badge area','Blue badge bays may be available near shops and stations. Check bay plate.'),
    guide('green-street-6','no_parking',51.5368,0.0368,'Barking Road junction restrictions','Yellow lines and junction restrictions nearby. Do not park unless signs allow.'),
    guide('east-ham-1','carpark',51.5397,0.0529,'East Ham town centre parking','Town centre parking nearby. Check machine, app or signs.','Usually daytime/evening controlled'),
    guide('east-ham-2','paid',51.5399,0.0507,'High Street North parking area','Paid and limited-stay parking around East Ham shops. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('east-ham-3','disabled',51.5366,0.0516,'East Ham blue badge area','Blue badge bays around civic and shopping area. Check bay plate.'),
    guide('east-ham-4','no_parking',51.5360,0.0508,'High Street no-waiting restrictions','Yellow lines and busier junction restrictions nearby. Do not park unless signs allow.'),
    guide('east-ham-5','resident',51.5420,0.0537,'East Ham residential CPZ','Resident permit and controlled parking streets nearby. Check entry zone plate.','Commonly Mon-Sat daytime controlled'),
    guide('east-ham-6','paid',51.5415,0.0478,'Myrtle Road parking area','Side-street controlled bays near East Ham. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('upton-park-1','resident',51.5351,0.0346,'Upton Park residential streets','Resident permit and controlled parking zones nearby. Check zone signs.','Commonly Mon-Sat daytime controlled'),
    guide('upton-park-2','paid',51.5356,0.0388,'Boleyn parking area','Controlled parking near Barking Road/Boleyn area. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('upton-park-3','loading',51.5331,0.0399,'Barking Road loading area','Loading and short-stay restrictions around shops. Check plate times.'),
    guide('plaistow-1','resident',51.5312,0.0245,'Plaistow residential CPZ','Permit and controlled parking around Plaistow. Check entry signs.','Commonly Mon-Sat daytime controlled'),
    guide('plaistow-2','paid',51.5322,0.0178,'Plaistow station parking area','Controlled parking and short-stay bays near station. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('plaistow-3','no_parking',51.5286,0.0220,'Plaistow Road restrictions','Yellow lines and bus lane/junction restrictions nearby. Check signs.'),
    guide('forest-gate-1','paid',51.5494,0.0243,'Forest Gate station parking area','Short-stay, paid and permit restrictions nearby. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('forest-gate-2','resident',51.5507,0.0285,'Woodgrange residential streets','Resident permit parking nearby. Check CPZ signs.','Commonly Mon-Sat daytime controlled'),
    guide('forest-gate-3','loading',51.5485,0.0227,'Woodgrange Road loading area','Loading bays and short-stay restrictions near shops. Check signs.'),
    guide('manor-park-1','paid',51.5523,0.0460,'Manor Park parking area','Controlled parking near station and local shops. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('manor-park-2','resident',51.5510,0.0505,'Manor Park residential CPZ','Permit and controlled parking streets nearby. Check entry zone plate.','Commonly Mon-Sat daytime controlled'),
    guide('stratford-1','carpark',51.5418,-0.0030,'Stratford parking area','Major car parks and controlled streets nearby. Check operator rules.','Car parks vary; street parking controlled'),
    guide('stratford-2','paid',51.5429,0.0015,'Stratford town centre street parking','Paid/limited-stay bays and restrictions nearby. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('stratford-3','disabled',51.5448,-0.0072,'Stratford blue badge area','Blue badge parking around town centre and stations. Check bay plate.'),
    guide('stratford-4','no_parking',51.5404,0.0065,'Stratford High Street restrictions','Red routes, bus lanes and no-stopping restrictions nearby. Check signs.'),
    guide('maryland-1','paid',51.5466,0.0069,'Maryland parking area','Controlled parking near station and local shops. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('maryland-2','resident',51.5486,0.0102,'Maryland residential streets','Permit and CPZ restrictions nearby. Check entry signs.','Commonly Mon-Sat daytime controlled'),
    guide('west-ham-1','resident',51.5279,0.0051,'West Ham residential CPZ','Permit and controlled parking around station/residential roads. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('west-ham-2','paid',51.5285,0.0078,'West Ham station parking area','Controlled streets near station. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('canning-town-1','paid',51.5141,0.0084,'Canning Town parking area','Controlled parking and off-street parking nearby. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('canning-town-2','resident',51.5166,0.0125,'Canning Town residential CPZ','Permit and controlled parking nearby. Check entry signs.','Commonly Mon-Sat daytime controlled'),
    guide('canning-town-3','no_parking',51.5116,0.0056,'A13/Canning Town restrictions','No-stopping, red route and junction restrictions nearby. Check signs.'),
    guide('custom-house-1','paid',51.5097,0.0262,'Custom House parking area','Station/event-area restrictions may apply. Check signs.','Commonly controlled'),
    guide('custom-house-2','resident',51.5082,0.0315,'Custom House residential streets','Permit and controlled parking nearby. Check CPZ signs.','Commonly Mon-Sat daytime controlled'),
    guide('beckton-1','free',51.5155,0.0584,'Beckton local parking area','Parking availability varies by retail/residential area. Check local signs.'),
    guide('beckton-2','carpark',51.5159,0.0612,'Beckton retail parking','Retail car parks nearby. Check operator time limits.'),
    guide('beckton-3','resident',51.5204,0.0618,'Beckton residential parking area','Residential and estate parking restrictions nearby. Check signs/permits.'),
    guide('royal-docks-1','paid',51.5073,0.0345,'Royal Docks parking area','Controlled parking and event restrictions may apply. Check signs.','Commonly controlled'),
    guide('royal-docks-2','disabled',51.5089,0.0290,'Royal Docks blue badge area','Blue badge bays may be available near venues/stations. Check bay signs.'),
    guide('silvertown-1','resident',51.5018,0.0405,'Silvertown residential parking area','Permit and local restrictions nearby. Check signs.','Commonly controlled'),
    guide('north-woolwich-1','free',51.5001,0.0619,'North Woolwich parking area','Local parking varies by street and estate. Check signs.'),
    guide('little-ilford-1','resident',51.5457,0.0635,'Little Ilford residential CPZ','Permit and controlled parking nearby. Check entry signs.','Commonly Mon-Sat daytime controlled'),
    guide('little-ilford-2','paid',51.5438,0.0610,'Little Ilford local shops parking','Short-stay and controlled parking near shops. Check signs.','Commonly Mon-Sat daytime controlled'),
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
