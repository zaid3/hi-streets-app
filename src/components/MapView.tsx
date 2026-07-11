import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { Map as MapLibre } from 'maplibre-gl'
import { Layers, Tag } from 'lucide-react'
import { directionsUrl, MAP_STYLE_URL, NEWHAM_BOUNDS, NEWHAM_CENTER } from '../lib/newham'
import { loadBusinesses, loadCpzGeoJson, loadParkingPoints } from '../lib/data'
import type { Business, ParkingPoint, Post } from '../types'

type LayerFilter = 'all' | 'food' | 'shops' | 'services' | 'offers' | 'jobs' | 'community' | 'parking'

function businessColour(category: string) {
  if (/restaurant|cafe|food|fast/i.test(category)) return '#F2762E'
  if (/service|office|solicitor|account/i.test(category)) return '#0F6E6B'
  return '#2D6CDF'
}

function pointFeature(item: Business | ParkingPoint, properties: Record<string, unknown>) {
  return { type: 'Feature' as const, properties, geometry: { type: 'Point' as const, coordinates: [item.lng, item.lat] } }
}

function businessData(items: Business[], offerIds: Set<string>) {
  return {
    type: 'FeatureCollection' as const,
    features: items.map(item => pointFeature(item, { id: item.id, name: item.name, category: item.category, colour: businessColour(item.category), hasOffer: offerIds.has(item.id) })),
  }
}

function parkingData(items: ParkingPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: items.map(item => pointFeature(item, { id: item.id, kind: item.kind, name: item.name })),
  }
}

function setGeoJson(map: MapLibre | null, sourceId: string, data: unknown) {
  const source = map?.getSource(sourceId) as maplibregl.GeoJSONSource | undefined
  source?.setData(data as any)
}

