'use client'
import{useEffect,useRef}from'react'

export default function MapLibreMap({center,zoom=15,segments=[],offers=[],onSegmentClick,onOfferClick,onMapMove}){
  const containerRef=useRef(null)
  const mapRef=useRef(null)
  const markersRef=useRef([])
  const userMarkerRef=useRef(null)
  const moveTimerRef=useRef(null)
  const initRef=useRef(false)

  useEffect(()=>{
    if(initRef.current||!containerRef.current)return
    initRef.current=true

    import('maplibre-gl').then(({default:ml})=>{
      const map=new ml.Map({
        container:containerRef.current,
        style:'https://tiles.openfreemap.org/styles/liberty',
        center:[center.lng,center.lat],
        zoom,
        maxZoom:20,minZoom:5,
        attributionControl:false,
      })

      map.on('load',()=>{
        // ── Parking line source ──────────────────────────
        map.addSource('parking',{type:'geojson',data:{type:'FeatureCollection',features:[]}})

        // Thick colored line for each bay segment
        map.addLayer({
          id:'parking-lines-bg',
          type:'line',
          source:'parking',
          layout:{'line-cap':'round','line-join':'round'},
          paint:{
            'line-color':['get','color'],
            'line-width':['interpolate',['linear'],['zoom'],13,5,16,10,19,16],
            'line-opacity':0.5,
          }
        })
        map.addLayer({
          id:'parking-lines',
          type:'line',
          source:'parking',
          layout:{'line-cap':'round','line-join':'round'},
          paint:{
            'line-color':['get','color'],
            'line-width':['interpolate',['linear'],['zoom'],13,2,16,4,19,6],
            'line-opacity':1,
          }
        })

        // ── Bay icon markers source ──────────────────────
        map.addSource('bays',{type:'geojson',data:{type:'FeatureCollection',features:[]}})

        // Outer circle (large, colored)
        map.addLayer({
          id:'bay-circle-outer',
          type:'circle',
          source:'bays',
          minzoom:14,
          paint:{
            'circle-radius':['interpolate',['linear'],['zoom'],14,8,17,14,19,18],
            'circle-color':['get','color'],
            'circle-stroke-width':2,
            'circle-stroke-color':'white',
            'circle-opacity':1,
          }
        })

        // ── Segment click ────────────────────────────────
        map.on('click','parking-lines',e=>{
          const f=map.queryRenderedFeatures(e.point,{layers:['parking-lines','parking-lines-bg']})[0]
          if(f&&onSegmentClick){
            try{onSegmentClick(JSON.parse(f.properties.data))}catch{}
          }
        })
        map.on('click','bay-circle-outer',e=>{
          const f=e.features[0]
          if(f&&onSegmentClick){
            try{onSegmentClick(JSON.parse(f.properties.data))}catch{}
          }
        })
        map.on('mouseenter','parking-lines',()=>{map.getCanvas().style.cursor='pointer'})
        map.on('mouseleave','parking-lines',()=>{map.getCanvas().style.cursor=''})
        map.on('mouseenter','bay-circle-outer',()=>{map.getCanvas().style.cursor='pointer'})
        map.on('mouseleave','bay-circle-outer',()=>{map.getCanvas().style.cursor=''})

        // ── User dot ─────────────────────────────────────
        const el=document.createElement('div')
        el.className='user-dot'
        el.innerHTML='<div class="user-dot-pulse"></div><div class="user-dot-inner"></div>'
        userMarkerRef.current=new ml.Marker({element:el,anchor:'center'})
          .setLngLat([center.lng,center.lat]).addTo(map)

        // Initial bounds
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

  // User dot position
  useEffect(()=>{
    userMarkerRef.current?.setLngLat([center.lng,center.lat])
  },[center.lat,center.lng])

  // Pan
  const prevC=useRef(null)
  useEffect(()=>{
    const map=mapRef.current
    if(!map)return
    if(prevC.current?.lat===center.lat&&prevC.current?.lng===center.lng)return
    prevC.current=center
    map.easeTo({center:[center.lng,center.lat],zoom,duration:600})
  },[center.lat,center.lng,zoom])

  // Segments
  useEffect(()=>{
    const map=mapRef.current
    if(!map||!map.isStyleLoaded())return
    if(!map.getSource('parking'))return

    const lineFeatures=[]
    const bayFeatures=[]

    segments.forEach(seg=>{
      if(!seg.coords?.length)return

      // Car park as single circle
      if(seg.isCarPark){
        const lat=seg.lat||seg.coords[0]?.[0]
        const lng=seg.lng||seg.coords[0]?.[1]
        if(lat&&lng){
          bayFeatures.push({
            type:'Feature',
            geometry:{type:'Point',coordinates:[lng,lat]},
            properties:{color:seg.color,data:JSON.stringify(seg),icon:'P'},
          })
        }
        return
      }

      if(seg.coords.length<2)return

      // Line for the segment
      lineFeatures.push({
        type:'Feature',
        geometry:{type:'LineString',coordinates:seg.coords.map(([lat,lng])=>[lng,lat])},
        properties:{color:seg.color,type:seg.type,data:JSON.stringify(seg)},
      })

      // Bay circles at intervals (every 2 points)
      const icon=seg.type==='free'?'✓':seg.type==='paid'?'£':seg.type==='permit'?'P':'⊘'
      for(let i=0;i<seg.coords.length;i+=Math.max(1,Math.floor(seg.coords.length/3))){
        const[lat,lng]=seg.coords[i]
        bayFeatures.push({
          type:'Feature',
          geometry:{type:'Point',coordinates:[lng,lat]},
          properties:{color:seg.color,data:JSON.stringify(seg),icon},
        })
      }
    })

    map.getSource('parking').setData({type:'FeatureCollection',features:lineFeatures})
    if(map.getSource('bays'))
      map.getSource('bays').setData({type:'FeatureCollection',features:bayFeatures})
  },[segments])

  // Offer markers
  useEffect(()=>{
    const map=mapRef.current
    if(!map)return
    markersRef.current.forEach(m=>m.remove())
    markersRef.current=[]

    import('maplibre-gl').then(({default:ml})=>{
      offers.forEach(offer=>{
        if(!offer.lat||!offer.lng)return
        const el=document.createElement('div')
        el.className='offer-bubble-wrap'
        el.innerHTML=`<div class="offer-bubble">${offer.shortLabel||offer.title||'Offer'}</div>`
        el.addEventListener('click',()=>onOfferClick&&onOfferClick(offer))
        const marker=new ml.Marker({element:el,anchor:'bottom'})
          .setLngLat([offer.lng,offer.lat]).addTo(map)
        markersRef.current.push(marker)
      })
    })
  },[offers])

  return(
    <div ref={containerRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
  )
}
