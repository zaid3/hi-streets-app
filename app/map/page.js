'use client'
import{useCallback,useEffect,useRef,useState}from'react'
import{useRouter}from'next/navigation'
import dynamic from'next/dynamic'
import{supabase}from'../../lib/supabase'
import{getParkingData}from'../../lib/parkingAdapter'
import{getLiveOffers,subscribeToOffers}from'../../lib/offersAdapter'
import{getPlacesData}from'../../lib/placesAdapter'
import{NEWHAM_CENTER,boundsAround,newhamPlaces}from'../../lib/newhamSeedData'
import ParkingSheet from'../../components/ParkingSheet'
import OfferSheet from'../../components/OfferSheet'
import SearchOverlay from'../../components/SearchOverlay'
import FiltersSheet from'../../components/FiltersSheet'
import ListViewSheet from'../../components/ListViewSheet'
import SideMenu from'../../components/SideMenu'

const MapLibreMap=dynamic(()=>import('../../components/MapLibreMap'),{ssr:false})
const GoogleMap=dynamic(()=>import('../../components/GoogleMap'),{ssr:false})
const UK=NEWHAM_CENTER
const ALL_TYPES=['free','paid','carpark','disabled','ev','loading','resident','yellow_single','yellow_double','red_route','no_parking']
function formatTime(d){return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}
function officialCount(segments){return segments.filter(s=>['dtro','council','curated','field_checked'].includes(s.source)||s.confidence==='high').length}
function uniqueById(items){const seen=new Set();return items.filter(item=>{const id=item.id||item.external_id||`${item.lat},${item.lng}`;if(seen.has(id))return false;seen.add(id);return true})}
function TimeSelector({startTime,duration,onChangeTime,onChangeDuration}){
  const[open,setOpen]=useState(false)
  const today=startTime.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})
  return <div style={{position:'relative'}}><button className="time-pill" onClick={()=>setOpen(o=>!o)}><span>{formatTime(startTime)}</span><span className="time-muted">for</span><span>{duration}h</span><span className="time-muted">{today}</span></button>{open&&<div style={{position:'absolute',right:0,top:60,background:'#fff',border:'1px solid #e7e3f0',borderRadius:14,boxShadow:'var(--shadow)',zIndex:500,padding:14,width:218}}><div style={{fontSize:12,fontWeight:900,color:'#77768a',letterSpacing:0,marginBottom:8}}>ARRIVE AT</div>{[new Date(),new Date(Date.now()+3600000),new Date(Date.now()+7200000)].map((t,i)=><button key={i} onClick={()=>onChangeTime(t)} style={{width:'100%',border:'1px solid #ece8f3',background:formatTime(t)===formatTime(startTime)?'#f0efff':'#fff',color:'#0b0628',borderRadius:10,padding:'10px 12px',fontWeight:900,marginBottom:7,cursor:'pointer',textAlign:'left'}}>{i===0?'Now':formatTime(t)}</button>)}<div style={{fontSize:12,fontWeight:900,color:'#77768a',letterSpacing:0,margin:'10px 0 8px'}}>DURATION</div><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>{[1,2,3,4,6,8,12,24].map(d=><button key={d} onClick={()=>{onChangeDuration(d);setOpen(false)}} style={{border:0,borderRadius:999,padding:'8px 0',fontWeight:900,background:duration===d?'#2547d8':'#f2f1f8',color:duration===d?'#fff':'#0b0628',cursor:'pointer'}}>{d}h</button>)}</div></div>}</div>
}
function DataBar({segments,offers,googleParking}){
  const official=officialCount(segments)
  const total=segments.length+googleParking.length
  const label=official?`${official} official road lines`:googleParking.length?`${googleParking.length} parking places nearby`:total?`${total} parking records`:'No parking found here yet'
  return <div className={`data-bar ${total?'':'empty'}`}><span>{label}</span>{!official&&googleParking.length>0&&<span>Council lines pending</span>}{official>0&&googleParking.length>0&&<span>{googleParking.length} car parks</span>}{offers.length>0&&<span>{offers.length} offers</span>}</div>
}
function ActionSheet({collapsed,setCollapsed,onPlan,onNearby,onBusiness,onOffers,offers,parkingCount,official,googleParking}){
  if(collapsed)return <div className="action-sheet compact"><div className="sheet-handle"/><button onClick={()=>setCollapsed(false)} className="action-compact-btn">Find parking and offers</button></div>
  const summary=official?`${official} official road records nearby`:googleParking?`${googleParking} parking places nearby from Google`:'Search an area to find parking nearby'
  return <div className="action-sheet"><div className="sheet-handle"/><div className="action-title">What do you need?</div><div className="action-summary"><b>{parkingCount}</b> parking results. {summary}</div><button onClick={onPlan} className="action-row"><span className="action-circle">⌕</span><span>Search destination</span><span className="chevron">›</span></button><button onClick={onNearby} className="action-row"><span className="action-circle">P</span><span>Filter parking</span><span className="chevron">›</span></button>{offers>0&&<button onClick={onOffers} className="action-row"><span className="action-circle">%</span><span>Show local offers</span><span style={{marginLeft:'auto',fontSize:14,fontWeight:900,color:'#ff681f'}}>{offers} live</span><span className="chevron">›</span></button>}<button onClick={onBusiness} className="action-row"><span className="action-circle">+</span><span>Add free business offer</span><span className="chevron">›</span></button><button onClick={()=>setCollapsed(true)} className="plain-collapse">Hide</button></div>
}
export default function MapPage(){
  const r=useRouter()
  const[center,setCenter]=useState(UK)
  const[zoom,setZoom]=useState(15)
  const[segments,setSegments]=useState([])
  const[googleParking,setGoogleParking]=useState([])
  const[offers,setOffers]=useState([])
  const[places,setPlaces]=useState(newhamPlaces)
  const[selectedSeg,setSelectedSeg]=useState(null)
  const[selectedOffer,setSelectedOffer]=useState(null)
  const[showSearch,setShowSearch]=useState(false)
  const[showMenu,setShowMenu]=useState(false)
  const[showFilters,setShowFilters]=useState(false)
  const[view,setView]=useState('map')
  const[user,setUser]=useState(null)
  const[showOffers,setShowOffers]=useState(true)
  const[filters,setFilters]=useState({types:ALL_TYPES,maxWalk:30,blueBadge:false,priceFilter:['free','paid'],logic:['limitedDuration','parkLater']})
  const[startTime,setStartTime]=useState(new Date())
  const[duration,setDuration]=useState(1)
  const[destination,setDestination]=useState(null)
  const[actionCollapsed,setActionCollapsed]=useState(true)
  const[showHelp,setShowHelp]=useState(false)
  const loadTimer=useRef(null)
  const gmapsKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||''
  const[useGoogleMap,setUseGoogleMap]=useState(false)
  useEffect(()=>{if(gmapsKey)setUseGoogleMap(localStorage.getItem('hs_use_google_map')!=='0')},[gmapsKey])
  useEffect(()=>{const fn=()=>setShowSearch(true);window.addEventListener('hi-streets-search-destination',fn);return()=>window.removeEventListener('hi-streets-search-destination',fn)},[])
  useEffect(()=>{if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('help')==='1')setShowHelp(true)},[])
  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user||null));const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setUser(s?.user||null));return()=>subscription.unsubscribe()},[])
  useEffect(()=>{navigator.geolocation?.getCurrentPosition(p=>setCenter({lat:p.coords.latitude,lng:p.coords.longitude}),()=>setCenter(UK),{enableHighAccuracy:true,timeout:9000,maximumAge:10000})},[])
  const handleBoundsChange=useCallback(async(bounds)=>{clearTimeout(loadTimer.current);loadTimer.current=setTimeout(async()=>{try{const[parking,poi]=await Promise.all([getParkingData(bounds),getPlacesData(bounds)]);setSegments(parking);setPlaces(poi)}catch(e){console.error(e)}},450)},[])
  useEffect(()=>{handleBoundsChange(boundsAround(UK));getLiveOffers().then(setOffers);const unsub=subscribeToOffers(setOffers);return unsub},[handleBoundsChange])
  const selectSeg=useCallback((seg)=>{const lat=seg.lat||seg.coords?.[0]?.[0],lng=seg.lng||seg.coords?.[0]?.[1];if(lat&&lng){setCenter({lat,lng});setZoom(17)}setSelectedOffer(null);setSelectedSeg(seg);setActionCollapsed(true)},[])
  function handleDirections(item){const lat=item.lat||item.coords?.[0]?.[0],lng=item.lng||item.coords?.[0]?.[1];if(!lat||!lng)return;window.open(`https://maps.google.com/?q=${lat},${lng}`,'_blank')}
  function walkMinsTo(seg){const lat=seg.lat||seg.coords?.[0]?.[0],lng=seg.lng||seg.coords?.[0]?.[1];if(!lat||!lng)return 0;const R=6371000,dLat=(lat-center.lat)*Math.PI/180,dLng=(lng-center.lng)*Math.PI/180;const a=Math.sin(dLat/2)**2+Math.cos(center.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;return Math.max(1,Math.round((R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)))/84))}
  const filteredSegments=segments.filter(s=>{const type=s.isCarPark?'carpark':s.type==='permit'?'resident':s.type;if(!filters.types.includes(type))return false;if(filters.blueBadge&&type!=='disabled')return false;if(filters.maxWalk<30&&walkMinsTo(s)>filters.maxWalk)return false;return true})
  const showGoogleMap=Boolean(gmapsKey&&useGoogleMap)
  const visibleGoogleParking=showGoogleMap?googleParking:[]
  const listSegments=uniqueById([...filteredSegments,...visibleGoogleParking])
  const official=officialCount(filteredSegments)
  return <div className="map-shell"><style jsx global>{`.map-shell{width:100vw!important;max-width:none!important;box-shadow:none!important}.data-bar.empty{background:#fff7f2;color:#9b4a16}.float-stack{gap:10px}.action-sheet{max-width:440px;margin:0 auto}.search-pill,.time-pill,.segment-tabs,.data-bar,.action-sheet,.float-btn,.map-menu{backdrop-filter:saturate(140%) blur(6px)}@media (min-width:700px){.glass-top{left:50%;right:auto;width:min(520px,calc(100vw - 32px));transform:translateX(-50%)}.map-menu{left:24px}.float-stack{right:24px}.action-sheet{left:50%!important;right:auto!important;transform:translateX(-50%);width:min(440px,100vw)}}`}</style>{showGoogleMap?<GoogleMap apiKey={gmapsKey} center={center} zoom={zoom} segments={filteredSegments} offers={showOffers?offers:[]} places={places} onSegmentClick={selectSeg} onOfferClick={o=>{setSelectedSeg(null);setSelectedOffer(o);setActionCollapsed(true)}} onMapMove={handleBoundsChange} onGoogleParking={setGoogleParking}/>:<MapLibreMap center={center} zoom={zoom} segments={filteredSegments} offers={showOffers?offers:[]} places={places} onSegmentClick={selectSeg} onOfferClick={o=>{setSelectedSeg(null);setSelectedOffer(o);setActionCollapsed(true)}} onMapMove={handleBoundsChange}/>}<div className="glass-top"><div className="top-row"><button className="search-pill" onClick={()=>setShowSearch(true)}><span className="search-icon">⌕</span><span>{destination?'Destination set':'Search place or postcode'}</span></button><TimeSelector startTime={startTime} duration={duration} onChangeTime={setStartTime} onChangeDuration={setDuration}/></div><div className="segment-tabs two"><button onClick={()=>setView('map')} className={`segment-tab ${view==='map'?'active':''}`}>Map</button><button onClick={()=>setView('list')} className={`segment-tab ${view==='list'?'active':''}`}>List</button></div><DataBar segments={filteredSegments} offers={offers} googleParking={visibleGoogleParking}/></div><button className="map-menu" onClick={()=>setShowMenu(true)}>☰</button><div className="float-stack"><button className="float-btn" onClick={()=>setShowFilters(true)}>☷</button><button className="float-btn" onClick={()=>navigator.geolocation?.getCurrentPosition(p=>{setCenter({lat:p.coords.latitude,lng:p.coords.longitude});setZoom(17)})}>⌾</button><button className={`float-btn ${showOffers?'active':''}`} onClick={()=>setShowOffers(s=>!s)}>%</button></div>{gmapsKey&&<button onClick={()=>{const next=!useGoogleMap;setUseGoogleMap(next);localStorage.setItem('hs_use_google_map',next?'1':'0');if(!next)setGoogleParking([])}} className="google-toggle" style={{bottom:actionCollapsed?96:360}}>{useGoogleMap?'Google on':'Google map'}</button>}{offers.length>0&&view!=='list'&&!selectedSeg&&!selectedOffer&&<button onClick={()=>setShowOffers(true)} className="offer-count-pill">{offers.length} live offers nearby</button>}{view==='list'&&<ListViewSheet segments={listSegments} center={center} onSelect={seg=>{selectSeg(seg);setView('map')}} onDirections={handleDirections} onBack={()=>setView('map')}/>} {!selectedSeg&&!selectedOffer&&view!=='list'&&<ActionSheet collapsed={actionCollapsed} setCollapsed={setActionCollapsed} onPlan={()=>setShowSearch(true)} onNearby={()=>setShowFilters(true)} onBusiness={()=>r.push('/business')} onOffers={()=>setShowOffers(true)} offers={offers.length} parkingCount={listSegments.length} official={official} googleParking={visibleGoogleParking.length}/>} {selectedSeg&&view!=='list'&&<ParkingSheet segment={selectedSeg} onClose={()=>{setSelectedSeg(null);setActionCollapsed(false)}} destination={destination} onDirections={handleDirections}/>} {selectedOffer&&<OfferSheet offer={selectedOffer} onClose={()=>{setSelectedOffer(null);setActionCollapsed(false)}} onDirections={handleDirections} onLogin={()=>r.push('/login?redirect=/map')}/>} {showSearch&&<SearchOverlay onClose={()=>setShowSearch(false)} currentLocation={center} onSelect={loc=>{setCenter({lat:loc.lat,lng:loc.lng});setZoom(16);setDestination({lat:loc.lat,lng:loc.lng});setShowSearch(false)}}/>}<FiltersSheet open={showFilters} onClose={()=>setShowFilters(false)} filters={filters} onApply={setFilters}/>{showHelp&&<div className="modal-dim"><div className="modal-card"><button className="modal-close" onClick={()=>setShowHelp(false)}>×</button><div className="modal-title">Help centre</div><p className="modal-copy" style={{textAlign:'left'}}>Road lines show official D-TRO or council parking restrictions where verified data exists. Blue means paid or car park, green means free or available, grey means no parking, purple means blue badge, orange means loading. Google parking places are shown as car park results. Always check the road sign before parking.</p><button className="solid-btn" style={{width:'100%'}} onClick={()=>setShowHelp(false)}>Got it</button></div></div>}<SideMenu open={showMenu} onClose={()=>setShowMenu(false)} user={user} onAction={a=>{if(a==='signout'){supabase.auth.signOut();setUser(null)}if(a==='help')setShowHelp(true);if(a==='about')setShowHelp(true)}}/></div>
}