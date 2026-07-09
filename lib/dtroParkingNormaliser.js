const PARKING_REGULATION_HINTS=[
  'kerbside','parking','waiting','loading','stopping','taxi','disabled','permit','resident','limited'
]

function deg(x){return x*180/Math.PI}
function rad(x){return x*Math.PI/180}

export function bngToLatLng(easting,northing){
  const a=6377563.396,b=6356256.909,F0=0.9996012717
  const lat0=rad(49),lon0=rad(-2),N0=-100000,E0=400000
  const e2=1-(b*b)/(a*a),n=(a-b)/(a+b)
  let lat=lat0,M=0
  do{
    lat=(northing-N0-M)/(a*F0)+lat
    const Ma=(1+n+(5/4)*n*n+(5/4)*n*n*n)*(lat-lat0)
    const Mb=(3*n+3*n*n+(21/8)*n*n*n)*Math.sin(lat-lat0)*Math.cos(lat+lat0)
    const Mc=((15/8)*n*n+(15/8)*n*n*n)*Math.sin(2*(lat-lat0))*Math.cos(2*(lat+lat0))
    const Md=(35/24)*n*n*n*Math.sin(3*(lat-lat0))*Math.cos(3*(lat+lat0))
    M=b*F0*(Ma-Mb+Mc-Md)
  }while(Math.abs(northing-N0-M)>=0.00001)
  const cosLat=Math.cos(lat),sinLat=Math.sin(lat)
  const nu=a*F0/Math.sqrt(1-e2*sinLat*sinLat)
  const rho=a*F0*(1-e2)/Math.pow(1-e2*sinLat*sinLat,1.5)
  const eta2=nu/rho-1
  const tanLat=Math.tan(lat),tan2=tanLat*tanLat,tan4=tan2*tan2,tan6=tan4*tan2
  const secLat=1/cosLat,dE=easting-E0
  const VII=tanLat/(2*rho*nu)
  const VIII=tanLat/(24*rho*Math.pow(nu,3))*(5+3*tan2+eta2-9*tan2*eta2)
  const IX=tanLat/(720*rho*Math.pow(nu,5))*(61+90*tan2+45*tan4)
  const X=secLat/nu
  const XI=secLat/(6*Math.pow(nu,3))*(nu/rho+2*tan2)
  const XII=secLat/(120*Math.pow(nu,5))*(5+28*tan2+24*tan4)
  const XIIA=secLat/(5040*Math.pow(nu,7))*(61+662*tan2+1320*tan4+720*tan6)
  const latOsgb=lat-VII*dE*dE+VIII*Math.pow(dE,4)-IX*Math.pow(dE,6)
  const lonOsgb=lon0+X*dE-XI*Math.pow(dE,3)+XII*Math.pow(dE,5)-XIIA*Math.pow(dE,7)
  return osgb36ToWgs84(latOsgb,lonOsgb)
}

function osgb36ToWgs84(lat,lon){
  const a=6377563.396,b=6356256.909,e2=1-(b*b)/(a*a),h=0
  const sinLat=Math.sin(lat),cosLat=Math.cos(lat),sinLon=Math.sin(lon),cosLon=Math.cos(lon)
  const nu=a/Math.sqrt(1-e2*sinLat*sinLat)
  const x1=(nu+h)*cosLat*cosLon
  const y1=(nu+h)*cosLat*sinLon
  const z1=((1-e2)*nu+h)*sinLat
  const tx=446.448,ty=-125.157,tz=542.060
  const s=20.4894e-6,rx=rad(0.1502/3600),ry=rad(0.2470/3600),rz=rad(0.8421/3600)
  const x2=tx+(1+s)*x1-rz*y1+ry*z1
  const y2=ty+rz*x1+(1+s)*y1-rx*z1
  const z2=tz-ry*x1+rx*y1+(1+s)*z1
  const a2=6378137,b2=6356752.3141,e22=1-(b2*b2)/(a2*a2)
  const p=Math.sqrt(x2*x2+y2*y2)
  let lat2=Math.atan2(z2,p*(1-e22)),latPrev
  do{
    latPrev=lat2
    const nu2=a2/Math.sqrt(1-e22*Math.sin(lat2)**2)
    lat2=Math.atan2(z2+e22*nu2*Math.sin(lat2),p)
  }while(Math.abs(lat2-latPrev)>1e-12)
  return{lat:deg(lat2),lng:deg(Math.atan2(y2,x2))}
}

function validLatLng(lat,lng){return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>49&&lat<61&&lng>-8&&lng<2}

export function parseDtroGeometry(value){
  if(!value||typeof value!=='string')return[]
  const pairs=[...value.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)]
  return pairs.map(match=>{
    const a=Number(match[1]),b=Number(match[2])
    if(validLatLng(a,b))return[a,b]
    if(validLatLng(b,a))return[b,a]
    if(a>0&&b>0){const p=bngToLatLng(a,b);return validLatLng(p.lat,p.lng)?[p.lat,p.lng]:null}
    return null
  }).filter(Boolean)
}

function firstText(...values){
  for(const value of values){
    if(value!==undefined&&value!==null&&String(value).trim())return String(value).trim()
  }
  return''
}

