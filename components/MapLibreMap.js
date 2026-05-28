'use client'
import{useEffect,useRef}from'react'

const MAP_STYLE_URL='https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

function pointForItem(item){
  if(item?.lat&&item?.lng)return[item.lng,item.lat]
  const coords=item?.coords||[]
  if(!coords.length)return null
  const mid=coords[Math.floor(coords.length/2)]||coords[0]
  return[mid[1],mid[0]]
}
function parkingLabel(seg){
  if(seg.isCarPark)return'P'
  if(seg.type==='free')return'✓'
  if(seg.type==='paid')return'£'
  if(seg.type==='restricted'||seg.type==='no_parking')return'!'
  return'?'
}
function shouldDrawGeometry(seg){
  return seg?.reliableGeometry===true&&(seg.source==='official'||seg.confidence==='official')&&seg.coords?.length>1
}

export default function MapLibreMap({center,zoom=15,segments=[],offers=[],onSegmentClick,onOfferClick,onMapMove}){
  const containerRef=useRef(null)
  const mapRef=useRef(null)
  const markersRef=useRef([])
  const userMarkerRef=useRef(null)
  const moveTimerRef=useRef(null)

  useEffect(()=>{
    if(!containerRef.current||mapRef.current)return
    import('maplibre-gl').then(({default:ml})=>{
      const map=new ml.Map({container:containerRef.current,style:MAP_STYLE_URL,center:[center.lng,center.lat],zoom,maxZoom:20,minZoom:5,attributionControl:false})
      map.on('load',()=>{
        map.addSource('parking-lines',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
        map.addLayer({id:'verified-parking-lines',type:'line',source:'parking-lines',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','color'],'line-width':5,'line-opacity':.95}})
        map.on('click','verified-parking-lines',e=>{
          const f=e.features?.[0]
          if(f&&onSegmentClick){try{onSegmentClick(JSON.parse(f.properties.data))}catch{}}
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
          const b=map.getBounds()
          onMapMove&&onMapMove({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()})
        },500)
      })
    })
  },[])

  useEffect(()=>{userMarkerRef.current?.setLngLat([center.lng,center.lat])},[center.lat,center.lng])
  useEffect(()=>{mapRef.current?.easeTo({center:[center.lng,center.lat],zoom,duration:450})},[center.lat,center.lng,zoom])

  useEffect(()=>{
    const map=mapRef.current
    if(!map)return
    markersRef.current.forEach(m=>m.remove())
    markersRef.current=[]
    import('maplibre-gl').then(({default:ml})=>{
      const lineFeatures=[]
      segments.forEach(seg=>{
        if(shouldDrawGeometry(seg))lineFeatures.push({type:'Feature',geometry:{type:'LineString',coordinates:seg.coords.map(([lat,lng])=>[lng,lat])},properties:{color:seg.color||'#2563EB',data:JSON.stringify(seg)}})
        const p=pointForItem(seg)
        if(!p)return
        const el=document.createElement('button')
        el.type='button'
        el.className=`parking-marker ${seg.type==='free'?'free':seg.type==='restricted'||seg.type==='no_parking'?'warn':'blue'}`
        el.textContent=parkingLabel(seg)
        el.addEventListener('click',()=>onSegmentClick&&onSegmentClick(seg))
        markersRef.current.push(new ml.Marker({element:el,anchor:'center'}).setLngLat(p).addTo(map))
      })
      map.getSource('parking-lines')?.setData({type:'FeatureCollection',features:lineFeatures})
      offers.forEach(offer=>{
        const p=pointForItem(offer)
        if(!p)return
        const el=document.createElement('button')
        el.type='button'
        el.className='offer-map-pin'
        el.textContent=offer.shortLabel||offer.discount||'Offer'
        el.addEventListener('click',()=>onOfferClick&&onOfferClick(offer))
        markersRef.current.push(new ml.Marker({element:el,anchor:'bottom'}).setLngLat(p).addTo(map))
      })
    })
  },[segments,offers,onSegmentClick,onOfferClick])

  return <div ref={containerRef} className="map-canvas"/>
}
