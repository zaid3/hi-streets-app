'use client'
import{useState,useEffect,useCallback,useRef}from'react'
import{useRouter}from'next/navigation'
import dynamic from'next/dynamic'
import{supabase}from'../../lib/supabase.js'
import{getCurrentLocation,UK_DEFAULT}from'../../lib/mapAdapters.js'
import{getParkingSegmentsByViewport,getCarParksByViewport}from'../../lib/parkingDataAdapter.js'
import{getPlacesByViewport}from'../../lib/placesAdapter.js'
import{getLiveOffers}from'../../lib/offersAdapter.js'
import{mockNotifications}from'../../data/mockNotifications.js'
import{getCatIcon,getCatColor}from'../../data/mockOffers.js'
import SearchOverlay from'../../components/SearchOverlay.js'
import ParkingSheet from'../../components/ParkingSheet.js'
import OfferSheet from'../../components/OfferSheet.js'
import FiltersSheet from'../../components/FiltersSheet.js'
import SideMenu from'../../components/SideMenu.js'
import HelpFAQ from'../../components/HelpFAQ.js'
import NotificationCenter from'../../components/NotificationCenter.js'
import ZoneView from'../../components/ZoneView.js'
import ListViewSheet from'../../components/ListViewSheet.js'
import WhatToDo from'../../components/WhatToDo.js'

const HSMap=dynamic(()=>import('../../components/Map.js'),{ssr:false})

const OR='#ff681f'
const PANEL='rgba(8,8,8,.99)'

