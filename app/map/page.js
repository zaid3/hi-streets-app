'use client'
import{useState,useEffect,useCallback,useRef}from'react'
import{useRouter}from'next/navigation'
import dynamic from'next/dynamic'
import{supabase}from'../../lib/supabase'
import{getParkingData}from'../../lib/parkingAdapter'
import{getLiveOffers,subscribeToOffers}from'../../lib/offersAdapter'
import ParkingSheet from'../../components/ParkingSheet'
import OfferSheet from'../../components/OfferSheet'
import SearchOverlay from'../../components/SearchOverlay'
import FiltersSheet from'../../components/FiltersSheet'
import ListViewSheet from'../../components/ListViewSheet'
import SideMenu from'../../components/SideMenu'
import ParkingTimerWidget,{useParkingTimer}from'../../components/ParkingTimer'

const MapLibreMap=dynamic(()=>import('../../components/MapLibreMap'),{ssr:false})

const OR='#ff681f'
const UK={lat:51.5370,lng:0.0325}

// ── Time selector ─────────────────────────────────────────
function TimeSelector({startTime,duration,onChangeTime,onChangeDuration}){
  const[open,setOpen]=useState(false)
  const fmt=t=>t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0')
  const durs=[1,2,3,4,6,8,12,24]
  const today=startTime.toLocaleDateString('en-GB',{day:'numeric',month:'short'})

  return(
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{background:'white',border:'1px solid rgba(0,0,0,.1)',borderRadius:12,padding:'0 14px',boxShadow:'0 2px 12px rgba(0,0,0,.15)',cursor:'pointer',height:48,display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#333',fontWeight:500,whiteSpace:'nowrap'}}>
        <span style={{fontWeight:700,color:'#111'}}>{fmt(startTime)}</span>
        <span style={{color:'rgba(0,0,0,.35)'}}>→ {duration}h</span>
        <span style={{color:'rgba(0,0,0,.35)',fontSize:11}}>{today}</span>
      </button>

      {open&&(
        <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'white',borderRadius:16,boxShadow:'0 8px 32px rgba(0,0,0,.2)',padding:16,zIndex:300,minWidth:220}}>
          <div style={{fontSize:12,color:'rgba(0,0,0,.4)',fontWeight:600,marginBottom:8}}>ARRIVE AT</div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            {[new Date(),new Date(Date.now()+3600000),new Date(Date.now()+7200000)].map((t,i)=>(
              <button key={i} onClick={()=>{onChangeTime(t);}}
                style={{flex:1,padding:'8px 4px',borderRadius:10,border:`1.5px solid ${fmt(startTime)===fmt(t)?OR:'rgba(0,0,0,.1)'}`,background:fmt(startTime)===fmt(t)?'rgba(255,104,31,.08)':'white',color:fmt(startTime)===fmt(t)?OR:'#333',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {i===0?'Now':fmt(t)}
              </button>
            ))}
          </div>
          <div style={{fontSize:12,color:'rgba(0,0,0,.4)',fontWeight:600,marginBottom:8}}>DURATION</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {durs.map(d=>(
              <button key={d} onClick={()=>{onChangeDuration(d);setOpen(false)}}
                style={{padding:'6px 12px',borderRadius:20,border:`1.5px solid ${duration===d?OR:'rgba(0,0,0,.1)'}`,background:duration===d?OR:'white',color:duration===d?'white':'#333',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {d}h
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Haversine distance in metres ──────────────────────────
function haversine(lat1,lng1,lat2,lng2){
  const R=6371000
  const dLat=(lat2-lat1)*Math.PI/180
  const dLng=(lng2-lng1)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

// ── Find nearest free bay ─────────────────────────────────
function findNearestFree(segments,userLat,userLng){
  const free=segments.filter(s=>s.type==='free')
  if(!free.length)return null
  let best=null,bestDist=Infinity
  free.forEach(s=>{
    const lat=s.lat||s.coords?.[0]?.[0]
    const lng=s.lng||s.coords?.[0]?.[1]
    if(!lat||!lng)return
    const d=haversine(userLat,userLng,lat,lng)
    if(d<bestDist){bestDist=d;best=s}
  })
  return best
}

// ── Toast notification ────────────────────────────────────
function Toast({message,onDismiss}){
  useEffect(()=>{const t=setTimeout(onDismiss,3500);return()=>clearTimeout(t)},[onDismiss])
  return(
    <div style={{position:'absolute',bottom:90,left:'50%',transform:'translateX(-50%)',zIndex:350,background:'#222',border:'1px solid rgba(255,255,255,.15)',borderRadius:14,padding:'10px 18px',fontSize:13,color:'white',fontWeight:500,whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>
      {message}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function MapPage(){
  const r=useRouter()
  const[center,setCenter]=useState(UK)
  const[userLocation,setUserLocation]=useState(null)
  const[zoom,setZoom]=useState(15)
  const[segments,setSegments]=useState([])
  const[offers,setOffers]=useState([])
  const[selectedSeg,setSelectedSeg]=useState(null)
  const[selectedOffer,setSelectedOffer]=useState(null)
  const[showSearch,setShowSearch]=useState(false)
  const[showMenu,setShowMenu]=useState(false)
  const[showFilters,setShowFilters]=useState(false)
  const[view,setView]=useState('bay')
  const[user,setUser]=useState(null)
  const[showOffers,setShowOffers]=useState(true)
  const[filters,setFilters]=useState({types:['free','paid','carpark','disabled','ev','resident'],maxWalk:10,blueBadge:false,priceFilter:['free','paid']})
  const[startTime,setStartTime]=useState(new Date())
  const[duration,setDuration]=useState(1)
  const[destination,setDestination]=useState(null)
  const[toast,setToast]=useState(null)
  const loadTimer=useRef(null)
  const{timer,startTimer,stopTimer,extendTimer}=useParkingTimer()

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user||null))
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setUser(s?.user||null))
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        p=>{
          const loc={lat:p.coords.latitude,lng:p.coords.longitude}
          setCenter(loc)
          setUserLocation(loc)
        },
        ()=>{},
        {timeout:6000,maximumAge:30000}
      )
    }
  },[])

  useEffect(()=>{
    getLiveOffers().then(setOffers)
    const unsub=subscribeToOffers(setOffers)
    return unsub
  },[])

  const handleBoundsChange=useCallback(async(bounds)=>{
    clearTimeout(loadTimer.current)
    loadTimer.current=setTimeout(async()=>{
      try{
        const data=await getParkingData(bounds)
        setSegments(data)
      }catch(e){console.error(e)}
    },700)
  },[])

  function handleDirections(item){
    const lat=item.lat||item.coords?.[0]?.[0]
    const lng=item.lng||item.coords?.[0]?.[1]
    if(lat&&lng){
      if(/iPhone|iPad|iPod/i.test(navigator.userAgent))
        window.open(`maps://maps.apple.com/?daddr=${lat},${lng}`)
      else
        window.open(`https://maps.google.com/?q=${lat},${lng}`,'_blank')
    }
  }

  function handleFindFreeBay(){
    const loc=userLocation||center
    if(!loc){setToast('📍 Enable location to find nearby bays');return}
    const nearest=findNearestFree(filteredSegments,loc.lat,loc.lng)
    if(!nearest){setToast('No free bays visible on map — try zooming out');return}
    setSelectedOffer(null)
    setSelectedSeg(nearest)
    // Pan map to bay
    const lat=nearest.lat||nearest.coords?.[0]?.[0]
    const lng=nearest.lng||nearest.coords?.[0]?.[1]
    if(lat&&lng)setCenter({lat,lng})
  }

  // Filter segments
  const filteredSegments=segments.filter(s=>{
    if(!filters.types.includes(s.type)&&!s.isCarPark)return false
    if(s.isCarPark&&!filters.types.includes('carpark'))return false
    return true
  })

  return(
    <div style={{position:'relative',height:'100dvh',background:'#0a0a0a',overflow:'hidden'}}>

      {/* Full screen map */}
      <MapLibreMap
        center={center}
        zoom={zoom}
        segments={filteredSegments}
        offers={showOffers?offers:[]}
        onSegmentClick={seg=>{setSelectedOffer(null);setSelectedSeg(seg)}}
        onOfferClick={o=>{setSelectedSeg(null);setSelectedOffer(o)}}
        onMapMove={handleBoundsChange}
      />

      {/* Top bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,zIndex:200,padding:'max(12px,env(safe-area-inset-top)) 12px 0',pointerEvents:'none'}}>

        {/* Row 1: menu + search + time */}
        <div style={{display:'flex',gap:8,marginBottom:8,pointerEvents:'all'}}>
          <button onClick={()=>setShowMenu(true)}
            style={{width:48,height:48,background:'white',border:'none',borderRadius:14,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,boxShadow:'0 2px 16px rgba(0,0,0,.2)',flexShrink:0}}>
            {[0,1,2].map(i=><div key={i} style={{width:18,height:2,background:'#333',borderRadius:1}}/>)}
          </button>
          <button onClick={()=>setShowSearch(true)}
            style={{flex:1,background:'white',border:'none',borderRadius:14,padding:'0 16px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 2px 16px rgba(0,0,0,.2)',cursor:'pointer',height:48,color:'rgba(0,0,0,.45)',fontSize:14}}>
            <span style={{color:'#4285f4',fontSize:18}}>🔍</span>
            <span style={{flex:1,textAlign:'left'}}>Search destination…</span>
          </button>
          <div style={{pointerEvents:'all',flexShrink:0}}>
            <TimeSelector startTime={startTime} duration={duration} onChangeTime={setStartTime} onChangeDuration={setDuration}/>
          </div>
        </div>

        {/* Row 2: view tabs */}
        <div style={{display:'flex',background:'white',borderRadius:12,padding:3,boxShadow:'0 2px 12px rgba(0,0,0,.15)',pointerEvents:'all',gap:2}}>
          {[['Zone view','zone'],['Bay view','bay'],['List view','list']].map(([lb,id])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{flex:1,padding:'10px 8px',borderRadius:9,border:'none',fontSize:14,fontWeight:view===id?700:400,cursor:'pointer',background:view===id?OR:'transparent',color:view===id?'white':'rgba(0,0,0,.5)',transition:'all .2s'}}>
              {lb}
            </button>
          ))}
        </div>
      </div>

      {/* Parking timer widget */}
      <ParkingTimerWidget timer={timer} onStop={stopTimer} onExtend={extendTimer}/>

      {/* Right floating */}
      <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',zIndex:200,display:'flex',flexDirection:'column',gap:10}}>
        {/* Filter */}
        <button onClick={()=>setShowFilters(true)}
          style={{width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.2)',fontSize:18}}>
          ⚙️
        </button>
        {/* Locate */}
        <button onClick={()=>{
          navigator.geolocation?.getCurrentPosition(p=>{
            const loc={lat:p.coords.latitude,lng:p.coords.longitude}
            setCenter(loc);setUserLocation(loc);setZoom(16)
          })
        }}
          style={{width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.2)',fontSize:18}}>
          📍
        </button>
        {/* Find free bay */}
        <button onClick={handleFindFreeBay}
          title="Find nearest free bay"
          style={{width:44,height:44,background:'#2ECC71',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(46,204,113,.4)',fontSize:18}}>
          🅿️
        </button>
        {/* Offers toggle */}
        <button onClick={()=>setShowOffers(s=>!s)}
          style={{width:44,height:44,background:showOffers?OR:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 2px 12px ${showOffers?'rgba(255,104,31,.4)':'rgba(0,0,0,.2)'}`,fontSize:18}}>
          🛍️
        </button>
        {/* Business */}
        <button onClick={()=>r.push('/business')}
          style={{width:44,height:44,background:OR,border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(255,104,31,.4)',fontSize:18}}>
          🏪
        </button>
      </div>

      {/* Live offers counter */}
      {offers.length>0&&view!=='list'&&!selectedSeg&&!selectedOffer&&!timer&&(
        <div style={{position:'absolute',bottom:80,left:'50%',transform:'translateX(-50%)',zIndex:200,pointerEvents:'none'}}>
          <div style={{background:OR,borderRadius:20,padding:'6px 16px',fontSize:13,fontWeight:600,color:'white',boxShadow:'0 2px 12px rgba(255,104,31,.4)',whiteSpace:'nowrap'}}>
            🛍️ {offers.length} live offer{offers.length!==1?'s':''} nearby
          </div>
        </div>
      )}

      {/* Toast */}
      {toast&&<Toast message={toast} onDismiss={()=>setToast(null)}/>}

      {/* Bottom tab bar */}
      <div className="tab-bar">
        {[
          {icon:'🗺️',label:'Map',active:view!=='list',action:()=>setView('bay')},
          {icon:'📋',label:'List',active:view==='list',action:()=>setView('list')},
          {icon:'🅿️',label:'Free bay',active:false,action:handleFindFreeBay},
          {icon:'👤',label:'Account',active:false,action:()=>user?r.push('/business'):r.push('/login?redirect=/map')},
        ].map(t=>(
          <button key={t.label} onClick={t.action} className={`tab-item${t.active?' active':''}`}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* List view */}
      {view==='list'&&(
        <ListViewSheet
          segments={filteredSegments}
          center={center}
          onSelect={seg=>{setSelectedSeg(seg);setView('bay')}}
          onDirections={handleDirections}
        />
      )}

      {/* Parking sheet */}
      {selectedSeg&&view!=='list'&&(
        <ParkingSheet
          segment={selectedSeg}
          onClose={()=>setSelectedSeg(null)}
          destination={destination}
          onDirections={handleDirections}
          onStartTimer={(mins,name,type)=>startTimer(mins,name,type)}
        />
      )}

      {/* Offer sheet */}
      {selectedOffer&&(
        <OfferSheet
          offer={selectedOffer}
          onClose={()=>setSelectedOffer(null)}
          onDirections={handleDirections}
          onLogin={()=>r.push('/login?redirect=/map')}
        />
      )}

      {/* Overlays */}
      {showSearch&&(
        <SearchOverlay
          onClose={()=>setShowSearch(false)}
          currentLocation={center}
          onSelect={loc=>{
            setCenter({lat:loc.lat,lng:loc.lng})
            setZoom(16)
            setDestination({lat:loc.lat,lng:loc.lng})
            setShowSearch(false)
          }}
        />
      )}

      <FiltersSheet
        open={showFilters}
        onClose={()=>setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
      />

      <SideMenu
        open={showMenu}
        onClose={()=>setShowMenu(false)}
        user={user}
        onAction={a=>{
          if(a==='signout'){supabase.auth.signOut();setUser(null)}
        }}
      />
    </div>
  )
}
