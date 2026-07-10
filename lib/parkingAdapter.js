// Parking data adapter.
// Priority:
// 1) verified imported parking segments from Supabase
// 2) council open parking bay data where available
// 3) server-side Newham road guide lines from OpenStreetMap road geometry
// 4) Newham local guide markers while exact bay data is incomplete
import{supabase}from'./supabase'
import{NEWHAM_BOUNDS,boundsIntersect}from'./newhamSeedData'

export function isLondon(lat,lng){return lat>51.28&&lat<51.7&&lng>-0.51&&lng<0.34}

export async function getParkingData(bounds){
  const[curated,council,roadGuide]=await Promise.all([fetchCuratedParking(bounds),fetchCouncilParking(bounds),fetchNewhamRoadGuide(bounds)])
  const guide=fetchNewhamFallback(bounds)
  return mergeById([...curated,...council,...roadGuide,...guide])
}

async function fetchCuratedParking(bounds){
  if(!bounds)return[]
  try{
    const{data,error}=await supabase.from('parking_segments').select('*').eq('is_verified',true).gte('lat',bounds.south).lte('lat',bounds.north).gte('lng',bounds.west).lte('lng',bounds.east).limit(5000)
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
      dataNote:row.data_note||'Verified parking data. Always check the roadside sign before parking.'
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

async function fetchNewhamRoadGuide(bounds){
  if(!bounds||!boundsIntersect(bounds,NEWHAM_BOUNDS))return[]
  try{
    const q=new URLSearchParams({south:String(bounds.south),west:String(bounds.west),north:String(bounds.north),east:String(bounds.east)})
    const res=await fetch(`/api/parking/newham-road-guide?${q.toString()}`,{cache:'no-store'})
    if(!res.ok)return[]
    const json=await res.json()
    return json.items||[]
  }catch{return[]}
}

function guide(id,type,lat,lng,name,restriction,hours='Check signs'){
  return{id:`newham-guide-${id}`,type,lat,lng,name,restriction,hours,color:colorFor(type),coords:[[lat,lng]],maxStay:null,isCarPark:type==='carpark',source:'local_guide',sourceName:'Newham local guide',confidence:'low',dataNote:'Local Newham parking guide marker. Not exact bay geometry. Always check the road sign, bay plate and road markings before parking.'}
}

function fetchNewhamFallback(bounds){
  if(bounds&&!boundsIntersect(bounds,NEWHAM_BOUNDS))return[]
  const base=[
    guide('green-street','paid',51.5360,0.0312,'Green Street parking area','Paid, limited-stay and permit bays nearby. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('upton-park','resident',51.5351,0.0346,'Upton Park residential streets','Resident permit and controlled parking nearby. Check CPZ signs.','Commonly Mon-Sat daytime controlled'),
    guide('east-ham','paid',51.5399,0.0507,'East Ham parking area','Paid and limited-stay parking around East Ham shops. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('east-ham-blue-badge','disabled',51.5366,0.0516,'East Ham blue badge area','Blue badge bays around civic and shopping area. Check bay plate.'),
    guide('green-street-loading','loading',51.5352,0.0308,'Green Street loading restrictions','Loading bays and loading restrictions operate around shops. Check plate times.'),
    guide('barking-road-no-waiting','no_parking',51.5368,0.0368,'Barking Road junction restrictions','Yellow lines and junction restrictions nearby. Do not park unless signs allow.'),
    guide('forest-gate','paid',51.5494,0.0243,'Forest Gate parking area','Short-stay, paid and permit restrictions nearby. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('stratford','carpark',51.5418,-0.0030,'Stratford parking area','Major car parks and controlled streets nearby. Check operator rules.'),
    guide('plaistow','resident',51.5312,0.0245,'Plaistow residential CPZ','Permit and controlled parking around Plaistow. Check entry signs.','Commonly Mon-Sat daytime controlled'),
    guide('canning-town','paid',51.5141,0.0084,'Canning Town parking area','Controlled parking and off-street parking nearby. Check signs.','Commonly Mon-Sat daytime controlled'),
    guide('beckton','free',51.5155,0.0584,'Beckton local parking area','Parking availability varies by retail/residential area. Check signs.'),
    guide('custom-house','paid',51.5097,0.0262,'Custom House parking area','Station/event-area restrictions may apply. Check signs.','Commonly controlled'),
    guide('manor-park','resident',51.5510,0.0505,'Manor Park residential CPZ','Permit and controlled parking streets nearby. Check entry zone plate.','Commonly Mon-Sat daytime controlled'),
    guide('little-ilford','resident',51.5457,0.0635,'Little Ilford residential CPZ','Permit and controlled parking nearby. Check entry signs.','Commonly Mon-Sat daytime controlled')
  ]
  return base.filter(item=>!bounds||(item.lat>=bounds.south&&item.lat<=bounds.north&&item.lng>=bounds.west&&item.lng<=bounds.east))
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
function badDtroText(value){const text=String(value||'').trim();return !text||/\*\*NOT PROVIDED\*\*|not provided|unknown|unnamed|example|^d-tro parking restriction$/i.test(text)}
function usableCuratedRow(row){
  if(row?.source!=='dtro')return true
  const coords=Array.isArray(row.coords)?row.coords:[]
  if(coords.length<2)return false
  if(badDtroText(row.name)||badDtroText(row.restriction))return false
  const length=lineLengthMetres(coords)
  return Boolean(length&&length<=1500)
}
function colorFor(type){if(type==='paid'||type==='carpark')return'#0b73d9';if(type==='disabled')return'#8E44AD';if(type==='loading')return'#ff681f';if(type==='ev')return'#29c9b2';if(['no_parking','yellow_double','red_route'].includes(type))return'#9d9da5';return'#078d16'}
function priority(item){return item.source==='curated'||item.source==='dtro'?0:item.source==='council'?1:item.source==='osm'?2:item.source==='road_guide'?3:4}
function mergeById(items){return Array.from(new Map(items.filter(Boolean).sort((a,b)=>priority(a)-priority(b)).map(item=>[item.id,item])).values())}
export function getMockSegments(){return[]}
