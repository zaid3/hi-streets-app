'use client'
import{useEffect,useRef,useState}from'react'
const GREEN='#078d16',BLUE='#0b73d9',GREY='#9d9da5',PURPLE='#8E44AD',ORANGE='#ff681f'
function loadGoogleMaps(apiKey){return new Promise((resolve,reject)=>{if(typeof window==='undefined')return reject(new Error('No window'));if(window.google?.maps)return resolve(window.google.maps);const existing=document.getElementById('gmaps-script');if(existing){existing.addEventListener('load',()=>resolve(window.google.maps),{once:true});existing.addEventListener('error',()=>reject(new Error('Failed to load Google Maps script')),{once:true});return}const script=document.createElement('script');script.id='gmaps-script';script.src=`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;script.async=true;script.defer=true;script.onload=()=>resolve(window.google.maps);script.onerror=()=>reject(new Error('Failed to load Google Maps script'));document.head.appendChild(script)})}
function controlledNow(){const d=new Date(),m=d.getHours()*60+d.getMinutes();return m>=8*60&&m<18*60+30}
function point(seg){if(seg.lat&&seg.lng)return{lat:seg.lat,lng:seg.lng};const coords=seg.coords||[];const mid=coords[Math.floor(coords.length/2)]||coords[0];return mid?{lat:mid[0],lng:mid[1]}:null}
function visual(seg){
  if(seg.isCarPark)return{color:BLUE,label:'P'}
  if(['restricted','no_parking','yellow_double','red_route'].includes(seg.type))return{color:GREY,label:'⊘'}
  if(seg.type==='paid')return{color:controlledNow()?BLUE:GREEN,label:controlledNow()?'£':'✓'}
  if(seg.type==='yellow_single')return{color:controlledNow()?GREY:GREEN,label:controlledNow()?'⊘':'✓'}
  if(seg.type==='disabled')return{color:PURPLE,label:'♿'}
  if(seg.type==='ev')return{color:'#29c9b2',label:'⚡'}
  if(seg.type==='loading')return{color:ORANGE,label:'L'}
  return{color:GREEN,label:'✓'}
}
export default function GoogleMap({apiKey,center,zoom=15,segments=[],offers=[],places=[],onSegmentClick,onOfferClick,onMapMove}){
  const containerRef=useRef(null)
  const mapRef=useRef(null)
  const overlaysRef=useRef([])
  const userMarkerRef=useRef(null)
  const[mapReady,setMapReady]=useState(false)
  useEffect(()=>{if(!apiKey||!containerRef.current||mapRef.current)return;loadGoogleMaps(apiKey).then((maps)=>{const map=new maps.Map(containerRef.current,{center,zoom,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,clickableIcons:false,gestureHandling:'greedy',styles:[{featureType:'poi.business',stylers:[{visibility:'on'}]},{featureType:'poi.park',elementType:'geometry',stylers:[{color:'#dff2df'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#ffffff'}]},{featureType:'landscape',stylers:[{color:'#efeee9'}]}]});mapRef.current=map;userMarkerRef.current=new maps.Marker({position:center,map,title:'Your location / search area',zIndex:80,icon:{path:maps.SymbolPath.CIRCLE,scale:8,fillColor:'#1475e8',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3}});map.addListener('idle',()=>{const b=map.getBounds();if(!b)return;const ne=b.getNorthEast(),sw=b.getSouthWest();onMapMove?.({south:sw.lat(),west:sw.lng(),north:ne.lat(),east:ne.lng()})});setMapReady(true)}).catch(error=>console.error('Google Maps failed to load',error))},[apiKey])
  useEffect(()=>{
    const map=mapRef.current;if(!mapReady||!map||!window.google?.maps)return
    overlaysRef.current.forEach(o=>o.setMap?.(null));overlaysRef.current=[]
    const maps=window.google.maps
    segments.forEach(seg=>{
      if(!seg.coords?.length)return
      const v=visual(seg)
      if(!seg.isCarPark&&seg.coords.length>1){const path=seg.coords.map(([lat,lng])=>({lat,lng}));const casing=new maps.Polyline({path,strokeColor:'#ffffff',strokeOpacity:.95,strokeWeight:11,map,zIndex:9});const line=new maps.Polyline({path,strokeColor:v.color,strokeOpacity:.98,strokeWeight:6,map,zIndex:10});line.addListener('click',()=>onSegmentClick?.(seg));casing.addListener('click',()=>onSegmentClick?.(seg));overlaysRef.current.push(casing,line)}
      const p=point(seg);if(!p)return
      const marker=new maps.Marker({position:p,map,title:seg.name||'Parking',label:{text:v.label,color:'#ffffff',fontSize:'16px',fontWeight:'900'},zIndex:40,icon:{path:maps.SymbolPath.CIRCLE,scale:seg.isCarPark?16:14,fillColor:v.color,fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3}})
      marker.addListener('click',()=>onSegmentClick?.(seg));overlaysRef.current.push(marker)
    })
    places.forEach(place=>{if(!place.lat||!place.lng)return;const marker=new maps.Marker({position:{lat:place.lat,lng:place.lng},map,title:place.name,label:{text:'•',color:'#ffffff',fontSize:'18px',fontWeight:'900'},zIndex:20,icon:{path:maps.SymbolPath.CIRCLE,scale:8,fillColor:'#ffffff',fillOpacity:1,strokeColor:'#d6d2e5',strokeWeight:2}});overlaysRef.current.push(marker)})
    offers.forEach(offer=>{if(!offer.lat||!offer.lng)return;const marker=new maps.Marker({position:{lat:offer.lat,lng:offer.lng},map,title:offer.title||offer.businessName||'Offer',label:{text:(offer.shortLabel||offer.discount||'Offer').slice(0,14),color:'#ffffff',fontSize:'11px',fontWeight:'900'},zIndex:70,icon:{path:maps.SymbolPath.BACKWARD_CLOSED_ARROW,scale:8,fillColor:'#ff681f',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:2}});marker.addListener('click',()=>onOfferClick?.(offer));overlaysRef.current.push(marker)})
  },[mapReady,segments,offers,places,onSegmentClick,onOfferClick])
  useEffect(()=>{const map=mapRef.current;if(!map)return;map.setCenter(center);map.setZoom(zoom);userMarkerRef.current?.setPosition(center)},[center,zoom])
  return <div ref={containerRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
}