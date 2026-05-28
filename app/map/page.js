'use client'
import{useState,useEffect,useCallback,useRef}from'react'
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

// ── Time selector ────────────────────────────────────────
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

// ── Main ─────────────────────────────────────────────────
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
  const[view,setView]=useState('bay')
  const[user,setUser]=useState(null)
  const[showOffers,setShowOffers]=useState(true)
  const[filters,setFilters]=useState({types:['free','paid','carpark','disabled','ev','resident'],maxWalk:10,blueBadge:false,priceFilter:['free','paid']})
  const[startTime,setStartTime]=useState(new Date())
  const[duration,setDuration]=useState(1)
  const[destination,setDestination]=useState(null)
  const[showTips,setShowTips]=useState(false)
  const[showHelp,setShowHelp]=useState(false)
  const loadTimer=useRef(null)
  const gmapsKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||''
  const[useGoogleMap,setUseGoogleMap]=useState(Boolean(gmapsKey))

  useEffect(()=>{
    if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('help')==='1')setShowHelp(true)
  },[])

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user||null))
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setUser(s?.user||null))
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        p=>setCenter({lat:p.coords.latitude,lng:p.coords.longitude}),
        ()=>setCenter(UK),
        {enableHighAccuracy:true,timeout:9000,maximumAge:10000}
      )
    }
  },[])

  const handleBoundsChange=useCallback(async(bounds)=>{
    clearTimeout(loadTimer.current)
    loadTimer.current=setTimeout(async()=>{
      try{
        const [parking,poi]=await Promise.all([getParkingData(bounds),getPlacesData(bounds)])
        setSegments(parking)
        setPlaces(poi)
      }catch(e){console.error(e)}
    },700)
  },[])

  useEffect(()=>{
    if(!localStorage.getItem('hs_tips_seen'))setShowTips(true)
    handleBoundsChange(boundsAround(UK))
    getLiveOffers().then(setOffers)
    const unsub=subscribeToOffers(setOffers)
    return unsub
  },[handleBoundsChange])

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

  function walkMinsTo(seg){
    const lat=seg.lat||seg.coords?.[0]?.[0]
    const lng=seg.lng||seg.coords?.[0]?.[1]
    if(!lat||!lng)return 0
    const R=6371000
    const dLat=(lat-center.lat)*Math.PI/180
    const dLng=(lng-center.lng)*Math.PI/180
    const a=Math.sin(dLat/2)**2+Math.cos(center.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2
    return Math.max(1,Math.round((R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)))/84))
  }

  // Filter segments by active filters while keeping car parks, resident and seed categories connected.
  const filteredSegments=segments.filter(s=>{
    const type=s.isCarPark?'carpark':(s.type==='permit'?'resident':s.type)
    if(!filters.types.includes(type))return false
    if(filters.blueBadge&&type!=='disabled')return false
    if(filters.priceFilter?.length&&type!=='carpark'){
      if(type==='free'&&!filters.priceFilter.includes('free'))return false
      if(type==='paid'&&!filters.priceFilter.includes('paid'))return false
    }
    if(filters.maxWalk<30&&walkMinsTo(s)>filters.maxWalk)return false
    return true
  })

  const handleSelectSegment=seg=>{
    const lat=seg.lat||seg.coords?.[0]?.[0]
    const lng=seg.lng||seg.coords?.[0]?.[1]
    if(lat&&lng){setCenter({lat,lng});setZoom(17)}
    setSelectedOffer(null)
    setSelectedSeg(seg)
  }

  const showGoogleMap=Boolean(gmapsKey&&useGoogleMap)

  return(
    <div className="map-shell">

      {/* Full screen map */}
      {showGoogleMap?(
        <GoogleMap
          apiKey={gmapsKey}
          center={center}
          zoom={zoom}
          segments={filteredSegments}
          offers={showOffers?offers:[]}
          places={places}
          onSegmentClick={handleSelectSegment}
          onOfferClick={o=>{setSelectedSeg(null);setSelectedOffer(o)}}
          onMapMove={handleBoundsChange}
        />
      ):(
        <MapLibreMap
          center={center}
          zoom={zoom}
          segments={filteredSegments}
          offers={showOffers?offers:[]}
          places={places}
          onSegmentClick={handleSelectSegment}
          onOfferClick={o=>{setSelectedSeg(null);setSelectedOffer(o)}}
          onMapMove={handleBoundsChange}
        />
      )}

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


      {gmapsKey&&<div style={{position:'absolute',left:12,bottom:96,zIndex:210}}>
        <button onClick={()=>{
          const next=!useGoogleMap
          setUseGoogleMap(next)
          localStorage.setItem('hs_use_google_map',next?'1':'0')
        }}
          style={{background:'rgba(17,17,17,.88)',color:'white',border:'1px solid rgba(255,255,255,.2)',borderRadius:20,padding:'8px 12px',fontSize:12,cursor:'pointer'}}>
          {useGoogleMap?'Use free map':'Use Google map'}
        </button>
      </div>}

      {/* Right floating */}
      <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',zIndex:200,display:'flex',flexDirection:'column',gap:10}}>
        {/* Filter */}
        <button onClick={()=>setShowFilters(true)}
          style={{width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.2)',fontSize:18}}>
          ⚙️
        </button>
        {/* Locate */}
        <button onClick={()=>{
          navigator.geolocation?.getCurrentPosition(
            p=>{setCenter({lat:p.coords.latitude,lng:p.coords.longitude});setZoom(17)},
            ()=>setCenter(UK),
            {enableHighAccuracy:true,timeout:9000,maximumAge:5000}
          )
        }}
          style={{width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.2)',fontSize:18}}>
          📍
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
      {offers.length>0&&view!=='list'&&!selectedSeg&&!selectedOffer&&(
        <div style={{position:'absolute',bottom:80,left:'50%',transform:'translateX(-50%)',zIndex:200,pointerEvents:'none'}}>
          <div style={{background:OR,borderRadius:20,padding:'6px 16px',fontSize:13,fontWeight:600,color:'white',boxShadow:'0 2px 12px rgba(255,104,31,.4)',whiteSpace:'nowrap'}}>
            🛍️ {offers.length} live offer{offers.length!==1?'s':''} nearby
          </div>
        </div>
      )}



      {view==='bay'&&!selectedSeg&&!selectedOffer&&(!showTips)&&(
        <div style={{position:'absolute',left:12,right:12,bottom:82,zIndex:220}}>
          <div style={{background:'rgba(255,255,255,.96)',borderRadius:18,padding:'14px 16px',boxShadow:'0 10px 30px rgba(0,0,0,.2)'}}>
            <div style={{fontSize:28,fontWeight:700,color:'#111',textAlign:'center',marginBottom:10}}>What do you want to do?</div>
            <button onClick={()=>setShowSearch(true)} style={{width:'100%',padding:'14px',borderRadius:12,border:'1px solid rgba(0,0,0,.08)',background:'white',textAlign:'left',fontSize:16,cursor:'pointer',marginBottom:10}}>🔎 Plan parking in advance</button>
            <button onClick={()=>r.push('/business')} style={{width:'100%',padding:'14px',borderRadius:12,border:'1px solid rgba(0,0,0,.08)',background:'white',textAlign:'left',fontSize:16,cursor:'pointer'}}>🚗 Park smarter with Kerb-pilot</button>
          </div>
        </div>
      )}

      {showTips&&(!selectedSeg)&&(!selectedOffer)&&(
        <div style={{position:'absolute',left:12,right:12,bottom:82,zIndex:240}}>
          <div style={{background:'rgba(17,17,17,.95)',color:'white',borderRadius:16,padding:'14px 16px',boxShadow:'0 8px 28px rgba(0,0,0,.4)'}}>
            <div style={{fontSize:14,lineHeight:1.5,marginBottom:10}}>Tap any bay to see parking rules. Orange bubbles are live offers. Sign in only when you want to save places and alerts.</div>
            <button onClick={()=>{localStorage.setItem('hs_tips_seen','1');setShowTips(false)}} style={{background:'#ff681f',border:'none',color:'white',padding:'10px 14px',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Got it</button>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="tab-bar">
        {[
          {icon:'🗺️',label:'Map',active:view!=='list',action:()=>setView('bay')},
          {icon:'📋',label:'List',active:view==='list',action:()=>setView('list')},
          {icon:'🛍️',label:'Offers',active:false,action:()=>setShowOffers(s=>!s)},
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
          onSelect={seg=>{handleSelectSegment(seg);setView('bay')}}
          onDirections={handleDirections}
          onBack={()=>setView('bay')}
        />
      )}

      {/* Parking sheet */}
      {selectedSeg&&view!=='list'&&(
        <ParkingSheet
          segment={selectedSeg}
          onClose={()=>setSelectedSeg(null)}
          destination={destination}
          onDirections={handleDirections}
          onBack={()=>setView('bay')}
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


      {showHelp&&(
        <div style={{position:'absolute',inset:0,zIndex:520,background:'rgba(0,0,0,.58)',display:'flex',alignItems:'center',justifyContent:'center',padding:18}}>
          <div style={{background:'#111',border:'1px solid rgba(255,255,255,.12)',borderRadius:20,maxWidth:520,width:'100%',maxHeight:'86vh',overflowY:'auto',boxShadow:'0 18px 60px rgba(0,0,0,.5)'}}>
            <div style={{padding:20,borderBottom:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div>
                <div style={{color:'white',fontSize:22,fontWeight:800}}>Help & FAQ</div>
                <div style={{color:'rgba(255,255,255,.45)',fontSize:13,marginTop:4}}>How to read the Hi Streets map</div>
              </div>
              <button onClick={()=>setShowHelp(false)} style={{background:'rgba(255,255,255,.1)',border:'none',color:'white',width:36,height:36,borderRadius:18,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:20,color:'rgba(255,255,255,.78)',fontSize:14,lineHeight:1.55}}>
              {[
                ['Parking pins','Blue P pins are car parks. Green ✓ pins are free bays. Blue £ pins are paid bays. Purple R pins are resident bays.'],
                ['Business and POI markers','Dark POI chips show shops, stations and local services. Orange offer bubbles are live deals from nearby businesses.'],
                ['Location fallback','If you allow location access we centre the map on you. If not, the map opens around Green Street / Newham so it is never empty.'],
                ['List view','Use List to see the same filtered parking shown on the map. Tapping a row recentres the map and opens details.'],
                ['Filters','Use the cog to filter by bay type, walking time, price and blue badge parking.'],
              ].map(([q,a])=>(
                <div key={q} style={{marginBottom:16,background:'rgba(255,255,255,.05)',borderRadius:12,padding:14}}>
                  <div style={{color:'white',fontWeight:700,marginBottom:6}}>{q}</div>
                  <div>{a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SideMenu
        open={showMenu}
        onClose={()=>setShowMenu(false)}
        user={user}
        onAction={a=>{
          if(a==='signout'){supabase.auth.signOut();setUser(null)}
          if(a==='help')setShowHelp(true)
        }}
      />
    </div>
  )
}
