import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { Map as MapLibre } from 'maplibre-gl'
import { LocateFixed, Search } from 'lucide-react'
import { fetchBusinessById, loadBusinessesGeoJson, loadNewhamBoundaryGeoJson } from '../lib/data'
import { getReliableUserPosition, locationErrorMessage } from '../lib/geolocation'
import { MAP_STYLE_URL, NEWHAM_BOUNDS, NEWHAM_CENTER } from '../lib/newham'
import {
  fullPostcodeIsInNewham,
  looksLikeFullPostcode,
  looksLikeOutcode,
  lookupFullPostcode,
  lookupOutcode,
  outcodeCoversNewham,
  postcodePoint,
} from '../lib/postcode'
import type { Business, Post } from '../types'
import BusinessDetailSheet from './BusinessDetailSheet'

type LayerFilter = 'all' | 'food' | 'grocery' | 'shops' | 'beauty' | 'health' | 'professional' | 'services' | 'community'
type FeatureCollection = { type: 'FeatureCollection'; features: Array<any> }
type BusinessPostKinds = Record<string, { offer: boolean; job: boolean; community: boolean }>
type CategoryInfo = { group: string; marker: string; label: string; icon: string; aliases: string }

type RawMapImage = { width: number; height: number; data: Uint8ClampedArray }

const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] }
const LOCATION_PROMPT_KEY = 'histreets_location_prompted_v1'

const markerDefinitions: Array<{ id: string; label: string; color: string }> = [
  { id: 'restaurant', label: '🍽', color: '#F2762E' },
  { id: 'takeaway', label: '🥡', color: '#F2762E' },
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
  if (/takeaway|fast.?food|chicken|pizza|kebab|burger|mcdonald|kfc|subway|domino|restaurant|grill|cafe|coffee|bakery|food/.test(text)) return info('food', 'restaurant', 'Food & drink', '🍽', 'restaurant cafe food halal takeaway')
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

function rgb(fill: string) {
  const value = Number.parseInt(fill.replace('#', ''), 16)
  return {
    r: Number.isFinite(value) ? (value >> 16) & 255 : 15,
    g: Number.isFinite(value) ? (value >> 8) & 255 : 110,
    b: Number.isFinite(value) ? value & 255 : 107,
  }
}

function fallbackMarkerImage(fill: string): RawMapImage {
  const size = 64
  const data = new Uint8ClampedArray(size * size * 4)
  const color = rgb(fill)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - 32
      const dy = y - 32
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance > 31) continue
      const offset = (y * size + x) * 4
      const isBorder = distance > 25
      data[offset] = isBorder ? 255 : color.r
      data[offset + 1] = isBorder ? 255 : color.g
      data[offset + 2] = isBorder ? 255 : color.b
      data[offset + 3] = 255
    }
  }
  return { width: size, height: size, data }
}

