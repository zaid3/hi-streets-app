import{NextResponse}from'next/server'
import{dtroConfig,getDtroById,searchDtros}from'../../../../lib/dtroClient'
import{normaliseDtroParking}from'../../../../lib/dtroParkingNormaliser'
import{getSupabaseAdmin,isSupabaseAdminConfigured}from'../../../../lib/supabaseAdmin'

export const dynamic='force-dynamic'

const DEFAULT_PARKING_TYPES=[
  'kerbsideLimitedWaiting',
  'kerbsidePermitParking',
  'kerbsideNoWaiting',
  'kerbsideNoStopping',
  'kerbsideLoading',
  'kerbsideNoLoading',
  'kerbsideDisabledBadgeHolders',
  'kerbsideParkingPlace',
]

function authorised(req){
  const token=process.env.ADMIN_IMPORT_TOKEN||''
  if(!token)return false
  return(req.headers.get('authorization')||'')===`Bearer ${token}`
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
    source:'dtro',
    source_name:item.sourceName,
    council:item.council,
    confidence:item.confidence||'high',
    data_note:item.dataNote,
    is_verified:false,
    updated_at:new Date().toISOString(),
  }
}

async function bodyJson(req){
  try{return await req.json()}catch{return{}}
}

async function fetchBySearch({regulationTypes,pageSize,pages}){
  const ids=new Set()
  const searches=[]
  for(const regulationType of regulationTypes){
    for(let page=1;page<=pages;page++){
      const result=await searchDtros({regulationType,page,pageSize})
      searches.push({regulationType,page,count:result?.results?.length||0,totalCount:result?.totalCount})
      for(const row of result?.results||[])if(row.id)ids.add(row.id)
      if(!result?.results?.length||result.results.length<pageSize)break
    }
  }
  const dtros=[]
  for(const id of ids)dtros.push(await getDtroById(id))
  return{dtros,searches,ids:[...ids]}
}

export async function POST(req){
  if(!authorised(req))return NextResponse.json({ok:false,error:'Unauthorised'},{status:401})
  const cfg=dtroConfig()
  if(!cfg.configured)return NextResponse.json({ok:false,error:'D-TRO credentials are not configured'},{status:500})
  const body=await bodyJson(req)
  const url=new URL(req.url)
  const dtroId=body.dtroId||url.searchParams.get('dtroId')
  const dryRun=body.dryRun===true||url.searchParams.get('dryRun')==='1'
  const pageSize=Math.min(50,Math.max(1,Number(body.pageSize||25)))
  const pages=Math.min(20,Math.max(1,Number(body.pages||1)))
  const regulationTypes=Array.isArray(body.regulationTypes)&&body.regulationTypes.length?body.regulationTypes:DEFAULT_PARKING_TYPES
  const fetched=dtroId?{dtros:[await getDtroById(dtroId)],searches:[],ids:[dtroId]}:await fetchBySearch({regulationTypes,pageSize,pages})
  const items=fetched.dtros.flatMap(normaliseDtroParking)
  const rows=items.map(toRow)
  if(dryRun)return NextResponse.json({ok:true,dryRun:true,dtros:fetched.ids.length,parkingRows:rows.length,searches:fetched.searches,sample:rows.slice(0,5)})
  if(!isSupabaseAdminConfigured)return NextResponse.json({ok:false,error:'Supabase admin is not configured'},{status:500})
  const supabase=getSupabaseAdmin()
  let imported=0
  for(let i=0;i<rows.length;i+=250){
    const chunk=rows.slice(i,i+250)
    const{error}=await supabase.from('parking_segments').upsert(chunk,{onConflict:'external_id'})
    if(error)return NextResponse.json({ok:false,error:error.message,imported},{status:500})
    imported+=chunk.length
  }
  return NextResponse.json({ok:true,source:'dtro',dtros:fetched.ids.length,imported,verified:false,searches:fetched.searches,message:'D-TRO parking rows imported as unverified. Review streets before setting is_verified=true.'})
}