// Compact top bar + time selector
function TopBar({onMenu,onSearch,onNotifOpen,unread,mapView,setMapView}){
  const[showTime,setShowTime]=useState(false)
  const now=new Date()
  const timeStr=`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
  return(
    <div style={{position:'absolute',top:0,left:0,right:0,zIndex:200,padding:'12px 12px 0',pointerEvents:'none'}}>
      {/* Row 1: search + time */}
      <div style={{display:'flex',gap:8,marginBottom:8,pointerEvents:'all'}}>
        <button onClick={onSearch} style={{flex:1,background:'white',border:'1px solid rgba(0,0,0,.1)',borderRadius:12,display:'flex',alignItems:'center',padding:'0 14px',gap:10,boxShadow:'0 2px 12px rgba(0,0,0,.15)',cursor:'pointer',height:48,color:'rgba(0,0,0,.45)',fontSize:14}}>
          <span style={{color:'#4285f4',fontSize:18}}>🔍</span>
          <span>Search destination</span>
        </button>
        <button onClick={()=>setShowTime(!showTime)} style={{background:'white',border:'1px solid rgba(0,0,0,.1)',borderRadius:12,padding:'0 14px',boxShadow:'0 2px 12px rgba(0,0,0,.15)',cursor:'pointer',height:48,display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#333',fontWeight:500,flexShrink:0}}>
          <span style={{fontWeight:600}}>{timeStr}</span>
          <span style={{color:'rgba(0,0,0,.4)'}}>→ 1h</span>
          <span style={{color:'rgba(0,0,0,.4)',fontSize:11}}>Today</span>
        </button>
      </div>
      {/* Row 2: zone/bay/list tabs */}
      <div style={{display:'flex',background:'white',borderRadius:12,padding:4,boxShadow:'0 2px 12px rgba(0,0,0,.15)',pointerEvents:'all',gap:2}}>
        {[['Zone view','zone'],['Bay view','bay'],['List view','list']].map(([lb,id])=>(
          <button key={id} onClick={()=>setMapView(id)} style={{flex:1,padding:'10px 8px',borderRadius:8,border:'none',fontSize:14,fontWeight:mapView===id?700:400,cursor:'pointer',background:mapView===id?OR:'transparent',color:mapView===id?'white':'rgba(0,0,0,.55)',transition:'all .2s'}}>
            {lb}
          </button>
        ))}
      </div>
    </div>
  )
}

function FloatingButtons({onMenu,onFilter,onLocate,onNotifOpen,unread,onSmarter}){
  return(
    <>
      {/* Left: menu */}
      <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',zIndex:200}}>
        <button onClick={onMenu} style={{width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.2)',flexDirection:'column',gap:4}}>
          {[0,1,2].map(i=><div key={i} style={{width:18,height:2,background:'#555',borderRadius:1}}/>)}
        </button>
      </div>
      {/* Right: filter + locate + 3D */}
      <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',zIndex:200,display:'flex',flexDirection:'column',gap:10}}>
        <button onClick={onFilter} style={{width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.2)',fontSize:18}}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="2.5" stroke="#555" strokeWidth="1.5"/><circle cx="13" cy="13" r="2.5" stroke="#555" strokeWidth="1.5"/><line x1="7" y1="2" x2="7" y2="12" stroke="#555" strokeWidth="1.5"/><line x1="13" y1="8" x2="13" y2="18" stroke="#555" strokeWidth="1.5"/></svg>
        </button>
        <button onClick={onLocate} style={{width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.2)',fontSize:18}}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3.5" stroke="#4285f4" strokeWidth="1.5"/><line x1="10" y1="1" x2="10" y2="5" stroke="#4285f4" strokeWidth="1.5"/><line x1="10" y1="15" x2="10" y2="19" stroke="#4285f4" strokeWidth="1.5"/><line x1="1" y1="10" x2="5" y2="10" stroke="#4285f4" strokeWidth="1.5"/><line x1="15" y1="10" x2="19" y2="10" stroke="#4285f4" strokeWidth="1.5"/></svg>
        </button>
        <button onClick={()=>alert('3D mode coming soon — needs Mapbox GL JS')} style={{width:44,height:44,background:'white',border:'none',borderRadius:50,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,.2)',fontSize:14,fontWeight:700,color:'#555'}}>3D</button>
      </div>
    </>
  )
}

function Logo({small}){
  const s=small?22:30,cs=small?5:7,sw=small?1.8:2.3
  return(
    <div style={{display:'inline-flex',flexDirection:'column',fontFamily:'Arial,Helvetica,sans-serif',lineHeight:1}}>
      <div style={{display:'flex',alignItems:'center'}}>
        <div style={{position:'relative',width:s*1.3,height:s*1.1,flexShrink:0}}>
          <div style={{position:'absolute',top:0,left:0,width:cs,height:cs,borderTop:sw+'px solid '+OR,borderLeft:sw+'px solid '+OR}}/>
          <span style={{position:'absolute',left:cs*.7,bottom:cs*.4,fontSize:s,fontWeight:800,color:OR,letterSpacing:'-0.08em'}}>Hi</span>
          <div style={{position:'absolute',right:0,bottom:cs*.3,width:cs,height:cs,borderBottom:sw+'px solid '+OR,borderRight:sw+'px solid '+OR}}/>
        </div>
        <span style={{fontSize:s*.9,fontWeight:400,color:'#fff',letterSpacing:'-0.055em'}}>Streets</span>
      </div>
    </div>
  )
}

function BottomNav({active,setActive,unread}){
  const tabs=[{id:'map',label:'Map',icon:'M'},{id:'offers',label:'Offers',icon:'O'},{id:'parking',label:'Park',icon:'P'},{id:'alerts',label:'Alerts',badge:unread,icon:'N'},{id:'account',label:'Account',icon:'A'}]
  const icons={map:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2C7.7 2 5 4.7 5 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" fill="currentColor"/></svg>,offers:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M7 11h8M11 7v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,parking:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M9 7h3a3 3 0 010 6H9V7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,alerts:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3a6 6 0 016 6v4l2 3H3l2-3V9a6 6 0 016-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 19a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,account:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M3 19c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
  return(
    <div style={{background:PANEL,borderTop:'1px solid rgba(255,255,255,.08)',display:'flex',paddingBottom:'env(safe-area-inset-bottom,10px)',zIndex:100,flexShrink:0}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>setActive(t.id)} style={{flex:1,background:'none',border:'none',cursor:'pointer',padding:'10px 0 6px',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
          <div style={{position:'relative',color:active===t.id?OR:'rgba(255,255,255,.45)'}}>
            {icons[t.id]}
            {t.badge>0&&<div style={{position:'absolute',top:-4,right:-6,background:'#E74C3C',color:'#fff',borderRadius:8,fontSize:9,fontWeight:800,minWidth:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{t.badge}</div>}
          </div>
          <span style={{fontSize:10,fontWeight:active===t.id?700:400,color:active===t.id?OR:'rgba(255,255,255,.4)'}}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

function OffersTab({offers,onSelect}){
  const[cat,setCat]=useState('all')
  const CATS=[{id:'all',label:'All'},{id:'food',label:'Food'},{id:'retail',label:'Retail'},{id:'beauty',label:'Beauty'},{id:'cafe',label:'Cafes'}]
  function tl(exp){const d=new Date(exp)-new Date();if(d<0)return'Expired';const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000);return h>0?`${h}h ${m}m`:m+'m left'}
  const filt=cat==='all'?offers:offers.filter(o=>o.category===cat)
  return(
    <div style={{flex:1,overflowY:'auto'}}>
      <div style={{padding:'16px 20px 0',marginBottom:12}}><h2 style={{fontSize:20,fontWeight:800}}>Live Offers Nearby</h2><p style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:4}}>{filt.length} offers · Live</p></div>
      <div style={{display:'flex',gap:8,overflowX:'auto',padding:'0 20px 14px'}}>
        {CATS.map(c=><button key={c.id} onClick={()=>setCat(c.id)} style={{padding:'7px 14px',borderRadius:20,border:'none',whiteSpace:'nowrap',fontSize:13,fontWeight:600,cursor:'pointer',flexShrink:0,background:cat===c.id?'linear-gradient(135deg,'+OR+',#FF8C00)':'rgba(255,255,255,.08)',color:'#fff',border:cat===c.id?'none':'1px solid rgba(255,255,255,.1)'}}>{c.label}</button>)}
      </div>
      <div style={{padding:'0 20px 24px',display:'flex',flexDirection:'column',gap:12}}>
        {filt.map(o=>{const ic=getCatIcon(o.category),col=getCatColor(o.category);return(
          <div key={o.id} onClick={()=>onSelect(o)} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,padding:16,cursor:'pointer'}}>
            <div style={{display:'flex',gap:12}}>
              <div style={{width:50,height:50,borderRadius:14,background:col+'22',border:'1px solid '+col+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{ic}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:3}}>{o.title}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,.45)',marginBottom:8}}>{o.businessName} · {o.distance}</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <span style={{background:OR+'22',color:OR,borderRadius:10,padding:'4px 10px',fontSize:12,fontWeight:700}}>{o.shortLabel}</span>
                  {o.expiresAt&&<span style={{background:'rgba(255,255,255,.07)',borderRadius:10,padding:'4px 10px',fontSize:12,color:'rgba(255,255,255,.4)'}}>⏱ {tl(o.expiresAt)}</span>}
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}

function ParkingTab({segments,carParks,onSelect}){
  const all=[...segments.map(s=>({...s,it:'seg'})),...(carParks||[]).map(c=>({...c,it:'cp'}))]
  const cols={free:'#2ECC71',paid:'#4A9EFF',permit:'#9B59B6',restricted:'#888',loading:'#F39C12',carpark:'#2a5fba'}
  return(
    <div style={{flex:1,overflowY:'auto'}}>
      <div style={{padding:'16px 20px 12px'}}><h2 style={{fontSize:20,fontWeight:800}}>Parking Near You</h2><p style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:4}}>{all.length} spots · Live status</p></div>
      {all.map(item=>{const c=cols[item.type]||'#4A9EFF';return(
        <div key={item.id} onClick={()=>onSelect(item)} style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',gap:12,alignItems:'center',cursor:'pointer',borderLeft:'3px solid '+c}}>
          <div style={{width:44,height:44,background:c+'22',border:'1px solid '+c+'44',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:c,fontSize:14}}>P</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{item.name}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>{item.label||item.statusLabel} · {item.maxStay||'No limit'}</div>
          </div>
          <div style={{fontSize:12,fontWeight:700,color:c}}>{item.cost>0?'£'+item.cost+'/hr':'Free'}</div>
        </div>
      )})}
    </div>
  )
}

function AccountTab({user,onNav,onSignOut}){
  const menus=[['🔖','Saved places','saved'],['🔔','Notifications','notifs'],['🏪','Business dashboard','business'],['❓','Help & FAQ','help'],['📧','Contact support','contact'],['⚙️','Settings','settings']]
  return(
    <div style={{flex:1,overflowY:'auto'}}>
      <div style={{padding:'16px 20px 12px'}}><h2 style={{fontSize:20,fontWeight:800}}>Account</h2></div>
      <div style={{padding:'0 20px 16px'}}>
        <div style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,padding:18,display:'flex',gap:14,alignItems:'center'}}>
          <div style={{width:54,height:54,borderRadius:16,background:OR+'22',border:'1px solid '+OR+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>👤</div>
          <div><div style={{fontSize:16,fontWeight:700}}>{user?.email||'Guest user'}</div><div style={{fontSize:13,color:'rgba(255,255,255,.4)',marginTop:2}}>Hi-Streets member</div></div>
        </div>
      </div>
      <div style={{padding:'0 20px',display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
        {menus.map(([ic,lb,ac])=><button key={ac} onClick={()=>onNav(ac)} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',color:'#fff',textAlign:'left',width:'100%'}}><span style={{fontSize:22}}>{ic}</span><span style={{fontSize:14,fontWeight:600,flex:1}}>{lb}</span><span style={{color:'rgba(255,255,255,.3)'}}>›</span></button>)}
      </div>
      <div style={{padding:'0 20px 40px'}}>
        <button onClick={onSignOut} style={{width:'100%',background:'rgba(231,76,60,.1)',border:'1px solid rgba(231,76,60,.3)',borderRadius:14,padding:16,fontSize:15,fontWeight:700,color:'#E74C3C',cursor:'pointer'}}>🚪 Logout</button>
      </div>
    </div>
  )
}

export default function MapPage(){
  const router=useRouter()
  const[activeTab,setActiveTab]=useState('map')
  const[loc,setLoc]=useState({lat:UK_DEFAULT.lat,lng:UK_DEFAULT.lng})
  const[mapCenter,setMapCenter]=useState({lat:UK_DEFAULT.lat,lng:UK_DEFAULT.lng})
  const[segments,setSegments]=useState([])
  const[carParks,setCarParks]=useState([])
  const[offers,setOffers]=useState([])
  const[places,setPlaces]=useState([])
  const[notifs,setNotifs]=useState(mockNotifications)
  const[selParking,setSelParking]=useState(null)
  const[selOffer,setSelOffer]=useState(null)
  const[showSearch,setShowSearch]=useState(false)
  const[showFilters,setShowFilters]=useState(false)
  const[showMenu,setShowMenu]=useState(false)
  const[showHelp,setShowHelp]=useState(false)
  const[showNotifs,setShowNotifs]=useState(false)
  const[showWhatToDo,setShowWhatToDo]=useState(true)
  const[filters,setFilters]=useState(['free','paid','carpark','permit','restricted','loading','offers','segments','carparks','pois'])
  const[mapView,setMapView]=useState('bay')
  const[user,setUser]=useState(null)
  const[toast,setToast]=useState(null)
  const loadTimer=useRef(null)
  const unread=notifs.filter(n=>!n.read).length

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),2800)}

  useEffect(()=>{
    const g=typeof window!=='undefined'&&localStorage.getItem('hs_guest')
    if(!g)supabase.auth.getSession().then(({data:{session}})=>{if(!session)router.replace('/splash');else setUser(session.user)})
    getCurrentLocation().then(pos=>{setLoc(pos);setMapCenter(pos)}).catch(()=>{})
    getLiveOffers().then(setOffers)
    const ch=supabase.channel('off').on('postgres_changes',{event:'INSERT',schema:'public',table:'offers'},p=>{
      const o={...p.new,shortLabel:(p.new.title||'').slice(0,22),businessName:'Local business',distance:'near you',lat:UK_DEFAULT.lat,lng:UK_DEFAULT.lng}
      setOffers(prev=>[o,...prev])
      setNotifs(prev=>[{id:'rt-'+Date.now(),type:'offer',icon:'🛍️',title:'New offer!',body:o.title,time:'just now',read:false},...prev])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])

  const handleBoundsChange=useCallback(async bounds=>{
    clearTimeout(loadTimer.current)
    loadTimer.current=setTimeout(async()=>{
      const[segs,cps,pls]=await Promise.all([getParkingSegmentsByViewport(bounds),getCarParksByViewport(bounds),getPlacesByViewport(bounds,80)])
      setSegments(segs);setCarParks(cps);setPlaces(pls)
    },700)
  },[])

  function handleSearchSelect(item){setMapCenter({lat:item.lat,lng:item.lng});setShowSearch(false)}

  function handleNav(action){
    setShowMenu(false)
    const m={map:()=>setActiveTab('map'),search:()=>setShowSearch(true),alerts:()=>setShowNotifs(true),notifs:()=>setShowNotifs(true),help:()=>setShowHelp(true),business:()=>router.push('/business'),contact:()=>{window.location.href='mailto:support@histreets.uk'},report:()=>showToast('Report submitted — thank you!'),settings:()=>showToast('Settings coming soon'),saved:()=>showToast('Saved places coming soon')}
    m[action]?.()
  }

  async function signOut(){await supabase.auth.signOut();typeof window!=='undefined'&&localStorage.removeItem('hs_guest');router.replace('/splash')}

  const fSegs=segments.filter(s=>{
    if(s.type==='free'&&!filters.includes('free'))return false
    if(s.type==='paid'&&!filters.includes('paid'))return false
    if(s.type==='permit'&&!filters.includes('permit'))return false
    if(s.type==='restricted'&&!filters.includes('restricted'))return false
    if(s.type==='loading'&&!filters.includes('loading'))return false
    return true
  })

  const showSegs=filters.includes('segments')
  const showCPs=filters.includes('carparks')
  const showOfrs=filters.includes('offers')
  const showPOIs=filters.includes('pois')

  return(
    <div style={{position:'fixed',inset:0,background:'#0a0a0a',display:'flex',flexDirection:'column',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
      {toast&&<div style={{position:'fixed',top:'10%',left:'50%',transform:'translateX(-50%)',background:'rgba(10,10,10,.97)',border:'1px solid rgba(255,255,255,.12)',color:'#fff',borderRadius:20,padding:'10px 22px',fontSize:14,fontWeight:600,zIndex:9999,whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>{toast}</div>}

      {activeTab==='map'&&(
        <div style={{flex:1,position:'relative',overflow:'hidden'}}>
          <HSMap
            segments={showSegs?fSegs:[]} carParks={showCPs?carParks:[]}
            offers={showOfrs?offers:[]} places={showPOIs?places:[]}
            center={mapCenter} zoom={15}
            onSegmentClick={s=>{setSelParking(s);setSelOffer(null);setShowWhatToDo(false)}}
            onCarParkClick={c=>{setSelParking(c);setSelOffer(null);setShowWhatToDo(false)}}
            onOfferClick={o=>{setSelOffer(o);setSelParking(null);setShowWhatToDo(false)}}
            onMapMove={handleBoundsChange}
            showSegments={showSegs} showCarParks={showCPs} showOffers={showOfrs} showPlaces={showPOIs}
          />

          <TopBar onMenu={()=>setShowMenu(true)} onSearch={()=>setShowSearch(true)} onNotifOpen={()=>setShowNotifs(true)} unread={unread} mapView={mapView} setMapView={v=>{setMapView(v);setSelParking(null);setSelOffer(null);if(v==='bay')setShowWhatToDo(true)}}/>

          <FloatingButtons onMenu={()=>setShowMenu(true)} onFilter={()=>setShowFilters(true)} onLocate={()=>setMapCenter(loc)} onNotifOpen={()=>setShowNotifs(true)} unread={unread} onSmarter={()=>showToast('Park smarter mode coming soon!')}/>

          {/* Zone view */}
          {mapView==='zone'&&!selParking&&!selOffer&&<ZoneView onClose={()=>setMapView('bay')}/>}

          {/* List view */}
          {mapView==='list'&&!selParking&&!selOffer&&<ListViewSheet segments={fSegs} carParks={carParks} onSelect={item=>{setSelParking(item);setMapView('bay')}} filters={filters} onFilterChange={setFilters}/>}

          {/* Bay view — What do you want to do bottom mini-sheet */}
          {mapView==='bay'&&!selParking&&!selOffer&&showWhatToDo&&(
            <WhatToDo
              onPlan={()=>showToast('Parking planner coming soon!')}
              onSmarter={()=>showToast('Park smarter — coming soon!')}
              onClose={()=>setShowWhatToDo(false)}
            />
          )}

          {/* Parking detail sheet */}
          {selParking&&<ParkingSheet item={selParking} onClose={()=>{setSelParking(null);setShowWhatToDo(true)}} onReport={()=>showToast('Report submitted!')}/>}

          {/* Offer sheet */}
          {selOffer&&<OfferSheet item={selOffer} onClose={()=>{setSelOffer(null);setShowWhatToDo(true)}}/>}

          {/* Overlays */}
          {showFilters&&<FiltersSheet activeFilters={filters} onApply={setFilters} onClose={()=>setShowFilters(false)}/>}
          {showSearch&&<SearchOverlay onSelect={handleSearchSelect} onClose={()=>setShowSearch(false)} currentLocation={loc}/>}
          {showMenu&&<SideMenu onClose={()=>setShowMenu(false)} onNav={handleNav} onSignOut={signOut} user={user}/>}
          {showHelp&&<HelpFAQ onClose={()=>setShowHelp(false)}/>}
          {showNotifs&&<NotificationCenter notifications={notifs} onClose={()=>setShowNotifs(false)} onUpdate={setNotifs}/>}
        </div>
      )}

      {activeTab==='offers'&&<OffersTab offers={offers} onSelect={o=>{setSelOffer(o);setActiveTab('map')}}/>}
      {activeTab==='parking'&&<ParkingTab segments={fSegs} carParks={carParks} onSelect={p=>{setSelParking(p);setActiveTab('map')}}/>}
      {activeTab==='alerts'&&<NotificationCenter notifications={notifs} onClose={()=>setActiveTab('map')} onUpdate={setNotifs}/>}
      {activeTab==='account'&&<AccountTab user={user} onNav={handleNav} onSignOut={signOut}/>}

      {showHelp&&activeTab!=='map'&&<HelpFAQ onClose={()=>setShowHelp(false)}/>}
      {showNotifs&&activeTab!=='map'&&<NotificationCenter notifications={notifs} onClose={()=>setShowNotifs(false)} onUpdate={setNotifs}/>}

      <BottomNav active={activeTab} setActive={t=>{setActiveTab(t);setSelParking(null);setSelOffer(null)}} unread={unread}/>
    </div>
  )
}