function markerImage(label: string, fill: string): ImageData | RawMapImage {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')
    if (!context) return fallbackMarkerImage(fill)
    context.beginPath()
    context.arc(32, 32, 28, 0, Math.PI * 2)
    context.fillStyle = fill
    context.fill()
    context.lineWidth = 6
    context.strokeStyle = '#ffffff'
    context.stroke()
    context.fillStyle = '#ffffff'
    context.font = `${label.length > 1 ? 18 : 23}px "Apple Color Emoji", "Segoe UI Emoji", Arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(label, 32, 33)
    return context.getImageData(0, 0, 64, 64)
  } catch {
    return fallbackMarkerImage(fill)
  }
}

function addMarkerImage(map: MapLibre, id: string, label: string, fill: string) {
  if (map.hasImage(id)) return
  map.addImage(id, markerImage(label, fill) as any)
}

function addCategoryImages(map: MapLibre) {
  for (const marker of markerDefinitions) addMarkerImage(map, `cat-${marker.id}`, marker.label, marker.color)
  addMarkerImage(map, 'offer-icon', '%', '#F2762E')
  addMarkerImage(map, 'job-icon', '💼', '#2D6CDF')
  addMarkerImage(map, 'community-icon', '❤', '#2E9E5B')
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
  if (!holes.length) return EMPTY_FC
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
      const address = String(props.address || '')
      const kinds = postKinds[id] || { offer: false, job: false, community: false }
      const details = categoryInfo(category, name)
      const hasOffer = Boolean(props.has_offer) || kinds.offer
      const hasJob = Boolean(props.has_job) || kinds.job
      const hasCommunity = Boolean(props.has_community) || kinds.community
      const primaryKind = hasOffer ? 'offer' : hasJob ? 'job' : hasCommunity ? 'community' : ''
      return { ...feature, properties: { ...props, category_group: details.group, marker_icon: details.marker, category_label: details.label, category_icon: details.icon, has_offer: hasOffer, has_job: hasJob, has_community: hasCommunity, primary_kind: primaryKind, searchable: `${name} ${category} ${address} ${details.group} ${details.label} ${details.aliases}`.toLowerCase() } }
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
  const lng = Number(coords[0])
  const lat = Number(coords[1])
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return [lng, lat]
}

function isInsideNewham(point: { lat: number; lng: number }) {
  return point.lat >= NEWHAM_BOUNDS.south && point.lat <= NEWHAM_BOUNDS.north && point.lng >= NEWHAM_BOUNDS.west && point.lng <= NEWHAM_BOUNDS.east
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function closestNewhamFocus(point: { lat: number; lng: number }) {
  const latPad = (NEWHAM_BOUNDS.north - NEWHAM_BOUNDS.south) * 0.01
  const lngPad = (NEWHAM_BOUNDS.east - NEWHAM_BOUNDS.west) * 0.01
  return {
    lat: clamp(point.lat, NEWHAM_BOUNDS.south + latPad, NEWHAM_BOUNDS.north - latPad),
    lng: clamp(point.lng, NEWHAM_BOUNDS.west + lngPad, NEWHAM_BOUNDS.east - lngPad),
  }
}

function userLocationData(point: { lat: number; lng: number } | null): FeatureCollection {
  if (!point || !isInsideNewham(point)) return EMPTY_FC
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'user-location' }, geometry: { type: 'Point', coordinates: [point.lng, point.lat] } }] }
}

function focusFeatures(map: MapLibre, features: Array<any>) {
  const coords = features.map(featureCoords).filter(Boolean) as [number, number][]
  if (!coords.length) return false
  if (coords.length === 1) {
    map.easeTo({ center: coords[0], zoom: 16.2, duration: 450 })
    return true
  }
  const bounds = coords.reduce((b, coord) => b.extend(coord), new maplibregl.LngLatBounds(coords[0], coords[0]))
  map.fitBounds(bounds, { padding: 60, maxZoom: 15.8, duration: 450 })
  return true
}

function locationPromptWasSeen() {
  try {
    return window.sessionStorage.getItem(LOCATION_PROMPT_KEY) === '1'
  } catch {
    return false
  }
}

function rememberLocationPrompt() {
  try {
    window.sessionStorage.setItem(LOCATION_PROMPT_KEY, '1')
  } catch {}
}

function postcodeLookupFailure(status: number) {
  if (status === 404) return 'Postcode not found. Check it and try again.'
  return 'Postcode lookup is temporarily unavailable. You can still search by business or street.'
}

export default function MapView({ posts }: { posts: Post[] }) {
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibre | null>(null)
  const businessesGeoJsonRef = useRef<FeatureCollection>(EMPTY_FC)
  const [businessesGeoJson, setBusinessesGeoJson] = useState<FeatureCollection>(EMPTY_FC)
  const [selected, setSelected] = useState<Business | null>(null)
  const [filter, setFilter] = useState<LayerFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [userPoint, setUserPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState('')
  const [locationPromptOpen, setLocationPromptOpen] = useState(() => !locationPromptWasSeen())
  const [locating, setLocating] = useState(false)
  const [searching, setSearching] = useState(false)

  const businessPostKinds = useMemo(() => getBusinessPostKinds(posts), [posts])
  const enrichedBusinesses = useMemo(() => enrichBusinessGeoJson(businessesGeoJson, businessPostKinds), [businessesGeoJson, businessPostKinds])
  const visibleBusinesses = useMemo(() => filteredBusinessGeoJson(enrichedBusinesses, filter, appliedSearch), [enrichedBusinesses, filter, appliedSearch])

  function applyMapData(nextBusinesses = visibleBusinesses, nextUserPoint = userPoint) {
    const map = mapRef.current
    if (!map) return
    setGeoJson(map, 'businesses', nextBusinesses)
    setGeoJson(map, 'business-dots', nextBusinesses)
    setGeoJson(map, 'user-location', userLocationData(nextUserPoint))
  }

  async function openBusinessById(id: string, coords?: [number, number] | null) {
    if (!id) return
    const business = await fetchBusinessById(id)
    if (!business) return
    setSelected(business)
    const map = mapRef.current
    const point = coords || [business.lng, business.lat]
    if (map && point) map.easeTo({ center: point, zoom: Math.max(map.getZoom(), 16), duration: 400 })
  }

  async function submitSearch(event: FormEvent) {
    event.preventDefault()
    const map = mapRef.current
    const query = searchTerm.trim()
    if (!map || searching) return

    if (!query) {
      setAppliedSearch('')
      const reset = filteredBusinessGeoJson(enrichedBusinesses, filter, '')
      applyMapData(reset, userPoint)
      setLocationStatus('Showing Newham map.')
      map.fitBounds([[NEWHAM_BOUNDS.west, NEWHAM_BOUNDS.south], [NEWHAM_BOUNDS.east, NEWHAM_BOUNDS.north]], { padding: 12, duration: 400 })
      return
    }

    if (looksLikeFullPostcode(query)) {
      setAppliedSearch('')
      setSearching(true)
      setLocationStatus('Searching postcode…')
      try {
        const lookup = await lookupFullPostcode(query)
        if (!lookup.ok || !lookup.result) {
          setLocationStatus(postcodeLookupFailure(lookup.status))
          return
        }
        const point = postcodePoint(lookup.result)
        if (!point) {
          setLocationStatus('That postcode does not have a usable map location.')
          return
        }
        if (!fullPostcodeIsInNewham(lookup.result) || !isInsideNewham(point)) {
          setLocationStatus('That postcode is outside the London Borough of Newham.')
          return
        }
        applyMapData(filteredBusinessGeoJson(enrichedBusinesses, filter, ''), userPoint)
        map.easeTo({ center: [point.lng, point.lat], zoom: 16.3, duration: 450 })
        setLocationStatus(`Showing ${String(lookup.result.postcode || query).toUpperCase()}.`)
      } catch (error) {
        const timedOut = error instanceof DOMException && error.name === 'AbortError'
        setLocationStatus(timedOut ? 'Postcode search timed out. Check your connection and try again.' : 'Postcode lookup is temporarily unavailable. You can still search by business or street.')
      } finally {
        setSearching(false)
      }
      return
    }

    if (looksLikeOutcode(query)) {
      setAppliedSearch('')
      setSearching(true)
      setLocationStatus('Searching postcode area…')
      try {
        const lookup = await lookupOutcode(query)
        if (!lookup.ok || !lookup.result) {
          setLocationStatus(postcodeLookupFailure(lookup.status))
          return
        }
        const point = postcodePoint(lookup.result)
        if (!point) {
          setLocationStatus('That postcode area does not have a usable map location.')
          return
        }
        if (!outcodeCoversNewham(lookup.result)) {
          setLocationStatus('That postcode area does not cover Newham.')
          return
        }
        const focus = isInsideNewham(point) ? point : closestNewhamFocus(point)
        applyMapData(filteredBusinessGeoJson(enrichedBusinesses, filter, ''), userPoint)
        map.easeTo({ center: [focus.lng, focus.lat], zoom: 14.6, duration: 450 })
        setLocationStatus(`Showing ${String(lookup.result.outcode || query).toUpperCase()} in Newham.`)
      } catch (error) {
        const timedOut = error instanceof DOMException && error.name === 'AbortError'
        setLocationStatus(timedOut ? 'Postcode search timed out. Check your connection and try again.' : 'Postcode lookup is temporarily unavailable. You can still search by business or street.')
      } finally {
        setSearching(false)
      }
      return
    }

    const matches = filteredBusinessGeoJson(enrichedBusinesses, filter, query)
    setAppliedSearch(query)
    applyMapData(matches, userPoint)
    if (focusFeatures(map, matches.features)) {
      setLocationStatus(`${matches.features.length} result${matches.features.length === 1 ? '' : 's'} found.`)
    } else {
      setLocationStatus('No matching business found yet. Try business name, street or postcode.')
    }
  }

  function dismissLocationPrompt() {
    rememberLocationPrompt()
    setLocationPromptOpen(false)
  }

  async function requestUserLocation() {
    if (locating) return
    dismissLocationPrompt()
    const map = mapRef.current
    if (!window.isSecureContext) {
      setLocationStatus('Location needs a secure HTTPS connection.')
      return
    }
    if (!navigator.geolocation) {
      setLocationStatus('Location is not supported on this browser.')
      return
    }

    setLocating(true)
    setLocationStatus('Finding your location…')
    try {
      const position = await getReliableUserPosition()
      const point = { lat: position.coords.latitude, lng: position.coords.longitude }
      const insideArea = isInsideNewham(point)
      const focusPoint = insideArea ? point : closestNewhamFocus(point)
      const visiblePoint = insideArea ? point : null
      setUserPoint(visiblePoint)
      setLocationStatus(insideArea ? 'Showing places near your location.' : 'Your location is outside Newham. Showing the closest Newham area.')
      requestAnimationFrame(() => {
        applyMapData(visibleBusinesses, visiblePoint)
        map?.easeTo({ center: [focusPoint.lng, focusPoint.lat], zoom: insideArea ? 16 : 14.8, duration: 500 })
      })
    } catch (error) {
      setUserPoint(null)
      setLocationStatus(locationErrorMessage(error, 'Could not get location. You can still use the Newham map and postcode search.'))
    } finally {
      setLocating(false)
    }
  }

  useEffect(() => {
    loadBusinessesGeoJson().then(data => {
      const enriched = enrichBusinessGeoJson(data, businessPostKinds)
      businessesGeoJsonRef.current = enriched
      setBusinessesGeoJson(data)
      requestAnimationFrame(() => applyMapData(enriched, userPoint))
    }).catch(() => setLocationStatus('Could not load the business map data. The base map and postcode search are still available.'))
    // Business data is loaded once. Post badges update locally from the posts prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    businessesGeoJsonRef.current = enrichedBusinesses
  }, [enrichedBusinesses])

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: nodeRef.current,
      style: MAP_STYLE_URL,
      center: [NEWHAM_CENTER.lng, NEWHAM_CENTER.lat],
      zoom: 12.7,
      minZoom: 12.1,
      maxZoom: 19,
      maxBounds: [[NEWHAM_BOUNDS.west, NEWHAM_BOUNDS.south], [NEWHAM_BOUNDS.east, NEWHAM_BOUNDS.north]],
      attributionControl: { compact: true },
    })
    mapRef.current = map

    map.on('load', async () => {
      try {
        map.fitBounds([[NEWHAM_BOUNDS.west, NEWHAM_BOUNDS.south], [NEWHAM_BOUNDS.east, NEWHAM_BOUNDS.north]], { padding: 12, duration: 0 })
        addCategoryImages(map)

        const boundary = await loadNewhamBoundaryGeoJson()
        const mask = maskFromBoundary(boundary)
        if (mask.features.length > 0) {
          map.addSource('newham-mask', { type: 'geojson', data: mask as any })
          map.addLayer({ id: 'newham-mask-fill', type: 'fill', source: 'newham-mask', paint: { 'fill-color': '#000000', 'fill-opacity': 0.55 } } as any)
        }

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

        map.on('click', async event => {
          const features = map.queryRenderedFeatures(event.point, { layers: ['business-action-badges', 'business-pins', 'business-clusters'] })
          const feature = features[0]
          if (!feature) return

          if (feature.layer.id === 'business-clusters') {
            const clusterId = feature.properties?.cluster_id
            const source = map.getSource('businesses') as maplibregl.GeoJSONSource
            const coordinates = featureCoords(feature)
            if (typeof clusterId !== 'number' || !coordinates) return
            try {
              const zoom = await source.getClusterExpansionZoom(clusterId)
              if (typeof zoom === 'number') map.easeTo({ center: coordinates, zoom, duration: 400 })
            } catch {}
            return
          }

          const id = String(feature.properties?.id || '')
          await openBusinessById(id, featureCoords(feature))
        })

        ;['business-clusters', 'business-pins', 'business-action-badges'].forEach(layer => {
          map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
        })
      } catch (error) {
        console.error('HiStreets map initialisation failed', error)
        setLocationStatus('The map could not finish loading. Refresh the page or check your connection.')
      }
    })

    map.on('error', event => {
      if (!map.loaded()) console.warn('HiStreets map resource error', event.error)
    })

    return () => { mapRef.current = null; map.remove() }
  }, [])

  useEffect(() => {
    if (!mapReady) return
    applyMapData(visibleBusinesses, userPoint)
  }, [mapReady, visibleBusinesses, userPoint])

  return (
    <section className="map-screen">
      <form className="map-search" aria-label="Search HiStreets" onSubmit={submitSearch}>
        <button className="map-search-button" type="submit" aria-label="Search" disabled={searching}><Search size={18} /></button>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search business, street or postcode…" autoComplete="off" enterKeyHint="search" aria-busy={searching} />
      </form>
      <div className="map-filterbar">
        <select className="category-select" value={filter === 'community' ? 'all' : filter} onChange={e => setFilter(e.target.value as LayerFilter)} aria-label="Filter by category">
          {categoryOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
        <button type="button" className={filter === 'community' ? 'quick-filter active' : 'quick-filter'} onClick={() => setFilter(filter === 'community' ? 'all' : 'community')}>Free meals</button>
      </div>
      <button type="button" className="locate-button" onClick={requestUserLocation} aria-label="Use my location" disabled={locating}><LocateFixed size={17} /> {locating ? 'Finding…' : 'Near me'}</button>
      {locationStatus && <div className="location-status" role="status" aria-live="polite">{locationStatus}</div>}
      <div ref={nodeRef} className="map-canvas" />
      {locationPromptOpen && !userPoint && <div className="location-gate" role="dialog" aria-modal="true" aria-labelledby="location-gate-title"><div><h2 id="location-gate-title">Use your location?</h2><p>HiStreets works best when you share location, so we can show nearby offers, jobs, free meals and local businesses in Newham.</p><button type="button" onClick={requestUserLocation} disabled={locating}><LocateFixed size={17} /> {locating ? 'Finding your location…' : 'Show what is near me'}</button><button type="button" className="secondary" onClick={dismissLocationPrompt}>Use Newham map for now</button></div></div>}
      {selected && <div className="bottom-sheet"><button type="button" className="sheet-close" onClick={() => setSelected(null)} aria-label="Close business details">×</button><BusinessDetailSheet business={selected} posts={posts.filter(p => p.business_id === selected.id)} /></div>}
    </section>
  )
}
