'use client'
import { useEffect, useRef } from 'react'

const CATEGORY_COLORS = {
  food: '#FF6B35',
  retail: '#4ECDC4',
  services: '#45B7D1',
  beauty: '#F72585',
  health: '#4CC9F0',
  parking_free: '#2ECC71',
  parking_paid: '#F39C12',
  other: '#AEB6BF',
}

const CATEGORY_ICONS = {
  food: '🍕',
  retail: '🛍️',
  services: '🔧',
  beauty: '💅',
  health: '💊',
  parking_free: '🅿️',
  parking_paid: '🅿️',
  other: '🏪',
}

export default function MapComponent({ offers, center, onOfferClick, newOfferIds }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const parkingLoadedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return
    const L = require('leaflet')

    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: 15,
      zoomControl: false,
    })

    // Dark-styled OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Custom zoom control position
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // User location dot
    const userIcon = L.divIcon({
      html: `<div style="position:relative;width:20px;height:20px">
        <div style="position:absolute;inset:0;background:rgba(66,133,244,0.3);border-radius:50%;animation:userPulse 2s ease infinite"></div>
        <div style="position:absolute;inset:4px;background:#4285f4;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(66,133,244,0.6)"></div>
      </div>`,
      iconSize: [20, 20], iconAnchor: [10, 10], className: '',
    })
    L.marker([center.lat, center.lng], { icon: userIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup('📍 You are here')

    mapInstanceRef.current = map

    // Load parking on moveend
    map.on('moveend', () => loadParking(map, L))
    loadParking(map, L)

  }, [])

  // Load parking from OpenStreetMap Overpass API
  async function loadParking(map, L) {
    if (!map) return
    const bounds = map.getBounds()
    const query = `
      [out:json][timeout:10];
      node["amenity"="parking"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
      out body 50;
    `
    try {
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
      const data = await res.json()
      data.elements?.slice(0, 30).forEach(el => {
        const isFree = el.tags?.fee === 'no' || !el.tags?.fee
        const maxStay = el.tags?.['maxstay'] || ''
        const color = isFree ? '#2ECC71' : '#F39C12'
        const icon = L.divIcon({
          html: `<div style="
            background:${color};color:white;
            width:28px;height:28px;border-radius:6px;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:800;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            border:2px solid white;
          ">P</div>`,
          iconSize: [28, 28], iconAnchor: [14, 14], className: '',
        })
        L.marker([el.lat, el.lon], { icon })
          .addTo(map)
          .bindPopup(`<div style="color:white;padding:4px">
            <b>${isFree ? '🟢 Free Parking' : '🟡 Paid Parking'}</b>
            ${maxStay ? `<br>Max stay: ${maxStay}` : ''}
          </div>`)
      })
    } catch (e) {
      // Silently fail if overpass is unavailable
    }
  }

  // Update offer markers
  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === 'undefined') return
    const L = require('leaflet')

    // Remove old offer markers
    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}

    offers.forEach(offer => {
      if (!offer.location) return
      let lat, lng
      try {
        const loc = typeof offer.location === 'string' ? JSON.parse(offer.location) : offer.location
        if (loc.coordinates) { lat = loc.coordinates[1]; lng = loc.coordinates[0] }
        else if (loc.lat) { lat = loc.lat; lng = loc.lng }
        else return
      } catch { return }

      const color = CATEGORY_COLORS[offer.category] || '#FF6B35'
      const emoji = CATEGORY_ICONS[offer.category] || '🏪'
      const isNew = newOfferIds?.includes(offer.id)

      const markerHtml = `
        <div style="position:relative;width:48px;height:56px;cursor:pointer">
          ${isNew ? `<div style="
            position:absolute;inset:-8px;
            border-radius:50%;
            border:3px solid ${color};
            opacity:0.6;
            animation:pulseRing 1.5s ease-out infinite;
          "></div>` : ''}
          <div style="
            position:absolute;bottom:0;left:50%;transform:translateX(-50%);
            width:44px;height:44px;
            background:linear-gradient(135deg, ${color}, ${color}dd);
            border-radius:50% 50% 50% 0;
            transform:translateX(-50%) rotate(-45deg);
            box-shadow:0 4px 14px ${color}66;
            border:2px solid white;
          "></div>
          <div style="
            position:absolute;bottom:6px;left:50%;
            transform:translateX(-50%) rotate(0deg);
            font-size:18px;line-height:1;
            width:28px;text-align:center;
          ">${emoji}</div>
        </div>
      `

      const icon = L.divIcon({
        html: markerHtml,
        iconSize: [48, 56], iconAnchor: [24, 56], className: '',
      })

      const marker = L.marker([lat, lng], { icon })
        .addTo(mapInstanceRef.current)
        .on('click', () => onOfferClick(offer))

      markersRef.current[offer.id] = marker
    })
  }, [offers, newOfferIds])

  return (
    <>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      <style>{`
        @keyframes userPulse { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.8);opacity:0} }
        @keyframes pulseRing { 0%{transform:scale(0.8);opacity:1} 100%{transform:scale(2.2);opacity:0} }
      `}</style>
    </>
  )
}
