// Parking data adapter.
// Only show verified/surveyed parking data. CPZ zones are handled separately by the official Newham CPZ layer.
import{supabase}from'./supabase'

export function isLondon(lat,lng){return lat>51.28&&lat<51.7&&lng>-0.51&&lng<0.34}

export async function getParkingData(bounds){
  const[curated,council]=await Promise.all([fetchCuratedParking(bounds),fetchCouncilParking(bounds)])
  return mergeById([...curated,...council])
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
function priority(item){return item.source==='curated'||item.source==='dtro'?0:item.source==='council'?1:2}
function mergeById(items){return Array.from(new Map(items.filter(Boolean).sort((a,b)=>priority(a)-priority(b)).map(item=>[item.id,item])).values())}
export function getMockSegments(){return[]}
