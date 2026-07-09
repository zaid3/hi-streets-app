import{NextResponse}from'next/server'
import{getDtroById,searchDtros}from'../../../../lib/dtroClient'
import{normaliseDtroParking}from'../../../../lib/dtroParkingNormaliser'
import{getSupabaseAdmin,isSupabaseAdminConfigured}from'../../../../lib/supabaseAdmin'
import{NEWHAM_BOUNDS}from'../../../../lib/newhamSeedData'

export const dynamic='force-dynamic'
export const runtime='nodejs'

const NEWHAM_TYPES=[
  'kerbsideParkingPlace',
  'kerbsideLimitedWaiting',
  'kerbsidePermitParking',
  'kerbsideDisabledBadgeHolders',
  'kerbsideLoading',
  'kerbsideNoLoading',
  'kerbsideNoWaiting',
  'kerbsideNoStopping',
]

function authorised(req){
  const token=process.env.ADMIN_IMPORT_TOKEN||''
  return Boolean(token)&&((req.headers.get('authorization')||'')===`Bearer ${token}`)
}
function bodyJson(req){return req.json().catch(()=>({}))}
function inBounds(row,bounds=NEWHAM_BOUNDS){return row.lat>=bounds.south&&row.lat<=bounds.north&&row.lng>=bounds.west&&row.lng<=bounds.east}
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
function badText(value){
  const text=String(value||'').trim()
  return !text||/\*\*NOT PROVIDED\*\*|not provided|unknown|unnamed|example|^d-tro parking restriction$/i.test(text)
}
function rejectReason(row){
  const coords=Array.isArray(row.coords)?row.coords:[]
  if(coords.length<2)return'No line geometry'
  if(badText(row.name))return'Missing road name'
  if(badText(row.restriction))return'Missing restriction text'
  const length=lineLengthMetres(coords)
  if(!length)return'Zero length geometry'
  if(length>1500)return'Line is too long to publish safely'
  return''
}
function safeRow(row){return !rejectReason(row)}
function toRow(item){return{
  external_id:item.id,
  type:item.type,
  color:item.color,
  coords:item.coords,
  lat:item.lat,
  lng:item.lng,
  name:item.name,
  restriction:item.restriction,
  hours:item.hours,
  max_stay:item.maxStay,
  tariff:item.tariff,
  cpz:item.cpz,
  spaces:item.spaces,
  length:item.length,
  is_car_park:!!item.isCarPark,
  source:'dtro',
  source_name:item.sourceName,
  council:item.council,
  confidence:item.confidence||'high',
  data_note:item.dataNote,
  is_verified:false,
  updated_at:new Date().toISOString(),
}}
async function searchAndNormalise({startPage,pages,pageSize,regulationTypes}){
  const ids=new Set(),searches=[],fetchErrors=[]
  for(const regulationType of regulationTypes){
    for(let page=startPage;page<startPage+pages;page++){
      try{
        const result=await searchDtros({regulationType,page,pageSize})
        const rows=result?.results||[]
        searches.push({regulationType,page,count:rows.length,totalCount:result?.totalCount})
        rows.forEach(row=>row.id&&ids.add(row.id))
        if(rows.length<pageSize)break
      }catch(error){searches.push({regulationType,page,error:error?.message||String(error)});break}
    }
  }
  const normalised=[]
  for(const id of ids){
    try{normalised.push(...normaliseDtroParking(await getDtroById(id)).map(toRow))}
    catch(error){fetchErrors.push({id,error:error?.message||String(error)})}
  }
  return{rows:normalised.filter(inBounds),totalRowsBeforeBounds:normalised.length,dtros:ids.size,searches,fetchErrors}
}
async function upsertRows(supabase,rows){
  let imported=0
  for(let i=0;i<rows.length;i+=250){
    const chunk=rows.slice(i,i+250)
    const{error}=await supabase.from('parking_segments').upsert(chunk,{onConflict:'external_id'})
    if(error)throw error
    imported+=chunk.length
  }
  return imported
}
async function publishRows(supabase,rows){
  const safe=rows.filter(safeRow)
  let verified=0
  for(let i=0;i<safe.length;i+=250){
    const chunk=safe.slice(i,i+250).map(row=>row.external_id)
    const{error}=await supabase.from('parking_segments').update({is_verified:true,confidence:'high'}).in('external_id',chunk)
    if(error)throw error
    verified+=chunk.length
  }
  return{safe,verified,rejected:rows.filter(row=>!safeRow(row))}
}
function sample(row){return{external_id:row.external_id,type:row.type,name:row.name,restriction:row.restriction,lat:row.lat,lng:row.lng,coords:Array.isArray(row.coords)?row.coords.length:0,length:row.length,reason:rejectReason(row)}}

export async function POST(req){
  try{
    if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
    if(!isSupabaseAdminConfigured)return NextResponse.json({ok:false,error:'Supabase admin is not configured'},{status:500})
    const body=await bodyJson(req)
    const dryRun=body.dryRun===true
    const startPage=Math.max(1,Number(body.startPage||1))
    const pages=Math.min(50,Math.max(1,Number(body.pages||10)))
    const pageSize=Math.min(50,Math.max(1,Number(body.pageSize||50)))
    const regulationTypes=Array.isArray(body.regulationTypes)&&body.regulationTypes.length?body.regulationTypes:NEWHAM_TYPES
    const fetched=await searchAndNormalise({startPage,pages,pageSize,regulationTypes})
    const supabase=getSupabaseAdmin()
    const publishable=fetched.rows.filter(safeRow)
    const rejected=fetched.rows.filter(row=>!safeRow(row))
    if(dryRun)return NextResponse.json({ok:true,dryRun:true,area:'newham',bounds:NEWHAM_BOUNDS,startPage,pages,pageSize,dtros:fetched.dtros,totalRowsBeforeBounds:fetched.totalRowsBeforeBounds,localRows:fetched.rows.length,publishable:publishable.length,rejected:rejected.length,searches:fetched.searches,fetchErrors:fetched.fetchErrors,sample:publishable.slice(0,10).map(sample),rejectedSample:rejected.slice(0,10).map(sample)})
    const imported=await upsertRows(supabase,fetched.rows)
    const published=await publishRows(supabase,fetched.rows)
    return NextResponse.json({ok:true,area:'newham',bounds:NEWHAM_BOUNDS,startPage,pages,pageSize,dtros:fetched.dtros,totalRowsBeforeBounds:fetched.totalRowsBeforeBounds,imported,verified:published.verified,rejected:published.rejected.length,searches:fetched.searches,fetchErrors:fetched.fetchErrors,sample:published.safe.slice(0,10).map(sample),message:published.verified?'Newham D-TRO rows imported and verified in one run.':'No safe Newham D-TRO road-line rows found in this scan window. Increase startPage/pages or add council GIS data.'})
  }catch(error){return NextResponse.json({ok:false,error:error?.message||String(error)},{status:500})}
}

export async function GET(req){
  if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
  return NextResponse.json({ok:true,route:'newham-refresh',area:'newham',bounds:NEWHAM_BOUNDS,usage:{method:'POST',body:{dryRun:true,startPage:1,pages:10,pageSize:50}}})
}
