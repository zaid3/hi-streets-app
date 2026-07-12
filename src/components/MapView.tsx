import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { Map as MapLibre } from 'maplibre-gl'
import { Accessibility, Layers, LocateFixed, Search } from 'lucide-react'
import { directionsUrl, MAP_STYLE_URL, NEWHAM_BOUNDS, NEWHAM_CENTER, paddedBounds } from '../lib/newham'
import { createBlueBadgeBay, fetchBusinessById, getCurrentRole, loadBusinessesGeoJson, loadNewhamBoundaryGeoJson, loadParkingPoints } from '../lib/data'
import type { Business, ParkingPoint, Post, Role } from '../types'
import BusinessDetailSheet from './BusinessDetailSheet'

type LayerFilter = 'all' | 'food' | 'grocery' | 'shops' | 'beauty' | 'health' | 'professional' | 'services' | 'offers' | 'jobs' | 'community' | 'parking'
type FeatureCollection = { type: 'FeatureCollection'; features: Array<any> }
type PendingBay = { lat: number; lng: number } | null
type BusinessPostKinds = Record<string, { offer: boolean; job: boolean; community: boolean }>
type CategoryInfo = { group: string; marker: string; label: string; icon: string }

const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] }

const markerDefinitions: Array<{ id: string; label: string; color: string }> = [
  { id: 'restaurant', label: '🍽', color: '#F2762E' },
  { id: 'takeaway', label: '🥡', color: '#F2762E' },
  { id: 'cafe', label: '☕', color: '#C97826' },
  { id: 'bakery', label: '🥐', color: '#C97826' },
  { id: 'grocery', label: '🛒', color: '#3C8D2F' },
  { id: 'butcher', label: '🥩', color: '#3C8D2F' },
  { id: 'tailor', label: '🧵', color: '#2D6CDF' },
  { id: 'fashion', label: '👕', color: '#2D6CDF' },
  { id: 'electronics', label: '📱', color: '#2D6CDF' },
  { id: 'furniture', label: '🛋', color: '#2D6CDF' },
  { id: 'jewellery', label: '💎', color: '#2D6CDF' },
  { id: 'florist', label: '🌸', color: '#2D6CDF' },
  { id: 'hardware', label: '🔩', color: '#2D6CDF' },
  { id: 'retail', label: '🛍', color: '#2D6CDF' },
  { id: 'beauty', label: '✂', color: '#B03A8B' },
  { id: 'dentist', label: '🦷', color: '#2E9E5B' },
  { id: 'optician', label: '👓', color: '#2E9E5B' },
  { id: 'pharmacy', label: '⚕', color: '#2E9E5B' },
  { id: 'health', label: '✚', color: '#2E9E5B' },
  { id: 'solicitor', label: '⚖', color: '#5B4FC4' },
  { id: 'accountant', label: '£', color: '#5B4FC4' },
  { id: 'estate', label: '⌂', color: '#5B4FC4' },
  { id: 'finance', label: '£', color: '#5B4FC4' },
  { id: 'mechanic', label: '🔧', color: '#0F6E6B' },
  { id: 'laundry', label: '🧺', color: '#0F6E6B' },
  { id: 'repair', label: '🛠', color: '#0F6E6B' },
  { id: 'printing', label: '🖨', color: '#0F6E6B' },
  { id: 'post', label: '📮', color: '#0F6E6B' },
  { id: 'education', label: '🎓', color: '#0F6E6B' },
  { id: 'community-service', label: '🤝', color: '#0F6E6B' },
  { id: 'travel', label: '✈', color: '#0F6E6B' },
  { id: 'service', label: '•', color: '#0F6E6B' },
  { id: 'default', label: '•', color: '#1A1A1A' },
]

function pointFeature(item: ParkingPoint, properties: Record<string, unknown>) {
  return { type: 'Feature' as const, properties, geometry: { type: 'Point' as const, coordinates: [item.lng, item.lat] } }
}

