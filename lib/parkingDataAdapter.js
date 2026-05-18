const OVERPASS='https://overpass-api.de/api/interpreter'

// Offset lat/lng point perpendicular to road line
function offset(lat1,lng1,lat2,lng2,side,meters){
  const dx=lat2-lat1,dy=lng2-lng1
  const len=Math.sqrt(dx*dx+dy*dy)
  if(len===0)return[lat1,lng1]
  const nx=-dy/len,ny=dx/len
  const mPerDeg=111320
  const oLat=meters/mPerDeg
  const oLng=meters/(mPerDeg*Math.cos(lat1*Math.PI/180))
  const dir=side==='right'?-1:1
  return[lat1+nx*oLat*dir,lng1+ny*oLng*dir]
}

function offsetCoords(coords,side,meters=8){
  return coords.map((pt,i)=>{
    const next=coords[Math.min(i+1,coords.length-1)]
    const prev=coords[Math.max(i-1,0)]
    const ref=i<coords.length-1?next:prev
    return offset(pt[0],pt[1],ref[0],ref[1],side,meters)
  })
}

function getRuleNow(tags,now=new Date()){
  const h=now.getHours(),d=now.getDay()
  const isWD=d>=1&&d<=5,isSat=d===6
  const inHours=h>=8&&h<18
  const inSatHours=h>=8&&h<13

  if(tags?.['highway']==='living_street')return{type:'free',label:'Park for free',color:'#2ECC71',bayType:'Resident bay'}
  if(tags?.['parking:lane:right']==='no_parking'||tags?.['parking:lane:left']==='no_parking'){
    return{type:'restricted',label:'No parking',color:'#888888',bayType:'Double yellow line',appliesAllTime:true}
  }
  if(tags?.['parking:lane:right']==='no_stopping'){
    return{type:'restricted',label:'No stopping',color:'#C0392B',bayType:'Red route',appliesAllTime:true}
  }
  if(tags?.['parking:condition:right']==='residents'||tags?.['parking:condition:left']==='residents'){
    if((isWD||isSat)&&inHours)return{type:'permit',label:'Permit only',color:'#9B59B6',bayType:'Resident bay',note:'No parking 08:00–18:00'}
    return{type:'free',label:'Park for free',color:'#2ECC71',bayType:'Resident bay',note:'No parking after 08:00 tomorrow'}
  }
  if(tags?.['parking:lane:right:fee']==='yes'||tags?.['parking:condition:right']==='ticket'){
    if((isWD||isSat)&&inHours)return{type:'paid',label:'Pay to park',color:'#4A9EFF',bayType:'Paid bay',note:'Pay to park until 18:30'}
    return{type:'free',label:'Park for free',color:'#2ECC71',bayType:'Paid bay',note:'Pay to park after 08:00 tomorrow'}
  }
  // Default: most streets free at night
  if((isWD||isSat)&&inHours)return{type:'paid',label:'Pay to park',color:'#4A9EFF',bayType:'Paid bay',note:'Pay to park until 18:30'}
  return{type:'free',label:'Park for free',color:'#2ECC71',bayType:'Paid bay',note:'Pay to park after 08:00 tomorrow'}
}

