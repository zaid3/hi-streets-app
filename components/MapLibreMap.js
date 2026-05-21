'use client'
import{useEffect,useRef}from'react'

const MAP_STYLE_URL='https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

export default function MapLibreMap({center,zoom=15,segments=[],offers=[],places=[],onSegmentClick,onOfferClick,onMapMove}){
  const containerRef=useRef(null)
  const mapRef=useRef(null)
  const markersRef=useRef([])
  const placesRef=useRef([])
  const userMarkerRef=useRef(null)
  const moveTimerRef=useRef(null)
  const initRef=useRef(false)

  useEffect(()=>{
    if(initRef.current||!containerRef.current)return
    initRef.current=true

    import('maplibre-gl').then(({default:ml})=>{
      const map=new ml.Map({container:containerRef.current,style:MAP_STYLE_URL,center:[center.lng,center.lat],zoom,maxZoom:20,minZoom:5,attributionControl:false})
      map.on('load',()=>{
        map.addSource('parking',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
        map.addSource('bays',{type:'geojson',data:{type:'FeatureCollection',features:[]}})

        map.addLayer({id:'parking-casing',type:'line',source:'parking',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],13,4,16,8,19,12],'line-opacity':0.85}})
        map.addLayer({id:'parking-lines-left',type:'line',source:'parking',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],13,1.6,16,2.4,19,3.5],'line-offset':['interpolate',['linear'],['zoom'],13,-2,16,-4,19,-7],'line-opacity':0.95}})
        map.addLayer({id:'parking-lines-right',type:'line',source:'parking',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],13,1.6,16,2.4,19,3.5],'line-offset':['interpolate',['linear'],['zoom'],13,2,16,4,19,7],'line-opacity':0.95}})
        map.addLayer({id:'bay-circle-outer',type:'circle',source:'bays',minzoom:14,paint:{'circle-radius':['interpolate',['linear'],['zoom'],14,7,17,11,19,13],'circle-color':['get','color'],'circle-stroke-width':2,'circle-stroke-color':'white','circle-opacity':1}})

        ;['parking-lines-left','parking-lines-right','bay-circle-outer'].forEach(layer=>{
          map.on('click',layer,e=>{
            const f=e.features?.[0]||map.queryRenderedFeatures(e.point,{layers:[layer]})[0]
            if(f&&onSegmentClick){try{onSegmentClick(JSON.parse(f.properties.data))}catch{}}
          })
          map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer'})
          map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor=''})
        })

        const el=document.createElement('div')
        el.className='user-dot'
        el.innerHTML='<div class="user-dot-pulse"></div><div class="user-dot-inner"></div>'
        userMarkerRef.current=new ml.Marker({element:el,anchor:'center'}).setLngLat([center.lng,center.lat]).addTo(map)

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
        },500)
      })
    })
  },[])

  useEffect(()=>{userMarkerRef.current?.setLngLat([center.lng,center.lat])},[center.lat,center.lng])

  const prevC=useRef(null)
  useEffect(()=>{
    const map=mapRef.current
    if(!map)return
    if(prevC.current?.lat===center.lat&&prevC.current?.lng===center.lng)return
    prevC.current=center
    map.easeTo({center:[center.lng,center.lat],zoom,duration:500})
  },[center.lat,center.lng,zoom])

  useEffect(()=>{
    const map=mapRef.current
    if(!map||!map.isStyleLoaded()||!map.getSource('parking'))return
    const lineFeatures=[]
    const bayFeatures=[]

    segments.forEach(seg=>{
      if(!seg.coords?.length)return
      if(seg.isCarPark){
        const lat=seg.lat||seg.coords[0]?.[0]
        const lng=seg.lng||seg.coords[0]?.[1]
        if(lat&&lng)bayFeatures.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{color:seg.color,data:JSON.stringify(seg)}})
        return
      }
      if(seg.coords.length<2)return
      lineFeatures.push({type:'Feature',geometry:{type:'LineString',coordinates:seg.coords.map(([lat,lng])=>[lng,lat])},properties:{color:seg.color,data:JSON.stringify(seg)}})
      for(let i=0;i<seg.coords.length;i+=Math.max(2,Math.floor(seg.coords.length/4))){
        const[lat,lng]=seg.coords[i]
        bayFeatures.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{color:seg.color,data:JSON.stringify(seg)}})
      }
    })

    map.getSource('parking').setData({type:'FeatureCollection',features:lineFeatures})
    map.getSource('bays')?.setData({type:'FeatureCollection',features:bayFeatures})
  },[segments])

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
        const marker=new ml.Marker({element:el,anchor:'bottom'}).setLngLat([offer.lng,offer.lat]).addTo(map)
        markersRef.current.push(marker)
      })
    })
  },[offers])



  useEffect(()=>{
    const map=mapRef.current
    if(!map)return
    placesRef.current.forEach(m=>m.remove())
    placesRef.current=[]

    import('maplibre-gl').then(({default:ml})=>{
      places.forEach(place=>{
        if(!place.lat||!place.lng)return
        const el=document.createElement('div')
        el.className='poi-chip'
        el.textContent=place.name
        el.title=place.category
        const marker=new ml.Marker({element:el,anchor:'bottom'}).setLngLat([place.lng,place.lat]).addTo(map)
        placesRef.current.push(marker)
      })
    })
  },[places])

  return <div ref={containerRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
}
