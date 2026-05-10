'use client'
import { useEffect, useRef } from 'react'

const SEGMENT_DASH = { loading: [8, 6] }

export default function HSMap({
  segments, carParks, offers, places,
  center, zoom, onSegmentClick, onCarParkClick, onOfferClick,
  showSegments, showCarParks, showOffers, showPlaces,
  onMapMove,
}) {
  const ref = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef({ segments:[], carParks:[], offers:[], places:[], user:null })
  const moveTimer = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !ref.current) return
    const L = require('leaflet')
    require('leaflet/dist/leaflet.css')

    const map = L.map(ref.current, {
      center: [center.lat, center.lng],
      zoom: zoom || 15,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 19, minZoom: 5,
    })

    // OSM tile
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // User location dot
    const userIcon = L.divIcon({
      html: `<div style="position:relative;width:22px;height:22px">
        <div style="position:absolute;inset:0;background:rgba(66,133,244,.25);border-radius:50%;animation:uloc 2s ease infinite"></div>
        <div style="position:absolute;inset:5px;background:#4285f4;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(66,133,244,.7)"></div>
      </div><style>@keyframes uloc{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(2.2);opacity:0}}</style>`,
      iconSize:[22,22], iconAnchor:[11,11], className:'',
    })
    layersRef.current.user = L.marker([center.lat,center.lng],{icon:userIcon,zIndexOffset:3000}).addTo(map)

    mapRef.current = map

    // Emit bounds on moveend
    map.on('moveend', () => {
      clearTimeout(moveTimer.current)
      moveTimer.current = setTimeout(() => {
        const b = map.getBounds()
        onMapMove && onMapMove({ south:b.getSouth(), west:b.getWest(), north:b.getNorth(), east:b.getEast() })
      }, 500)
    })

    // Emit initial bounds
    setTimeout(() => {
      if (!map) return
      map.invalidateSize()
      const b = map.getBounds()
      onMapMove && onMapMove({ south:b.getSouth(), west:b.getWest(), north:b.getNorth(), east:b.getEast() })
    }, 400)

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Update user location
  useEffect(() => {
    if (!mapRef.current || !layersRef.current.user) return
    layersRef.current.user.setLatLng([center.lat, center.lng])
  }, [center.lat, center.lng])

  // Pan map when center prop changes externally
  const prevCenter = useRef(null)
  useEffect(() => {
    if (!mapRef.current) return
    if (prevCenter.current && prevCenter.current.lat === center.lat && prevCenter.current.lng === center.lng) return
    prevCenter.current = center
    mapRef.current.setView([center.lat, center.lng], zoom || mapRef.current.getZoom(), { animate: true })
  }, [center.lat, center.lng, zoom])

  // Draw parking segments (polylines)
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return
    const L = require('leaflet')
    layersRef.current.segments.forEach(l => l.remove())
    layersRef.current.segments = []
    if (!showSegments || !segments) return

    segments.forEach(seg => {
      const opts = {
        color: seg.color || '#4A9EFF',
        weight: seg.weight || 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }
      if (SEGMENT_DASH[seg.type]) opts.dashArray = SEGMENT_DASH[seg.type].join(' ')

      const line = L.polyline(seg.coords, opts)
        .addTo(mapRef.current)
        .on('click', () => onSegmentClick && onSegmentClick(seg))

      // Invisible wider clickable overlay
      const hitLine = L.polyline(seg.coords, { color:'transparent', weight:18, opacity:0 })
        .addTo(mapRef.current)
        .on('click', () => onSegmentClick && onSegmentClick(seg))

      layersRef.current.segments.push(line, hitLine)
    })
  }, [segments, showSegments])

  // Draw car park pins
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return
    const L = require('leaflet')
    layersRef.current.carParks.forEach(l => l.remove())
    layersRef.current.carParks = []
    if (!showCarParks || !carParks) return

    carParks.forEach(cp => {
      const color = cp.free ? '#2ECC71' : '#F39C12'
      const icon = L.divIcon({
        html: `<div style="position:relative;width:34px;height:40px;cursor:pointer">
          <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%) rotate(-45deg);width:30px;height:30px;background:${color};border-radius:50% 50% 50% 0;box-shadow:0 3px 12px ${color}88;border:2.5px solid white"></div>
          <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);color:white;font-size:11px;font-weight:900;text-shadow:0 1px 3px rgba(0,0,0,.4)">P</div>
        </div>`,
        iconSize:[34,40], iconAnchor:[17,40], className:'',
      })
      const m = L.marker([cp.lat,cp.lng],{icon,zIndexOffset:500})
        .addTo(mapRef.current)
        .on('click', () => onCarParkClick && onCarParkClick(cp))
      layersRef.current.carParks.push(m)
    })
  }, [carParks, showCarParks])

  // Draw offer bubbles
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return
    const L = require('leaflet')
    layersRef.current.offers.forEach(l => l.remove())
    layersRef.current.offers = []
    if (!showOffers || !offers) return

    offers.forEach(o => {
      if (!o.lat || !o.lng) return
      const label = (o.shortLabel || o.title || '').slice(0,24)
      const icon = L.divIcon({
        html: `<div style="cursor:pointer;position:relative">
          <div style="background:#ff681f;color:white;border-radius:20px;padding:6px 12px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 14px rgba(255,104,31,.55);border:2px solid rgba(255,255,255,.3);font-family:Arial,sans-serif;line-height:1.2;display:inline-block">${label}</div>
          <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #ff681f"></div>
        </div>`,
        iconSize:[150,34], iconAnchor:[75,40], className:'',
      })
      const m = L.marker([o.lat,o.lng],{icon,zIndexOffset:200})
        .addTo(mapRef.current)
        .on('click', () => onOfferClick && onOfferClick(o))
      layersRef.current.offers.push(m)
    })
  }, [offers, showOffers])

  // Draw POI places
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return
    const L = require('leaflet')
    layersRef.current.places.forEach(l => l.remove())
    layersRef.current.places = []
    if (!showPlaces || !places) return

    places.slice(0,80).forEach(p => {
      const icon = L.divIcon({
        html: `<div style="background:rgba(18,18,18,.92);border:1.5px solid rgba(255,255,255,.15);border-radius:10px;padding:4px 8px;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.5)">${p.icon}</div>`,
        iconSize:[36,32], iconAnchor:[18,16], className:'',
      })
      L.marker([p.lat,p.lng],{icon})
        .addTo(mapRef.current)
        .bindPopup(`<div style="color:#fff;padding:6px 2px;min-width:140px"><b style="font-size:13px">${p.name}</b>${p.address?'<br><span style="color:rgba(255,255,255,.5);font-size:12px">'+p.address+'</span>':''}</div>`)
      layersRef.current.places.push()
    })
  }, [places, showPlaces])

  return <div ref={ref} style={{ position:'absolute', inset:0 }} />
}