function collectGeometryStrings(node,found=[]){
  if(!node)return found
  if(typeof node==='string'){
    if(/(POINT|LINESTRING|POLYGON|SRID=)/i.test(node))found.push(node)
    return found
  }
  if(Array.isArray(node)){node.forEach(item=>collectGeometryStrings(item,found));return found}
  if(typeof node==='object')Object.values(node).forEach(value=>collectGeometryStrings(value,found))
  return found
}

function midPoint(coords){
  const point=coords[Math.floor(coords.length/2)]||coords[0]
  return point?{lat:point[0],lng:point[1]}:{lat:null,lng:null}
}

function regulationTypes(provision){
  return(provision.regulation||[]).map(reg=>firstText(reg?.generalRegulation?.regulationType,reg?.regulationType)).filter(Boolean)
}

function isParkingProvision(provision){
  const haystack=[provision.provisionDescription,...regulationTypes(provision)].join(' ').toLowerCase()
  return PARKING_REGULATION_HINTS.some(hint=>haystack.includes(hint))
}

function classifyProvision(provision){
  const text=[provision.provisionDescription,...regulationTypes(provision)].join(' ').toLowerCase()
  if(/disabled|blue badge/.test(text))return{type:'disabled',color:'#8E44AD'}
  if(/electric|ev charging|charging place/.test(text))return{type:'ev',color:'#29c9b2'}
  if(/loading/.test(text))return{type:'loading',color:'#ff681f'}
  if(/no waiting|no parking|no stopping|red route|prohibition/.test(text))return{type:'no_parking',color:'#9d9da5'}
  if(/permit|resident/.test(text))return{type:'resident',color:'#078d16'}
  if(/limited|paid|pay|meter|parking place|parking bay/.test(text))return{type:'paid',color:'#0b73d9'}
  return{type:'free',color:'#078d16'}
}

function collectValues(node,key,found=[]){
  if(!node)return found
  if(Array.isArray(node)){node.forEach(item=>collectValues(item,key,found));return found}
  if(typeof node==='object'){
    for(const[name,value]of Object.entries(node)){
      if(name===key&&typeof value==='string')found.push(value.split('T')[0])
      collectValues(value,key,found)
    }
  }
  return found
}

function hoursFromRegulations(provision){
  const text=JSON.stringify(provision.regulation||[])
  const dayMatches=[...text.matchAll(/"applicableDay"\s*:\s*\[([^\]]+)\]/g)].map(m=>m[1].replace(/["\s]/g,'').split(',').filter(Boolean).join(', '))
  const starts=collectValues(provision.regulation,'startTimeOfPeriod')
  const ends=collectValues(provision.regulation,'endTimeOfPeriod')
  const times=starts.map((start,index)=>ends[index]?`${start}-${ends[index]}`:start)
  const days=[...new Set(dayMatches)].filter(Boolean).join('; ')
  const uniqueTimes=[...new Set(times)].filter(Boolean).join('; ')
  if(days&&uniqueTimes)return`${days} ${uniqueTimes}`
  if(uniqueTimes)return uniqueTimes
  return'Check signs'
}

function lengthMetres(coords){
  if(coords.length<2)return''
  const R=6371000
  let total=0
  for(let i=1;i<coords.length;i++){
    const[lat1,lng1]=coords[i-1],[lat2,lng2]=coords[i]
    const dLat=rad(lat2-lat1),dLng=rad(lng2-lng1)
    const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)**2
    total+=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
  }
  return String(Math.max(1,Math.round(total)))
}

export function normaliseDtroParking(dtro){
  const source=dtro?.data?.source||dtro?.data||dtro?.source||{}
  const provisions=Array.isArray(source.provision)?source.provision:[]
  const troName=firstText(source.troName,dtro?.troName,'D-TRO parking restriction')
  const council=firstText(dtro?.traName,source.traName,source.currentTraOwner,source.traCreator,'D-TRO authority')
  const dtroId=dtro?.id||source.id||source.reference||'dtro'
  return provisions.flatMap((provision,index)=>{
    if(!isParkingProvision(provision))return[]
    const geometryStrings=collectGeometryStrings(provision.regulatedPlace||provision)
    const coords=[...new Map(geometryStrings.flatMap(parseDtroGeometry).map(p=>[p.join(','),p])).values()]
    if(!coords.length)return[]
    const point=midPoint(coords)
    if(!point.lat||!point.lng)return[]
    const bay=classifyProvision(provision)
    const place=Array.isArray(provision.regulatedPlace)?provision.regulatedPlace[0]:null
    const description=firstText(provision.provisionDescription,place?.description,troName)
    const regs=regulationTypes(provision).join(', ')
    return[{
      id:`dtro-${dtroId}-${provision.reference||index}`,
      type:bay.type,
      color:bay.color,
      coords,
      lat:point.lat,
      lng:point.lng,
      name:firstText(place?.description,troName,'D-TRO parking restriction'),
      restriction:firstText(regs,description,'D-TRO parking restriction'),
      hours:hoursFromRegulations(provision),
      maxStay:null,
      tariff:'',
      cpz:'',
      spaces:'',
      length:lengthMetres(coords),
      isCarPark:false,
      source:'dtro',
      sourceName:'DfT D-TRO',
      council,
      confidence:'high',
      dataNote:'Official DfT Digital Traffic Regulation Order extract. Always check the roadside sign before parking.',
    }]
  })
}