function parkingData(items: ParkingPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: items.map(item => pointFeature(item, { id: item.id, kind: item.kind, name: item.name, road_name: item.road_name, photo_url: item.photo_url })),
  }
}

function userLocationData(point: { lat: number; lng: number } | null): FeatureCollection {
  if (!point) return EMPTY_FC
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { id: 'user-location' }, geometry: { type: 'Point', coordinates: [point.lng, point.lat] } }],
  }
}

function getBusinessPostKinds(posts: Post[]): BusinessPostKinds {
  const kinds: BusinessPostKinds = {}
  for (const post of posts) {
    if (typeof post.business_id !== 'string') continue
    kinds[post.business_id] ||= { offer: false, job: false, community: false }
    if (post.type === 'offer') kinds[post.business_id].offer = true
    if (post.type === 'job') kinds[post.business_id].job = true
    if (post.type === 'free_meal' || post.type === 'community') kinds[post.business_id].community = true
  }
  return kinds
}

function categoryInfo(category?: string, name?: string): CategoryInfo {
  const text = `${category || ''} ${name || ''}`.toLowerCase()

  if (/takeaway|fast_food|chicken|pizza|kebab|fish.?and.?chips|burger|fried/.test(text)) return { group: 'food', marker: 'takeaway', label: 'Takeaway', icon: '🥡' }
  if (/restaurant|food|bar|pub|diner|grill|bistro/.test(text)) return { group: 'food', marker: 'restaurant', label: 'Restaurant', icon: '🍽' }
  if (/cafe|coffee|tea|espresso/.test(text)) return { group: 'food', marker: 'cafe', label: 'Cafe', icon: '☕' }
  if (/bakery|cake|dessert|sweet|patisserie/.test(text)) return { group: 'food', marker: 'bakery', label: 'Bakery', icon: '🥐' }

  if (/butcher|meat|halal meat/.test(text)) return { group: 'grocery', marker: 'butcher', label: 'Butcher', icon: '🥩' }
  if (/greengrocer|fruit|vegetable/.test(text)) return { group: 'grocery', marker: 'grocery', label: 'Greengrocer', icon: '🥬' }
  if (/supermarket|grocery|convenience|off.?licen[cs]e|mini.?market|market|food store/.test(text)) return { group: 'grocery', marker: 'grocery', label: 'Grocery', icon: '🛒' }

  if (/tailor|tailoring|alteration|sewing|dressmaker/.test(text)) return { group: 'shop', marker: 'tailor', label: 'Tailoring', icon: '🧵' }
  if (/clothes|fashion|boutique|wear|apparel|shoe/.test(text)) return { group: 'shop', marker: 'fashion', label: 'Fashion', icon: '👕' }
  if (/mobile|phone|electronics|computer|laptop|gadget/.test(text)) return { group: 'shop', marker: 'electronics', label: 'Electronics', icon: '📱' }
  if (/furniture|sofa|bed|home|carpet|curtain/.test(text)) return { group: 'shop', marker: 'furniture', label: 'Home & furniture', icon: '🛋' }
  if (/jeweller|jewelry|jewellery|gold|watch/.test(text)) return { group: 'shop', marker: 'jewellery', label: 'Jewellery', icon: '💎' }
  if (/florist|flower/.test(text)) return { group: 'shop', marker: 'florist', label: 'Florist', icon: '🌸' }
  if (/hardware|diy|tool|paint/.test(text)) return { group: 'shop', marker: 'hardware', label: 'Hardware', icon: '🔩' }
  if (/shop|retail|store/.test(text)) return { group: 'shop', marker: 'retail', label: 'Retail', icon: '🛍' }

  if (/hairdresser|barber|beauty|nail|salon|spa|cosmetic|massage|laser|brow|lash/.test(text)) return { group: 'beauty', marker: 'beauty', label: 'Beauty / barber', icon: '✂' }

  if (/dentist|dental/.test(text)) return { group: 'health', marker: 'dentist', label: 'Dentist', icon: '🦷' }
  if (/optician|optical|glasses|vision/.test(text)) return { group: 'health', marker: 'optician', label: 'Optician', icon: '👓' }
  if (/pharmacy|chemist/.test(text)) return { group: 'health', marker: 'pharmacy', label: 'Pharmacy', icon: '⚕' }
  if (/clinic|doctors|doctor|gp|hospital|health|medical|care|therapy|physio/.test(text)) return { group: 'health', marker: 'health', label: 'Health', icon: '✚' }

  if (/solicitor|lawyer|legal|law firm|immigration|notary/.test(text)) return { group: 'professional', marker: 'solicitor', label: 'Solicitor / legal', icon: '⚖' }
  if (/accountant|accounting|tax|book.?keeping|payroll/.test(text)) return { group: 'professional', marker: 'accountant', label: 'Accountant', icon: '£' }
  if (/estate agent|real estate|letting|property/.test(text)) return { group: 'professional', marker: 'estate', label: 'Estate agent', icon: '⌂' }
  if (/bank|finance|financial|mortgage|insurance|money transfer|exchange/.test(text)) return { group: 'professional', marker: 'finance', label: 'Finance', icon: '£' }

  if (/mechanic|garage|mot|car repair|vehicle|tyre|tire|auto|motorcycle|bike|car wash/.test(text)) return { group: 'service', marker: 'mechanic', label: 'Mechanic / vehicle', icon: '🔧' }
  if (/laundry|launderette|dry.?clean|cleaner/.test(text)) return { group: 'service', marker: 'laundry', label: 'Laundry / cleaning', icon: '🧺' }
  if (/repair|fix|maintenance|plumber|electrician/.test(text)) return { group: 'service', marker: 'repair', label: 'Repair service', icon: '🛠' }
  if (/printing|print|copy|photocopy|sign/.test(text)) return { group: 'service', marker: 'printing', label: 'Printing', icon: '🖨' }
  if (/post office|post|courier|parcel|delivery/.test(text)) return { group: 'service', marker: 'post', label: 'Post / parcel', icon: '📮' }
  if (/school|college|education|tuition|training|academy|nursery/.test(text)) return { group: 'service', marker: 'education', label: 'Education', icon: '🎓' }
  if (/charity|community|mosque|church|temple|support/.test(text)) return { group: 'service', marker: 'community-service', label: 'Community', icon: '🤝' }
  if (/travel|agency|ticket|tour/.test(text)) return { group: 'service', marker: 'travel', label: 'Travel', icon: '✈' }
  return { group: 'service', marker: 'service', label: 'Service', icon: '•' }
}

