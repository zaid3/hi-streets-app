import{NextResponse}from'next/server'
import{COUNCIL_PARKING_SOURCES,normaliseCouncilRows}from'../../../../lib/councilParkingSources'
import{getSupabaseAdmin,isSupabaseAdminConfigured}from'../../../../lib/supabaseAdmin'

export const dynamic='force-dynamic'

function authorised(req){
  const token=process.env.ADMIN_IMPORT_TOKEN||''
  if(!token)return false
  const header=req.headers.get('authorization')||''
  return header===`Bearer ${token}`
}

function toRow(item){
  return{
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
    source:'council',
    source_name:item.sourceName,
    council:item.council,
    confidence:item.confidence||'high',
    data_note:item.dataNote,
    is_verified:false,
    updated_at:new Date().toISOString(),
  }
}

export async function POST(req){
  if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
  if(!isSupabaseAdminConfigured)return NextResponse.json({ok:false,error:'Supabase admin is not configured'},{status:500})
  const source=COUNCIL_PARKING_SOURCES.find(s=>s.id==='camden-parking-bays')
  const res=await fetch(source.endpoint+'?$limit=50000',{cache:'no-store'})
  if(!res.ok)return NextResponse.json({ok:false,error:'Could not fetch Camden parking data'},{status:502})
  const rows=await res.json()
  const items=normaliseCouncilRows(source,rows,source.bounds).map(toRow)
  const supabase=getSupabaseAdmin()
  let imported=0
  for(let i=0;i<items.length;i+=500){
    const chunk=items.slice(i,i+500)
    const{error}=await supabase.from('parking_segments').upsert(chunk,{onConflict:'external_id'})
    if(error)return NextResponse.json({ok:false,error:error.message,imported},{status:500})
    imported+=chunk.length
  }
  return NextResponse.json({ok:true,source:source.id,imported,verified:false,message:'Rows imported as unverified. Review sample streets before setting is_verified=true.'})
}
