
const OVERPASS = 'https://overpass-api.de/api/interpreter'

// Offset a lat/lng point perpendicular to a line segment by ~5-7m (curb-side)
function offsetPoint(lat1, lng1, lat2, lng2, side, meters) {
  const dx = lat2 - lat1, dy = lng2 - lng1
  const len = Math.sqrt(dx*dx + dy*dy)
  if (len === 0) return [lat1, lng1]
  const nx = -dy / len, ny = dx / len // normal
  const mPerDeg = 111320
  const offsetLat = meters / mPerDeg
  const offsetLng = meters / (mPerDeg * Math.cos(lat1 * Math.PI / 180))
  const dir = side === 'left' ? 1 : -1
  return [lat1 + nx * offsetLat * dir, lng1 + ny * offsetLng * dir]
}

function offsetSegment(coords, side, meters = 6) {
  if (coords.length < 2) return coords
  return coords.map((pt, i) => {
    const [lat, lng] = pt
    const next = coords[i+1] || coords[i-1]
    const [nlat, nlng] = next
    return offsetPoint(lat, lng, nlat, nlng, side, meters)
  })
}

// Determine parking rule for this time of day
function getParkingRule(tags, now = new Date()) {
  const h = now.getHours(), d = now.getDay()
  const isWeekday = d >= 1 && d <= 5
  const isSat = d === 6
  const isWorkingHours = h >= 8 && h < 18

  if (tags?.['parking:lane:right'] === 'no_parking' || tags?.['parking:lane:left'] === 'no_parking') {
    return { type:'restricted', label:'No parking', color:'#888888', weight:5 }
  }
  if (tags?.['parking:lane:right'] === 'permit' || tags?.['parking:condition:right'] === 'residents_zone') {
    return isWeekday && isWorkingHours
      ? { type:'permit', label:'Permit only', color:'#9B59B6', weight:5 }
      : { type:'free', label:'Park for free', color:'#2ECC71', weight:5 }
  }
  if (tags?.['parking:lane:right:fee'] === 'yes' || tags?.['parking:condition:right'] === 'ticket') {
    return isWeekday && isWorkingHours
      ? { type:'paid', label:'Pay to park', color:'#4A9EFF', weight:5 }
      : { type:'free', label:'Park for free', color:'#2ECC71', weight:5 }
  }
  // Default free overnight/weekend pattern
  if (isWeekday && isWorkingHours) {
    return { type:'paid', label:'Pay to park', color:'#4A9EFF', weight:5 }
  }
  return { type:'free', label:'Park for free', color:'#2ECC71', weight:5 }
}

// Fetch real road geometries from OSM and generate curb-side segments
export async function getParkingSegmentsByViewport(bounds) {
  const { south, west, north, east } = bounds
  const bbox = `${south},${west},${north},${east}`

  // Get roads with parking lane data
  const query = `[out:json][timeout:15];(
    way["highway"~"residential|primary|secondary|tertiary|unclassified"]["name"](${bbox});
    way["parking:lane:right"](${bbox});
    way["parking:lane:left"](${bbox});
  );out geom 50;`

  try {
    const r = await fetch(`${OVERPASS}?data=${encodeURIComponent(query)}`)
    const data = await r.json()
    const segments = []
    const now = new Date()

    for (const way of (data.elements || []).slice(0, 40)) {
      if (!way.geometry || way.geometry.length < 2) continue
      const coords = way.geometry.map(n => [n.lat, n.lon])
      const tags = way.tags || {}
      const rule = getParkingRule(tags, now)
      const name = tags.name || 'Road'

      // Right side segment
      const rightCoords = offsetSegment(coords, 'right', 7)
      segments.push({
        id: `osm-r-${way.id}`,
        source: 'osm',
        wayId: way.id,
        name,
        side: 'right',
        coords: rightCoords,
        rawCoords: coords,
        ...rule,
        tags,
        info: getRuleInfo(rule, tags),
        maxStay: tags['parking:condition:right:maxstay'] || tags.maxstay || null,
        cost: rule.type === 'paid' ? 2.50 : 0,
        noReturn: '1 hour',
        address: name + ', ' + (tags['addr:city'] || ''),
        lat: coords[Math.floor(coords.length/2)][0],
        lng: coords[Math.floor(coords.length/2)][1],
      })

      // Left side if explicitly tagged
      if (tags['parking:lane:left'] && tags['parking:lane:left'] !== 'no') {
        const leftCoords = offsetSegment(coords, 'left', 7)
        const leftRule = getParkingRule({ ...tags, 'parking:lane:right': tags['parking:lane:left'] }, now)
        segments.push({
          id: `osm-l-${way.id}`,
          source: 'osm',
          wayId: way.id,
          name,
          side: 'left',
          coords: leftCoords,
          rawCoords: coords,
          ...leftRule,
          tags,
          info: getRuleInfo(leftRule, tags),
          maxStay: tags['parking:condition:left:maxstay'] || null,
          cost: leftRule.type === 'paid' ? 2.50 : 0,
          noReturn: '1 hour',
          address: name + ' (left side)',
          lat: coords[Math.floor(coords.length/2)][0],
          lng: coords[Math.floor(coords.length/2)][1],
        })
      }
    }
    if (segments.length > 5) return segments
    return getMockSegments(bounds, now)
  } catch(e) {
    return getMockSegments(bounds, new Date())
  }
}

