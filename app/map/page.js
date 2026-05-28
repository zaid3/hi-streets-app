'use client'
import{useState,useEffect,useCallback,useMemo,useRef}from'react'
import{useRouter}from'next/navigation'
import dynamic from'next/dynamic'
import{supabase}from'../../lib/supabase'
import{getParkingData}from'../../lib/parkingAdapter'
import{getLiveOffers,subscribeToOffers}from'../../lib/offersAdapter'
import{getPlacesData}from'../../lib/placesAdapter'
import{NEWHAM_CENTER,boundsAround,newhamParkingSegments,newhamPlaces}from'../../lib/newhamSeedData'
import ParkingSheet from'../../components/ParkingSheet'
import OfferSheet from'../../components/OfferSheet'
import SearchOverlay from'../../components/SearchOverlay'
import FiltersSheet from'../../components/FiltersSheet'
import ListViewSheet from'../../components/ListViewSheet'
import SideMenu from'../../components/SideMenu'

const MapLibreMap=dynamic(()=>import('../../components/MapLibreMap'),{ssr:false})
const GoogleMap=dynamic(()=>import('../../components/GoogleMap'),{ssr:false})

const OR='#ff681f'
const UK=NEWHAM_CENTER
const DEFAULT_FILTERS={types:['free','paid','carpark','disabled','resident','restricted','loading'],maxWalk:20,blueBadge:false,priceFilter:['free','paid']}

function fmtTime(t){return t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0')}
function TimePill({startTime,duration,onChangeTime,onChangeDuration}){
  const[open,setOpen]=useState(false)
  return <div className="time-pill-wrap">
    <button className="time-pill" onClick={()=>setOpen(o=>!o)}><strong>{fmtTime(startTime)}</strong><span>{duration}h</span></button>
    {open&&<div className="time-popover">
      <span className="eyebrow">Arrive</span>
      <div className="pill-grid three">{[0,1,2].map(i=>{const d=new Date(Date.now()+i*3600000);return <button key={i} onClick={()=>onChangeTime(d)} className="filter-pill">{i?'+'+i+'h':'Now'}</button>})}</div>
      <span className="eyebrow">Duration</span>
      <div className="pill-grid four">{[1,2,3,4,6,8].map(d=><button key={d} onClick={()=>{onChangeDuration(d);setOpen(false)}} className={`filter-pill ${duration===d?'selected':''}`}>{d}h</button>)}</div>
    </div>}
  </div>
}
function point(item){return{lat:item.lat||item.coords?.[0]?.[0],lng:item.lng||item.coords?.[0]?.[1]}}
function walkMins(item,center){
  const p=point(item)
  if(!p.lat||!p.lng)return 0
  const R=6371000,dLat=(p.lat-center.lat)*Math.PI/180,dLng=(p.lng-center.lng)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(center.lat*Math.PI/180)*Math.cos(p.lat*Math.PI/180)*Math.sin(dLng/2)**2
  return Math.max(1,Math.round((R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)))/84))
}
function typeOf(seg){return seg.isCarPark?'carpark':seg.type==='permit'?'resident':seg.type}
function OffersPanel({offers,onSelect,onBack}){
  return <div className="list-panel offers-panel">
    <div className="panel-header"><button className="round-close" onClick={onBack}>←</button><div><div className="eyebrow">Spend local</div><h2>{offers.length} live offers</h2></div></div>
    <div className="list-scroll">{offers.map(o=><button key={o.id} className="offer-row" onClick={()=>onSelect(o)}><span className="offer-badge">{o.shortLabel||o.discount||'Offer'}</span><span className="row-main"><strong>{o.businessName||'Local business'}</strong><small>{o.title||'Live offer'}</small><em>{o.address||o.category||'Nearby'}</em></span></button>)}</div>
  </div>
}

