import{NextResponse}from'next/server'
import{NEWHAM_BOUNDS}from'../../../../lib/newhamSeedData'

export const dynamic='force-dynamic'

function fallback(){
  const b=NEWHAM_BOUNDS
  return{type:'FeatureCollection',features:[{type:'Feature',properties:{name:'London Borough of Newham',source:'fallback bounds'},geometry:{type:'Polygon',coordinates:[[[b.west,b.south],[b.east,b.south],[b.east,b.north],[b.west,b.north],[b.west,b.south]]]}}]}
}

export async function GET(){
  try{
    const url=new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q','London Borough of Newham, London, UK')
    url.searchParams.set('format','json')
    url.searchParams.set('polygon_geojson','1')
    url.searchParams.set('limit','1')
    const res=await fetch(url.toString(),{headers:{'Accept-Language':'en','User-Agent':'Hi-Streets Newham community parking app'},next:{revalidate:60*60*24*14}})
    if(!res.ok)throw new Error('Boundary lookup failed')
    const data=await res.json()
    const geom=data?.[0]?.geojson
    if(!geom)throw new Error('Boundary geometry missing')
    return NextResponse.json({type:'FeatureCollection',features:[{type:'Feature',properties:{name:'London Borough of Newham',source:'OpenStreetMap Nominatim'},geometry:geom}]},{headers:{'Cache-Control':'public, s-maxage=1209600, stale-while-revalidate=2419200'}})
  }catch{
    return NextResponse.json(fallback(),{headers:{'Cache-Control':'public, s-maxage=86400'}})
  }
}