export async function getParkingSegmentsByViewport(bounds){
  const{south,west,north,east}=bounds
  const bbox=`${south},${west},${north},${east}`
  const q=`[out:json][timeout:15];(way["highway"~"residential|tertiary|secondary|primary|unclassified"]["name"](${bbox});way["parking:lane:right"](${bbox});way["parking:lane:left"](${bbox}););out geom 60;`
  try{
    const r=await fetch(`${OVERPASS}?data=${encodeURIComponent(q)}`)
    const data=await r.json()
    const segs=[],now=new Date()
    for(const way of(data.elements||[]).slice(0,50)){
      if(!way.geometry||way.geometry.length<2)continue
      const coords=way.geometry.map(n=>[n.lat,n.lon])
      const tags=way.tags||{}
      const rule=getRuleNow(tags,now)
      const name=tags.name||'Road'
      const rcoords=offsetCoords(coords,'right',8)
      segs.push(buildSeg(`r-${way.id}`,name,'right',rcoords,coords,rule,tags))
      if(tags['parking:lane:left']&&tags['parking:lane:left']!=='no'&&tags['parking:lane:left']!=='no_parking'){
        const lcoords=offsetCoords(coords,'left',8)
        const lrule=getRuleNow({...tags,'parking:lane:right':tags['parking:lane:left']},now)
        segs.push(buildSeg(`l-${way.id}`,name,'left',lcoords,coords,lrule,tags))
      }
    }
    if(segs.length>=4)return segs
    return getMockSegments(bounds)
  }catch{return getMockSegments(bounds)}
}

function buildSeg(id,name,side,offCoords,rawCoords,rule,tags){
  const mid=Math.floor(rawCoords.length/2)
  return{
    id:`osm-${id}`,source:'osm',name,side,
    coords:offCoords,rawCoords,
    midLat:rawCoords[mid][0],midLng:rawCoords[mid][1],
    ...rule,
    tags,
    maxStay:tags['parking:condition:right:maxstay']||tags.maxstay||'10h 1m',
    cost:rule.type==='paid'?2.50:0,
    noReturn:rule.type==='paid'?'1 hour':'None',
    address:name,
  }
}

export function getMockSegments(bounds){
  const{south,west,north,east}=bounds
  const clat=(south+north)/2,clng=(west+east)/2
  const now=new Date(),h=now.getHours(),d=now.getDay()
  const inHours=h>=8&&h<18&&d>=1&&d<=6
  const sp=0.002

  // Generate realistic grid of parking segments
  const segs=[]
  const streets=[
    {name:'High Street',lat:clat+sp*.6,dlng:sp*3,side:'south'},
    {name:'Marlow Road',lat:clat-sp*.4,dlng:sp*2.5,side:'south'},
    {name:'Church Street',lat:clat+sp*1.4,dlng:sp*2,side:'south'},
    {name:'Rancliffe Road',lat:clat-sp*1.2,dlng:sp*2,side:'north'},
    {name:'Station Approach',lat:clat+sp*.1,dlng:sp*1.5,side:'restricted'},
  ]

  streets.forEach((st,i)=>{
    const isRestricted=st.side==='restricted'
    let rule
    if(isRestricted){rule={type:'restricted',label:'No parking',color:'#888888',bayType:'Double yellow line',appliesAllTime:true,note:'Applies at all times'}}
    else if(st.name==='Rancliffe Road'){rule=inHours?{type:'permit',label:'Permit only',color:'#9B59B6',bayType:'Resident bay',note:'No parking until 16:00'}:{type:'free',label:'Park for free',color:'#2ECC71',bayType:'Resident bay',note:'No parking after 08:00 tomorrow'}}
    else{rule=inHours?{type:'paid',label:'Pay to park',color:'#4A9EFF',bayType:'Paid bay',note:'Pay to park until 18:30'}:{type:'free',label:'Park for free',color:'#2ECC71',bayType:'Paid bay',note:'Pay to park after 08:00 tomorrow'}}

    const startLng=clng-sp*1.5+(i*.001)
    const endLng=startLng+st.dlng
    const offLat=st.lat+(st.side==='south'?-0.00006:0.00006)

    // Main long segment
    segs.push({
      id:`mock-${i}-main`,source:'mock',name:st.name,side:st.side,
      coords:[[offLat,startLng],[offLat,startLng+st.dlng*.33],[offLat,startLng+st.dlng*.67],[offLat,endLng]],
      rawCoords:[[st.lat,startLng],[st.lat,endLng]],
      midLat:st.lat,midLng:(startLng+endLng)/2,
      ...rule,
      maxStay:'10h 1m',cost:rule.type==='paid'?2.50:0,noReturn:rule.type==='paid'?'1 hour':'None',
      address:`${st.name}, Newham`,
    })

    // Short break / restricted section
    if(!isRestricted){
      segs.push({
        id:`mock-${i}-gap`,source:'mock',name:st.name+' (junction)',side:st.side,
        coords:[[offLat,startLng+st.dlng*.33+.00005],[offLat,startLng+st.dlng*.38]],
        rawCoords:[[st.lat,startLng+st.dlng*.33],[st.lat,startLng+st.dlng*.38]],
        midLat:st.lat,midLng:startLng+st.dlng*.35,
        type:'restricted',label:'No parking',color:'#888888',bayType:'Junction clearance',note:'Applies at all times',
        maxStay:null,cost:0,noReturn:null,address:st.name,
      })
    }
  })

  // Vertical streets
  const vstreets=[
    {name:'Basil Avenue',lng:clng+sp*.8,dlat:sp*2,free:true},
    {name:'Pulleyns Avenue',lng:clng-sp*.6,dlat:sp*1.5,free:false},
  ]
  vstreets.forEach((vs,i)=>{
    const offLng=vs.lng+0.00007
    const rule=vs.free||!inHours?{type:'free',label:'Park for free',color:'#2ECC71',bayType:'Paid bay',note:'Pay to park after 08:00 tomorrow'}:{type:'paid',label:'Pay to park',color:'#4A9EFF',bayType:'Paid bay',note:'Pay to park until 18:30'}
    segs.push({
      id:`mock-v${i}`,source:'mock',name:vs.name,side:'right',
      coords:[[clat-sp*.3,offLng],[clat,offLng],[clat+sp*.3,offLng],[clat+sp*.7,offLng],[clat+sp*1.1,offLng]],
      rawCoords:[[clat-sp*.3,vs.lng],[clat+sp*1.1,vs.lng]],
      midLat:clat+sp*.4,midLng:vs.lng,
      ...rule,
      maxStay:'10h 1m',cost:rule.type==='paid'?2.50:0,noReturn:'None',address:vs.name+', London',
    })
  })

  return segs
}

