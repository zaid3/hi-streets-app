'use client'
import{useEffect,useRef}from'react'

// Generate individual bay marker positions along a segment
function bayPositions(coords,spacing=0.00018){
  const pts=[]
  let cumDist=spacing/2
  for(let i=0;i<coords.length-1;i++){
    const[lat1,lng1]=coords[i],[lat2,lng2]=coords[i+1]
    const segLen=Math.sqrt((lat2-lat1)**2+(lng2-lng1)**2)
    let d=0
    while(d+cumDist<segLen){
      const t=(d+cumDist)/segLen
      pts.push([lat1+(lat2-lat1)*t,lng1+(lng2-lng1)*t])
      d+=spacing
    }
    cumDist=d+cumDist-segLen
  }
  return pts
}

export default function HSMap({segments,carParks,offers,places,center,zoom,onSegmentClick,onCarParkClick,onOfferClick,showSegments,showCarParks,showOffers,showPlaces,onMapMove}){
  const ref=useRef(null)
  const mapRef=useRef(null)
  const layersRef=useRef({segs:[],cps:[],offers:[],places:[],user:null,bayMarkers:[]})
  const moveTimer=useRef(null)

  useEffect(()=>{
    if(typeof window==='undefined'||mapRef.current||!ref.current)return
    const L=require('leaflet')
    require('leaflet/dist/leaflet.css')

    const map=L.map(ref.current,{
      center:[center.lat,center.lng],
      zoom:zoom||15,
      zoomControl:false,
      attributionControl:false,
      maxZoom:19,minZoom:5,
    })

    // CartoDB Positron — light, clean, modern (like AppyParking)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
      maxZoom:19,
      subdomains:'abcd',
    }).addTo(map)

    L.control.zoom({position:'bottomright'}).addTo(map)

    // User location blue dot
    const userIcon=L.divIcon({
      html:`<div style="position:relative;width:22px;height:22px">
        <div style="position:absolute;inset:0;background:rgba(66,133,244,.22);border-radius:50%;animation:ul 2s ease infinite"></div>
        <div style="position:absolute;inset:5px;background:#4285f4;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(66,133,244,.7)"></div>
      </div><style>@keyframes ul{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(2.2);opacity:0}}</style>`,
      iconSize:[22,22],iconAnchor:[11,11],className:'',
    })
    layersRef.current.user=L.marker([center.lat,center.lng],{icon:userIcon,zIndexOffset:3000}).addTo(map)
    mapRef.current=map

    map.on('moveend',()=>{
      clearTimeout(moveTimer.current)
      moveTimer.current=setTimeout(()=>{
        const b=map.getBounds()
        onMapMove&&onMapMove({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()})
      },500)
    })

    setTimeout(()=>{
      if(!map)return
      map.invalidateSize()
      const b=map.getBounds()
      onMapMove&&onMapMove({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()})
    },400)

    return()=>{map.remove();mapRef.current=null}
  },[])

  // Update user dot
  useEffect(()=>{
    if(!mapRef.current||!layersRef.current.user)return
    layersRef.current.user.setLatLng([center.lat,center.lng])
  },[center.lat,center.lng])

  // Pan on center change
  const prevC=useRef(null)
  useEffect(()=>{
    if(!mapRef.current)return
    if(prevC.current?.lat===center.lat&&prevC.current?.lng===center.lng)return
    prevC.current=center
    mapRef.current.setView([center.lat,center.lng],zoom||mapRef.current.getZoom(),{animate:true})
  },[center.lat,center.lng,zoom])

  // Draw parking segments with AppyParking-style bay visuals
  useEffect(()=>{
    if(!mapRef.current||typeof window==='undefined')return
    const L=require('leaflet')
    layersRef.current.segs.forEach(l=>l.remove())
    layersRef.current.bayMarkers.forEach(l=>l.remove())
    layersRef.current.segs=[]
    layersRef.current.bayMarkers=[]
    if(!showSegments||!segments)return

    segments.forEach(seg=>{
      const isRestricted=seg.type==='restricted'||seg.type==='loading'
      const segColor=seg.color||'#2ECC71'
      const fillColor=segColor+'33' // 20% opacity fill

      // Main colored outline (thick polyline to simulate bay rectangle border)
      const outline=L.polyline(seg.coords,{
        color:segColor,weight:isRestricted?4:8,opacity:.8,
        lineCap:'butt',lineJoin:'round',
        ...(isRestricted?{dashArray:'6 4'}:{})
      }).addTo(mapRef.current).on('click',()=>onSegmentClick&&onSegmentClick(seg))

      // Lighter fill strip inside (thinner, lighter)
      const fill=L.polyline(seg.coords,{
        color:fillColor,weight:isRestricted?2:5,opacity:1,
        lineCap:'butt',
      }).addTo(mapRef.current).on('click',()=>onSegmentClick&&onSegmentClick(seg))

      // Wide invisible click area
      const hit=L.polyline(seg.coords,{color:'transparent',weight:20,opacity:0})
        .addTo(mapRef.current).on('click',()=>onSegmentClick&&onSegmentClick(seg))

      layersRef.current.segs.push(outline,fill,hit)

      // Bay markers (checkmark circles or prohibited circles) at intervals
      if(!isRestricted){
        const pts=bayPositions(seg.coords,.00020)
        pts.forEach((pt,j)=>{
          const markerIcon=L.divIcon({
            html:seg.type==='free'||seg.type==='permit'
              ?`<div style="width:20px;height:20px;background:${segColor};border-radius:50%;border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;cursor:pointer"><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
              :`<div style="width:20px;height:20px;background:${segColor};border-radius:50%;border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;cursor:pointer"><svg width="10" height="10" viewBox="0 0 10 10"><text x="5" y="9" text-anchor="middle" font-size="10" fill="white">£</text></svg></div>`,
            iconSize:[20,20],iconAnchor:[10,10],className:'',
          })
          const m=L.marker(pt,{icon:markerIcon,zIndexOffset:100})
            .addTo(mapRef.current).on('click',()=>onSegmentClick&&onSegmentClick(seg))
          layersRef.current.bayMarkers.push(m)
        })
      }else{
        // Restricted: prohibited circles
        const pts=bayPositions(seg.coords,.00025)
        pts.forEach(pt=>{
          const icon=L.divIcon({
            html:`<div style="width:20px;height:20px;background:#888;border-radius:50%;border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;cursor:pointer"><svg width="11" height="11" viewBox="0 0 11 11"><circle cx="5.5" cy="5.5" r="4.5" stroke="white" stroke-width="1.5" fill="none"/><line x1="2" y1="9" x2="9" y2="2" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg></div>`,
            iconSize:[20,20],iconAnchor:[10,10],className:'',
          })
          const m=L.marker(pt,{icon,zIndexOffset:100})
            .addTo(mapRef.current).on('click',()=>onSegmentClick&&onSegmentClick(seg))
          layersRef.current.bayMarkers.push(m)
        })
      }
    })
  },[segments,showSegments])

  // Draw car park markers — blue P square
  useEffect(()=>{
    if(!mapRef.current||typeof window==='undefined')return
    const L=require('leaflet')
    layersRef.current.cps.forEach(l=>l.remove())
    layersRef.current.cps=[]
    if(!showCarParks||!carParks)return

    carParks.forEach(cp=>{
      const icon=L.divIcon({
        html:`<div style="width:34px;height:34px;background:${cp.free?'#2a5fba':'#2a5fba'};border-radius:6px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.3);cursor:pointer;border:2px solid white"><span style="color:white;font-size:18px;font-weight:900;line-height:1">P</span></div>`,
        iconSize:[34,34],iconAnchor:[17,34],className:'',
      })
      const m=L.marker([cp.lat,cp.lng],{icon,zIndexOffset:500})
        .addTo(mapRef.current).on('click',()=>onCarParkClick&&onCarParkClick(cp))
      layersRef.current.cps.push(m)
    })
  },[carParks,showCarParks])

  // Draw offer bubbles
  useEffect(()=>{
    if(!mapRef.current||typeof window==='undefined')return
    const L=require('leaflet')
    layersRef.current.offers.forEach(l=>l.remove())
    layersRef.current.offers=[]
    if(!showOffers||!offers)return

    offers.forEach(o=>{
      if(!o.lat||!o.lng)return
      const label=(o.shortLabel||o.title||'').slice(0,24)
      const icon=L.divIcon({
        html:`<div style="position:relative;cursor:pointer">
          <div style="background:#ff681f;color:white;border-radius:18px;padding:5px 12px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 3px 12px rgba(255,104,31,.55);border:2px solid rgba(255,255,255,.35);font-family:Arial,sans-serif;line-height:1.2;display:inline-block">${label}</div>
          <div style="position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #ff681f"></div>
        </div>`,
        iconSize:[150,34],iconAnchor:[75,40],className:'',
      })
      const m=L.marker([o.lat,o.lng],{icon,zIndexOffset:200})
        .addTo(mapRef.current).on('click',()=>onOfferClick&&onOfferClick(o))
      layersRef.current.offers.push(m)
    })
  },[offers,showOffers])

  // Draw POI places
  useEffect(()=>{
    if(!mapRef.current||typeof window==='undefined')return
    const L=require('leaflet')
    layersRef.current.places.forEach(l=>l.remove())
    layersRef.current.places=[]
    if(!showPlaces||!places)return

    places.slice(0,100).forEach(p=>{
      const icon=L.divIcon({
        html:`<div style="background:white;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;padding:4px 8px;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);white-space:nowrap">${p.icon}</div>`,
        iconSize:[36,32],iconAnchor:[18,16],className:'',
      })
      L.marker([p.lat,p.lng],{icon})
        .addTo(mapRef.current)
        .bindPopup(`<div style="color:#fff;padding:6px 2px;min-width:140px"><b style="font-size:13px">${p.name}</b>${p.address?`<br><span style="color:rgba(255,255,255,.5);font-size:11px">${p.address}</span>`:''}</div>`)
    })
  },[places,showPlaces])

  return<div ref={ref} style={{position:'absolute',inset:0}} />
}