export default function MapView({ posts }: { posts: Post[] }) {
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibre | null>(null)
  const businessesRef = useRef<Business[]>([])
  const parkingRef = useRef<ParkingPoint[]>([])
  const offerIdsRef = useRef<Set<string>>(new Set())
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [parking, setParking] = useState<ParkingPoint[]>([])
  const [selected, setSelected] = useState<Business | ParkingPoint | null>(null)
  const [filter, setFilter] = useState<LayerFilter>('all')

  useEffect(() => {
    loadBusinesses().then(setBusinesses)
    loadParkingPoints('all').then(setParking)
  }, [])
  useEffect(() => { businessesRef.current = businesses }, [businesses])
  useEffect(() => { parkingRef.current = parking }, [parking])

  const liveOfferBusinessIds = useMemo(() => new Set(posts.flatMap(p => (p.type === 'offer' && typeof p.business_id === 'string') ? [p.business_id] : [])), [posts])
  useEffect(() => { offerIdsRef.current = liveOfferBusinessIds }, [liveOfferBusinessIds])
  const filteredBusinesses = businesses.filter(b => {
    if (filter === 'offers') return liveOfferBusinessIds.has(b.id)
    if (filter === 'food') return /restaurant|cafe|food|fast/i.test(b.category)
    if (filter === 'shops') return /shop|retail|grocery|supermarket/i.test(b.category)
    if (filter === 'services') return /service|office|solicitor|account|bank|pharmacy/i.test(b.category)
    if (['jobs', 'community', 'parking'].includes(filter)) return false
    return true
  })
  const visibleParking = filter === 'parking' || filter === 'all' ? parking : []

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return
    const b = NEWHAM_BOUNDS
    const map = new maplibregl.Map({
      container: nodeRef.current,
      style: MAP_STYLE_URL,
      center: [NEWHAM_CENTER.lng, NEWHAM_CENTER.lat],
      zoom: 12.3,
      minZoom: 11.5,
      maxZoom: 19,
      maxBounds: [[b.west - 0.01, b.south - 0.01], [b.east + 0.01, b.north + 0.01]],
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.on('load', async () => {
      map.fitBounds([[b.west, b.south], [b.east, b.north]], { padding: 34, duration: 0 })
      const cpz = await loadCpzGeoJson()
      map.addSource('cpz', { type: 'geojson', data: cpz as any })
      map.addLayer({ id: 'cpz-fill', type: 'fill', source: 'cpz', paint: { 'fill-color': '#0F6E6B', 'fill-opacity': 0.12 } })
      map.addLayer({ id: 'cpz-line', type: 'line', source: 'cpz', paint: { 'line-color': '#0F6E6B', 'line-width': 1.5, 'line-opacity': 0.72 } })
      map.addLayer({ id: 'cpz-label', type: 'symbol', source: 'cpz', minzoom: 12, layout: { 'text-field': ['coalesce', ['get', 'name'], ['get', 'zone'], 'CPZ'], 'text-size': 12 }, paint: { 'text-color': '#0F6E6B', 'text-halo-color': '#fff', 'text-halo-width': 2 } })

      map.addSource('businesses', { type: 'geojson', data: businessData(businessesRef.current, offerIdsRef.current) as any })
      map.addLayer({ id: 'business-pins', type: 'circle', source: 'businesses', paint: { 'circle-radius': ['case', ['get', 'hasOffer'], 9, 7], 'circle-color': ['get', 'colour'], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
      map.addLayer({ id: 'offer-pulse', type: 'circle', source: 'businesses', filter: ['==', ['get', 'hasOffer'], true], paint: { 'circle-radius': 15, 'circle-color': '#F2762E', 'circle-opacity': 0.22 } })

      map.addSource('parking', { type: 'geojson', data: parkingData(parkingRef.current) as any })
      map.addLayer({ id: 'parking-pins', type: 'circle', source: 'parking', paint: { 'circle-radius': 8, 'circle-color': ['case', ['==', ['get', 'kind'], 'blue_badge'], '#8E44AD', '#2D6CDF'], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
      map.addLayer({ id: 'parking-labels', type: 'symbol', source: 'parking', layout: { 'text-field': ['case', ['==', ['get', 'kind'], 'blue_badge'], 'BB', '£'], 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': '#fff' } })

      map.on('click', 'business-pins', e => {
        const id = e.features?.[0]?.properties?.id
        const item = businessesRef.current.find(biz => biz.id === id)
        if (item) setSelected(item)
      })
      map.on('click', 'parking-pins', e => {
        const id = e.features?.[0]?.properties?.id
        const item = parkingRef.current.find(p => p.id === id)
        if (item) setSelected(item)
      })
      ;['business-pins', 'parking-pins'].forEach(layer => {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      })
    })
    return () => { mapRef.current = null; map.remove() }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    setGeoJson(map, 'businesses', businessData(filteredBusinesses, liveOfferBusinessIds))
    setGeoJson(map, 'parking', parkingData(visibleParking))
  }, [filteredBusinesses, visibleParking, liveOfferBusinessIds])

  const chips: Array<{ key: LayerFilter; label: string }> = [
    { key: 'all', label: 'All' }, { key: 'food', label: 'Food' }, { key: 'shops', label: 'Shops' }, { key: 'services', label: 'Services' }, { key: 'offers', label: 'Offers 🔥' }, { key: 'jobs', label: 'Jobs' }, { key: 'community', label: 'Free meals' }, { key: 'parking', label: 'Parking' },
  ]

  return (
    <section className="map-screen">
      <div className="map-search"><strong>Search HiStreets…</strong></div>
      <div className="chip-row map-chips">{chips.map(c => <button key={c.key} className={filter === c.key ? 'active' : ''} onClick={() => setFilter(c.key)}>{c.label}</button>)}</div>
      <div ref={nodeRef} className="map-canvas" />
      <button className="fab" aria-label="Post"><Layers size={20} />＋ Post</button>
      {selected && <div className="bottom-sheet"><button className="sheet-close" onClick={() => setSelected(null)}>×</button>{'kind' in selected ? <ParkingDetail item={selected} /> : <BusinessDetail business={selected} posts={posts.filter(p => p.business_id === selected.id)} />}</div>}
    </section>
  )
}

function BusinessDetail({ business, posts }: { business: Business; posts: Post[] }) {
  return <><div className="sheet-handle" /><h2>{business.name}</h2><p className="muted">{business.category} · {business.address || 'Newham'}</p>{posts.filter(p => p.type === 'offer').map(p => <article className="mini-card" key={p.id}><Tag size={16} /> <strong>{p.title}</strong><span>{p.body}</span></article>)}<div className="sheet-actions"><a href={directionsUrl(business.lat, business.lng)} target="_blank" rel="noreferrer">Directions</a><button>Claim this business</button></div></>
}

function ParkingDetail({ item }: { item: ParkingPoint }) {
  return <><div className="sheet-handle" /><h2>{item.kind === 'blue_badge' ? 'Blue Badge bay' : 'Paid bay'}</h2><p className="muted">{item.name}</p>{item.kind === 'paid_bay' && <p>PayByPhone: <strong>{item.paybyphone_code || 'Check sign'}</strong><br />Max stay: <strong>{item.max_stay_mins ? `${item.max_stay_mins} mins` : 'Check sign'}</strong></p>}<p className="trust">Source: {item.source}. Last verified: {item.last_verified_at ? new Date(item.last_verified_at).toLocaleDateString() : 'not recorded'}.</p><a href={directionsUrl(item.lat, item.lng)} target="_blank" rel="noreferrer">Directions</a></>
}