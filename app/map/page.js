'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase.js'
import { getCurrentLocation, UK_DEFAULT } from '../../lib/mapAdapters.js'
import { getParkingSegmentsByViewport, getCarParksByViewport } from '../../lib/parkingDataAdapter.js'
import { getPlacesByViewport } from '../../lib/placesAdapter.js'
import { getLiveOffersByViewport } from '../../lib/offersAdapter.js'
import { mockNotifications } from '../../data/mockNotifications.js'
import { getCatIcon, getCatColor } from '../../data/mockOffers.js'
import SearchOverlay from '../../components/SearchOverlay.js'
import ParkingSheet from '../../components/ParkingSheet.js'
import OfferSheet from '../../components/OfferSheet.js'
import FiltersSheet from '../../components/FiltersSheet.js'
import SideMenu from '../../components/SideMenu.js'
import HelpFAQ from '../../components/HelpFAQ.js'
import NotificationCenter from '../../components/NotificationCenter.js'
import ZoneView from '../../components/ZoneView.js'
import ListViewSheet from '../../components/ListViewSheet.js'

const HSMap = dynamic(() => import('../../components/Map.js'), { ssr: false })

const OR = '#ff681f'
const PANEL = 'rgba(10,10,10,.97)'

function Logo({ small }) {
  const s = small ? 22 : 30, cs = small ? 5 : 7, sw = small ? 1.8 : 2.3
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', fontFamily:'Arial,Helvetica,sans-serif', lineHeight:1 }}>
      <div style={{ display:'flex', alignItems:'center' }}>
        <div style={{ position:'relative', width:s*1.3, height:s*1.1, flexShrink:0 }}>
          <div style={{ position:'absolute', top:0, left:0, width:cs, height:cs, borderTop:sw+'px solid '+OR, borderLeft:sw+'px solid '+OR }} />
          <span style={{ position:'absolute', left:cs*.7, bottom:cs*.4, fontSize:s, fontWeight:800, color:OR, letterSpacing:'-0.08em' }}>Hi</span>
          <div style={{ position:'absolute', right:0, bottom:cs*.3, width:cs, height:cs, borderBottom:sw+'px solid '+OR, borderRight:sw+'px solid '+OR }} />
        </div>
        <span style={{ fontSize:s*.9, fontWeight:400, color:'#fff', letterSpacing:'-0.055em' }}>Streets</span>
      </div>
    </div>
  )
}

