export const CAMDEN_BOUNDS={south:51.512,west:-0.22,north:51.575,east:-0.105}

export const COUNCIL_PARKING_SOURCES=[
  {
    id:'camden-parking-bays',
    council:'London Borough of Camden',
    shortName:'Camden',
    kind:'socrata',
    endpoint:'https://opendata.camden.gov.uk/resource/7hiv-3r9k.json',
    datasetUrl:'https://opendata.camden.gov.uk/Transport/Parking-Bays/7hiv-3r9k',
    bounds:CAMDEN_BOUNDS,
    licence:'Open council data',
    confidence:'high',
  },
]

export function boundsOverlap(a,b){
  if(!a||!b)return true
  return !(a.west>b.east||a.east<b.west||a.south>b.north||a.north<b.south)
}

export function activeCouncilSources(bounds){
  return COUNCIL_PARKING_SOURCES.filter(source=>boundsOverlap(bounds,source.bounds))
}

export function parseWktCoords(wkt){
  if(!wkt||typeof wkt!=='string')return[]
  const text=wkt.trim()
  const pairs=[...text.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)]
  return pairs.map(match=>normalisePair(Number(match[1]),Number(match[2]))).filter(Boolean)
}

function normalisePair(a,b){
  if(!Number.isFinite(a)||!Number.isFinite(b))return null
  if(Math.abs(a)<=90&&Math.abs(b)<=180&&a>49&&a<61)return[a,b]
  return[b,a]
}

function pick(row,names){
  for(const name of names){
    if(row?.[name]!==undefined&&row?.[name]!==null&&String(row[name]).trim()!=='')return row[name]
  }
  return''
}

function text(row,names){return String(pick(row,names)||'').trim()}

function numberValue(row,names){
  const raw=pick(row,names)
  const n=Number(raw)
  return Number.isFinite(n)?n:null
}

function coordsFromRow(row){
  const wkt=text(row,['wkt','the_geom','geometry','geocoded_column','geolocation'])
  const parsed=parseWktCoords(wkt)
  if(parsed.length)return parsed
  const lat=numberValue(row,['latitude','lat','y'])
  const lng=numberValue(row,['longitude','lon','lng','x'])
  return lat&&lng?[[lat,lng]]:[]
}

function midPoint(coords){
  if(!coords.length)return{lat:null,lng:null}
  const point=coords[Math.floor(coords.length/2)]||coords[0]
  return{lat:point[0],lng:point[1]}
}

function classifyBay(row){
  const raw=[
    text(row,['restriction_type','parking_bay_type','bay_type','restriction','type','description']),
    text(row,['tariff','charge','payment','pay_by_phone']),
    text(row,['disabled','blue_badge']),
  ].join(' ').toLowerCase()
  if(/disabled|blue badge/.test(raw))return{type:'disabled',color:'#8E44AD'}
  if(/loading/.test(raw))return{type:'loading',color:'#ff681f'}
  if(/resident|permit/.test(raw))return{type:'resident',color:'#078d16'}
  if(/electric|ev/.test(raw))return{type:'ev',color:'#29c9b2'}
  if(/no waiting|no parking|double yellow|red route|no stopping/.test(raw))return{type:'no_parking',color:'#9d9da5'}
  if(/pay|paid|tariff|meter|cashless|phone|display|voucher|charge/.test(raw))return{type:'paid',color:'#0b73d9'}
  return{type:'free',color:'#078d16'}
}

function inBounds(coords,bounds){
  if(!bounds||!coords.length)return true
  return coords.some(([lat,lng])=>lat>=bounds.south&&lat<=bounds.north&&lng>=bounds.west&&lng<=bounds.east)
}

export function normaliseCamdenBay(row,index,bounds){
  const coords=coordsFromRow(row)
  if(!inBounds(coords,bounds))return null
  const{lat,lng}=midPoint(coords)
  if(!lat||!lng)return null
  const bay=classifyBay(row)
  const road=text(row,['road_name','street','street_name','location','name'])||'Camden parking bay'
  const restriction=text(row,['restriction_type','parking_bay_type','bay_type','restriction','description'])||'Council parking bay'
  const hours=text(row,['times_of_operation','hours','hours_of_operation','controlled_hours'])||'Check signs'
  const maxStay=text(row,['maximum_stay','max_stay','maxstay'])||null
  const tariff=text(row,['tariff','charge','price','payment'])||''
  const cpz=text(row,['cpz','controlled_parking_zone','zone'])||''
  const spaces=text(row,['approximate_number_of_spaces','number_of_spaces','spaces'])||''
  const length=text(row,['approximate_length_metres','bay_length_metres','length'])||''
  return{
    id:`camden-${pick(row,['id','objectid','bay_id','unique_id'])||index}`,
    type:bay.type,
    color:bay.color,
    coords,
    lat,
    lng,
    name:road,
    restriction,
    hours,
    maxStay,
    tariff,
    cpz,
    spaces,
    length,
    isCarPark:false,
    source:'council',
    sourceName:'Camden parking bays',
    council:'London Borough of Camden',
    confidence:'high',
    dataNote:'Official council open data. Always check the roadside sign before parking.',
  }
}

export function normaliseCouncilRows(source,rows,bounds){
  if(source.id==='camden-parking-bays')return(rows||[]).map((row,index)=>normaliseCamdenBay(row,index,bounds)).filter(Boolean)
  return[]
}
