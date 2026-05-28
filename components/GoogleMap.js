'use client'
import{useEffect,useRef}from'react'

function loadGoogleMaps(apiKey){
  return new Promise((resolve,reject)=>{
    if(typeof window==='undefined')return reject(new Error('No window'))
    if(window.google?.maps)return resolve(window.google.maps)
    const existing=document.getElementById('gmaps-script')
    if(existing){
      existing.addEventListener('load',()=>resolve(window.google.maps),{once:true})
      existing.addEventListener('error',()=>reject(new Error('Failed to load Google Maps script')),{once:true})
      return
    }
    const script=document.createElement('script')
    script.id='gmaps-script'
    script.src=`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async=true
    script.defer=true
    script.onload=()=>resolve(window.google.maps)
    script.onerror=()=>reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
}

function pointForSegment(seg){
  if(seg.lat&&seg.lng)return{lat:seg.lat,lng:seg.lng}
  const coords=seg.coords||[]
  if(!coords.length)return null
  const mid=coords[Math.floor(coords.length/2)]||coords[0]
  return{lat:mid[0],lng:mid[1]}
}

function parkingLabel(seg){
  if(seg.isCarPark)return'P'
  if(seg.type==='paid')return'£'
  if(seg.type==='disabled')return'♿'
  if(seg.type==='loading')return'L'
  if(seg.type==='resident'||seg.type==='permit')return'R'
  if(seg.type==='restricted'||seg.type==='no_parking')return'×'
  return'✓'
}

export default function GoogleMap({apiKey,center,zoom=15,segments=[],offers=[],places=[],onSegmentClick,onOfferClick,onMapMove}){
  const containerRef=useRef(null)
  const mapRef=useRef(null)
  const overlaysRef=useRef([])
  const userMarkerRef=useRef(null)

  useEffect(()=>{
    if(!apiKey||!containerRef.current||mapRef.current)return
    loadGoogleMaps(apiKey).then((maps)=>{
      const map=new maps.Map(containerRef.current,{
        center,
        zoom,
        mapTypeControl:false,
        streetViewControl:false,
        fullscreenControl:false,
        clickableIcons:false,
        gestureHandling:'greedy',
        styles:[
          {featureType:'poi.business',stylers:[{visibility:'on'}]},
          {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#dff2df'}]},
        ],
      })
      mapRef.current=map
      userMarkerRef.current=new maps.Marker({
        position:center,
        map,
        title:'Your location / search area',
        zIndex:50,
        icon:{path:maps.SymbolPath.CIRCLE,scale:8,fillColor:'#4285f4',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3},
      })
      map.addListener('idle',()=>{
        const b=map.getBounds()
        if(!b)return
        const ne=b.getNorthEast()
        const sw=b.getSouthWest()
        onMapMove&&onMapMove({south:sw.lat(),west:sw.lng(),north:ne.lat(),east:ne.lng()})
      })
    }).catch((error)=>console.error('Google Maps failed to load',error))
  },[apiKey])

  useEffect(()=>{
    const map=mapRef.current
    if(!map||!window.google?.maps)return
    overlaysRef.current.forEach(o=>o.setMap?.(null))
    overlaysRef.current=[]
    const maps=window.google.maps

    segments.forEach(seg=>{
      if(!seg.coords?.length)return
      if(!seg.isCarPark&&seg.coords.length>1){
        const path=seg.coords.map(([lat,lng])=>({lat,lng}))
        const line=new maps.Polyline({path,strokeColor:seg.color||'#2ECC71',strokeOpacity:0.98,strokeWeight:7,map,zIndex:10})
        line.addListener('click',()=>onSegmentClick&&onSegmentClick(seg))
        overlaysRef.current.push(line)
      }
      const point=pointForSegment(seg)
      if(!point)return
      const marker=new maps.Marker({
        position:point,
        map,
        title:seg.name||'Parking',
        label:{text:parkingLabel(seg),color:'#ffffff',fontSize:'13px',fontWeight:'800'},
        zIndex:30,
        icon:{path:maps.SymbolPath.CIRCLE,scale:seg.isCarPark?13:10,fillColor:seg.color||'#2a5fba',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3},
      })
      marker.addListener('click',()=>onSegmentClick&&onSegmentClick(seg))
      overlaysRef.current.push(marker)
    })

    places.forEach(place=>{
      if(!place.lat||!place.lng)return
      const marker=new maps.Marker({
        position:{lat:place.lat,lng:place.lng},
        map,
        title:place.name,
        label:{text:'•',color:'#ffffff',fontSize:'18px',fontWeight:'800'},
        zIndex:20,
        icon:{path:maps.SymbolPath.CIRCLE,scale:8,fillColor:'#111827',fillOpacity:0.92,strokeColor:'#ffffff',strokeWeight:2},
      })
      const info=new maps.InfoWindow({content:`<strong>${place.name}</strong><br/><span>${place.category||'Local place'}</span>`})
      marker.addListener('click',()=>info.open({anchor:marker,map}))
      overlaysRef.current.push(marker,info)
    })

    offers.forEach(offer=>{
      if(!offer.lat||!offer.lng)return
      const marker=new maps.Marker({
        position:{lat:offer.lat,lng:offer.lng},
        map,
        title:offer.title||offer.businessName||'Offer',
        label:{text:(offer.shortLabel||offer.discount||'Offer').slice(0,12),color:'#ffffff',fontSize:'11px',fontWeight:'800'},
        zIndex:40,
        icon:{path:maps.SymbolPath.BACKWARD_CLOSED_ARROW,scale:7,fillColor:'#ff681f',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:2},
      })
      marker.addListener('click',()=>onOfferClick&&onOfferClick(offer))
      overlaysRef.current.push(marker)
    })
  },[segments,offers,places,onSegmentClick,onOfferClick])

  useEffect(()=>{
    const map=mapRef.current
    if(!map)return
    map.setCenter(center)
    map.setZoom(zoom)
    userMarkerRef.current?.setPosition(center)
  },[center,zoom])

  return <div ref={containerRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
}