function BottomNav({ active, setActive, unread }) {
  const tabs = [{id:'map',icon:'🗺',label:'Map'},{id:'offers',icon:'🛍',label:'Offers'},{id:'parking',icon:'P',label:'Park'},{id:'alerts',icon:'🔔',label:'Alerts',badge:unread},{id:'account',icon:'👤',label:'Account'}]
  return (
    <div style={{ background:PANEL, borderTop:'1px solid rgba(255,255,255,.08)', display:'flex', paddingBottom:'env(safe-area-inset-bottom,10px)', zIndex:100, flexShrink:0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={()=>setActive(t.id)} style={{ flex:1, background:'none', border:'none', cursor:'pointer', padding:'10px 0 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <div style={{ position:'relative' }}>
            <span style={{ fontSize:20, filter:active===t.id?'none':'grayscale(1) opacity(.45)' }}>{t.icon}</span>
            {t.badge>0 && <div style={{ position:'absolute', top:-4, right:-6, background:'#E74C3C', color:'#fff', borderRadius:8, fontSize:9, fontWeight:800, minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{t.badge}</div>}
          </div>
          <span style={{ fontSize:10, fontWeight:active===t.id?700:400, color:active===t.id?OR:'rgba(255,255,255,.4)' }}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

function OffersTab({ offers, onSelect }) {
  const [cat,setCat]=useState('all')
  const CATS=[{id:'all',label:'All'},{id:'food',label:'Food'},{id:'retail',label:'Retail'},{id:'beauty',label:'Beauty'},{id:'cafe',label:'Cafes'},{id:'electronics',label:'Services'}]
  function tl(exp){const d=new Date(exp)-new Date();if(d<0)return'Expired';const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000);return h>0?h+'h '+m+'m':m+'m left'}
  const filtered=cat==='all'?offers:offers.filter(o=>o.category===cat)
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <div style={{ padding:'16px 20px 0' }}><h2 style={{ fontSize:20, fontWeight:800 }}>Live Offers Nearby</h2></div>
      <div style={{ display:'flex', gap:8, overflowX:'auto', padding:'12px 20px' }}>
        {CATS.map(c=><button key={c.id} onClick={()=>setCat(c.id)} style={{ padding:'7px 14px', borderRadius:20, border:'none', whiteSpace:'nowrap', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0, background:cat===c.id?'linear-gradient(135deg,'+OR+',#FF8C00)':'rgba(255,255,255,.07)', color:'#fff', border:cat===c.id?'none':'1px solid rgba(255,255,255,.1)' }}>{c.label}</button>)}
      </div>
      <div style={{ padding:'0 20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.map(o=>{const ic=getCatIcon(o.category),col=getCatColor(o.category);return(
          <div key={o.id} onClick={()=>onSelect(o)} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:16, cursor:'pointer' }}>
            <div style={{ display:'flex', gap:12 }}>
              <div style={{ width:50,height:50,borderRadius:14,background:col+'22',border:'1px solid '+col+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>{ic}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>{o.title}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:8 }}>{o.businessName} · {o.distance}</div>
                <div style={{ display:'flex', gap:8 }}>
                  <span style={{ background:OR+'22', color:OR, borderRadius:10, padding:'4px 10px', fontSize:12, fontWeight:700 }}>{o.shortLabel}</span>
                  {o.expiresAt&&<span style={{ background:'rgba(255,255,255,.07)', borderRadius:10, padding:'4px 10px', fontSize:12, color:'rgba(255,255,255,.4)' }}>⏱ {tl(o.expiresAt)}</span>}
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}

function ParkingTab({ segments, carParks, onSelect }) {
  const all=[...segments.map(s=>({...s,itemType:'segment'})),...(carParks||[]).map(c=>({...c,itemType:'carpark'}))]
  const cols={free:'#2ECC71',paid:'#4A9EFF',permit:'#9B59B6',restricted:'#888888',loading:'#F39C12',carpark:'#F39C12'}
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <div style={{ padding:'16px 20px 12px' }}><h2 style={{ fontSize:20, fontWeight:800 }}>Parking Near You</h2><p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:4 }}>{all.length} spots</p></div>
      {all.map(item=>{const c=cols[item.type]||'#4A9EFF';return(
        <div key={item.id} onClick={()=>onSelect(item)} style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', gap:12, alignItems:'center', cursor:'pointer', borderLeft:'3px solid '+c }}>
          <div style={{ width:44,height:44,background:c+'22',border:'1px solid '+c+'44',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0,fontWeight:800,color:c }}>P</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{item.name}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{item.label||item.statusLabel} · {item.maxStay||'No limit'}</div>
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:c }}>{item.cost>0?'£'+item.cost+'/hr':'Free'}</div>
        </div>
      )})}
    </div>
  )
}

function AccountTab({ user, onNav, onSignOut }) {
  const menus=[['🔖','Saved places','saved'],['🔔','Notifications','notifs'],['🏪','Business dashboard','business'],['❓','Help & FAQ','help'],['📧','Contact support','contact'],['⚙️','Settings','settings']]
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <div style={{ padding:'16px 20px 12px' }}><h2 style={{ fontSize:20, fontWeight:800 }}>Account</h2></div>
      <div style={{ padding:'0 20px 16px' }}>
        <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:18, display:'flex', gap:14, alignItems:'center' }}>
          <div style={{ width:54,height:54,borderRadius:16,background:OR+'22',border:'1px solid '+OR+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>👤</div>
          <div><div style={{ fontSize:16, fontWeight:700 }}>{user?.email||'Guest user'}</div><div style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginTop:2 }}>Hi-Streets member</div></div>
        </div>
      </div>
      <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
        {menus.map(([ic,lb,ac])=><button key={ac} onClick={()=>onNav(ac)} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', color:'#fff', textAlign:'left', width:'100%' }}><span style={{ fontSize:22 }}>{ic}</span><span style={{ fontSize:14, fontWeight:600 }}>{lb}</span><span style={{ marginLeft:'auto', color:'rgba(255,255,255,.3)' }}>›</span></button>)}
      </div>
      <div style={{ padding:'0 20px 40px' }}>
        <button onClick={onSignOut} style={{ width:'100%', background:'rgba(231,76,60,.1)', border:'1px solid rgba(231,76,60,.3)', borderRadius:14, padding:16, fontSize:15, fontWeight:700, color:'#E74C3C', cursor:'pointer' }}>Logout</button>
      </div>
    </div>
  )
}

export default function MapPage() {
  const router = useRouter()
  const [activeTab,setActiveTab]=useState('map')
  const [loc,setLoc]=useState({lat:UK_DEFAULT.lat,lng:UK_DEFAULT.lng})
  const [mapCenter,setMapCenter]=useState({lat:UK_DEFAULT.lat,lng:UK_DEFAULT.lng})
  const [segments,setSegments]=useState([])
  const [carParks,setCarParks]=useState([])
  const [offers,setOffers]=useState([])
  const [places,setPlaces]=useState([])
  const [notifications,setNotifications]=useState(mockNotifications)
  const [selectedParking,setSelectedParking]=useState(null)
  const [selectedOffer,setSelectedOffer]=useState(null)
  const [showSearch,setShowSearch]=useState(false)
  const [showFilters,setShowFilters]=useState(false)
  const [showMenu,setShowMenu]=useState(false)
  const [showHelp,setShowHelp]=useState(false)
  const [showNotifs,setShowNotifs]=useState(false)
  const [showLegend,setShowLegend]=useState(false)
  const [filters,setFilters]=useState(['free','paid','carpark','permit','restricted','loading','pois','offers','segments','carparks'])
  const [mapView,setMapView]=useState('zone')
  const [user,setUser]=useState(null)
  const [toast,setToast]=useState(null)
  const loadTimer=useRef(null)
  const unread=notifications.filter(n=>!n.read).length

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(null),2800)}

  useEffect(()=>{
    const guest=typeof window!=='undefined'&&localStorage.getItem('hs_guest')
    if(!guest){supabase.auth.getSession().then(({data:{session}})=>{if(!session)router.replace('/splash');else setUser(session.user)})}
    getCurrentLocation().then(pos=>{setLoc(pos);setMapCenter(pos)}).catch(()=>{})
    getLiveOffersByViewport({}).then(setOffers)
    const ch=supabase.channel('offers-rt').on('postgres_changes',{event:'INSERT',schema:'public',table:'offers'},p=>{
      const o={...p.new,shortLabel:(p.new.title||'').slice(0,22),businessName:'Local business',distance:'near you',lat:UK_DEFAULT.lat,lng:UK_DEFAULT.lng}
      setOffers(prev=>[o,...prev])
      setNotifications(prev=>[{id:'rt-'+Date.now(),type:'offer',icon:'🛍',title:'New offer!',body:o.title,time:'just now',read:false},...prev])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])

  const handleBoundsChange=useCallback(async(bounds)=>{
    clearTimeout(loadTimer.current)
    loadTimer.current=setTimeout(async()=>{
      const [segs,cps,pls]=await Promise.all([getParkingSegmentsByViewport(bounds),getCarParksByViewport(bounds),getPlacesByViewport(bounds,60)])
      setSegments(segs); setCarParks(cps); setPlaces(pls)
    },700)
  },[])

  function handleSearchSelect(item){setMapCenter({lat:item.lat,lng:item.lng});setShowSearch(false)}

  function handleNav(action){
    setShowMenu(false)
    const map={'map':()=>setActiveTab('map'),'search':()=>setShowSearch(true),'alerts':()=>setShowNotifs(true),'notifs':()=>setShowNotifs(true),'help':()=>setShowHelp(true),'business':()=>router.push('/business'),'contact':()=>{window.location.href='mailto:support@histreets.uk'},'report':()=>showToast('Report submitted — thank you!'),'settings':()=>showToast('Settings coming soon'),'saved':()=>showToast('Saved places coming soon'),'map-prefs':()=>showToast('Coming soon'),'park-prefs':()=>showToast('Coming soon'),'privacy':()=>window.open('https://histreets.uk/privacy','_blank')}
    map[action]?.()
  }

  async function signOut(){await supabase.auth.signOut();typeof window!=='undefined'&&localStorage.removeItem('hs_guest');router.replace('/splash')}

  const filteredSegs=segments.filter(s=>{
    if(s.type==='free'&&!filters.includes('free'))return false
    if(s.type==='paid'&&!filters.includes('paid'))return false
    if(s.type==='permit'&&!filters.includes('permit'))return false
    if(s.type==='restricted'&&!filters.includes('restricted'))return false
    if(s.type==='loading'&&!filters.includes('loading'))return false
    return true
  })

  return (
    <div style={{position:'fixed',inset:0,background:'#0a0a0a',display:'flex',flexDirection:'column',fontFamily:'Arial,Helvetica,sans-serif'}}>
      {toast&&<div style={{position:'fixed',top:'10%',left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,'+OR+',#FF8C00)',color:'#fff',borderRadius:20,padding:'10px 22px',fontSize:14,fontWeight:700,zIndex:9999,whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>{toast}</div>}

      {activeTab==='map'&&(
        <div style={{flex:1,position:'relative',overflow:'hidden'}}>
          <HSMap segments={filters.includes('segments')?filteredSegs:[]} carParks={filters.includes('carparks')?carParks:[]} offers={filters.includes('offers')?offers:[]} places={filters.includes('pois')?places:[]} center={mapCenter} zoom={15} onSegmentClick={s=>{setSelectedParking(s);setSelectedOffer(null)}} onCarParkClick={c=>{setSelectedParking(c);setSelectedOffer(null)}} onOfferClick={o=>{setSelectedOffer(o);setSelectedParking(null)}} onMapMove={handleBoundsChange} showSegments={filters.includes('segments')} showCarParks={filters.includes('carparks')} showOffers={filters.includes('offers')} showPlaces={filters.includes('pois')} />

          <div style={{position:'absolute',top:0,left:0,right:0,zIndex:200,padding:'12px 12px 0',pointerEvents:'none'}}>
            <div style={{display:'flex',gap:8,marginBottom:8,pointerEvents:'all'}}>
              <button onClick={()=>setShowMenu(true)} style={{width:44,height:44,background:PANEL,backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0,boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>☰</button>
              <button onClick={()=>setShowSearch(true)} style={{flex:1,background:PANEL,backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,display:'flex',alignItems:'center',padding:'0 14px',gap:10,boxShadow:'0 4px 20px rgba(0,0,0,.5)',cursor:'pointer',color:'rgba(255,255,255,.4)',fontSize:14}}>
                <span style={{opacity:.5}}>🔍</span> Search UK postcode, town, road...
              </button>
              <button onClick={()=>setShowNotifs(true)} style={{width:44,height:44,background:PANEL,backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,boxShadow:'0 4px 20px rgba(0,0,0,.5)',position:'relative'}}>
                🔔
                {unread>0&&<div style={{position:'absolute',top:6,right:6,width:8,height:8,background:'#E74C3C',borderRadius:'50%'}} />}
              </button>
            </div>
            <div style={{display:'flex',gap:6,pointerEvents:'all'}}>
              {[['Zone view','zone'],['Bay view','bay'],['List view','list']].map(([lb,id])=><button key={id} onClick={()=>setMapView(id)} style={{padding:'7px 14px',borderRadius:20,border:'none',whiteSpace:'nowrap',fontSize:13,fontWeight:600,cursor:'pointer',flexShrink:0,background:mapView===id?'linear-gradient(135deg,'+OR+',#FF8C00)':PANEL,color:'#fff',border:mapView===id?'none':'1px solid rgba(255,255,255,.1)',backdropFilter:'blur(20px)',boxShadow:mapView===id?'0 4px 12px rgba(255,104,31,.4)':'0 2px 8px rgba(0,0,0,.4)'}}>{lb}</button>)}
            </div>
          </div>

          <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:8,zIndex:200}}>
            {[['F',()=>setShowFilters(true),'Filter'],[' ⊕',()=>setMapCenter(loc),'Locate'],[' i',()=>setShowLegend(true),'Legend'],['3D',()=>showToast('3D coming soon'),'3D']].map(([ic,fn,lb],i)=><button key={i} title={lb} onClick={fn} style={{width:44,height:44,background:PANEL,backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'rgba(255,255,255,.7)',boxShadow:'0 4px 16px rgba(0,0,0,.4)'}}>{ic}</button>)}
          </div>

          {!selectedParking&&!selectedOffer&&mapView==='bay'&&<div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',background:PANEL,backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:24,padding:'10px 20px',display:'flex',gap:16,alignItems:'center',zIndex:200,boxShadow:'0 4px 20px rgba(0,0,0,.5)',whiteSpace:'nowrap'}}><span style={{fontSize:13,color:'rgba(255,255,255,.6)'}}><span style={{color:OR,fontWeight:700}}>●</span> {offers.length} offers</span><div style={{width:1,height:14,background:'rgba(255,255,255,.15)'}} /><span style={{fontSize:13,color:'rgba(255,255,255,.6)'}}>🛣️ {filteredSegs.length} segments</span></div>}

          {mapView==='zone'&&!selectedParking&&!selectedOffer&&<ZoneView center={mapCenter} onClose={()=>setMapView('bay')} />}
          {mapView==='list'&&!selectedParking&&!selectedOffer&&<ListViewSheet segments={filteredSegs} carParks={carParks} onSelect={item=>{setSelectedParking(item);setMapView('bay')}} filters={filters} onFilterChange={setFilters} />}

          {showLegend&&<div style={{position:'fixed',inset:0,zIndex:800}}><div onClick={()=>setShowLegend(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.6)'}} /><div className="slide-up" style={{position:'absolute',bottom:0,left:0,right:0,background:PANEL,backdropFilter:'blur(30px)',borderRadius:'22px 22px 0 0',padding:'16px 20px 40px',zIndex:801}}><div style={{width:36,height:4,background:'rgba(255,255,255,.2)',borderRadius:2,margin:'0 auto 14px'}} /><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}><h3 style={{fontSize:18,fontWeight:800,margin:0}}>How to read the map</h3><button onClick={()=>setShowLegend(false)} style={{background:'rgba(255,255,255,.08)',border:'none',width:32,height:32,borderRadius:'50%',color:'#fff',cursor:'pointer',fontSize:16}}>x</button></div>{[['Green segment','Free parking','Park for free'],['Blue segment','Paid parking','Mon-Sat 8am-6:30pm'],['Grey segment','No parking','Double yellow / restricted'],['Purple segment','Permit only','Resident zone'],['Orange dashed','Loading bay','30 min max'],['P pin','Car park','Off-street parking']].map(([ic,title,sub])=><div key={title} style={{display:'flex',gap:14,alignItems:'center',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.06)'}}><span style={{fontSize:20,width:28,textAlign:'center',flexShrink:0}}>━</span><div><div style={{fontSize:14,fontWeight:600}}>{title}</div><div style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:2}}>{sub}</div></div></div>)}<button onClick={()=>setShowLegend(false)} style={{width:'100%',marginTop:20,background:'linear-gradient(135deg,'+OR+',#FF8C00)',border:'none',borderRadius:12,padding:16,fontSize:15,fontWeight:700,color:'#fff',cursor:'pointer'}}>Got it</button></div></div>}

          {selectedParking&&<ParkingSheet item={selectedParking} onClose={()=>setSelectedParking(null)} onReport={()=>showToast('Report submitted!')} />}
          {selectedOffer&&<OfferSheet item={selectedOffer} onClose={()=>setSelectedOffer(null)} />}
          {showFilters&&<FiltersSheet activeFilters={filters} onApply={setFilters} onClose={()=>setShowFilters(false)} />}
          {showSearch&&<SearchOverlay onSelect={handleSearchSelect} onClose={()=>setShowSearch(false)} currentLocation={loc} />}
          {showMenu&&<SideMenu onClose={()=>setShowMenu(false)} onNav={handleNav} onSignOut={signOut} user={user} />}
          {showHelp&&<HelpFAQ onClose={()=>setShowHelp(false)} />}
          {showNotifs&&<NotificationCenter notifications={notifications} onClose={()=>setShowNotifs(false)} onUpdate={setNotifications} />}
        </div>
      )}

      {activeTab==='offers'&&<OffersTab offers={offers} onSelect={o=>{setSelectedOffer(o);setActiveTab('map')}} />}
      {activeTab==='parking'&&<ParkingTab segments={filteredSegs} carParks={carParks} onSelect={p=>{setSelectedParking(p);setActiveTab('map')}} />}
      {activeTab==='alerts'&&<NotificationCenter notifications={notifications} onClose={()=>setActiveTab('map')} onUpdate={setNotifications} />}
      {activeTab==='account'&&<AccountTab user={user} onNav={handleNav} onSignOut={signOut} />}

      {showHelp&&activeTab!=='map'&&<HelpFAQ onClose={()=>setShowHelp(false)} />}
      {showNotifs&&activeTab!=='map'&&<NotificationCenter notifications={notifications} onClose={()=>setShowNotifs(false)} onUpdate={setNotifications} />}

      <BottomNav active={activeTab} setActive={t=>{setActiveTab(t);setSelectedParking(null);setSelectedOffer(null)}} unread={unread} />
    </div>
  )
}
