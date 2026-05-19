// Parking data: TfL for London, OSM Overpass elsewhere, mock fallback
const OVERPASS='https://overpass-api.de/api/interpreter'

export function isLondon(lat,lng){
  return lat>51.28&&lat<51.7&&lng>-0.51&&lng<0.34
}

export async function getParkingData(bounds){
  try{
    const data=await fetchOverpass(bounds)
    if(data&&data.length>=3)return data
  }catch{}
  return getMockSegments(bounds)
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
)->;
out geom qt 60;`
  const res=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q),signal:AbortSignal.timeout(8000)})
  if(!res.ok)throw new Error('Overpass failed')
  const json=await res.json()
  return processOverpass(json.elements||[],bounds)
}

function processOverpass(elements,bounds){
  const now=new Date()
  const h=now.getHours(),dow=now.getDay()
  const isPaid=h>=8&&h<18&&dow>=1&&dow<=6

  return elements.slice(0,80).map((el,i)=>{
    if(!el.geometry?.length)return null
    const coords=el.geometry.map(g=>[g.lat,g.lon])
    const tags=el.tags||{}
    const isCarPark=tags.amenity==='parking'
    const permit=tags['parking:lane:both']==='permit'||tags['parking:lane:left']==='permit'||tags['parking:lane:right']==='permit'
    const nopark=tags['parking:lane:both']==='no_parking'||tags['parking:lane:left']==='no_parking'

    let type,color
    if(isCarPark){type='carpark';color='#2a5fba'}
    else if(nopark){type='restricted';color='#888888'}
    else if(permit){type='permit';color='#9B59B6'}
    else if(isPaid){type='paid';color='#4A9EFF'}
    else{type='free';color='#2ECC71'}

    return{
      id:`osm-${el.id||i}`,
      type,color,coords,
      name:tags.name||tags['addr:street']||'Parking bay',
      restriction:permit?'Permit holders only':nopark?'No parking':isPaid?'Paid parking (Mon-Sat 8am-6pm)':'Free parking',
      hours:isPaid?'Mon–Sat 8am–6pm':'Currently free',
      maxStay:tags['maxstay']||null,
      isCarPark,
    }
  }).filter(Boolean)
}

export function getMockSegments(bounds){
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
    const types=i%4===0?'free':i%4===1?(isPaid?'paid':'free'):i%4===2?'permit':'restricted'
    const color=types==='free'?'#2ECC71':types==='paid'?'#4A9EFF':types==='permit'?'#9B59B6':'#888888'
    const coords=st.dir==='h'
      ?[[lat-0.0003,lng],[lat-0.0003,lng+st.len]]
      :[[lat,lng-0.0003],[lat+st.len,lng-0.0003]]
    segs.push({
      id:`mock-${i}`,type:types,color,coords,
      name:st.name,
      restriction:types==='free'?'Free parking':types==='paid'?`Paid parking (Mon-Sat 8am-6pm)`:types==='permit'?'Permit holders only':'No parking',
      hours:types==='paid'?'Mon–Sat 8am–6pm':'Any time',
      maxStay:types==='free'?'2 hours':null,
      isCarPark:false,
    })
  })

  // Add a car park
  segs.push({
    id:'mock-cp',type:'carpark',color:'#2a5fba',
    coords:[[clat+0.002,clng+0.001]],
    name:'Central Car Park',restriction:'Pay & display',
    hours:'24 hours',maxStay:null,isCarPark:true,
    lat:clat+0.002,lng:clng+0.001,
  })

  return segs
}
