'use client'
import{useEffect,useRef}from'react'

function metersPerDegreeLat(){return 111320}
function metersPerDegreeLng(lat){return 111320*Math.cos((lat*Math.PI)/180)}
function bayRectangles(coords,widthMeters=2.4){
  const polys=[]
  if(!coords||coords.length<2)return polys
  for(let i=0;i<coords.length-1;i++){
    const[aLat,aLng]=coords[i]
    const[bLat,bLng]=coords[i+1]
    const midLat=(aLat+bLat)/2
    const dx=(bLng-aLng)*metersPerDegreeLng(midLat)
    const dy=(bLat-aLat)*metersPerDegreeLat()
    const len=Math.hypot(dx,dy)
    if(len<3)continue
    const nx=-dy/len,ny=dx/len
    const oxLng=(nx*(widthMeters/2))/metersPerDegreeLng(midLat)
    const oxLat=(ny*(widthMeters/2))/metersPerDegreeLat()
    polys.push([[aLng+oxLng,aLat+oxLat],[bLng+oxLng,bLat+oxLat],[bLng-oxLng,bLat-oxLat],[aLng-oxLng,aLat-oxLat],[aLng+oxLng,aLat+oxLat]])
  }
  return polys
}

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
      const map=new ml.Map({container:containerRef.current,style:'https://tiles.openfreemap.org/styles/liberty',center:[center.lng,center.lat],zoom,maxZoom:20,minZoom:5,attributionControl:false})
      map.on('load',()=>{
        map.addSource('parking',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
        map.addSource('bay-polygons',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
        map.addSource('bays',{type:'geojson',data:{type:'FeatureCollection',features:[]}})

        map.addLayer({id:'bay-fill',type:'fill',source:'bay-polygons',minzoom:15,paint:{'fill-color':['get','color'],'fill-opacity':0.18}})
        map.addLayer({id:'bay-outline',type:'line',source:'bay-polygons',minzoom:15,paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],15,1.2,18,2],'line-opacity':0.95}})
        map.addLayer({id:'parking-lines',type:'line',source:'parking',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],13,1.4,16,2.4,19,3.2],'line-opacity':0.9}})
        map.addLayer({id:'bay-circle-outer',type:'circle',source:'bays',minzoom:14,paint:{'circle-radius':['interpolate',['linear'],['zoom'],14,8,17,12,19,14],'circle-color':['get','color'],'circle-stroke-width':2,'circle-stroke-color':'white','circle-opacity':1}})

        map.on('click','parking-lines',e=>{const f=map.queryRenderedFeatures(e.point,{layers:['parking-lines']})[0];if(f&&onSegmentClick){try{onSegmentClick(JSON.parse(f.properties.data))}catch{}}})
        map.on('click','bay-circle-outer',e=>{const f=e.features[0];if(f&&onSegmentClick){try{onSegmentClick(JSON.parse(f.properties.data))}catch{}}})
        map.on('click','bay-fill',e=>{const f=e.features[0];if(f&&onSegmentClick){try{onSegmentClick(JSON.parse(f.properties.data))}catch{}}})

        const el=document.createElement('div')
        el.className='user-dot'
        el.innerHTML='<div class="user-dot-pulse"></div><div class="user-dot-inner"></div>'
        userMarkerRef.current=new ml.Marker({element:el,anchor:'center'}).setLngLat([center.lng,center.lat]).addTo(map)

        const b=map.getBounds()
        onMapMove&&onMapMove({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()})
        mapRef.current=map
      })

      map.on('moveend',()=>{clearTimeout(moveTimerRef.current);moveTimerRef.current=setTimeout(()=>{if(!map)return;const b=map.getBounds();onMapMove&&onMapMove({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()})},500)})
    })
  },[])

  useEffect(()=>{userMarkerRef.current?.setLngLat([center.lng,center.lat])},[center.lat,center.lng])

  const prevC=useRef(null)
  useEffect(()=>{const map=mapRef.current;if(!map)return;if(prevC.current?.lat===center.lat&&prevC.current?.lng===center.lng)return;prevC.current=center;map.easeTo({center:[center.lng,center.lat],zoom,duration:500})},[center.lat,center.lng,zoom])

  useEffect(()=>{
    const map=mapRef.current
    if(!map||!map.isStyleLoaded()||!map.getSource('parking'))return
    const lineFeatures=[]
    const bayFeatures=[]
    const bayPolyFeatures=[]

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
      bayRectangles(seg.coords,2.3).forEach(poly=>bayPolyFeatures.push({type:'Feature',geometry:{type:'Polygon',coordinates:[poly]},properties:{color:seg.color,data:JSON.stringify(seg)}}))
      for(let i=0;i<seg.coords.length;i+=Math.max(2,Math.floor(seg.coords.length/3))){
        const[lat,lng]=seg.coords[i]
        bayFeatures.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{color:seg.color,data:JSON.stringify(seg)}})
      }
    })

    map.getSource('parking').setData({type:'FeatureCollection',features:lineFeatures})
    map.getSource('bay-polygons')?.setData({type:'FeatureCollection',features:bayPolyFeatures})
    map.getSource('bays')?.setData({type:'FeatureCollection',features:bayFeatures})
  },[segments])

  useEffect(()=>{const map=mapRef.current;if(!map)return;markersRef.current.forEach(m=>m.remove());markersRef.current=[];import('maplibre-gl').then(({default:ml})=>{offers.forEach(offer=>{if(!offer.lat||!offer.lng)return;const el=document.createElement('div');el.className='offer-bubble-wrap';el.innerHTML=`<div class="offer-bubble">${offer.shortLabel||offer.title||'Offer'}</div>`;el.addEventListener('click',()=>onOfferClick&&onOfferClick(offer));const marker=new ml.Marker({element:el,anchor:'bottom'}).setLngLat([offer.lng,offer.lat]).addTo(map);markersRef.current.push(marker)})})},[offers])

  return <div ref={containerRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
}