export default function MapPage(){
  const r=useRouter()
  const[center,setCenter]=useState(UK)
  const[zoom,setZoom]=useState(15)
  const[segments,setSegments]=useState(newhamParkingSegments)
  const[offers,setOffers]=useState([])
  const[places,setPlaces]=useState(newhamPlaces)
  const[selectedSeg,setSelectedSeg]=useState(null)
  const[selectedOffer,setSelectedOffer]=useState(null)
  const[showSearch,setShowSearch]=useState(false)
  const[showMenu,setShowMenu]=useState(false)
  const[showFilters,setShowFilters]=useState(false)
  const[view,setView]=useState('map')
  const[user,setUser]=useState(null)
  const[filters,setFilters]=useState(DEFAULT_FILTERS)
  const[startTime,setStartTime]=useState(new Date())
  const[duration,setDuration]=useState(1)
  const[destination,setDestination]=useState(null)
  const[showHelp,setShowHelp]=useState(false)
  const[locPrompt,setLocPrompt]=useState(true)
  const loadTimer=useRef(null)
  const gmapsKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||''
  const useGoogleMap=Boolean(gmapsKey)

  useEffect(()=>{if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('help')==='1')setShowHelp(true)},[])
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user||null))
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setUser(s?.user||null))
    return()=>subscription.unsubscribe()
  },[])

  const handleBoundsChange=useCallback(async(bounds)=>{
    clearTimeout(loadTimer.current)
    loadTimer.current=setTimeout(async()=>{
      try{
        const[parking,poi]=await Promise.all([getParkingData(bounds),getPlacesData(bounds)])
        setSegments(parking)
        setPlaces(poi)
      }catch(e){console.error(e)}
    },650)
  },[])

  useEffect(()=>{
    handleBoundsChange(boundsAround(UK))
    getLiveOffers().then(setOffers)
    const unsub=subscribeToOffers(setOffers)
    return unsub
  },[handleBoundsChange])

  function requestLocation(){
    setLocPrompt(false)
    if(!navigator.geolocation){setCenter(UK);return}
    navigator.geolocation.getCurrentPosition(
      p=>{setCenter({lat:p.coords.latitude,lng:p.coords.longitude});setZoom(16)},
      ()=>setCenter(UK),
      {enableHighAccuracy:true,timeout:9000,maximumAge:10000}
    )
  }
  function handleDirections(item){
    const p=point(item)
    if(!p.lat||!p.lng)return
    const url=/iPhone|iPad|iPod/i.test(navigator.userAgent)?`maps://maps.apple.com/?daddr=${p.lat},${p.lng}`:`https://maps.google.com/?q=${p.lat},${p.lng}`
    window.open(url,'_blank')
  }
  const filteredSegments=useMemo(()=>segments.filter(s=>{
    const type=typeOf(s)
    if(!filters.types.includes(type))return false
    if(filters.blueBadge&&type!=='disabled')return false
    if(filters.priceFilter?.length&&['free','paid'].includes(type)&&!filters.priceFilter.includes(type))return false
    if(filters.maxWalk<30&&walkMins(s,center)>filters.maxWalk)return false
    return true
  }),[segments,filters,center])
  const selectedFilters=filters.types.length
  const topOffers=offers.slice(0,30)
  const handleSelectSegment=seg=>{const p=point(seg);if(p.lat&&p.lng){setCenter(p);setZoom(17)};setSelectedOffer(null);setSelectedSeg(seg);setView('map')}
  const handleSelectOffer=o=>{const p=point(o);if(p.lat&&p.lng){setCenter(p);setZoom(17)};setSelectedSeg(null);setSelectedOffer(o);setView('map')}

  return <div className="map-shell phase1-map-shell">
    {useGoogleMap?<GoogleMap apiKey={gmapsKey} center={center} zoom={zoom} segments={filteredSegments} offers={topOffers} onSegmentClick={handleSelectSegment} onOfferClick={handleSelectOffer} onMapMove={handleBoundsChange}/>:<MapLibreMap center={center} zoom={zoom} segments={filteredSegments} offers={topOffers} onSegmentClick={handleSelectSegment} onOfferClick={handleSelectOffer} onMapMove={handleBoundsChange}/>}

    <div className="mobile-map-top">
      <div className="top-search-row">
        <button className="menu-button" onClick={()=>setShowMenu(true)} aria-label="Open menu"><span/><span/><span/></button>
        <button className="search-control" onClick={()=>setShowSearch(true)}><span>🔎</span><strong>{destination?'Destination set':'Where are you going?'}</strong><small>Park free. Spend local.</small></button>
        <TimePill startTime={startTime} duration={duration} onChangeTime={setStartTime} onChangeDuration={setDuration}/>
      </div>
      <div className="chip-row">
        <button className="map-chip blue" onClick={()=>setView('parking')}>Parking {filteredSegments.length}</button>
        <button className="map-chip orange" onClick={()=>setView('offers')}>Offers {topOffers.length}</button>
        <button className="map-chip" onClick={()=>setShowFilters(true)}>Filters {selectedFilters}</button>
        <button className="map-chip" onClick={requestLocation}>Locate</button>
      </div>
    </div>

    {locPrompt&&!selectedSeg&&!selectedOffer&&view==='map'&&<div className="location-nudge"><div><strong>Use your current location?</strong><span>We only use it on this device to centre the map.</span></div><button onClick={requestLocation}>Allow</button><button onClick={()=>setLocPrompt(false)}>Not now</button></div>}

    <div className="map-fabs"><button onClick={()=>setShowFilters(true)}>⚙️</button><button onClick={requestLocation}>⌖</button><button className="orange" onClick={()=>setView('offers')}>%</button></div>

    {view==='parking'&&<ListViewSheet segments={filteredSegments} center={center} onSelect={handleSelectSegment} onDirections={handleDirections} onBack={()=>setView('map')}/>}
    {view==='offers'&&<OffersPanel offers={topOffers} onSelect={handleSelectOffer} onBack={()=>setView('map')}/>}
    {selectedSeg&&<ParkingSheet segment={selectedSeg} onClose={()=>setSelectedSeg(null)} destination={destination} onDirections={handleDirections}/>}
    {selectedOffer&&<OfferSheet offer={selectedOffer} onClose={()=>setSelectedOffer(null)} onDirections={handleDirections}/>}

    {showSearch&&<SearchOverlay onClose={()=>setShowSearch(false)} currentLocation={center} onSelect={loc=>{setCenter({lat:loc.lat,lng:loc.lng});setZoom(16);setDestination({lat:loc.lat,lng:loc.lng});setShowSearch(false)}}/>}
    <FiltersSheet open={showFilters} onClose={()=>setShowFilters(false)} filters={filters} onApply={setFilters}/>

    {showHelp&&<div className="modal-backdrop"><button className="modal-scrim" onClick={()=>setShowHelp(false)} aria-label="Close help"/><div className="premium-sheet open help-panel"><div className="sheet-grabber"/><div className="panel-header static"><div><div className="eyebrow">Help & FAQ</div><h2>Reading the map</h2></div><button className="round-close" onClick={()=>setShowHelp(false)}>✕</button></div><div className="help-copy"><p><strong>Orange</strong> pins are live offers from local businesses.</p><p><strong>Blue</strong> pins are parking guidance. <strong>Green</strong> means free guidance only when it is marked as free.</p><p>Seed and OSM data are approximate. Always check local signs before parking.</p></div></div></div>}

    <SideMenu open={showMenu} onClose={()=>setShowMenu(false)} user={user} onAction={a=>{if(a==='signout'){supabase.auth.signOut();setUser(null)};if(a==='help')setShowHelp(true)}}/>

    <nav className="bottom-nav">
      {[['map','Map','⌂'],['offers','Offers','%'],['parking','Parking','P'],['businesses','Businesses','◆'],['account','Account','◡']].map(([id,label,icon])=><button key={id} className={view===id||id==='map'&&view==='map'?'active':''} onClick={()=>{if(id==='account')r.push(user?'/business':'/login?redirect=/map');else if(id==='businesses')r.push('/business');else setView(id)}}><span>{icon}</span>{label}</button>)}
    </nav>
  </div>
}