function groupMatchesFilter(group: string, filter: LayerFilter) {
  if (filter === 'food') return group === 'food'
  if (filter === 'grocery') return group === 'grocery'
  if (filter === 'shops') return group === 'shop'
  if (filter === 'beauty') return group === 'beauty'
  if (filter === 'health') return group === 'health'
  if (filter === 'professional') return group === 'professional'
  if (filter === 'services') return group === 'service'
  return false
}

function svgIcon(label: string, fill: string) {
  const size = label.length > 1 ? 18 : 23
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="${fill}" stroke="white" stroke-width="6"/><text x="32" y="40" text-anchor="middle" dominant-baseline="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Arial, sans-serif" font-size="${size}" font-weight="800" fill="white">${label}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function addImage(map: MapLibre, id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    if (map.hasImage(id)) return resolve()
    const image = new Image(64, 64)
    image.onload = () => { map.addImage(id, image); resolve() }
    image.onerror = () => reject(new Error(`Could not load ${id}`))
    image.src = src
  })
}

async function addCategoryImages(map: MapLibre) {
  await Promise.all([
    ...markerDefinitions.map(marker => addImage(map, `cat-${marker.id}`, svgIcon(marker.label, marker.color))),
    addImage(map, 'offer-icon', svgIcon('%', '#F2762E')),
    addImage(map, 'job-icon', svgIcon('💼', '#2D6CDF')),
    addImage(map, 'community-icon', svgIcon('❤', '#2E9E5B')),
    addImage(map, 'bb-icon', svgIcon('♿', '#2D6CDF')),
  ])
}

