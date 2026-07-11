import{NextResponse}from'next/server'
import{supabase}from'../../../../lib/supabase'
import{NEWHAM_BOUNDS,boundsIntersect}from'../../../../lib/newhamSeedData'

export const dynamic='force-dynamic'

function num(v,fallback){const n=Number(v);return Number.isFinite(n)?n:fallback}
function boundsFrom(url){const sp=url.searchParams;const b={south:num(sp.get('south'),NEWHAM_BOUNDS.south),west:num(sp.get('west'),NEWHAM_BOUNDS.west),north:num(sp.get('north'),NEWHAM_BOUNDS.north),east:num(sp.get('east'),NEWHAM_BOUNDS.east)};return{south:Math.max(b.south,NEWHAM_BOUNDS.south),west:Math.max(b.west,NEWHAM_BOUNDS.west),north:Math.min(b.north,NEWHAM_BOUNDS.north),east:Math.min(b.east,NEWHAM_BOUNDS.east)}}
function item(row){return{id:row.external_id||row.id,type:'paid',color:'#0b73d9',coords:[[row.lat,row.lng]],lat:row.lat,lng:row.lng,name:row.name||'Paid parking bay',restriction:row.location_code?`PayByPhone location ${row.location_code}`:'Paid parking bay',hours:row.hours||'Check signs',maxStay:row.max_stay||null,tariff:row.tariff||'',cpz:row.cpz||'',isCarPark:false,source:'paybyphone',sourceName:'PayByPhone / paid bay import',confidence:'high',dataNote:'Verified paid-bay/location import. Always check the bay plate and payment app before parking.'}}
export async function GET(req){
  const url=new URL(req.url)
  const b=boundsFrom(url)
  if(!boundsIntersect(b,NEWHAM_BOUNDS))return NextResponse.json({ok:true,items:[]})
  try{
    const{data,error}=await supabase.from('paid_bays').select('*').eq('is_verified',true).gte('lat',b.south).lte('lat',b.north).gte('lng',b.west).lte('lng',b.east).limit(1000)
    if(error)return NextResponse.json({ok:true,items:[],warning:error.message})
    return NextResponse.json({ok:true,items:(data||[]).map(item)},{headers:{'Cache-Control':'public, s-maxage=300'}})
  }catch(error){return NextResponse.json({ok:true,items:[],warning:error?.message||String(error)})}
}
