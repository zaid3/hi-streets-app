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

function unsafeDtroRow(row){
  if(row?.source!=='dtro')return false
  const coords=Array.isArray(row.coords)?row.coords:[]
  if(coords.length<2)return true
  if(badText(row.name)||badText(row.restriction))return true
  const length=lineLengthMetres(coords)
  if(!length||length>1500)return true
  return false
}

async function bodyJson(req){try{return await req.json()}catch{return{}}}

export async function POST(req){
  if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
  if(!isSupabaseAdminConfigured)return NextResponse.json({ok:false,error:'Supabase admin is not configured'},{status:500})
  const body=await bodyJson(req)
  const dryRun=body.dryRun===true
  const supabase=getSupabaseAdmin()
  const{data,error}=await supabase
    .from('parking_segments')
    .select('id,external_id,source,coords,name,restriction,is_verified')
    .eq('source','dtro')
    .limit(10000)
  if(error)return NextResponse.json({ok:false,error:error.message},{status:500})
  const unsafe=(data||[]).filter(unsafeDtroRow)
  const ids=unsafe.map(row=>row.id).filter(Boolean)
  let updated=0
  if(!dryRun){
    for(let i=0;i<ids.length;i+=500){
      const chunk=ids.slice(i,i+500)
      const{error:updateError}=await supabase.from('parking_segments').update({is_verified:false}).in('id',chunk)
      if(updateError)return NextResponse.json({ok:false,error:updateError.message,updated},{status:500})
      updated+=chunk.length
    }
  }
  return NextResponse.json({ok:true,dryRun,checked:data?.length||0,unsafe:ids.length,updated,sample:unsafe.slice(0,5).map(row=>({id:row.id,external_id:row.external_id,name:row.name,restriction:row.restriction}))})
}

export async function GET(req){
  if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
  return NextResponse.json({ok:true,route:'clean-parking-data',supabaseAdminConfigured:isSupabaseAdminConfigured})
}
