// Blue Badge parking adapter.
// The public map only shows verified/surveyed disabled bays.
// CPZ zones can remain as light background context, but non-disabled paid/permit/loading bays are hidden.
import{supabase}from'./supabase'

export function isLondon(lat,lng){return lat>51.28&&lat<51.7&&lng>-0.51&&lng<0.34}

export async function getParkingData(bounds){
  const[verified,surveyed]=await Promise.all([fetchVerifiedBlueBadge(bounds),fetchSurveyedBlueBadge(bounds)])
  return mergeById([...verified,...surveyed])
}

async function fetchVerifiedBlueBadge(bounds){
  if(!bounds)return[]
  try{
    const{data,error}=await supabase
      .from('parking_segments')
      .select('*')
      .eq('is_verified',true)
      .eq('type','disabled')
      .gte('lat',bounds.south)
      .lte('lat',bounds.north)
      .gte('lng',bounds.west)
      .lte('lng',bounds.east)
      .limit(2000)
    if(error)return[]
    return(data||[]).filter(usableDisabledRow).map(row=>({
      id:row.external_id||row.id,
      type:'disabled',
      color:'#8E44AD',
      coords:Array.isArray(row.coords)?row.coords:[[row.lat,row.lng]],
      lat:row.lat,
      lng:row.lng,
      name:row.name||'Blue Badge bay',
      restriction:row.restriction||'Blue Badge holders only. Check bay plate and road markings.',
      hours:row.hours||'Check bay sign',
      maxStay:row.max_stay||null,
      tariff:row.tariff||'',
      cpz:row.cpz||'',
      spaces:row.spaces||'',
      length:row.length||'',
      isCarPark:!!row.is_car_park,
      source:row.source||'verified_blue_badge',
      sourceName:row.source_name||'Verified Blue Badge data',
      council:row.council||'Newham',
      confidence:row.confidence||'high',
      dataNote:row.data_note||'Verified Blue Badge parking bay. Always check the bay plate and road markings before parking.'
    }))
  }catch{return[]}
}

async function fetchSurveyedBlueBadge(bounds){
  if(!bounds)return[]
  try{
    const{data,error}=await supabase
      .from('surveyed_restrictions')
      .select('*')
      .eq('restriction_type','disabled')
      .gte('lat',bounds.south)
      .lte('lat',bounds.north)
      .gte('lng',bounds.west)
      .lte('lng',bounds.east)
      .limit(2000)
    if(error)return[]
    return(data||[]).map(row=>({
      id:row.external_id||row.id,
      type:'disabled',
      color:'#8E44AD',
      coords:Array.isArray(row.coords)?row.coords:[[row.lat,row.lng]],
      lat:row.lat,
      lng:row.lng,
      name:row.road_name?`Blue Badge bay · ${row.road_name}`:'Blue Badge bay',
      restriction:row.restriction_text||'Blue Badge holders only. Check bay plate and road markings.',
      hours:row.operating_hours||'Check bay sign',
      maxStay:row.max_stay||null,
      tariff:'Blue Badge bay',
      cpz:row.cpz||'',
      spaces:row.spaces||'',
      length:row.length||'',
      isCarPark:false,
      source:'surveyed_blue_badge',
      sourceName:'Surveyed Blue Badge bay',
      council:'Newham',
      confidence:row.confidence||'medium',
      dataNote:row.photo_url?'Surveyed Blue Badge bay with photo evidence. Check signs before parking.':'Surveyed Blue Badge bay. Check signs before parking.'
    }))
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
function usableDisabledRow(row){
  const coords=Array.isArray(row.coords)?row.coords:[[row.lat,row.lng]].filter(Boolean)
  if(!row.lat||!row.lng)return false
  if(coords.length>1){const length=lineLengthMetres(coords);if(!length||length>300)return false}
  return true
}
function priority(item){return item.source==='dtro'||item.source==='verified_blue_badge'?0:item.source==='surveyed_blue_badge'?1:2}
function mergeById(items){return Array.from(new Map(items.filter(Boolean).sort((a,b)=>priority(a)-priority(b)).map(item=>[item.id,item])).values())}
export function getMockSegments(){return[]}
