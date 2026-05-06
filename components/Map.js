'use client'
import { useEffect, useRef } from 'react'

const CAT_COLORS = { food:'#ff681f', retail:'#4ECDC4', services:'#45B7D1', beauty:'#F72585', health:'#4CC9F0', other:'#ff681f' }
const CAT_ICONS = { food:'🍕', retail:'🛍️', services:'🔧', beauty:'💅', health:'💊', other:'🏪' }

export default function MapComponent({ offers, center, onOfferClick, newOfferIds }) {
  const ref = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const parkingRef = useRef([])

  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return
    const L = require('leaflet')
    require('leaflet/dist/leaflet.css')

    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    const map = L.map(ref.current, {
      center: [center.lat, center.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const userIcon = L.divIcon({
      html: `<div style="position:relative;width:20px;height:20px">
        <div style="position:absolute;inset:0;background:rgba(66,133,244,.3);border-radius:50%;animation:up 2s ease infinite"></div>
        <div style="position:absolute;inset:4px;background:#4285f4;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(66,133,244,.6)"></div>
      </div><style>@keyframes up{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.8);opacity:0}}</style>`,
      iconSize:[20,20], iconAnchor:[10,10], className:'',
    })
    L.marker([center.lat, center.lng], { icon: userIcon, zIndexOffset: 1000 })
      .addTo(map).bindPopup('<div style="color:white;font-size:13px;padding:2px">📍 You are here</div>')

    mapRef.current = map
    loadParking(map, L)
    map.on('moveend', () => loadParking(map, L))
    return () => { map.remove(); mapRef.current = null }
  }, [])

  async function loadParking(map, L) {
    parkingRef.current.forEach(m => m.remove())
    parkingRef.current = []
    const b = map.getBounds()
    const q = `[out:json][timeout:8];node["amenity"="parking"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});out body 30;`
    try {
      const r = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`)
      const d = await r.json()
      d.elements?.slice(0,30).forEach(el => {
        const free = el.tags?.fee === 'no' || !el.tags?.fee
        const color = free ? '#2ECC71' : '#F39C12'
        const icon = L.divIcon({
          html:`<div style="background:${color};color:white;width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.35);border:2px solid white">P</div>`,
          iconSize:[26,26], iconAnchor:[13,13], className:'',
        })
        const m = L.marker([el.lat, el.lon], { icon })
          .addTo(map)
          .bindPopup(`<div style="color:white;padding:4px 2px"><b>${free?'🟢 Free':'🟡 Paid'} Parking</b>${el.tags?.maxstay?`<br>⏱ Max: ${el.tags.maxstay}`:''}</div>`)
        parkingRef.current.push(m)
      })
    } catch(e) {}
  }

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return
    const L = require('leaflet')
    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}

    offers.forEach(offer => {
      if (!offer.location) return
      let lat, lng
      try {
        const loc = typeof offer.location === 'string' ? JSON.parse(offer.location) : offer.location
        if (loc.coordinates) { lat = loc.coordinates[1]; lng = loc.coordinates[0] }
        else return
      } catch { return }

      const color = CAT_COLORS[offer.category] || '#ff681f'
      const emoji = CAT_ICONS[offer.category] || '🏪'
      const isNew = newOfferIds?.includes(offer.id)

      const icon = L.divIcon({
        html: `<div style="position:relative;width:44px;height:52px;cursor:pointer">
          ${isNew ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2.5px solid ${color};opacity:.5;animation:pr 1.5s ease-out infinite"></div>` : ''}
          <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%) rotate(-45deg);width:38px;height:38px;background:${color};border-radius:50% 50% 50% 0;box-shadow:0 4px 14px ${color}88;border:2.5px solid white"></div>
          <div style="position:absolute;bottom:7px;left:50%;transform:translateX(-50%);font-size:16px;line-height:1;width:26px;text-align:center">${emoji}</div>
        </div><style>@keyframes pr{0%{transform:scale(.8);opacity:1}100%{transform:scale(2.2);opacity:0}}</style>`,
        iconSize:[44,52], iconAnchor:[22,52], className:'',
      })

      const m = L.marker([lat, lng], { icon }).addTo(mapRef.current).on('click', () => onOfferClick(offer))
      markersRef.current[offer.id] = m
    })
  }, [offers, newOfferIds])

  return <div ref={ref} style={{ position:'absolute', inset:0 }} />
}
