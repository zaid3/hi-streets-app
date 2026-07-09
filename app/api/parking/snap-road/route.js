import{NextResponse}from'next/server'

export const dynamic='force-dynamic'

function validPoint(point){
  return Array.isArray(point)&&point.length>=2&&Number.isFinite(Number(point[0]))&&Number.isFinite(Number(point[1]))
}

function decimate(points,max=100){
  if(points.length<=max)return points
  const out=[]
  const last=points.length-1
  for(let i=0;i<max;i++)out.push(points[Math.round((i*last)/(max-1))])
  return out
}

async function bodyJson(req){try{return await req.json()}catch{return{}}}

export async function POST(req){
  const key=process.env.GOOGLE_ROADS_API_KEY||process.env.GOOGLE_MAPS_API_KEY||process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||''
  if(!key)return NextResponse.json({ok:false,error:'Google Roads API key is not configured'},{status:200})
  const body=await bodyJson(req)
  const raw=Array.isArray(body.coords)?body.coords.filter(validPoint):[]
  if(raw.length<2)return NextResponse.json({ok:false,error:'At least two coordinates are required'},{status:200})
  const points=decimate(raw).map(([lat,lng])=>[Number(lat),Number(lng)])
  const url=new URL('https://roads.googleapis.com/v1/snapToRoads')
  url.searchParams.set('path',points.map(([lat,lng])=>`${lat.toFixed(7)},${lng.toFixed(7)}`).join('|'))
  url.searchParams.set('interpolate',body.interpolate===false?'false':'true')
  url.searchParams.set('key',key)
  try{
    const res=await fetch(url.toString(),{cache:'no-store',signal:AbortSignal.timeout(7000)})
    const json=await res.json().catch(()=>({}))
    if(!res.ok)return NextResponse.json({ok:false,error:json?.error?.message||'Google Roads API failed',status:res.status},{status:200})
    const snapped=(json.snappedPoints||[])
      .map(point=>point.location?[point.location.latitude,point.location.longitude]:null)
      .filter(Boolean)
    if(snapped.length<2)return NextResponse.json({ok:false,error:'No snapped road geometry returned'},{status:200})
    return NextResponse.json({ok:true,coords:snapped,warnings:json.warningMessage?[json.warningMessage]:[]},{headers:{'Cache-Control':'public, s-maxage=86400, stale-while-revalidate=604800'}})
  }catch(error){
    return NextResponse.json({ok:false,error:error?.message||'Snap-to-road failed'},{status:200})
  }
}
