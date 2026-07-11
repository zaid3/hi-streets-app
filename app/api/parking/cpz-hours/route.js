import{NextResponse}from'next/server'
import{supabase}from'../../../../lib/supabase'

export const dynamic='force-dynamic'

export async function GET(req){
  const url=new URL(req.url)
  const zone=(url.searchParams.get('zone')||'').trim()
  try{
    let query=supabase.from('cpz_hours').select('*').order('zone',{ascending:true})
    if(zone)query=query.eq('zone',zone)
    const{data,error}=await query
    if(error)return NextResponse.json({ok:true,items:[],warning:error.message})
    return NextResponse.json({ok:true,items:data||[]},{headers:{'Cache-Control':'public, s-maxage=300'}})
  }catch(error){return NextResponse.json({ok:true,items:[],warning:error?.message||String(error)})}
}
