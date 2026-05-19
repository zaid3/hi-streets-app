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
import SideMenu from'../../components/SideMenu'

const MapLibreMap=dynamic(()=>import('../../components/MapLibreMap'),{ssr:false})

const OR='#ff681f'
const UK={lat:51.5370,lng:0.0325} // Green Street, Newham

export default function MapPage(){
  const r=useRouter()
  const[center,setCenter]=useState(UK)
  const[zoom,setZoom]=useState(15)
  const[segments,setSegments]=useState([])
  const[offers,setOffers]=useState([])
  const[selectedSeg,setSelectedSeg]=useState(null)
  const[selectedOffer,setSelectedOffer]=useState(null)
  const[showSearch,setShowSearch]=useState(false)
  const[showMenu,setShowMenu]=useState(false)
  const[view,setView]=useState('bay') // bay | zone | list
  const[user,setUser]=useState(null)
  const[loading,setLoading]=useState(true)
  const[showOffers,setShowOffers]=useState(true)
  const loadTimer=useRef(null)

  // Auth
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user||null))
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setUser(s?.user||null))
    return()=>subscription.unsubscribe()
  },[])

  // Location
  useEffect(()=>{
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        p=>{setCenter({lat:p.coords.latitude,lng:p.coords.longitude});setLoading(false)},
        ()=>setLoading(false),
        {timeout:5000,maximumAge:30000}
      )
    }else setLoading(false)
  },[])

  // Live offers
  useEffect(()=>{
    getLiveOffers().then(setOffers)
    const unsub=subscribeToOffers(setOffers)
    return unsub
  },[])

  // Load parking on bounds change
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
    if(lat&&lng)window.open(`https://maps.google.com/?q=${lat},${lng}`,'_blank')
  }

  return(
    <div style={{position:'relative',height:'100dvh',background:'#0a0a0a',overflow:'hidden'}}>

      {/* Full screen map */}
      <MapLibreMap
        center={center}
        zoom={zoom}
        segments={segments}
        offers={showOffers?offers:[]}
        onSegmentClick={seg=>{setSelectedOffer(null);setSelectedSeg(seg)}}
        onOfferClick={o=>{setSelectedSeg(null);setSelectedOffer(o)}}
        onMapMove={handleBoundsChange}
        showSegments={true}
        showOffers={showOffers}
      />

      {/* Top search bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,zIndex:200,padding:'max(12px,env(safe-area-inset-top)) 12px 0',pointerEvents:'none'}}>
        <div style={{display:'flex',gap:8,pointerEvents:'all'}}>
          {/* Menu */}
          <button onClick={()=>setShowMenu(true)}
            style={{width:48,height:48,background:'white',border:'none',borderRadius:14,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,boxShadow:'0 2px 16px rgba(0,0,0,.2)',flexShrink:0}}>
            {[0,1,2].map(i=><div key={i} style={{width:18,height:2,background:'#333',borderRadius:1}}/>)}
          </button>

          {/* Search */}
          <button onClick={()=>setShowSearch(true)}
            style={{flex:1,background:'white',border:'none',borderRadius:14,padding:'0 16px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 2px 16px rgba(0,0,0,.2)',cursor:'pointer',height:48,color:'rgba(0,0,0,.45)',fontSize:14}}>
            <span style={{fontSize:18}}>🔍</span>
            <span>Search destination…</span>
          </button>

          {/* Offers toggle */}
          <button onClick={()=>setShowOffers(s=>!s)}
            style={{width:48,height:48,background:showOffers?OR:'white',border:'none',borderRadius:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 16px rgba(0,0,0,.2)',fontSize:20,flexShrink:0}}>
            🛍️
          </button>
        </div>

        {/* View tabs */}
        <div style={{display:'flex',background:'white',borderRadius:12,padding:3,boxShadow:'0 2px 12px rgba(0,0,0,.15)',marginTop:8,pointerEvents:'all',gap:2}}>
          {[['🅿️ Bays','bay'],['📍 Zones','zone'],['📋 List','list']].map(([lb,id])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{flex:1,padding:'9px 8px',borderRadius:9,border:'none',fontSize:13,fontWeight:view===id?700:400,cursor:'pointer',background:view===id?OR:'transparent',color:view===id?'white':'rgba(0,0,0,.5)',transition:'all .2s'}}>
              {lb}
            </button>
          ))}
        </div>
      </div>

      {/* Right floating buttons */}
      <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',zIndex:200,display:'flex',flexDirection:'column',gap:10}}>
        <button
          onClick={()=>{
            if(navigator.geolocation){
              navigator.geolocation.getCurrentPosition(p=>{
                setCenter({lat:p.coords.latitude,lng:p.coords.longitude})
                setZoom(16)
              })
            }
          }}
          style={{width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.2)',fontSize:20}}>
          📍
        </button>
        <button
          onClick={()=>r.push('/business')}
          style={{width:44,height:44,background:OR,border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(255,104,31,.4)',fontSize:18}}>
          🏪
        </button>
      </div>

      {/* Live offers counter pill */}
      {offers.length>0&&(
        <div style={{position:'absolute',bottom:90,left:'50%',transform:'translateX(-50%)',zIndex:200}}>
          <div style={{background:OR,borderRadius:20,padding:'6px 16px',fontSize:13,fontWeight:600,color:'white',boxShadow:'0 2px 12px rgba(255,104,31,.4)',whiteSpace:'nowrap'}}>
            🛍️ {offers.length} live offer{offers.length!==1?'s':''} nearby
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="tab-bar">
        {[
          {icon:'🗺️',label:'Map',active:true,action:()=>{}},
          {icon:'🛍️',label:'Offers',active:false,action:()=>setShowOffers(s=>!s)},
          {icon:'🔔',label:'Alerts',active:false,action:()=>{}},
          {icon:'👤',label:'Account',active:false,action:()=>user?r.push('/business'):r.push('/login?redirect=/map')},
        ].map(t=>(
          <button key={t.label} onClick={t.action} className={`tab-item${t.active?' active':''}`}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Sheets */}
      {selectedSeg&&<ParkingSheet segment={selectedSeg} onClose={()=>setSelectedSeg(null)} onDirections={handleDirections}/>}
      {selectedOffer&&<OfferSheet offer={selectedOffer} onClose={()=>setSelectedOffer(null)} onDirections={handleDirections} onLogin={()=>r.push('/login?redirect=/map')}/>}

      {/* Overlays */}
      {showSearch&&<SearchOverlay onClose={()=>setShowSearch(false)} currentLocation={center} onSelect={loc=>{setCenter({lat:loc.lat,lng:loc.lng});setZoom(16);setShowSearch(false)}}/>}
      <SideMenu open={showMenu} onClose={()=>setShowMenu(false)} user={user}
        onAction={a=>{
          if(a==='signout'){supabase.auth.signOut();setUser(null)}
          else if(a==='saved'||a==='notif'||a==='help'){}
        }}/>
    </div>
  )
}
