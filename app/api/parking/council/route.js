import{NextResponse}from'next/server'
import{activeCouncilSources,normaliseCouncilRows}from'../../../../lib/councilParkingSources'

export const dynamic='force-dynamic'

function boundsFromUrl(url){
  const p=url.searchParams
  const bounds={
    south:Number(p.get('south')),
    west:Number(p.get('west')),
    north:Number(p.get('north')),
    east:Number(p.get('east')),
  }
  return Object.values(bounds).every(Number.isFinite)?bounds:null
}

async function fetchSocrata(source,bounds){
  const url=new URL(source.endpoint)
  url.searchParams.set('$limit','5000')
  const res=await fetch(url.toString(),{next:{revalidate:60*60*12}})
  if(!res.ok)throw new Error(`${source.id} failed`)
  const rows=await res.json()
  return normaliseCouncilRows(source,rows,bounds)
}

async function fetchSource(source,bounds){
  if(source.kind==='socrata')return fetchSocrata(source,bounds)
  return[]
}

export async function GET(request){
  const url=new URL(request.url)
  const bounds=boundsFromUrl(url)
  if(!bounds)return NextResponse.json({items:[],sources:[],error:'Missing map bounds'},{status:400})
  const sources=activeCouncilSources(bounds)
  const settled=await Promise.allSettled(sources.map(source=>fetchSource(source,bounds).then(items=>({source,items}))))
  const items=[],used=[],errors=[]
  for(const result of settled){
    if(result.status==='fulfilled'){
      items.push(...result.value.items)
      used.push({id:result.value.source.id,council:result.value.source.council,datasetUrl:result.value.source.datasetUrl,confidence:result.value.source.confidence})
    }else errors.push(result.reason?.message||'Council source failed')
  }
  return NextResponse.json({items,sources:used,errors},{headers:{'Cache-Control':'public, s-maxage=43200, stale-while-revalidate=86400'}})
}
