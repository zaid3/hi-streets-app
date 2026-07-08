'use client'
import{useEffect,useRef}from'react'

const MAP_STYLE_URL='https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const GREEN='#078d16',BLUE='#0b73d9',GREY='#9d9da5',YELLOW='#f0c327',RED='#f05a5a',PURPLE='#8E44AD',ORANGE='#ff681f'
function controlledNow(){const d=new Date(),m=d.getHours()*60+d.getMinutes();return m>=8*60&&m<18*60+30}
function visual(seg){
  if(seg.isCarPark)return{color:BLUE,label:'P'}
  if(['restricted','no_parking','yellow_double','red_route'].includes(seg.type))return{color:GREY,label:'⊘'}
  if(seg.type==='yellow_single')return{color:controlledNow()?GREY:GREEN,label:controlledNow()?'⊘':'✓'}
  if(seg.type==='paid')return{color:controlledNow()?BLUE:GREEN,label:controlledNow()?'£':'✓'}
  if(seg.type==='resident'||seg.type==='permit')return{color:controlledNow()?GREEN:GREEN,label:'✓'}
  if(seg.type==='disabled')return{color:PURPLE,label:'♿'}
  if(seg.type==='ev')return{color:'#29c9b2',label:'⚡'}
  if(seg.type==='loading')return{color:ORANGE,label:'L'}
  return{color:GREEN,label:'✓'}
}
function point(seg){const p=seg.coords?.[Math.floor((seg.coords?.length||1)/2)]||seg.coords?.[0];return{lat:seg.lat||p?.[0],lng:seg.lng||p?.[1]}}

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
        map.addLayer({id:'parking-casing',type:'line',source:'parking',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],12,5,16,10,19,15],'line-opacity':.92}})
        map.addLayer({id:'parking-lines',type:'line',source:'parking',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],12,2.5,16,4.5,19,6.5],'line-opacity':.98}})
        map.addLayer({id:'bay-circle-shadow',type:'circle',source:'bays',minzoom:12,paint:{'circle-radius':['interpolate',['linear'],['zoom'],12,10,17,17,19,22],'circle-color':'#08340f','circle-opacity':.16,'circle-translate':[0,5]}})
        map.addLayer({id:'bay-circle-outer',type:'circle',source:'bays',minzoom:12,paint:{'circle-radius':['interpolate',['linear'],['zoom'],12,10,17,17,19,22],'circle-color':['get','color'],'circle-stroke-width':3,'circle-stroke-color':'#ffffff','circle-opacity':1}})
        map.addLayer({id:'bay-labels',type:'symbol',source:'bays',minzoom:12,layout:{'text-field':['get','label'],'text-size':['interpolate',['linear'],['zoom'],12,12,17,17,19,20],'text-font':['Open Sans Bold','Arial Unicode MS Bold'],'text-allow-overlap':true},paint:{'text-color':'#ffffff'}})
        ;['parking-lines','bay-circle-outer','bay-labels'].forEach(layer=>{
          map.on('click',layer,e=>{const f=e.features?.[0]||map.queryRenderedFeatures(e.point,{layers:[layer]})[0];if(f&&onSegmentClick){try{onSegmentClick(JSON.parse(f.properties.data))}catch{}}})
          map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer'})
          map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor=''})
        })
        const el=document.createElement('div')
        el.className='user-dot'
        el.innerHTML='<div class="user-dot-pulse"></div><div class="user-dot-inner"></div>'
        userMarkerRef.current=new ml.Marker({element:el,anchor:'center'}).setLngLat([center.lng,center.lat]).addTo(map)
        const b=map.getBounds();onMapMove?.({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()})
        mapRef.current=map
      })
      map.on('moveend',()=>{clearTimeout(moveTimerRef.current);moveTimerRef.current=setTimeout(()=>{const b=map.getBounds();onMapMove?.({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()})},500)})
    })
  },[])

  useEffect(()=>{userMarkerRef.current?.setLngLat([center.lng,center.lat])},[center.lat,center.lng])
  const prevC=useRef(null)
  useEffect(()=>{const map=mapRef.current;if(!map)return;if(prevC.current?.lat===center.lat&&prevC.current?.lng===center.lng)return;prevC.current=center;map.easeTo({center:[center.lng,center.lat],zoom,duration:500})},[center.lat,center.lng,zoom])

  useEffect(()=>{
    const map=mapRef.current
    if(!map||!map.isStyleLoaded()||!map.getSource('parking'))return
    const lineFeatures=[],bayFeatures=[]
    segments.forEach(seg=>{
      if(!seg.coords?.length)return
      const v=visual(seg)
      if(!seg.isCarPark&&seg.coords.length>1)lineFeatures.push({type:'Feature',geometry:{type:'LineString',coordinates:seg.coords.map(([lat,lng])=>[lng,lat])},properties:{color:v.color,data:JSON.stringify(seg)}})
      const p=point(seg)
      if(p.lat&&p.lng)bayFeatures.push({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{color:v.color,label:v.label,data:JSON.stringify(seg)}})
      if(!seg.isCarPark&&seg.coords.length>3){
        for(let i=0;i<seg.coords.length;i+=Math.max(3,Math.floor(seg.coords.length/3))){const[lat,lng]=seg.coords[i];bayFeatures.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{color:v.color,label:v.label,data:JSON.stringify(seg)}})}
      }
    })
    map.getSource('parking').setData({type:'FeatureCollection',features:lineFeatures})
    map.getSource('bays').setData({type:'FeatureCollection',features:bayFeatures})
  },[segments])

  useEffect(()=>{
    const map=mapRef.current;if(!map)return
    markersRef.current.forEach(m=>m.remove());markersRef.current=[]
    import('maplibre-gl').then(({default:ml})=>{offers.forEach(offer=>{if(!offer.lat||!offer.lng)return;const el=document.createElement('div');el.className='offer-bubble-wrap';el.innerHTML=`<div class="offer-bubble">${offer.shortLabel||offer.title||'Offer'}</div>`;el.addEventListener('click',()=>onOfferClick?.(offer));const marker=new ml.Marker({element:el,anchor:'bottom'}).setLngLat([offer.lng,offer.lat]).addTo(map);markersRef.current.push(marker)})})
  },[offers,onOfferClick])

  useEffect(()=>{
    const map=mapRef.current;if(!map)return
    placesRef.current.forEach(m=>m.remove());placesRef.current=[]
    import('maplibre-gl').then(({default:ml})=>{places.forEach(place=>{if(!place.lat||!place.lng)return;const el=document.createElement('div');el.className='poi-chip';el.textContent=place.name;el.title=place.category;const marker=new ml.Marker({element:el,anchor:'bottom'}).setLngLat([place.lng,place.lat]).addTo(map);placesRef.current.push(marker)})})
  },[places])
  return <div ref={containerRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
}