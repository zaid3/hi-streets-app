import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { Map as MapLibre } from 'maplibre-gl'
import { Layers, LocateFixed, Search } from 'lucide-react'
import { MAP_STYLE_URL, NEWHAM_BOUNDS, NEWHAM_CENTER, paddedBounds } from '../lib/newham'
import { fetchBusinessById, loadBusinessesGeoJson, loadNewhamBoundaryGeoJson } from '../lib/data'
import type { Business, Post } from '../types'
import BusinessDetailSheet from './BusinessDetailSheet'

type LayerFilter = 'all' | 'food' | 'grocery' | 'shops' | 'beauty' | 'health' | 'professional' | 'services' | 'community'
type FeatureCollection = { type: 'FeatureCollection'; features: Array<any> }
type BusinessPostKinds = Record<string, { offer: boolean; job: boolean; community: boolean }>
type CategoryInfo = { group: string; marker: string; label: string; icon: string; aliases: string }

const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] }

const markerDefinitions: Array<{ id: string; label: string; color: string }> = [
  { id: 'restaurant', label: '🍽', color: '#F2762E' },
  { id: 'takeaway', label: '🥡', color: '#F2762E' },
  { id: 'cafe', label: '☕', color: '#C97826' },
  { id: 'bakery', label: '🥐', color: '#C97826' },
  { id: 'grocery', label: '🛒', color: '#3C8D2F' },
  { id: 'retail', label: '🛍', color: '#2D6CDF' },
  { id: 'beauty', label: '✂', color: '#B03A8B' },
  { id: 'health', label: '✚', color: '#2E9E5B' },
  { id: 'solicitor', label: '⚖', color: '#5B4FC4' },
  { id: 'accountant', label: '£', color: '#5B4FC4' },
  { id: 'mechanic', label: '🔧', color: '#0F6E6B' },
  { id: 'service', label: '•', color: '#0F6E6B' },
  { id: 'community-service', label: '🤝', color: '#0F6E6B' },
  { id: 'default', label: '•', color: '#1A1A1A' },
]

const categoryOptions: Array<{ key: LayerFilter; label: string }> = [
  { key: 'all', label: 'All categories' },
  { key: 'food', label: 'Restaurants & takeaway' },
  { key: 'grocery', label: 'Grocery & convenience' },
  { key: 'shops', label: 'Retail shops' },
  { key: 'beauty', label: 'Beauty & barbers' },
  { key: 'health', label: 'Health, pharmacy & dental' },
  { key: 'professional', label: 'Accountants, solicitors & estate agents' },
  { key: 'services', label: 'Mechanics, repair, laundry & services' },
]

function info(group: string, marker: string, label: string, icon: string, aliases: string): CategoryInfo {
  return { group, marker, label, icon, aliases }
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
  if (/takeaway|fast.?food|chicken|pizza|kebab|burger|mcdonald|kfc|subway|domino/.test(text)) return info('food', 'takeaway', 'Takeaway / fast food', '🥡', 'takeaway food halal restaurant')
  if (/cafe|coffee|tea|bakery|cake|dessert|restaurant|grill|food|pub|bar/.test(text)) return info('food', 'restaurant', 'Restaurant / cafe', '🍽', 'restaurant cafe food bakery')
  if (/supermarket|grocery|convenience|off.?licen[cs]e|butcher|market|food store/.test(text)) return info('grocery', 'grocery', 'Grocery', '🛒', 'grocery supermarket convenience')
  if (/hair|barber|beauty|nail|salon|spa|cosmetic|massage/.test(text)) return info('beauty', 'beauty', 'Beauty / barber', '✂', 'beauty barber hair nail salon')
  if (/pharmacy|chemist|dentist|dental|optician|clinic|doctor|gp|health|medical|therapy|physio/.test(text)) return info('health', 'health', 'Health', '✚', 'health pharmacy dental clinic')
  if (/solicitor|lawyer|legal|immigration|notary/.test(text)) return info('professional', 'solicitor', 'Solicitor / legal', '⚖', 'solicitor legal immigration')
  if (/accountant|accounting|tax|book.?keeping|payroll/.test(text)) return info('professional', 'accountant', 'Accountant', '£', 'accountant tax payroll')
  if (/mechanic|garage|mot|car repair|vehicle|tyre|auto|car wash/.test(text)) return info('service', 'mechanic', 'Mechanic / vehicle', '🔧', 'mechanic garage mot car repair')
  if (/laundry|dry.?clean|repair|printing|travel|post|courier|plumber|electrician/.test(text)) return info('service', 'service', 'Local service', '•', 'service repair laundry printing travel')
  if (/school|college|education|tuition|training|church|mosque|temple|charity|community|support/.test(text)) return info('community_place', 'community-service', 'Community place', '🤝', 'community charity support education')
  if (/shop|retail|store|tailor|clothes|fashion|mobile|phone|electronics|furniture|jewellery|florist|hardware/.test(text)) return info('shop', 'retail', 'Retail shop', '🛍', 'shop retail tailoring mobile electronics')
  return info('other', 'default', 'Local business', '•', 'local business')
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
      const category = String(props.category || '')
      const name = String(props.name || '')
      const kinds = postKinds[id] || { offer: false, job: false, community: false }
      const info = categoryInfo(category, name)
      const hasOffer = Boolean(props.has_offer) || kinds.offer
      const hasJob = Boolean(props.has_job) || kinds.job
      const hasCommunity = Boolean(props.has_community) || kinds.community
      const primaryKind = hasOffer ? 'offer' : hasJob ? 'job' : hasCommunity ? 'community' : ''
      return { ...feature, properties: { ...props, category_group: info.group, marker_icon: info.marker, category_label: info.label, category_icon: info.icon, has_offer: hasOffer, has_job: hasJob, has_community: hasCommunity, primary_kind: primaryKind, searchable: `${name} ${category} ${info.group} ${info.label} ${info.aliases}`.toLowerCase() } }
    }),
  }
}

