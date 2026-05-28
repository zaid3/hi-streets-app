// Parking data: OSM Overpass where available, with resilient Newham seed data fallback.
import{boundsIntersect,newhamParkingSegments}from'./newhamSeedData'

const OVERPASS='https://overpass-api.de/api/interpreter'

export function isLondon(lat,lng){
  return lat>51.28&&lat<51.7&&lng>-0.51&&lng<0.34
}

export async function getParkingData(bounds){
  const seed=boundsIntersect(bounds)?newhamParkingSegments:[]
  try{
    const data=await fetchOverpass(bounds)
    const merged=mergeById([...seed,...data])
    if(merged.length>=3)return merged
  }catch{}
  return seed.length?seed:getMockSegments(bounds)
}

async function fetchOverpass(bounds){
  const{south,west,north,east}=bounds
  const bbox=`${south},${west},${north},${east}`
  const q=`[out:json][timeout:10];
(
  way["parking"="lane"](${bbox});
  way["parking:lane:both"](${bbox});
  way["parking:lane:left"](${bbox});
  way["parking:lane:right"](${bbox});
  way["amenity"="parking"](${bbox});
  node["amenity"="parking"](${bbox});
);
out geom qt 90;`
  const res=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q),signal:AbortSignal.timeout(8000)})
  if(!res.ok)throw new Error('Overpass failed')
  const json=await res.json()
  return processOverpass(json.elements||[])
}

function processOverpass(elements){
  const now=new Date()
  const h=now.getHours(),dow=now.getDay()
  const isPaid=h>=8&&h<18&&dow>=1&&dow<=6

  return elements.slice(0,100).map((el,i)=>{
    const tags=el.tags||{}
    const isCarPark=tags.amenity==='parking'
    const coords=el.geometry?.length?el.geometry.map(g=>[g.lat,g.lon]):(el.lat&&el.lon?[[el.lat,el.lon]]:null)
    if(!coords?.length)return null
    const lane=[tags['parking:lane:both'],tags['parking:lane:left'],tags['parking:lane:right'],tags.parking].filter(Boolean).join(' ')
    const permit=/permit|residents?/i.test(lane)
    const disabled=/disabled/i.test(tags.parking||tags.capacity?.disabled||'')
    const loading=/loading/i.test(lane)
    const nopark=/no_parking|no_stopping/i.test(lane)

    let type,color
    if(isCarPark){type='carpark';color='#2a5fba'}
    else if(disabled){type='disabled';color='#9B59B6'}
    else if(loading){type='loading';color='#E67E22'}
    else if(nopark){type='restricted';color='#888888'}
    else if(permit){type='resident';color='#8E44AD'}
    else if(isPaid){type='paid';color='#4A9EFF'}
    else{type='free';color='#2ECC71'}

    const lat=el.lat||coords[0]?.[0]
    const lng=el.lon||coords[0]?.[1]
    return{
      id:`osm-${el.id||i}`,
      type,color,coords,
      name:tags.name||tags['addr:street']||(isCarPark?'Car park':'Parking bay'),
      restriction:permit?'Resident permit holders only':nopark?'No parking':isPaid?'Paid parking during controlled hours':'Free / unrestricted parking',
      hours:isPaid?'Mon–Sat 8am–6pm':'Check local signs',
      maxStay:tags.maxstay||null,
      isCarPark,
      source:'osm',
      confidence:isCarPark?'osm':'unknown',
      lat,
      lng,
    }
  }).filter(Boolean)
}

function mergeById(items){
  return Array.from(new Map(items.filter(Boolean).map(item=>[item.id,item])).values())
}

export function getMockSegments(bounds){
  if(!bounds)return newhamParkingSegments
  const{south,west,north,east}=bounds
  const clat=(south+north)/2,clng=(west+east)/2
  const now=new Date(),h=now.getHours(),dow=now.getDay()
  const isPaid=h>=8&&h<18&&dow>=1&&dow<=6

  const streets=[
    {dlat:0,dlng:0,len:0.0025,dir:'h',name:'High Street'},
    {dlat:0.001,dlng:0,len:0.002,dir:'h',name:'Market Road'},
    {dlat:-0.001,dlng:0,len:0.002,dir:'h',name:'Station Road'},
    {dlat:0,dlng:0.002,len:0.002,dir:'v',name:'Church Lane'},
    {dlat:0,dlng:-0.002,len:0.002,dir:'v',name:'Park Avenue'},
    {dlat:0.0015,dlng:0.001,len:0.0018,dir:'h',name:'Victoria Street'},
    {dlat:-0.0015,dlng:-0.001,len:0.0015,dir:'h',name:'Queens Road'},
  ]

  const segs=[]
  streets.forEach((st,i)=>{
    const lat=clat+st.dlat,lng=clng+st.dlng
    const type=i%4===0?'free':i%4===1?(isPaid?'paid':'free'):i%4===2?'resident':'restricted'
    const color=type==='free'?'#2ECC71':type==='paid'?'#4A9EFF':type==='resident'?'#8E44AD':'#888888'
    const coords=st.dir==='h'
      ?[[lat-0.0003,lng],[lat-0.0003,lng+st.len]]
      :[[lat,lng-0.0003],[lat+st.len,lng-0.0003]]
    segs.push({
      id:`mock-${i}`,type,color,coords,
      name:st.name,
      restriction:type==='free'?'Free parking':type==='paid'?'Paid parking (Mon-Sat 8am-6pm)':type==='resident'?'Resident permit holders only':'No parking',
      hours:type==='paid'?'Mon–Sat 8am–6pm':'Any time',
      maxStay:type==='free'?'2 hours':null,
      isCarPark:false,
      source:'unknown',
      confidence:'unknown',
    })
  })

  segs.push({
    id:'mock-cp',type:'carpark',color:'#2a5fba',
    coords:[[clat+0.002,clng+0.001]],
    name:'Central Car Park',restriction:'Pay & display',
    hours:'24 hours',maxStay:null,isCarPark:true,source:'unknown',confidence:'unknown',
    lat:clat+0.002,lng:clng+0.001,
  })

  return segs
}
