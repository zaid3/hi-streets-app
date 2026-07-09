import{NextResponse}from'next/server'
import{getSupabaseAdmin,isSupabaseAdminConfigured}from'../../../../lib/supabaseAdmin'

export const dynamic='force-dynamic'
export const runtime='nodejs'

function authorised(req){
  const token=process.env.ADMIN_IMPORT_TOKEN||''
  if(!token)return false
  return(req.headers.get('authorization')||'')===`Bearer ${token}`
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
function badText(value){
  const text=String(value||'').trim()
  return !text||/\*\*NOT PROVIDED\*\*|not provided|unknown|unnamed|example|^d-tro parking restriction$/i.test(text)
}
function safeRow(row){
  if(row?.source!=='dtro'&&row?.source!=='council')return false
  const coords=Array.isArray(row.coords)?row.coords:[]
  if(coords.length<2)return false
  if(badText(row.name)||badText(row.restriction))return false
  const length=lineLengthMetres(coords)
  return length>0&&length<=1500
}
function parseBounds(value){
  if(!value||typeof value!=='object')return null
  const bounds={south:Number(value.south),west:Number(value.west),north:Number(value.north),east:Number(value.east)}
  return Object.values(bounds).every(Number.isFinite)&&bounds.south<bounds.north&&bounds.west<bounds.east?bounds:null
}
function inBounds(row,bounds){
  if(!bounds)return false
  return row.lat>=bounds.south&&row.lat<=bounds.north&&row.lng>=bounds.west&&row.lng<=bounds.east
}
async function bodyJson(req){try{return await req.json()}catch{return{}}}

export async function POST(req){
  if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
  if(!isSupabaseAdminConfigured)return NextResponse.json({ok:false,error:'Supabase admin is not configured'},{status:500})
  const body=await bodyJson(req)
  const dryRun=body.dryRun===true
  const bounds=parseBounds(body.bounds)
  if(!bounds)return NextResponse.json({ok:false,error:'Bounds are required so only the reviewed local area is published.'},{status:400})
  const source=body.source||'dtro'
  const supabase=getSupabaseAdmin()
  const{data,error}=await supabase
    .from('parking_segments')
    .select('id,external_id,source,coords,lat,lng,name,restriction,is_verified')
    .eq('source',source)
    .eq('is_verified',false)
    .limit(10000)
  if(error)return NextResponse.json({ok:false,error:error.message},{status:500})
  const candidates=(data||[]).filter(row=>inBounds(row,bounds))
  const publishable=candidates.filter(safeRow)
  const rejected=candidates.filter(row=>!safeRow(row))
  let updated=0
  if(!dryRun&&publishable.length){
    const ids=publishable.map(row=>row.id).filter(Boolean)
    for(let i=0;i<ids.length;i+=500){
      const chunk=ids.slice(i,i+500)
      const{error:updateError}=await supabase.from('parking_segments').update({is_verified:true,confidence:'high'}).in('id',chunk)
      if(updateError)return NextResponse.json({ok:false,error:updateError.message,updated},{status:500})
      updated+=chunk.length
    }
  }
  return NextResponse.json({
    ok:true,
    dryRun,
    source,
    bounds,
    checked:data?.length||0,
    candidates:candidates.length,
    publishable:publishable.length,
    rejected:rejected.length,
    updated,
    message:dryRun?'Dry run only. Re-run without dryRun after reviewing the sample.':'Safe local parking rows are now public.',
    sample:publishable.slice(0,8).map(row=>({id:row.id,external_id:row.external_id,name:row.name,restriction:row.restriction,lat:row.lat,lng:row.lng}))
  })
}

export async function GET(req){
  if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
  return NextResponse.json({ok:true,route:'verify-parking-data',supabaseAdminConfigured:isSupabaseAdminConfigured})
}
