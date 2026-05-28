'use client'
import{useEffect,useRef}from'react'

function loadGoogleMaps(apiKey){
  return new Promise((resolve,reject)=>{
    if(typeof window==='undefined')return reject(new Error('No window'))
    if(window.google?.maps)return resolve(window.google.maps)
    const existing=document.getElementById('gmaps-script')
    if(existing){
      existing.addEventListener('load',()=>resolve(window.google.maps))
      existing.addEventListener('error',()=>reject(new Error('Failed to load Google Maps script')))
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

export default function GoogleMap({apiKey,center,zoom=15,segments=[],offers=[],places=[],onSegmentClick,onOfferClick,onMapMove}){
  const containerRef=useRef(null)
  const mapRef=useRef(null)
  const overlaysRef=useRef([])

  useEffect(()=>{
    if(!apiKey||!containerRef.current||mapRef.current)return
    loadGoogleMaps(apiKey).then((maps)=>{
      const map=new maps.Map(containerRef.current,{center,zoom,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'greedy'})
      mapRef.current=map
      map.addListener('idle',()=>{
        const b=map.getBounds()
        if(!b)return
        const ne=b.getNorthEast()
        const sw=b.getSouthWest()
        onMapMove&&onMapMove({south:sw.lat(),west:sw.lng(),north:ne.lat(),east:ne.lng()})
      })
    }).catch(()=>{})
  },[apiKey])

  useEffect(()=>{
    const map=mapRef.current
    if(!map||!window.google?.maps)return
    overlaysRef.current.forEach(o=>o.setMap?.(null))
    overlaysRef.current=[]
    const maps=window.google.maps

    segments.forEach(seg=>{
      if(!seg.coords?.length)return
      const path=seg.coords.map(([lat,lng])=>({lat,lng}))
      const line=new maps.Polyline({path,strokeColor:seg.color||'#2ECC71',strokeOpacity:0.95,strokeWeight:5,map})
      line.addListener('click',()=>onSegmentClick&&onSegmentClick(seg))
      overlaysRef.current.push(line)
    })

    places.forEach(place=>{
      if(!place.lat||!place.lng)return
      const marker=new maps.Marker({position:{lat:place.lat,lng:place.lng},map,title:place.name,icon:{path:maps.SymbolPath.CIRCLE,scale:5,fillColor:'#3b82f6',fillOpacity:0.9,strokeColor:'#ffffff',strokeWeight:1}})
      overlaysRef.current.push(marker)
    })

    offers.forEach(offer=>{
      if(!offer.lat||!offer.lng)return
      const marker=new maps.Marker({position:{lat:offer.lat,lng:offer.lng},map,title:offer.title||'Offer',icon:{path:maps.SymbolPath.CIRCLE,scale:7,fillColor:'#ff681f',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:2}})
      marker.addListener('click',()=>onOfferClick&&onOfferClick(offer))
      overlaysRef.current.push(marker)
    })
  },[segments,offers,places,onSegmentClick,onOfferClick])

  useEffect(()=>{
    const map=mapRef.current
    if(!map)return
    map.setCenter(center)
    map.setZoom(zoom)
  },[center,zoom])

  return <div ref={containerRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
}
