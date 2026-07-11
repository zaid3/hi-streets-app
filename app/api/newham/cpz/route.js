import{NextResponse}from'next/server'

export const dynamic='force-dynamic'
export const runtime='nodejs'

const CPZ_URL='https://mapping.newham.gov.uk/ArcGIS/rest/services/CPZ/MapServer/0/query'

function emptyFeatureCollection(){return{type:'FeatureCollection',features:[]}}
function normaliseFeature(feature,index){
  const properties=feature.properties||{}
  const zone=properties.Zone||properties.ZONE||properties.CPZ||properties.cpz||properties.Name||properties.NAME||properties.OBJECTID||`CPZ ${index+1}`
  return{
    ...feature,
    id:feature.id||properties.OBJECTID||properties.FID||`newham-cpz-${index}`,
    properties:{...properties,zone:String(zone),source:'Newham Council ArcGIS CPZ'}
  }
}

export async function GET(){
  try{
    const url=new URL(CPZ_URL)
    url.searchParams.set('where','1=1')
    url.searchParams.set('outFields','*')
    url.searchParams.set('f','geojson')
    const res=await fetch(url.toString(),{
      headers:{'Accept':'application/geo+json,application/json','User-Agent':'Hi-Streets Newham CPZ map'},
      cache:'no-store'
    })
    if(!res.ok)throw new Error(`Newham ArcGIS ${res.status}`)
    const geojson=await res.json()
    const features=Array.isArray(geojson.features)?geojson.features.map(normaliseFeature):[]
    return NextResponse.json({type:'FeatureCollection',features,properties:{source:'Newham Council ArcGIS CPZ',url:CPZ_URL}}, {headers:{'Cache-Control':'public, s-maxage=86400, stale-while-revalidate=604800'}})
  }catch(error){
    return NextResponse.json({...emptyFeatureCollection(),error:error?.message||String(error)},{headers:{'Cache-Control':'public, s-maxage=300'}})
  }
}
