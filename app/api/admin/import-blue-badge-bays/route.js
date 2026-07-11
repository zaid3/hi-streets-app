import{NextResponse}from'next/server'
import{getSupabaseAdmin,isSupabaseAdminConfigured}from'../../../../lib/supabaseAdmin'
import{NEWHAM_BOUNDS}from'../../../../lib/newhamSeedData'

export const dynamic='force-dynamic'
export const runtime='nodejs'

function authorised(req){const token=process.env.ADMIN_IMPORT_TOKEN||'';return Boolean(token)&&((req.headers.get('authorization')||'')===`Bearer ${token}`)}
function inNewham(lat,lng){return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=NEWHAM_BOUNDS.south&&lat<=NEWHAM_BOUNDS.north&&lng>=NEWHAM_BOUNDS.west&&lng<=NEWHAM_BOUNDS.east}
function rowFrom(input,index){
  const lat=Number(input.lat),lng=Number(input.lng)
  if(!inNewham(lat,lng))return null
  const road=String(input.road||input.road_name||input.name||'').trim()
  const bayId=String(input.id||input.external_id||`blue-badge-${road||'bay'}-${lat}-${lng}-${index}`).replace(/\s+/g,'-').toLowerCase()
  return{
    external_id:bayId,
    type:'disabled',
    color:'#8E44AD',
    coords:Array.isArray(input.coords)?input.coords:[[lat,lng]],
    lat,lng,
    name:road?`Blue Badge bay · ${road}`:'Blue Badge bay',
    restriction:String(input.restriction||input.restriction_text||'Blue Badge holders only. Check bay plate and road markings.'),
    hours:String(input.hours||input.operating_hours||'Check bay sign'),
    max_stay:input.max_stay||input.maxStay||null,
    tariff:'Blue Badge bay',
    cpz:input.cpz||'',
    spaces:input.spaces||input.bay_count||'',
    length:input.length||'',
    is_car_park:false,
    source:'surveyed_blue_badge',
    source_name:input.source_name||'Surveyed Blue Badge bay',
    council:'Newham',
    confidence:input.confidence||'medium',
    data_note:input.photo_url?'Surveyed Blue Badge bay with photo evidence. Check signs before parking.':'Surveyed Blue Badge bay. Check signs before parking.',
    is_verified:input.is_verified!==false,
    updated_at:new Date().toISOString(),
  }
}
export async function POST(req){
  try{
    if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
    if(!isSupabaseAdminConfigured)return NextResponse.json({ok:false,error:'Supabase admin not configured'},{status:500})
    const body=await req.json().catch(()=>({}))
    const rows=Array.isArray(body.items)?body.items:Array.isArray(body.rows)?body.rows:[]
    const mapped=rows.map(rowFrom).filter(Boolean)
    if(!mapped.length)return NextResponse.json({ok:false,error:'No valid Newham Blue Badge rows found. Send {items:[{lat,lng,road,hours,max_stay,spaces}]}'},{status:400})
    const supabase=getSupabaseAdmin()
    const{error}=await supabase.from('parking_segments').upsert(mapped,{onConflict:'external_id'})
    if(error)throw error
    return NextResponse.json({ok:true,imported:mapped.length,sample:mapped.slice(0,5)})
  }catch(error){return NextResponse.json({ok:false,error:error?.message||String(error)},{status:500})}
}
export async function GET(req){if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401});return NextResponse.json({ok:true,route:'import-blue-badge-bays',example:{items:[{lat:51.5366,lng:0.0516,road:'High Street North',hours:'At all times',max_stay:'Check sign',spaces:'1'}]}})}