function getRuleInfo(rule, tags) {
  const msgs = {
    free: 'If you park now, you can stay for free. Restrictions may apply during working hours.',
    paid: 'Pay & Display in operation. Mon–Sat 8am–6:30pm. £2.50/hr.',
    permit: 'Permit holders only Mon–Fri 10am–4pm. Free at all other times.',
    restricted: 'No parking at any time. Double yellow lines or clearway.',
    loading: 'Loading and unloading only. Max 30 minutes.',
  }
  return msgs[rule.type] || msgs.free
}

// Mock segments for when Overpass fails or returns too little data
export function getMockSegments(bounds, now = new Date()) {
  const { south, west, north, east } = bounds
  const clat = (south + north) / 2
  const clng = (west + east) / 2
  const h = now.getHours(), d = now.getDay()
  const isWorkingHours = h >= 8 && h < 18 && d >= 1 && d <= 5

  // Generate a realistic grid of road segments
  const sp = 0.002
  const segments = [
    // Main road — horizontal
    {
      id:'m-seg-1', name:'High Street', side:'right',
      coords: [[clat+sp*0.5, clng-sp*2], [clat+sp*0.5, clng-sp], [clat+sp*0.5, clng], [clat+sp*0.5, clng+sp]],
      type: isWorkingHours ? 'paid' : 'free',
      label: isWorkingHours ? 'Pay to park' : 'Park for free',
      color: isWorkingHours ? '#4A9EFF' : '#2ECC71', weight:6,
      info: 'Free outside Mon–Sat 8am–6:30pm. Paid during restriction hours.',
      maxStay: '2 hours', cost: isWorkingHours ? 2.50 : 0, noReturn: '1 hour',
      address: 'High Street', lat: clat+sp*0.5, lng: clng,
    },
    {
      id:'m-seg-2', name:'High Street', side:'left',
      coords: [[clat+sp*0.3, clng-sp*2], [clat+sp*0.3, clng-sp], [clat+sp*0.3, clng], [clat+sp*0.3, clng+sp]],
      type: 'restricted', label: 'No parking', color: '#888888', weight:5,
      info: 'Double yellow lines on this side. No parking at any time.',
      maxStay: null, cost: 0, noReturn: null,
      address: 'High Street (north side)', lat: clat+sp*0.3, lng: clng,
    },
    // Side road north
    {
      id:'m-seg-3', name:'Church Street', side:'right',
      coords: [[clat+sp, clng+sp*0.5], [clat+sp*1.5, clng+sp*0.5], [clat+sp*2, clng+sp*0.5]],
      type: 'free', label: 'Park for free', color: '#2ECC71', weight:6,
      info: 'Free parking. No time restrictions.',
      maxStay: 'Unlimited', cost: 0, noReturn: null,
      address: 'Church Street', lat: clat+sp*1.5, lng: clng+sp*0.5,
    },
    // Side road — permit zone
    {
      id:'m-seg-4', name:'Rancliffe Road', side:'right',
      coords: [[clat-sp*0.5, clng-sp*0.5], [clat-sp, clng-sp*0.5], [clat-sp*1.5, clng-sp*0.5]],
      type: isWorkingHours ? 'permit' : 'free',
      label: isWorkingHours ? 'Permit only' : 'Park for free',
      color: isWorkingHours ? '#9B59B6' : '#2ECC71', weight:6,
      info: 'Resident permit zone. Free outside Mon–Fri 10am–4pm.',
      maxStay: isWorkingHours ? 'Permit only' : '9h 1m', cost: 0, noReturn: '2 hours',
      address: 'Rancliffe Road, Newham', lat: clat-sp, lng: clng-sp*0.5,
    },
    // Station approach — no stopping
    {
      id:'m-seg-5', name:'Station Road', side:'right',
      coords: [[clat-sp, clng+sp], [clat-sp, clng+sp*1.5], [clat-sp, clng+sp*2]],
      type: 'restricted', label: 'No parking', color: '#E74C3C', weight:6,
      info: 'No stopping at any time. Red route / clearway.',
      maxStay: null, cost: 0, noReturn: null,
      address: 'Station Road', lat: clat-sp, lng: clng+sp*1.5,
    },
    // Free street east
    {
      id:'m-seg-6', name:'Marlow Road', side:'right',
      coords: [[clat+sp*1.5, clng+sp], [clat+sp*1.5, clng+sp*1.5], [clat+sp*1.5, clng+sp*2]],
      type: 'free', label: 'Park for free', color: '#2ECC71', weight:6,
      info: 'If you park now at ' + now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) + ', you can stay until 08:00 tomorrow.',
      maxStay: '10h 1m', cost: 0, noReturn: 'None',
      address: 'Marlow Road, Newham', lat: clat+sp*1.5, lng: clng+sp*1.5,
    },
    // Loading bay
    {
      id:'m-seg-7', name:'Market Street', side:'right',
      coords: [[clat-sp*0.2, clng-sp*1.5], [clat-sp*0.2, clng-sp]],
      type: 'loading', label: 'Loading bay', color: '#F39C12', weight:5,
      info: 'Loading and unloading only. 30 minute maximum.',
      maxStay: '30 minutes', cost: 0, noReturn: null,
      address: 'Market Street', lat: clat-sp*0.2, lng: clng-sp*1.2,
    },
  ]

  // Add carpark pins separately
  return segments
}

