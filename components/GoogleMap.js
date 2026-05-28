'use client'
import{useEffect,useRef,useState}from'react'

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

function pointForItem(item){
  if(item?.lat&&item?.lng)return{lat:item.lat,lng:item.lng}
  const coords=item?.coords||[]
  if(!coords.length)return null
  const mid=coords[Math.floor(coords.length/2)]||coords[0]
  return{lat:mid[0],lng:mid[1]}
}

function parkingStyle(seg){
  const type=seg.isCarPark?'carpark':seg.type
  if(type==='free')return{label:'Free',short:'✓',color:'#16A34A'}
  if(type==='paid'||type==='carpark')return{label:type==='carpark'?'Car park':'Paid',short:type==='carpark'?'P':'£',color:'#2563EB'}
  if(type==='restricted'||type==='no_parking')return{label:'Check',short:'!',color:'#DC2626'}
  return{label:'Check',short:'?',color:'#64748B'}
}

function shouldDrawGeometry(seg){
  return seg?.reliableGeometry===true&&(seg.source==='official'||seg.confidence==='official')&&seg.coords?.length>1
}

export default function GoogleMap({apiKey,center,zoom=15,segments=[],offers=[],onSegmentClick,onOfferClick,onMapMove}){
  const containerRef=useRef(null)
  const mapRef=useRef(null)
  const overlaysRef=useRef([])
  const userMarkerRef=useRef(null)
  const[mapReady,setMapReady]=useState(false)

  useEffect(()=>{
    if(!apiKey||!containerRef.current||mapRef.current)return
    loadGoogleMaps(apiKey).then((maps)=>{
      const map=new maps.Map(containerRef.current,{
        center,
        zoom,
        mapTypeControl:false,
        streetViewControl:false,
        fullscreenControl:false,
        clickableIcons:true,
        gestureHandling:'greedy',
        styles:[
          {featureType:'poi.business',stylers:[{visibility:'on'}]},
          {featureType:'transit.station',stylers:[{visibility:'on'}]},
        ],
      })
      mapRef.current=map
      userMarkerRef.current=new maps.Marker({
        position:center,
        map,
        title:'Current search area',
        zIndex:70,
        icon:{path:maps.SymbolPath.CIRCLE,scale:7,fillColor:'#2563EB',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3},
      })
      map.addListener('idle',()=>{
        const b=map.getBounds()
        if(!b)return
        const ne=b.getNorthEast()
        const sw=b.getSouthWest()
        onMapMove&&onMapMove({south:sw.lat(),west:sw.lng(),north:ne.lat(),east:ne.lng()})
      })
      setMapReady(true)
    }).catch((error)=>console.error('Google Maps failed to load',error))
  },[apiKey])

  useEffect(()=>{
    const map=mapRef.current
    if(!mapReady||!map||!window.google?.maps)return
    overlaysRef.current.forEach(o=>o.setMap?.(null))
    overlaysRef.current=[]
    const maps=window.google.maps

    segments.forEach(seg=>{
      const point=pointForItem(seg)
      if(!point)return
      if(shouldDrawGeometry(seg)){
        const line=new maps.Polyline({
          path:seg.coords.map(([lat,lng])=>({lat,lng})),
          strokeColor:seg.color||'#2563EB',
          strokeOpacity:.95,
          strokeWeight:5,
          map,
          zIndex:20,
        })
        line.addListener('click',()=>onSegmentClick&&onSegmentClick(seg))
        overlaysRef.current.push(line)
      }
      const style=parkingStyle(seg)
      const marker=new maps.Marker({
        position:point,
        map,
        title:seg.name||'Parking guidance',
        label:{text:style.short,color:'#ffffff',fontSize:'13px',fontWeight:'900'},
        zIndex:40,
        icon:{path:maps.SymbolPath.CIRCLE,scale:13,fillColor:style.color,fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3},
      })
      marker.addListener('click',()=>onSegmentClick&&onSegmentClick(seg))
      overlaysRef.current.push(marker)
    })

    offers.forEach(offer=>{
      const point=pointForItem(offer)
      if(!point)return
      const label=(offer.shortLabel||offer.discount||'Offer').slice(0,14)
      const marker=new maps.Marker({
        position:point,
        map,
        title:offer.businessName||offer.title||'Live offer',
        label:{text:label,color:'#ffffff',fontSize:'11px',fontWeight:'900'},
        zIndex:60,
        icon:{path:maps.SymbolPath.BACKWARD_CLOSED_ARROW,scale:8,fillColor:'#ff681f',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:2},
      })
      marker.addListener('click',()=>onOfferClick&&onOfferClick(offer))
      overlaysRef.current.push(marker)
    })
  },[mapReady,segments,offers,onSegmentClick,onOfferClick])

  useEffect(()=>{
    const map=mapRef.current
    if(!map)return
    map.setCenter(center)
    map.setZoom(zoom)
    userMarkerRef.current?.setPosition(center)
  },[center,zoom])

  return <div ref={containerRef} className="map-canvas"/>
}