function markerIconExpression(): any {
  const expression: unknown[] = ['match', ['get', 'marker_icon']]
  for (const marker of markerDefinitions) expression.push(marker.id, `cat-${marker.id}`)
  expression.push('cat-default')
  return expression as any
}

const actionBadgeExpression: any = ['match', ['get', 'primary_kind'], 'offer', 'offer-icon', 'job', 'job-icon', 'community', 'community-icon', 'offer-icon']

function maskFromBoundary(boundary: FeatureCollection): FeatureCollection {
  const holes: number[][][] = []
  for (const feature of boundary.features || []) {
    const geom = feature.geometry
    if (geom?.type === 'Polygon') holes.push(...geom.coordinates.slice(0, 1))
    if (geom?.type === 'MultiPolygon') for (const poly of geom.coordinates) holes.push(poly[0])
  }
  if (!holes.length) return { type: 'FeatureCollection', features: [] }
  const world = [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]]
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [world[0], ...holes] } }] }
}

function enrichBusinessGeoJson(data: FeatureCollection, postKinds: BusinessPostKinds = {}): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (data.features || []).filter(feature => feature?.geometry).map(feature => {
      const props = feature.properties || {}
      const id = String(props.id || feature.id || '')
      const kinds = postKinds[id] || { offer: false, job: false, community: false }
      const info = categoryInfo(props.category, props.name)
      const hasOffer = Boolean(props.has_offer) || kinds.offer
      const hasJob = Boolean(props.has_job) || kinds.job
      const hasCommunity = Boolean(props.has_community) || kinds.community
      const primaryKind = hasOffer ? 'offer' : hasJob ? 'job' : hasCommunity ? 'community' : ''
      return {
        ...feature,
        properties: {
          ...props,
          category_group: info.group,
          marker_icon: info.marker,
          category_label: info.label,
          category_icon: info.icon,
          has_offer: hasOffer,
          has_job: hasJob,
          has_community: hasCommunity,
          primary_kind: primaryKind,
          searchable: `${props.name || ''} ${props.category || ''} ${info.group} ${info.label} ${info.marker} accountant solicitor takeaway restaurant grocery retail beauty health service mechanic tailoring laundry dentist optician estate agent bank school charity travel`.toLowerCase(),
        },
      }
    }),
  }
}

function filteredBusinessGeoJson(data: FeatureCollection, filter: LayerFilter, query: string): FeatureCollection {
  if (filter === 'parking') return EMPTY_FC
  const q = query.trim().toLowerCase()
  return {
    type: 'FeatureCollection',
    features: data.features.filter(feature => {
      const props = feature.properties || {}
      const group = String(props.category_group || categoryInfo(String(props.category || ''), String(props.name || '')).group)
      const matchesQuery = !q || String(props.searchable || '').includes(q)
      if (!matchesQuery) return false
      if (filter === 'all') return true
      if (filter === 'offers') return Boolean(props.has_offer)
      if (filter === 'jobs') return Boolean(props.has_job)
      if (filter === 'community') return Boolean(props.has_community)
      return groupMatchesFilter(group, filter)
    }),
  }
}

function setGeoJson(map: MapLibre | null, sourceId: string, data: FeatureCollection) {
  const source = map?.getSource(sourceId) as maplibregl.GeoJSONSource | undefined
  if (!source) return false
  source.setData(data as any)
  return true
}

function featureCoords(feature: any): [number, number] | null {
  const coords = feature?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  return [Number(coords[0]), Number(coords[1])]
}