function filteredBusinessGeoJson(data: FeatureCollection, filter: LayerFilter, query: string): FeatureCollection {
  const q = query.trim().toLowerCase()
  return {
    type: 'FeatureCollection',
    features: data.features.filter(feature => {
      const props = feature.properties || {}
      const group = String(props.category_group || categoryInfo(String(props.category || ''), String(props.name || '')).group)
      const matchesQuery = !q || String(props.searchable || '').includes(q)
      if (!matchesQuery) return false
      if (filter === 'all') return true
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

function userLocationData(point: { lat: number; lng: number } | null): FeatureCollection {
  if (!point) return EMPTY_FC
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'user-location' }, geometry: { type: 'Point', coordinates: [point.lng, point.lat] } }] }
}

export default function MapView({ posts, onOpenPostForm }: { posts: Post[]; onOpenPostForm: () => void }) {
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibre | null>(null)
  const businessesGeoJsonRef = useRef<FeatureCollection>(EMPTY_FC)
  const [businessesGeoJson, setBusinessesGeoJson] = useState<FeatureCollection>(EMPTY_FC)
  const [selected, setSelected] = useState<Business | null>(null)
  const [filter, setFilter] = useState<LayerFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [mapStatus, setMapStatus] = useState('Loading approved businesses…')
  const [userPoint, setUserPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState('')

  const businessPostKinds = useMemo(() => getBusinessPostKinds(posts), [posts])
  const enrichedBusinesses = useMemo(() => enrichBusinessGeoJson(businessesGeoJson, businessPostKinds), [businessesGeoJson, businessPostKinds])
  const visibleBusinesses = useMemo(() => filteredBusinessGeoJson(enrichedBusinesses, filter, searchTerm), [enrichedBusinesses, filter, searchTerm])
  const nearbyBusinesses = useMemo(() => {
    const copy = [...visibleBusinesses.features]
    copy.sort((a, b) => distanceScore(a, userPoint) - distanceScore(b, userPoint))
    return copy.slice(0, 8)
  }, [visibleBusinesses, userPoint])

  function applyMapData(nextBusinesses = visibleBusinesses, nextUserPoint = userPoint) {
    const map = mapRef.current
    if (!map) return
    const pushedBusinesses = setGeoJson(map, 'businesses', nextBusinesses)
    const pushedDots = setGeoJson(map, 'business-dots', nextBusinesses)
    setGeoJson(map, 'user-location', userLocationData(nextUserPoint))
    if (pushedBusinesses || pushedDots) setMapStatus(`${nextBusinesses.features.length.toLocaleString()} approved businesses loaded`)
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
    if (!navigator.geolocation) return setLocationStatus('Location not supported on this browser')
    setLocationStatus('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      position => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserPoint(point)
        setLocationStatus('Showing nearest first.')
        requestAnimationFrame(() => {
          applyMapData(visibleBusinesses, point)
          const map = mapRef.current
          if (map && isInsidePaddedNewham(point)) map.easeTo({ center: [point.lng, point.lat], zoom: 15 })
          if (map && !isInsidePaddedNewham(point)) map.easeTo({ center: [NEWHAM_CENTER.lng, NEWHAM_CENTER.lat], zoom: 12.5 })
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
      setMapStatus(`${enriched.features.length.toLocaleString()} approved businesses loaded`)
      requestAnimationFrame(() => applyMapData(enriched, userPoint))
    }).catch(() => setMapStatus('Could not load approved businesses'))
  }, [businessPostKinds])

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
      map.addSource('businesses', { type: 'geojson', data: businessesGeoJsonRef.current as any, cluster: true, clusterMaxZoom: 15, clusterRadius: 50 })
      map.addLayer({ id: 'business-clusters', type: 'circle', source: 'businesses', filter: ['has', 'point_count'], paint: { 'circle-color': '#0F6E6B', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28, 200, 34] } } as any)
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'businesses', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } } as any)
      map.addLayer({ id: 'business-pins', type: 'symbol', source: 'businesses', filter: ['!', ['has', 'point_count']], layout: { 'icon-image': markerIconExpression(), 'icon-size': 0.64, 'icon-allow-overlap': false } } as any)
      map.addLayer({ id: 'business-action-badges', type: 'symbol', source: 'businesses', filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'primary_kind'], '']], layout: { 'icon-image': actionBadgeExpression, 'icon-size': 0.44, 'icon-offset': [18, -18], 'icon-allow-overlap': true } } as any)
      map.addSource('user-location', { type: 'geojson', data: userLocationData(userPoint) as any })
      map.addLayer({ id: 'user-location-pulse', type: 'circle', source: 'user-location', paint: { 'circle-radius': 18, 'circle-color': '#2D6CDF', 'circle-opacity': 0.2 } } as any)
      map.addLayer({ id: 'user-location-dot', type: 'circle', source: 'user-location', paint: { 'circle-radius': 7, 'circle-color': '#2D6CDF', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' } } as any)
      setMapReady(true)
      requestAnimationFrame(() => applyMapData(businessesGeoJsonRef.current, userPoint))

      map.on('click', 'business-clusters', async e => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['business-clusters'] })
        const clusterId = features[0]?.properties?.cluster_id
        const source = map.getSource('businesses') as maplibregl.GeoJSONSource
        const coordinates = (features[0]?.geometry as any)?.coordinates
        if (typeof clusterId !== 'number' || !coordinates) return
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId)
          if (typeof zoom === 'number') map.easeTo({ center: coordinates, zoom })
        } catch {}
      })

      async function openBusinessFromMap(e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) {
        const feature = e.features?.[0]
        const id = String(feature?.properties?.id || '')
        await openBusinessById(id, featureCoords(feature))
      }
      map.on('click', 'business-pins', openBusinessFromMap)
      map.on('click', 'business-action-badges', openBusinessFromMap)
      map.on('click', 'business-visible-dots', openBusinessFromMap)
      ;['business-clusters', 'business-pins', 'business-action-badges', 'business-visible-dots'].forEach(layer => {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      })
    })
    return () => { mapRef.current = null; map.remove() }
  }, [])

  useEffect(() => {
    if (!mapReady) return
    applyMapData(visibleBusinesses, userPoint)
  }, [mapReady, visibleBusinesses, userPoint])

  return (
    <section className="map-screen">
      <label className="map-search" aria-label="Search HiStreets">
        <Search size={18} />
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search offers, jobs, restaurants, salons…" />
      </label>
      <div className="map-filterbar">
        <select className="category-select" value={filter === 'community' ? 'all' : filter} onChange={e => setFilter(e.target.value as LayerFilter)} aria-label="Filter by category">
          {categoryOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
        <button className={filter === 'community' ? 'quick-filter active' : 'quick-filter'} onClick={() => setFilter(filter === 'community' ? 'all' : 'community')}>Free meals</button>
      </div>
      <div className="map-debug-pill">{mapStatus}</div>
      <button className="locate-button" onClick={requestUserLocation} aria-label="Use my location"><LocateFixed size={17} /> Near me</button>
      {locationStatus && <div className="location-status">{locationStatus}</div>}
      <div ref={nodeRef} className="map-canvas" />
      {!selected && nearbyBusinesses.length > 0 && <div className="nearby-results" aria-label="Nearby businesses">
        <div className="nearby-title"><strong>{userPoint ? 'Nearby businesses' : 'Approved businesses'}</strong><span>{nearbyBusinesses.length} shown</span></div>
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
      {selected && <div className="bottom-sheet"><button className="sheet-close" onClick={() => setSelected(null)}>×</button><BusinessDetailSheet business={selected} posts={posts.filter(p => p.business_id === selected.id)} /></div>}
    </section>
  )
}
