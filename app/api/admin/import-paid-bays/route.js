import{NextResponse}from'next/server'
import{getSupabaseAdmin,isSupabaseAdminConfigured}from'../../../../lib/supabaseAdmin'
import{inNewhamBounds}from'../../../../lib/newhamSeedData'

export const dynamic='force-dynamic'
export const runtime='nodejs'

function authorised(req){const token=process.env.ADMIN_IMPORT_TOKEN||'';return Boolean(token)&&((req.headers.get('authorization')||'')===`Bearer ${token}`)}
function clean(v){return v===undefined||v===null?'':String(v).trim()}
function row(input,index){
  const lat=Number(input.lat??input.latitude),lng=Number(input.lng??input.lon??input.longitude)
  const locationCode=clean(input.location_code??input.locationCode??input.code)
  const name=clean(input.name??input.location_name??input.address??`Paid bay ${locationCode||index+1}`)
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!inNewhamBounds({lat,lng}))return null
  return{external_id:clean(input.external_id)||`paybyphone-${locationCode||lat+'-'+lng}`,provider:clean(input.provider)||'paybyphone',location_code:locationCode,name,address:clean(input.address),lat,lng,tariff:clean(input.tariff),max_stay:clean(input.max_stay??input.maxStay),hours:clean(input.hours),cpz:clean(input.cpz),source_url:clean(input.source_url??input.sourceUrl),is_verified:input.is_verified===false?false:true,updated_at:new Date().toISOString()}
}
export async function POST(req){
  try{
    if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
    if(!isSupabaseAdminConfigured)return NextResponse.json({ok:false,error:'Supabase admin is not configured'},{status:500})
    const body=await req.json().catch(()=>({}))
    const rows=Array.isArray(body.items)?body.items.map(row).filter(Boolean):[]
    if(body.dryRun)return NextResponse.json({ok:true,dryRun:true,received:Array.isArray(body.items)?body.items.length:0,valid:rows.length,sample:rows.slice(0,10)})
    if(!rows.length)return NextResponse.json({ok:false,error:'No valid Newham paid bay rows supplied'},{status:400})
    const{error}=await getSupabaseAdmin().from('paid_bays').upsert(rows,{onConflict:'external_id'})
    if(error)throw error
    return NextResponse.json({ok:true,imported:rows.length,sample:rows.slice(0,10)})
  }catch(error){return NextResponse.json({ok:false,error:error?.message||String(error)},{status:500})}
}

export async function GET(req){if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401});return NextResponse.json({ok:true,route:'import-paid-bays',example:{items:[{location_code:'12345',name:'Example paid bay',lat:51.536,lng:0.031,tariff:'£1.20/hour',max_stay:'2 hours',hours:'Mon-Sat 8am-6.30pm',cpz:'Zone A',source_url:'PayByPhone map'}]}})}