function distanceScore(feature: any, point: { lat: number; lng: number } | null) {
  const coords = featureCoords(feature)
  if (!coords || !point) return 0
  const [lng, lat] = coords
  return Math.hypot((lat - point.lat) * 111, (lng - point.lng) * 70)
}

function isInsidePaddedNewham(point: { lat: number; lng: number }) {
  const b = paddedBounds(0.1)
  return point.lat >= b.south && point.lat <= b.north && point.lng >= b.west && point.lng <= b.east
}

export default function MapView({ posts, onOpenPostForm }: { posts: Post[]; onOpenPostForm: () => void }) {
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibre | null>(null)
  const businessesGeoJsonRef = useRef<FeatureCollection>(EMPTY_FC)
  const parkingRef = useRef<ParkingPoint[]>([])
  const holdTimer = useRef<number | null>(null)
  const [businessesGeoJson, setBusinessesGeoJson] = useState<FeatureCollection>(EMPTY_FC)
  const [parking, setParking] = useState<ParkingPoint[]>([])
  const [selected, setSelected] = useState<Business | ParkingPoint | null>(null)
  const [filter, setFilter] = useState<LayerFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [pendingBay, setPendingBay] = useState<PendingBay>(null)
  const [refreshFlag, setRefreshFlag] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [mapStatus, setMapStatus] = useState('Loading businesses…')
  const [userPoint, setUserPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState('')

  const businessPostKinds = useMemo(() => getBusinessPostKinds(posts), [posts])
  const enrichedBusinesses = useMemo(() => enrichBusinessGeoJson(businessesGeoJson, businessPostKinds), [businessesGeoJson, businessPostKinds])
  const visibleBusinesses = useMemo(() => filteredBusinessGeoJson(enrichedBusinesses, filter, searchTerm), [enrichedBusinesses, filter, searchTerm])
  const visibleParking = filter === 'parking' || filter === 'all' ? parking : []
  const nearbyBusinesses = useMemo(() => {
    const copy = [...visibleBusinesses.features]
    copy.sort((a, b) => distanceScore(a, userPoint) - distanceScore(b, userPoint))
    return copy.slice(0, 8)
  }, [visibleBusinesses, userPoint])

  function applyMapData(nextBusinesses = visibleBusinesses, nextParking = visibleParking, nextUserPoint = userPoint) {
    const map = mapRef.current
    if (!map) return
    const pushedBusinesses = setGeoJson(map, 'businesses', nextBusinesses)
    const pushedDots = setGeoJson(map, 'business-dots', nextBusinesses)
    const pushedParking = setGeoJson(map, 'parking', parkingData(nextParking) as FeatureCollection)
    setGeoJson(map, 'user-location', userLocationData(nextUserPoint))
    if (pushedBusinesses || pushedDots) setMapStatus(`${nextBusinesses.features.length.toLocaleString()} businesses loaded`)
    if (!pushedBusinesses && !pushedDots && mapReady) setMapStatus('Map source not ready yet')
  }

  async function openBusinessById(id: string, coords?: [number, number] | null) {
    if (!id) return
    const business = await fetchBusinessById(id)
    if (business) {
      setSelected(business)
      const map = mapRef.current
      const point = coords || [business.lng, business.lat]
      if (map && point) map.easeTo({ center: point, zoom: Math.max(map.getZoom(), 16) })
    }
  }

  function requestUserLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('Location not supported on this browser')
      return
    }
    setLocationStatus('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      position => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserPoint(point)
        setLocationStatus('')
        requestAnimationFrame(() => {
          applyMapData(visibleBusinesses, visibleParking, point)
          const map = mapRef.current
          if (map && isInsidePaddedNewham(point)) map.easeTo({ center: [point.lng, point.lat], zoom: 15 })
          if (map && !isInsidePaddedNewham(point)) {
            setLocationStatus('You are outside Newham — showing Newham map')
            map.easeTo({ center: [NEWHAM_CENTER.lng, NEWHAM_CENTER.lat], zoom: 12.5 })
          }
        })
      },
      error => setLocationStatus(error.code === error.PERMISSION_DENIED ? 'Location permission denied' : 'Could not get location'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  useEffect(() => {
    loadBusinessesGeoJson().then(data => {
      const enriched = enrichBusinessGeoJson(data, businessPostKinds)
      businessesGeoJsonRef.current = enriched
      setBusinessesGeoJson(data)
      setMapStatus(`${enriched.features.length.toLocaleString()} businesses loaded`)
      requestAnimationFrame(() => applyMapData(enriched, parkingRef.current, userPoint))
    }).catch(() => setMapStatus('Could not load businesses'))
    loadParkingPoints('blue_badge').then(data => {
      parkingRef.current = data
      setParking(data)
      requestAnimationFrame(() => applyMapData(businessesGeoJsonRef.current, data, userPoint))
    })
    getCurrentRole().then(setRole)
  }, [refreshFlag, businessPostKinds])

  useEffect(() => {
    businessesGeoJsonRef.current = enrichedBusinesses
  }, [enrichedBusinesses])

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return
    const b = paddedBounds(0.1)
    const map = new maplibregl.Map({
      container: nodeRef.current,
      style: MAP_STYLE_URL,
      center: [NEWHAM_CENTER.lng, NEWHAM_CENTER.lat],
      zoom: 12.3,
      minZoom: 11.5,
      maxZoom: 19,
      maxBounds: [[b.west, b.south], [b.east, b.north]],
      attributionControl: { compact: true },
    })
    mapRef.current = map

    map.on('load', async () => {
      map.fitBounds([[NEWHAM_BOUNDS.west, NEWHAM_BOUNDS.south], [NEWHAM_BOUNDS.east, NEWHAM_BOUNDS.north]], { padding: 26, duration: 0 })
      await addCategoryImages(map)

      const boundary = await loadNewhamBoundaryGeoJson()
      map.addSource('newham-mask', { type: 'geojson', data: maskFromBoundary(boundary) as any })
      map.addLayer({ id: 'newham-mask-fill', type: 'fill', source: 'newham-mask', paint: { 'fill-color': '#000000', 'fill-opacity': 0.55 } } as any)

      map.addSource('business-dots', { type: 'geojson', data: businessesGeoJsonRef.current as any })
      map.addLayer({ id: 'business-visible-dots', type: 'circle', source: 'business-dots', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 15, 5], 'circle-color': ['case', ['get', 'has_offer'], '#F2762E', ['get', 'has_job'], '#2D6CDF', ['get', 'has_community'], '#2E9E5B', '#0F6E6B'], 'circle-opacity': 0.56, 'circle-stroke-width': 1.4, 'circle-stroke-color': '#ffffff' } } as any)

      map.addSource('businesses', {
        type: 'geojson',
        data: businessesGeoJsonRef.current as any,
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 50,
      })
      map.addLayer({ id: 'business-clusters', type: 'circle', source: 'businesses', filter: ['has', 'point_count'], paint: { 'circle-color': '#0F6E6B', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28, 200, 34] } } as any)
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'businesses', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } } as any)
      map.addLayer({ id: 'business-pins', type: 'symbol', source: 'businesses', filter: ['!', ['has', 'point_count']], layout: { 'icon-image': markerIconExpression(), 'icon-size': 0.64, 'icon-allow-overlap': false } } as any)
      map.addLayer({ id: 'business-action-badges', type: 'symbol', source: 'businesses', filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'primary_kind'], '']], layout: { 'icon-image': actionBadgeExpression, 'icon-size': 0.44, 'icon-offset': [18, -18], 'icon-allow-overlap': true } } as any)

      map.addSource('parking', { type: 'geojson', data: parkingData(parkingRef.current) as any })
      map.addLayer({ id: 'blue-badge-pins', type: 'symbol', source: 'parking', layout: { 'icon-image': 'bb-icon', 'icon-size': 0.62, 'icon-allow-overlap': true } } as any)

      map.addSource('user-location', { type: 'geojson', data: userLocationData(userPoint) as any })
      map.addLayer({ id: 'user-location-pulse', type: 'circle', source: 'user-location', paint: { 'circle-radius': 18, 'circle-color': '#2D6CDF', 'circle-opacity': 0.2 } } as any)
      map.addLayer({ id: 'user-location-dot', type: 'circle', source: 'user-location', paint: { 'circle-radius': 7, 'circle-color': '#2D6CDF', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' } } as any)

      setMapReady(true)
      requestAnimationFrame(() => applyMapData(businessesGeoJsonRef.current, parkingRef.current, userPoint))

      map.on('click', 'business-clusters', async e => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['business-clusters'] })
        const clusterId = features[0]?.properties?.cluster_id
        const source = map.getSource('businesses') as maplibregl.GeoJSONSource
        const coordinates = (features[0]?.geometry as any)?.coordinates
        if (typeof clusterId !== 'number' || !coordinates) return
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId)
          if (typeof zoom === 'number') map.easeTo({ center: coordinates, zoom })
        } catch {
          // Keep cluster clicks non-fatal if MapLibre cannot resolve expansion zoom.
        }
      })

      async function openBusinessFromMap(e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) {
        const feature = e.features?.[0]
        const id = String(feature?.properties?.id || '')
        await openBusinessById(id, featureCoords(feature))
      }

      map.on('click', 'business-pins', openBusinessFromMap)
      map.on('click', 'business-action-badges', openBusinessFromMap)
      map.on('click', 'business-visible-dots', openBusinessFromMap)

      map.on('click', 'blue-badge-pins', e => {
        const id = String(e.features?.[0]?.properties?.id || '')
        const item = parkingRef.current.find(p => p.id === id)
        if (item) setSelected(item)
      })

      map.on('contextmenu', e => {
        if (role !== 'admin') return
        e.preventDefault()
        setPendingBay({ lng: e.lngLat.lng, lat: e.lngLat.lat })
      })

      map.on('touchstart', e => {
        if (role !== 'admin' || !e.lngLat) return
        holdTimer.current = window.setTimeout(() => setPendingBay({ lng: e.lngLat.lng, lat: e.lngLat.lat }), 650)
      })
      map.on('touchend', () => { if (holdTimer.current) window.clearTimeout(holdTimer.current) })
      map.on('touchmove', () => { if (holdTimer.current) window.clearTimeout(holdTimer.current) })

      ;['business-clusters', 'business-pins', 'business-action-badges', 'business-visible-dots', 'blue-badge-pins'].forEach(layer => {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      })
    })
    return () => { mapRef.current = null; map.remove() }
  }, [role])

  useEffect(() => {
    if (!mapReady) return
    applyMapData(visibleBusinesses, visibleParking, userPoint)
  }, [mapReady, visibleBusinesses, visibleParking, userPoint])

  const chips: Array<{ key: LayerFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'food', label: 'Restaurants & takeaway' },
    { key: 'grocery', label: 'Grocery' },
    { key: 'shops', label: 'Retail' },
    { key: 'beauty', label: 'Beauty' },
    { key: 'health', label: 'Health' },
    { key: 'professional', label: 'Accountants & Solicitors' },
    { key: 'services', label: 'Services' },
    { key: 'offers', label: 'Offers 🔥' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'community', label: 'Free meals' },
    { key: 'parking', label: 'Blue Badge' },
  ]

  return (
    <section className="map-screen">
      <label className="map-search" aria-label="Search HiStreets">
        <Search size={18} />
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search mechanic, tailoring, solicitor, takeaway…" />
      </label>
      <div className="chip-row map-chips">{chips.map(c => <button key={c.key} className={filter === c.key ? 'active' : ''} onClick={() => setFilter(c.key)}>{c.label}</button>)}</div>
      <div className="map-debug-pill">{mapStatus}</div>
      <button className="locate-button" onClick={requestUserLocation} aria-label="Use my location"><LocateFixed size={17} /> Near me</button>
      {locationStatus && <div className="location-status">{locationStatus}</div>}
      <div ref={nodeRef} className="map-canvas" />
      {!selected && nearbyBusinesses.length > 0 && <div className="nearby-results" aria-label="Nearby businesses">
        <div className="nearby-title"><strong>{userPoint ? 'Nearby businesses' : 'Businesses in this view'}</strong><span>{nearbyBusinesses.length} shown</span></div>
        <div className="nearby-scroll">
          {nearbyBusinesses.map(feature => {
            const props = feature.properties || {}
            const coords = featureCoords(feature)
            const info = categoryInfo(String(props.category || ''), String(props.name || ''))
            return <button key={String(props.id)} className="nearby-card" onClick={() => openBusinessById(String(props.id), coords)}>
              <span className={`nearby-icon ${info.group}`}>{String(props.category_icon || info.icon)}</span>
              <span className="nearby-card-text"><strong>{String(props.name || 'Local business')}</strong><small>{String(props.category_label || info.label)}{props.has_offer ? ' · Offer' : props.has_job ? ' · Hiring' : props.has_community ? ' · Community help' : ''}</small></span>
            </button>
          })}
        </div>
      </div>}
      <button className="fab" aria-label="Post" onClick={onOpenPostForm}><Layers size={20} />＋ Post</button>
      {selected && <div className="bottom-sheet"><button className="sheet-close" onClick={() => setSelected(null)}>×</button>{'kind' in selected ? <ParkingDetail item={selected} /> : <BusinessDetailSheet business={selected} posts={posts.filter(p => p.business_id === selected.id)} />}</div>}
      {pendingBay && <BayForm point={pendingBay} onClose={() => setPendingBay(null)} onSaved={() => { setPendingBay(null); setRefreshFlag(v => v + 1) }} />}
    </section>
  )
}

