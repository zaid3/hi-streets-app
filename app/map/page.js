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
        style={{background:'white',border:'1px solid rgba(0,0,0,.09)',borderRadius:12,padding:'0 14px',boxShadow:'0 1px 8px rgba(0,0,0,.10)',cursor:'pointer',height:48,display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#333',fontWeight:500,whiteSpace:'nowrap'}}>
        <span style={{fontWeight:700,color:'#111'}}>{fmt(startTime)}</span>
        <span style={{color:'rgba(0,0,0,.35)'}}>→ {duration}h</span>
        <span style={{color:'rgba(0,0,0,.35)',fontSize:11}}>{today}</span>
      </button>

      {open&&(
        <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'white',borderRadius:16,boxShadow:'0 8px 32px rgba(0,0,0,.15)',padding:16,zIndex:600,minWidth:220,border:'1px solid rgba(0,0,0,.07)'}}>
          <div style={{fontSize:11,color:'rgba(0,0,0,.4)',fontWeight:700,letterSpacing:.5,marginBottom:8}}>ARRIVE AT</div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            {[new Date(),new Date(Date.now()+3600000),new Date(Date.now()+7200000)].map((t,i)=>(
              <button key={i} onClick={()=>onChangeTime(t)}
                style={{flex:1,padding:'8px 4px',borderRadius:10,border:`1.5px solid ${fmt(startTime)===fmt(t)?OR:'rgba(0,0,0,.1)'}`,background:fmt(startTime)===fmt(t)?'rgba(255,104,31,.06)':'white',color:fmt(startTime)===fmt(t)?OR:'#333',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {i===0?'Now':fmt(t)}
              </button>
            ))}
          </div>
          <div style={{fontSize:11,color:'rgba(0,0,0,.4)',fontWeight:700,letterSpacing:.5,marginBottom:8}}>DURATION</div>
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

// ── Haversine ─────────────────────────────────────────────
function haversine(lat1,lng1,lat2,lng2){
  const R=6371000
  const dLat=(lat2-lat1)*Math.PI/180
  const dLng=(lng2-lng1)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

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

// ── Toast ─────────────────────────────────────────────────
function Toast({message,onDismiss}){
  useEffect(()=>{const t=setTimeout(onDismiss,3500);return()=>clearTimeout(t)},[onDismiss])
  return(
    <div style={{position:'fixed',bottom:'calc(max(8px,env(safe-area-inset-bottom)) + 68px)',left:'50%',transform:'translateX(-50%)',zIndex:480,background:'#1a1a1a',borderRadius:14,padding:'10px 18px',fontSize:13,color:'white',fontWeight:500,whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(0,0,0,.3)'}}>
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
        p=>{const loc={lat:p.coords.latitude,lng:p.coords.longitude};setCenter(loc);setUserLocation(loc)},
        ()=>{},{timeout:6000,maximumAge:30000}
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
      try{const data=await getParkingData(bounds);setSegments(data)}catch(e){console.error(e)}
    },700)
  },[])

  function handleDirections(item){
    const lat=item.lat||item.coords?.[0]?.[0]
    const lng=item.lng||item.coords?.[0]?.[1]
    if(lat&&lng){
      if(/iPhone|iPad|iPod/i.test(navigator.userAgent))window.open(`maps://maps.apple.com/?daddr=${lat},${lng}`)
      else window.open(`https://maps.google.com/?q=${lat},${lng}`,'_blank')
    }
  }

  function handleFindFreeBay(){
    const loc=userLocation||center
    if(!loc){setToast('📍 Enable location to find nearby bays');return}
    const nearest=findNearestFree(filteredSegments,loc.lat,loc.lng)
    if(!nearest){setToast('No free bays visible — try zooming out');return}
    setSelectedOffer(null);setSelectedSeg(nearest)
    const lat=nearest.lat||nearest.coords?.[0]?.[0]
    const lng=nearest.lng||nearest.coords?.[0]?.[1]
    if(lat&&lng)setCenter({lat,lng})
  }

  const filteredSegments=segments.filter(s=>{
    if(!filters.types.includes(s.type)&&!s.isCarPark)return false
    if(s.isCarPark&&!filters.types.includes('carpark'))return false
    return true
  })

  // Top bar height for safe positioning
  const topBarH='max(124px,calc(env(safe-area-inset-top) + 116px))'

  return(
    <div style={{position:'fixed',inset:0,background:'#f2f3f5',overflow:'hidden'}}>

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

      {/* ── Top bar ───────────────────────────────────────── */}
      <div style={{position:'absolute',top:0,left:0,right:0,zIndex:200,padding:'max(12px,env(safe-area-inset-top)) 12px 0',background:'white',boxShadow:'0 1px 0 rgba(0,0,0,.06)'}}>
        {/* Row 1: search + time */}
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <button onClick={()=>setShowSearch(true)}
            style={{flex:1,background:'#f2f3f5',border:'none',borderRadius:12,padding:'0 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',height:48,color:'rgba(0,0,0,.4)',fontSize:14}}>
            <span style={{color:'#4285f4',fontSize:17}}>🔍</span>
            <span style={{flex:1,textAlign:'left',fontWeight:400}}>Search destination…</span>
          </button>
          <TimeSelector startTime={startTime} duration={duration} onChangeTime={setStartTime} onChangeDuration={setDuration}/>
        </div>

        {/* Row 2: view tabs */}
        <div style={{display:'flex',background:'#f2f3f5',borderRadius:10,padding:'3px',gap:2,marginBottom:10}}>
          {[['Zone view','zone'],['Bay view','bay'],['List view','list']].map(([lb,id])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{flex:1,padding:'9px 8px',borderRadius:8,border:'none',fontSize:14,fontWeight:view===id?600:400,cursor:'pointer',background:view===id?OR:'transparent',color:view===id?'white':'rgba(0,0,0,.5)',transition:'all .2s'}}>
              {lb}
            </button>
          ))}
        </div>
      </div>

      {/* ── Map-level controls ─────────────────────────────── */}
      {/* Menu button — top left of map */}
      <button onClick={()=>setShowMenu(true)}
        style={{position:'absolute',top:`max(${parseInt('12')+96}px,calc(env(safe-area-inset-top) + 118px))`,left:12,zIndex:200,width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,boxShadow:'0 2px 12px rgba(0,0,0,.15)'}}>
        {[0,1,2].map(i=><div key={i} style={{width:16,height:2,background:'#333',borderRadius:1}}/>)}
      </button>

      {/* Filter button — top right of map */}
      <button onClick={()=>setShowFilters(true)}
        style={{position:'absolute',top:`max(${parseInt('12')+96}px,calc(env(safe-area-inset-top) + 118px))`,right:12,zIndex:200,width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.15)',fontSize:18}}>
        ⚙️
      </button>

      {/* Locate button — bottom right above tab bar */}
      <button onClick={()=>{
        navigator.geolocation?.getCurrentPosition(p=>{
          const loc={lat:p.coords.latitude,lng:p.coords.longitude}
          setCenter(loc);setUserLocation(loc);setZoom(16)
        })
      }}
        style={{position:'fixed',bottom:'calc(max(8px,env(safe-area-inset-bottom)) + 72px)',right:16,zIndex:200,width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.2)',fontSize:20}}>
        🎯
      </button>

      {/* Offers toggle — bottom right, above locate */}
      {offers.length>0&&(
        <button onClick={()=>setShowOffers(s=>!s)}
          style={{position:'fixed',bottom:'calc(max(8px,env(safe-area-inset-bottom)) + 122px)',right:16,zIndex:200,width:44,height:44,background:showOffers?OR:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 2px 12px ${showOffers?'rgba(255,104,31,.35)':'rgba(0,0,0,.15)'}`,fontSize:18}}>
          🛍️
        </button>
      )}

      {/* Parking timer widget */}
      <ParkingTimerWidget timer={timer} onStop={stopTimer} onExtend={extendTimer}/>

      {/* Live offers counter */}
      {offers.length>0&&showOffers&&view!=='list'&&!selectedSeg&&!selectedOffer&&!timer&&(
        <div style={{position:'fixed',bottom:'calc(max(8px,env(safe-area-inset-bottom)) + 68px)',left:'50%',transform:'translateX(-50%)',zIndex:480,pointerEvents:'none'}}>
          <div style={{background:OR,borderRadius:20,padding:'6px 16px',fontSize:13,fontWeight:600,color:'white',boxShadow:'0 2px 12px rgba(255,104,31,.35)',whiteSpace:'nowrap'}}>
            🛍️ {offers.length} live offer{offers.length!==1?'s':''} nearby
          </div>
        </div>
      )}

      {/* Toast */}
      {toast&&<Toast message={toast} onDismiss={()=>setToast(null)}/>}

      {/* ── Tab bar ───────────────────────────────────────── */}
      <div className="tab-bar">
        {[
          {icon:'🗺️',label:'Map',active:view==='bay'||view==='zone',action:()=>setView('bay')},
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

      {/* ── Sheets & overlays ─────────────────────────────── */}

      {/* List view */}
      {view==='list'&&(
        <ListViewSheet
          segments={filteredSegments}
          center={center}
          onSelect={seg=>{setSelectedSeg(seg);setView('bay')}}
          onDirections={handleDirections}
        />
      )}

      {/* Parking sheet backdrop */}
      {selectedSeg&&view!=='list'&&(
        <div onClick={()=>setSelectedSeg(null)} style={{position:'fixed',inset:0,zIndex:399}}/>
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

      {/* Search */}
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

      <FiltersSheet open={showFilters} onClose={()=>setShowFilters(false)} filters={filters} onApply={setFilters}/>

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
