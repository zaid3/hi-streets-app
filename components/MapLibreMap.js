'use client'
import{useEffect,useRef,useCallback}from'react'

export default function MapLibreMap({
  center,zoom=15,
  segments=[],offers=[],
  onSegmentClick,onOfferClick,onMapMove,
  showSegments=true,showOffers=true,
}){
  const containerRef=useRef(null)
  const mapRef=useRef(null)
  const markersRef=useRef([])
  const userMarkerRef=useRef(null)
  const moveTimerRef=useRef(null)
  const initRef=useRef(false)

  // Init map once
  useEffect(()=>{
    if(initRef.current||!containerRef.current)return
    initRef.current=true

    import('maplibre-gl').then(({default:maplibregl})=>{
      const map=new maplibregl.Map({
        container:containerRef.current,
        // OpenFreeMap — completely free, no API key
        style:'https://tiles.openfreemap.org/styles/liberty',
        center:[center.lng,center.lat],
        zoom,
        maxZoom:19,
        minZoom:5,
        attributionControl:false,
        logoPosition:'bottom-left',
      })

      map.on('load',()=>{
        // Parking segments source + layer
        map.addSource('parking',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
        map.addLayer({
          id:'parking-lines',
          type:'line',
          source:'parking',
          layout:{'line-cap':'round','line-join':'round'},
          paint:{
            'line-color':['get','color'],
            'line-width':['interpolate',['linear'],['zoom'],13,3,16,7,19,10],
            'line-opacity':0.88,
          }
        })
        // Bay indicator circles
        map.addSource('bays',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
        map.addLayer({
          id:'bay-circles',
          type:'circle',
          source:'bays',
          paint:{
            'circle-radius':['interpolate',['linear'],['zoom'],14,4,17,8],
            'circle-color':['get','color'],
            'circle-stroke-width':1.5,
            'circle-stroke-color':'white',
            'circle-opacity':0.9,
          }
        })

        // Segment click
        map.on('click','parking-lines',e=>{
          const f=e.features[0]
          if(f&&onSegmentClick)onSegmentClick(JSON.parse(f.properties.data))
        })
        map.on('mouseenter','parking-lines',()=>{map.getCanvas().style.cursor='pointer'})
        map.on('mouseleave','parking-lines',()=>{map.getCanvas().style.cursor=''})

        // User location dot
        const el=document.createElement('div')
        el.className='user-dot'
        el.innerHTML='<div class="user-dot-pulse"></div><div class="user-dot-inner"></div>'
        userMarkerRef.current=new maplibregl.Marker({element:el,anchor:'center'})
          .setLngLat([center.lng,center.lat])
          .addTo(map)

        // Fire initial bounds
        const b=map.getBounds()
        onMapMove&&onMapMove({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()})

        mapRef.current=map
      })

      map.on('moveend',()=>{
        clearTimeout(moveTimerRef.current)
        moveTimerRef.current=setTimeout(()=>{
          if(!map)return
          const b=map.getBounds()
          onMapMove&&onMapMove({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()})
        },600)
      })

      return()=>{
        clearTimeout(moveTimerRef.current)
        markersRef.current.forEach(m=>m.remove())
        map.remove()
        mapRef.current=null
        initRef.current=false
      }
    })
  },[])

  // Update user dot position
  useEffect(()=>{
    if(userMarkerRef.current)
      userMarkerRef.current.setLngLat([center.lng,center.lat])
  },[center.lat,center.lng])

  // Pan to new center
  const prevCenter=useRef(null)
  useEffect(()=>{
    const map=mapRef.current
    if(!map)return
    if(prevCenter.current?.lat===center.lat&&prevCenter.current?.lng===center.lng)return
    prevCenter.current=center
    map.easeTo({center:[center.lng,center.lat],zoom,duration:600})
  },[center.lat,center.lng,zoom])

  // Update parking segments
  useEffect(()=>{
    const map=mapRef.current
    if(!map||!map.isStyleLoaded()||!map.getSource('parking'))return

    const lineFeatures=[]
    const bayFeatures=[]

    segments.forEach(seg=>{
      if(!seg.coords?.length)return
      if(seg.isCarPark&&seg.lat){
        // Car park as circle bay
        bayFeatures.push({
          type:'Feature',
          geometry:{type:'Point',coordinates:[seg.lng||seg.coords[0]?.[1],seg.lat||seg.coords[0]?.[0]]},
          properties:{color:seg.color,data:JSON.stringify(seg),label:'P'},
        })
        return
      }
      if(seg.coords.length<2)return
      lineFeatures.push({
        type:'Feature',
        geometry:{type:'LineString',coordinates:seg.coords.map(([lat,lng])=>[lng,lat])},
        properties:{color:seg.color,type:seg.type,data:JSON.stringify(seg)},
      })
      // Place bay circles every ~200m along segment
      for(let i=0;i<seg.coords.length-1;i+=2){
        const[lat,lng]=seg.coords[i]
        bayFeatures.push({
          type:'Feature',
          geometry:{type:'Point',coordinates:[lng,lat]},
          properties:{color:seg.color,data:JSON.stringify(seg)},
        })
      }
    })

    map.getSource('parking').setData({type:'FeatureCollection',features:lineFeatures})
    if(map.getSource('bays'))
      map.getSource('bays').setData({type:'FeatureCollection',features:bayFeatures})
  },[segments])

  // Update offer markers
  useEffect(()=>{
    const map=mapRef.current
    if(!map)return

    // Remove old offer markers
    markersRef.current.forEach(m=>m.remove())
    markersRef.current=[]

    import('maplibre-gl').then(({default:maplibregl})=>{
      offers.forEach(offer=>{
        if(!offer.lat||!offer.lng)return
        const el=document.createElement('div')
        el.className='offer-bubble-wrap'
        el.innerHTML=`<div class="offer-bubble">${offer.shortLabel||offer.title||'Offer'}</div>`
        el.addEventListener('click',()=>onOfferClick&&onOfferClick(offer))

        const marker=new maplibregl.Marker({element:el,anchor:'bottom'})
          .setLngLat([offer.lng,offer.lat])
          .addTo(map)
        markersRef.current.push(marker)
      })
    })
  },[offers])

  return(
    <div
      ref={containerRef}
      style={{position:'absolute',inset:0,width:'100%',height:'100%'}}
    />
  )
}
