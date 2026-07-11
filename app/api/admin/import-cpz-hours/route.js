import{NextResponse}from'next/server'
import{getSupabaseAdmin,isSupabaseAdminConfigured}from'../../../../lib/supabaseAdmin'

export const dynamic='force-dynamic'
export const runtime='nodejs'

function authorised(req){const token=process.env.ADMIN_IMPORT_TOKEN||'';return Boolean(token)&&((req.headers.get('authorization')||'')===`Bearer ${token}`)}
function clean(v){return v===undefined||v===null?'':String(v).trim()}
function row(input){
  const zone=clean(input.zone??input.Zone??input.cpz??input.CPZ)
  const operating_hours=clean(input.operating_hours??input.operatingHours??input.hours)
  if(!zone||!operating_hours)return null
  return{zone,zone_name:clean(input.zone_name??input.zoneName??input.name),operating_hours,days:clean(input.days),start_time:clean(input.start_time??input.startTime),end_time:clean(input.end_time??input.endTime),source_url:clean(input.source_url??input.sourceUrl),notes:clean(input.notes),updated_at:new Date().toISOString()}
}
export async function POST(req){
  try{
    if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
    if(!isSupabaseAdminConfigured)return NextResponse.json({ok:false,error:'Supabase admin is not configured'},{status:500})
    const body=await req.json().catch(()=>({}))
    const rows=Array.isArray(body.items)?body.items.map(row).filter(Boolean):[]
    if(body.dryRun)return NextResponse.json({ok:true,dryRun:true,received:Array.isArray(body.items)?body.items.length:0,valid:rows.length,sample:rows.slice(0,10)})
    if(!rows.length)return NextResponse.json({ok:false,error:'No valid CPZ hour rows supplied'},{status:400})
    const{error}=await getSupabaseAdmin().from('cpz_hours').upsert(rows,{onConflict:'zone'})
    if(error)throw error
    return NextResponse.json({ok:true,imported:rows.length,sample:rows.slice(0,10)})
  }catch(error){return NextResponse.json({ok:false,error:error?.message||String(error)},{status:500})}
}
export async function GET(req){if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401});return NextResponse.json({ok:true,route:'import-cpz-hours',example:{items:[{zone:'A',zone_name:'Example CPZ',operating_hours:'Mon-Sat 8am-6.30pm',source_url:'https://www.newham.gov.uk/parking-permits/parking-permit-zones'}]}})}
