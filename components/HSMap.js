'use client'
import { useEffect, useRef } from 'react'

const PARKING_COLORS = { free: '#2ECC71', paid: '#4A9EFF', restricted: '#E74C3C' }

export default function HSMap({ parking, offers, center, onParkingClick, onOfferClick, newOfferIds }) {
  const ref = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return
    const L = require('leaflet')
    require('leaflet/dist/leaflet.css')

    const map = L.map(ref.current, {
      center: [center.lat, center.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // User dot
    const userIcon = L.divIcon({
      html: '<div style="position:relative;width:22px;height:22px"><div style="position:absolute;inset:0;background:rgba(66,133,244,.25);border-radius:50%;animation:up 2s ease infinite"></div><div style="position:absolute;inset:5px;background:#4285f4;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(66,133,244,.7)"></div></div><style>@keyframes up{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(2);opacity:0}}</style>',
      iconSize: [22, 22], iconAnchor: [11, 11], className: '',
    })
    L.marker([center.lat, center.lng], { icon: userIcon, zIndexOffset: 2000 }).addTo(map)

    mapRef.current = map
    loadOSMBusinesses(map, L)
    map.on('moveend', () => loadOSMBusinesses(map, L))
    return () => { map.remove(); mapRef.current = null }
  }, [])

  async function loadOSMBusinesses(map, L) {
    const b = map.getBounds()
    // Load parking from OSM
    const pq = '[out:json][timeout:8];node["amenity"="parking"](' + b.getSouth() + ',' + b.getWest() + ',' + b.getNorth() + ',' + b.getEast() + ');out body 25;'
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(pq))
      const d = await r.json()
      d.elements?.slice(0, 25).forEach(el => {
        const free = el.tags?.fee === 'no' || !el.tags?.fee
        const color = free ? '#2ECC71' : '#F39C12'
        const icon = L.divIcon({
          html: '<div style="background:' + color + ';color:white;width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;box-shadow:0 3px 10px rgba(0,0,0,.4);border:2.5px solid white">P</div>',
          iconSize: [28, 28], iconAnchor: [14, 14], className: '',
        })
        L.marker([el.lat, el.lon], { icon })
          .addTo(map)
          .bindPopup('<div style="padding:8px 4px;color:#fff"><b>' + (free ? '🟢 Free' : '🟡 Paid') + ' Parking</b>' + (el.tags?.maxstay ? '<br>⏱ Max: ' + el.tags.maxstay : '') + '</div>')
      })
    } catch(e) {}
  }

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return
    const L = require('leaflet')
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Parking markers
    if (parking) {
      parking.forEach(p => {
        const color = PARKING_COLORS[p.type] || '#4A9EFF'
        const icon = L.divIcon({
          html: '<div style="position:relative;width:36px;height:42px;cursor:pointer"><div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%) rotate(-45deg);width:32px;height:32px;background:' + color + ';border-radius:50% 50% 50% 0;box-shadow:0 4px 14px ' + color + '88;border:2.5px solid white"></div><div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);color:white;font-size:11px;font-weight:800;line-height:1;width:24px;text-align:center">P</div></div>',
          iconSize: [36, 42], iconAnchor: [18, 42], className: '',
        })
        const m = L.marker([p.lat, p.lng], { icon }).addTo(mapRef.current).on('click', () => onParkingClick && onParkingClick(p))
        markersRef.current.push(m)
      })
    }

    // Offer markers
    if (offers) {
      offers.forEach(o => {
        if (!o.lat || !o.lng) return
        const isNew = newOfferIds?.includes(o.id)
        const icon = L.divIcon({
          html: '<div style="position:relative;cursor:pointer">' +
            (isNew ? '<div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid #ff681f;opacity:.5;animation:pr 1.5s ease-out infinite"></div>' : '') +
            '<div style="background:#ff681f;color:white;border-radius:20px;padding:5px 10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 14px rgba(255,104,31,.5);border:2px solid rgba(255,255,255,.3)">' + o.shortLabel + '</div>' +
            '</div><style>@keyframes pr{0%{transform:scale(.8);opacity:1}100%{transform:scale(2.2);opacity:0}}</style>',
          iconSize: [120, 30], iconAnchor: [60, 30], className: '',
        })
        const m = L.marker([o.lat, o.lng], { icon, zIndexOffset: 100 }).addTo(mapRef.current).on('click', () => onOfferClick && onOfferClick(o))
        markersRef.current.push(m)
      })
    }
  }, [parking, offers, newOfferIds])

  return <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
}