// Off-street car parks (pins not segments)
export async function getCarParksByViewport(bounds) {
  const { south, west, north, east } = bounds
  const bbox = `${south},${west},${north},${east}`
  const query = `[out:json][timeout:10];node["amenity"="parking"](${bbox});out body 20;`
  try {
    const r = await fetch(`${OVERPASS}?data=${encodeURIComponent(query)}`)
    const data = await r.json()
    const now = new Date()
    return (data.elements || []).slice(0,20).map(el => ({
      id: `cp-${el.id}`,
      type: 'carpark',
      name: el.tags?.name || 'Car park',
      lat: el.lat, lng: el.lon,
      cost: el.tags?.fee === 'no' ? 0 : 1.80,
      free: el.tags?.fee === 'no',
      capacity: el.tags?.capacity || null,
      operator: el.tags?.operator || null,
      maxStay: el.tags?.maxstay || 'All day',
      info: el.tags?.fee === 'no' ? 'Free car park.' : 'Pay & Display car park.',
      statusLabel: el.tags?.fee === 'no' ? 'Park for free' : 'Pay at location',
      statusColor: el.tags?.fee === 'no' ? '#2ECC71' : '#F39C12',
    }))
  } catch(e) {
    return getMockCarParks(bounds)
  }
}

export function getMockCarParks(bounds) {
  const { south, west, north, east } = bounds
  const clat = (south + north) / 2
  const clng = (west + east) / 2
  const sp = 0.003
  return [
    { id:'mcp1', type:'carpark', name:'Town Centre Car Park', lat: clat-sp*0.8, lng: clng-sp*1.8, cost:1.80, free:false, maxStay:'8h', info:'Multi-storey. £1.80/hr. Open 24/7.', statusLabel:'Pay at location', statusColor:'#F39C12' },
    { id:'mcp2', type:'carpark', name:'Madge Gill Way', lat: clat+sp*1.2, lng: clng+sp*2, cost:0, free:true, maxStay:'Unlimited', info:'Free surface car park. Open all day.', statusLabel:'Park for free', statusColor:'#2ECC71' },
  ]
}