function ParkingDetail({ item }: { item: ParkingPoint }) {
  return <><div className="sheet-handle" /><h2><Accessibility size={20} /> Blue Badge bay</h2><p className="muted">{item.road_name || item.name}</p>{item.photo_url && <img className="bay-photo" src={item.photo_url} alt="Blue Badge bay evidence" />}{item.notes && <p>{item.notes}</p>}<p className="trust">Community verified · {item.last_verified_at ? new Date(item.last_verified_at).toLocaleDateString() : 'not recorded'}.</p><a href={directionsUrl(item.lat, item.lng)} target="_blank" rel="noreferrer">Open in Google Maps</a></>
}

function BayForm({ point, onClose, onSaved }: { point: { lat: number; lng: number }; onClose: () => void; onSaved: () => void }) {
  const [road, setRoad] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  async function submit() {
    try {
      setStatus('Saving…')
      if (!file) throw new Error('Photo is required')
      await createBlueBadgeBay({ lat: point.lat, lng: point.lng, road_name: road, notes, file })
      setStatus('Saved')
      onSaved()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save bay')
    }
  }
  return <div className="bottom-sheet"><button className="sheet-close" onClick={onClose}>×</button><div className="sheet-handle" /><h2>Add Blue Badge bay</h2><p className="muted">Admin only · photo required · community verified</p><label>Road name<input value={road} onChange={e => setRoad(e.target.value)} placeholder="e.g. High Street North" /></label><label>Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Bay sign details, side of road, nearby shop…" /></label><label>Photo<input type="file" accept="image/*" required onChange={e => setFile(e.target.files?.[0] || null)} /></label><button onClick={submit} disabled={!road.trim() || !file}>Save bay</button>{status && <p className="form-status">{status}</p>}</div>
}