export async function getCarParksByViewport(bounds){
  const{south,west,north,east}=bounds
  const bbox=`${south},${west},${north},${east}`
  const q=`[out:json][timeout:10];node["amenity"="parking"](${bbox});out body 20;`
  try{
    const r=await fetch(`${OVERPASS}?data=${encodeURIComponent(q)}`)
    const data=await r.json()
    return(data.elements||[]).slice(0,15).map(el=>({
      id:`cp-${el.id}`,type:'carpark',
      name:el.tags?.name||'Car park',
      lat:el.lat,lng:el.lon,
      free:el.tags?.fee==='no'||!el.tags?.fee,
      cost:el.tags?.fee==='no'?0:1.80,
      maxStay:el.tags?.maxstay||'All day',
      operator:el.tags?.operator||null,
      info:el.tags?.fee==='no'?'Free car park. Open all day.':'Pay & Display car park.',
      statusLabel:el.tags?.fee==='no'?'Park for free':'Pay at location',
      bayType:'Off-street parking',
      address:el.tags?.name||'Car park',
    }))
  }catch{return getMockCarParks(bounds)}
}

export function getMockCarParks(bounds){
  const{south,west,north,east}=bounds
  const clat=(south+north)/2,clng=(west+east)/2
  return[
    {id:'mcp1',type:'carpark',name:'Madge Gill Way car park',lat:clat-.003,lng:clng-.004,free:true,cost:0,maxStay:'All day',info:'Free surface car park.',statusLabel:'Park for free',bayType:'Off-street parking',address:'Madge Gill Way'},
    {id:'mcp2',type:'carpark',name:'Town Centre Multi-storey',lat:clat+.003,lng:clng+.003,free:false,cost:1.80,maxStay:'8h',info:'Pay & Display. £1.80/hr.',statusLabel:'Pay at location',bayType:'Off-street parking',address:'Town Centre'},
  ]
}
