'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase'
import { mockOffers, mockParking, mockNotifications, mockBusinessStats, getCategoryIcon, getCategoryColor } from '../../lib/mockData'

const HSMap = dynamic(() => import('../../components/HSMap'), { ssr: false })
const OR = '#ff681f'
const BG = '#0a0a0a'
const PANEL = 'rgba(12,12,12,0.97)'

const CATS = [
  { id:'all', label:'All', icon:'🗺️' },
  { id:'food', label:'Food', icon:'🍕' },
  { id:'retail', label:'Retail', icon:'🛍️' },
  { id:'services', label:'Services', icon:'🔧' },
  { id:'beauty', label:'Beauty', icon:'💅' },
  { id:'health', label:'Health', icon:'💊' },
]

function Logo({ small }) {
  const s = small ? 24 : 34
  const cs = small ? 6 : 9
  const sw = small ? 1.8 : 2.5
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', fontFamily:'Arial,Helvetica,sans-serif', lineHeight:1 }}>
      <div style={{ display:'flex', alignItems:'center' }}>
        <div style={{ position:'relative', width: s*1.3, height: s*1.1, flexShrink:0 }}>
          <div style={{ position:'absolute', top:0, left:0, width:cs, height:cs, borderTop: sw+'px solid '+OR, borderLeft: sw+'px solid '+OR }} />
          <span style={{ position:'absolute', left: cs*0.7, bottom: cs*0.5, fontSize:s, fontWeight:800, color:OR, letterSpacing:'-0.08em' }}>Hi</span>
          <div style={{ position:'absolute', right:0, bottom: cs*0.35, width:cs, height:cs, borderBottom: sw+'px solid '+OR, borderRight: sw+'px solid '+OR }} />
        </div>
        <span style={{ fontSize: s*0.9, fontWeight:400, color:'#fff', letterSpacing:'-0.055em' }}>Streets</span>
      </div>
      {!small && <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:7 }}>
        <div style={{ width:22, height:1.5, background:OR, opacity:0.7 }} />
        <span style={{ fontSize:7, color:OR, fontWeight:600, letterSpacing:'0.22em', textTransform:'uppercase', whiteSpace:'nowrap' }}>LIVE OFFERS &amp; FREE PARKING</span>
      </div>}
    </div>
  )
}

function BottomNav({ active, setActive, alerts }) {
  const tabs = [
    { id:'map', icon:'🗺️', label:'Map' },
    { id:'offers', icon:'🛍️', label:'Offers' },
    { id:'parking', icon:'🅿️', label:'Park' },
    { id:'alerts', icon:'🔔', label:'Alerts', badge: alerts },
    { id:'account', icon:'👤', label:'Account' },
  ]
  return (
    <div style={{ position:'relative', background: PANEL, borderTop:'1px solid rgba(255,255,255,.08)', display:'flex', paddingBottom:'env(safe-area-inset-bottom,10px)', zIndex:100 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)} style={{ flex:1, background:'none', border:'none', cursor:'pointer', padding:'10px 0 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <div style={{ position:'relative' }}>
            <span style={{ fontSize:22, filter: active === t.id ? 'none' : 'grayscale(1) opacity(.5)' }}>{t.icon}</span>
            {t.badge > 0 && <div style={{ position:'absolute', top:-4, right:-6, background:'#E74C3C', color:'#fff', borderRadius:8, fontSize:9, fontWeight:800, minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{t.badge}</div>}
          </div>
          <span style={{ fontSize:10, fontWeight: active===t.id ? 700 : 400, color: active===t.id ? OR : 'rgba(255,255,255,.4)' }}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

function ParkingSheet({ item, onClose }) {
  if (!item) return null
  const colors = { free:'#2ECC71', paid:'#4A9EFF', restricted:'#E74C3C' }
  const c = colors[item.type] || '#4A9EFF'
  return (
    <div className="slide-up" style={{ position:'absolute', bottom:0, left:0, right:0, background: PANEL, backdropFilter:'blur(30px)', borderTop:'1px solid rgba(255,255,255,.08)', borderRadius:'24px 24px 0 0', padding:'16px 20px 40px', zIndex:500 }}>
      <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 16px' }} />
      <button onClick={onClose} style={{ position:'absolute', top:16, right:20, background:'rgba(255,255,255,.08)', border:'none', width:32, height:32, borderRadius:'50%', color:'#fff', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      <div style={{ display:'inline-block', background: c+'22', color:c, border:'1px solid '+c+'44', borderRadius:20, padding:'6px 14px', fontSize:13, fontWeight:700, marginBottom:14 }}>{item.status}</div>
      <h3 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>{item.name}</h3>
      <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:16 }}>📍 {item.address}</p>
      <div style={{ background:'rgba(255,255,255,.05)', borderRadius:14, padding:16, marginBottom:16, border:'1px solid rgba(255,255,255,.07)' }}>
        <p style={{ fontSize:15, color:'rgba(255,255,255,.8)', lineHeight:1.6, margin:0 }}>{item.info}</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        {[['Stay up to', item.maxStay],['No return', item.noReturn || 'N/A'],['Hours', item.hours],['Cost', item.cost ? '£'+item.cost+'/hr' : 'Free']].map(([k,v]) => (
          <div key={k} style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:'10px 12px' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:4 }}>{k}</div>
            <div style={{ fontSize:14, fontWeight:700 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button style={{ flex:1, background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:12, padding:16, fontSize:15, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <span>🧭</span> Directions
        </button>
        <button style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:'16px 18px', cursor:'pointer', color:'rgba(255,255,255,.6)', fontSize:14 }}>🔖 Save</button>
      </div>
    </div>
  )
}

function OfferSheet({ item, onClose }) {
  if (!item) return null
  const icon = getCategoryIcon(item.category)
  const color = getCategoryColor(item.category)
  function timeLeft(exp) {
    const d = new Date(exp) - new Date()
    if (d < 0) return 'Expired'
    const h = Math.floor(d/3600000), m = Math.floor((d%3600000)/60000)
    return h > 0 ? h+'h '+m+'m left' : m+'m left'
  }
  return (
    <div className="slide-up" style={{ position:'absolute', bottom:0, left:0, right:0, background: PANEL, backdropFilter:'blur(30px)', borderTop:'1px solid rgba(255,255,255,.08)', borderRadius:'24px 24px 0 0', padding:'16px 20px 40px', zIndex:500 }}>
      <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 16px' }} />
      <button onClick={onClose} style={{ position:'absolute', top:16, right:20, background:'rgba(255,255,255,.08)', border:'none', width:32, height:32, borderRadius:'50%', color:'#fff', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:16 }}>
        <div style={{ width:56, height:56, borderRadius:14, background: color+'22', border:'1px solid '+color+'44', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{icon}</div>
        <div>
          <h3 style={{ fontSize:18, fontWeight:800, margin:'0 0 2px' }}>{item.title}</h3>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', margin:0 }}>{item.businessName} · {item.distance}</p>
        </div>
      </div>
      <p style={{ fontSize:14, color:'rgba(255,255,255,.65)', lineHeight:1.6, marginBottom:16 }}>{item.description}</p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        <span style={{ background: OR+'22', color:OR, border:'1px solid '+OR+'44', borderRadius:20, padding:'6px 14px', fontSize:13, fontWeight:700 }}>{item.shortLabel}</span>
        {item.expiresAt && <span style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, padding:'6px 14px', fontSize:13, color:'rgba(255,255,255,.5)' }}>⏱ {timeLeft(item.expiresAt)}</span>}
        {item.source === 'whatsapp' && <span style={{ background:'rgba(37,211,102,.15)', color:'#25D366', border:'1px solid rgba(37,211,102,.3)', borderRadius:20, padding:'6px 14px', fontSize:13 }}>via WhatsApp</span>}
      </div>
      {item.terms && <div style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:'10px 14px', marginBottom:20, border:'1px solid rgba(255,255,255,.07)' }}>
        <p style={{ fontSize:12, color:'rgba(255,255,255,.35)', margin:0 }}>Terms: {item.terms}</p>
      </div>}
      <div style={{ display:'flex', gap:10 }}>
        <button style={{ flex:1, background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:12, padding:16, fontSize:15, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)' }}>🧭 Directions</button>
        <button style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:'16px 18px', cursor:'pointer', color:'rgba(255,255,255,.6)', fontSize:14 }}>🔖</button>
      </div>
    </div>
  )
}

function FiltersSheet({ onClose }) {
  const [selected, setSelected] = useState(['free','paid'])
  const opts = [['free','🟢','Free parking'],['paid','🔵','Paid parking'],['restricted','🔴','No parking'],['carpark','🅿️','Car parks'],['disabled','♿','Disabled bays'],['ev','⚡','EV bays'],['loading','📦','Loading bays'],['resident','🏠','Resident bays']]
  const tog = id => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id])
  return (
    <div style={{ position:'fixed', inset:0, zIndex:900 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)' }} />
      <div className="slide-up" style={{ position:'absolute', bottom:0, left:0, right:0, background: PANEL, backdropFilter:'blur(30px)', borderRadius:'24px 24px 0 0', padding:'16px 20px 40px', zIndex:901 }}>
        <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 16px' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:18, fontWeight:800, margin:0 }}>Filters</h3>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.08)', border:'none', width:32, height:32, borderRadius:'50%', color:'#fff', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
          {opts.map(([id,ic,lb]) => (
            <button key={id} onClick={() => tog(id)} style={{ background: selected.includes(id) ? 'rgba(255,104,31,.15)' : 'rgba(255,255,255,.04)', border: selected.includes(id) ? '2px solid '+OR : '1px solid rgba(255,255,255,.1)', borderRadius:12, padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, color:'#fff', textAlign:'left' }}>
              <span style={{ fontSize:18 }}>{ic}</span>
              <span style={{ fontSize:13, fontWeight: selected.includes(id) ? 700 : 400 }}>{lb}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ width:'100%', background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:12, padding:16, fontSize:15, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)' }}>Apply Filters</button>
      </div>
    </div>
  )
}

function LegendSheet({ onClose }) {
  const items = [['🟩','Free parking','Lane-side parking is free'],['🟦','Paid parking','Lane-side parking is paid'],['🟥','No parking','Parking not allowed'],['⬜','Restricted','Permit holders / time restricted'],['🟠','Offer nearby','Live offer from a business'],['🅿️','Car park','Off-street car park']]
  return (
    <div style={{ position:'fixed', inset:0, zIndex:900 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)' }} />
      <div className="slide-up" style={{ position:'absolute', bottom:0, left:0, right:0, background: PANEL, backdropFilter:'blur(30px)', borderRadius:'24px 24px 0 0', padding:'16px 20px 40px', zIndex:901 }}>
        <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 16px' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:18, fontWeight:800, margin:0 }}>How to read the map</h3>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.08)', border:'none', width:32, height:32, borderRadius:'50%', color:'#fff', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
        {items.map(([ic,title,sub]) => (
          <div key={title} style={{ display:'flex', gap:14, alignItems:'center', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize:22, width:28, textAlign:'center', flexShrink:0 }}>{ic}</span>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>{title}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:2 }}>{sub}</div>
            </div>
          </div>
        ))}
        <button onClick={onClose} style={{ width:'100%', marginTop:20, background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:12, padding:16, fontSize:15, fontWeight:700, color:'#fff', cursor:'pointer' }}>Got it</button>
      </div>
    </div>
  )
}

// ===== TABS =====

function MapTab({ offers, parking, loc, selectedParking, setSelectedParking, selectedOffer, setSelectedOffer, showFilters, setShowFilters, showLegend, setShowLegend }) {
  const [mapView, setMapView] = useState('zone')
  const [search, setSearch] = useState('')

  return (
    <div style={{ flex:1, position:'relative' }}>
      <HSMap parking={parking} offers={offers} center={loc} onParkingClick={setSelectedParking} onOfferClick={setSelectedOffer} />

      {/* Top overlay */}
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:200, padding:'12px 12px 0', pointerEvents:'none' }}>
        {/* Logo + Search row */}
        <div style={{ display:'flex', gap:8, marginBottom:8, pointerEvents:'all' }}>
          <div style={{ background: PANEL, backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:'8px 14px', flexShrink:0, boxShadow:'0 4px 20px rgba(0,0,0,.5)' }}>
            <Logo small />
          </div>
          <div style={{ flex:1, background: PANEL, backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, display:'flex', alignItems:'center', padding:'0 14px', gap:10, boxShadow:'0 4px 20px rgba(0,0,0,.5)' }}>
            <span style={{ opacity:.5, fontSize:16 }}>🔍</span>
            <input placeholder="Search destination..." value={search} onChange={e => setSearch(e.target.value)} style={{ background:'none', border:'none', outline:'none', color:'#fff', fontSize:14, flex:1, minWidth:0 }} />
          </div>
        </div>

        {/* View tabs */}
        <div style={{ display:'flex', gap:6, pointerEvents:'all' }}>
          {['Zone view','Bay view','List view'].map((v, i) => {
            const id = ['zone','bay','list'][i]
            return (
              <button key={id} onClick={() => setMapView(id)} style={{ padding:'7px 14px', borderRadius:20, border:'none', whiteSpace:'nowrap', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0, background: mapView===id ? 'linear-gradient(135deg,'+OR+',#FF8C00)' : PANEL, color:'#fff', border: mapView===id ? 'none' : '1px solid rgba(255,255,255,.1)', backdropFilter:'blur(20px)', boxShadow: mapView===id ? '0 4px 12px rgba(255,104,31,.4)' : '0 2px 8px rgba(0,0,0,.4)' }}>
                {v}
              </button>
            )
          })}
        </div>
      </div>

      {/* Floating buttons */}
      <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:8, zIndex:200 }}>
        {[['⚙️', () => setShowFilters(true)], ['📍', () => {}], ['ℹ️', () => setShowLegend(true)]].map(([ic, fn], i) => (
          <button key={i} onClick={fn} style={{ width:44, height:44, background: PANEL, backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 4px 16px rgba(0,0,0,.4)' }}>{ic}</button>
        ))}
      </div>

      {/* Stats bar */}
      {!selectedParking && !selectedOffer && (
        <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', background: PANEL, backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:24, padding:'10px 20px', display:'flex', gap:16, alignItems:'center', zIndex:200, boxShadow:'0 4px 20px rgba(0,0,0,.5)', whiteSpace:'nowrap' }}>
          <span style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}><span style={{ color: OR, fontWeight:700 }}>●</span> {offers.length} live offers</span>
          <div style={{ width:1, height:14, background:'rgba(255,255,255,.15)' }} />
          <span style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>🅿️ Parking shown</span>
        </div>
      )}

      {/* List view overlay */}
      {mapView === 'list' && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, maxHeight:'60vh', overflowY:'auto', background: PANEL, backdropFilter:'blur(30px)', borderTop:'1px solid rgba(255,255,255,.08)', borderRadius:'24px 24px 0 0', zIndex:300, padding:'16px 0 24px' }}>
          <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 16px' }} />
          <h3 style={{ padding:'0 20px', margin:'0 0 14px', fontSize:16, fontWeight:800 }}>Nearby Parking</h3>
          {parking.map(p => {
            const colors = { free:'#2ECC71', paid:'#4A9EFF', restricted:'#E74C3C' }
            const c = colors[p.type]
            return (
              <div key={p.id} onClick={() => setSelectedParking(p)} style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', gap:12, alignItems:'center', cursor:'pointer' }}>
                <div style={{ width:44, height:44, background: c+'22', border:'1px solid '+c+'44', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, fontWeight:800, color:c }}>P</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700, marginBottom:2 }}>{p.name}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{p.maxStay} · {p.hours}</div>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:c }}>{p.status}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OffersTab({ offers }) {
  const [cat, setCat] = useState('all')
  function timeLeft(exp) {
    const d = new Date(exp) - new Date()
    if (d < 0) return 'Expired'
    const h = Math.floor(d/3600000), m = Math.floor((d%3600000)/60000)
    return h > 0 ? h+'h '+m+'m left' : m+'m left'
  }
  const filtered = cat === 'all' ? offers : offers.filter(o => o.category === cat)
  return (
    <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'16px 20px 0' }}>
        <h2 style={{ fontSize:20, fontWeight:800, marginBottom:14 }}>Live Offers Nearby</h2>
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:12 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{ padding:'7px 14px', borderRadius:20, border:'none', whiteSpace:'nowrap', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0, background: cat===c.id ? 'linear-gradient(135deg,'+OR+',#FF8C00)' : 'rgba(255,255,255,.07)', color:'#fff', border: cat===c.id ? 'none' : '1px solid rgba(255,255,255,.1)', boxShadow: cat===c.id ? '0 4px 12px rgba(255,104,31,.35)' : 'none' }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding:'0 20px 24px', display:'flex', flexDirection:'column', gap:12, flex:1 }}>
        {filtered.length === 0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:40 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🛍️</div>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>No offers nearby yet</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.35)' }}>Check back later for exciting offers</div>
          </div>
        ) : filtered.map(o => {
          const icon = getCategoryIcon(o.category)
          const color = getCategoryColor(o.category)
          return (
            <div key={o.id} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:'16px', cursor:'pointer' }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:50, height:50, borderRadius:14, background: color+'22', border:'1px solid '+color+'44', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:4 }}>
                    <div style={{ fontSize:15, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{o.title}</div>
                    <div style={{ fontSize:11, color:OR, fontWeight:600, flexShrink:0 }}>{o.distance}</div>
                  </div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:10 }}>{o.businessName}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span style={{ background: OR+'22', color:OR, borderRadius:10, padding:'4px 10px', fontSize:12, fontWeight:700 }}>{o.shortLabel}</span>
                    <span style={{ background:'rgba(255,255,255,.06)', borderRadius:10, padding:'4px 10px', fontSize:12, color:'rgba(255,255,255,.4)' }}>⏱ {timeLeft(o.expiresAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ParkingTab({ parking }) {
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <div style={{ padding:'16px 20px 0', marginBottom:14 }}>
        <h2 style={{ fontSize:20, fontWeight:800 }}>Parking Nearby</h2>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginTop:4 }}>Newham, London · Live data</p>
      </div>
      <div style={{ padding:'0 20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
        {parking.map(p => {
          const colors = { free:'#2ECC71', paid:'#4A9EFF', restricted:'#E74C3C' }
          const c = colors[p.type] || '#4A9EFF'
          return (
            <div key={p.id} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:'16px', overflow:'hidden' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, marginBottom:2 }}>{p.name}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>📍 {p.address}</div>
                </div>
                <span style={{ background: c+'22', color:c, border:'1px solid '+c+'44', borderRadius:10, padding:'4px 10px', fontSize:12, fontWeight:700, flexShrink:0 }}>{p.status}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[['Stay',p.maxStay],['Cost',p.cost ? '£'+p.cost+'/hr' : 'Free'],['Hours',p.hours]].map(([k,v]) => (
                  <div key={k} style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'8px 10px' }}>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:12, fontWeight:700 }}>{v}</div>
                  </div>
                ))}
              </div>
              {p.info && <div style={{ marginTop:10, padding:'10px 12px', background:'rgba(255,255,255,.03)', borderRadius:10, border:'1px solid rgba(255,255,255,.06)' }}>
                <p style={{ fontSize:12, color:'rgba(255,255,255,.55)', margin:0, lineHeight:1.5 }}>{p.info}</p>
              </div>}
              <button style={{ marginTop:12, width:'100%', background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:10, padding:'12px', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 16px rgba(255,104,31,.3)' }}>🧭 Directions</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AlertsTab({ notifications }) {
  const [tab, setTab] = useState('All')
  const tabs = ['All','Offers','Parking','Updates']
  const unread = notifications.filter(n => !n.read).length
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <div style={{ padding:'16px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <h2 style={{ fontSize:20, fontWeight:800 }}>Notifications</h2>
        {unread > 0 && <button style={{ background:'none', border:'none', color:OR, fontSize:13, cursor:'pointer', fontWeight:600 }}>Mark all read</button>}
      </div>
      <div style={{ display:'flex', gap:6, padding:'0 20px', marginBottom:16 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'7px 14px', borderRadius:20, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', background: tab===t ? 'linear-gradient(135deg,'+OR+',#FF8C00)' : 'rgba(255,255,255,.07)', color:'#fff', border: tab===t ? 'none' : '1px solid rgba(255,255,255,.1)', boxShadow: tab===t ? '0 4px 12px rgba(255,104,31,.35)' : 'none' }}>{t}</button>
        ))}
      </div>
      <div style={{ padding:'0 0 24px' }}>
        <div style={{ padding:'0 20px', fontSize:11, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>Today</div>
        {notifications.map(n => (
          <div key={n.id} style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', gap:12, alignItems:'flex-start', background: !n.read ? 'rgba(255,104,31,.04)' : 'transparent' }}>
            <div style={{ width:42, height:42, borderRadius:12, background: !n.read ? OR+'22' : 'rgba(255,255,255,.06)', border: '1px solid '+(!n.read ? OR+'44' : 'rgba(255,255,255,.08)'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{n.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                <div style={{ fontSize:14, fontWeight: !n.read ? 700 : 500 }}>{n.title}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', flexShrink:0 }}>{n.time}</div>
              </div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginTop:3, lineHeight:1.4 }}>{n.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AccountTab({ onSignOut }) {
  const menus = [
    { icon:'👤', label:'Account details', sub:'Manage your profile' },
    { icon:'🔔', label:'Notifications', sub:'Manage your alerts' },
    { icon:'🗺️', label:'Map preferences', sub:'Customise your map' },
    { icon:'🅿️', label:'Parking preferences', sub:'Set vehicle type' },
    { icon:'❓', label:'Help & FAQs', sub:'Get support' },
    { icon:'📄', label:'Privacy policy', sub:'How we use your data' },
  ]
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <div style={{ padding:'16px 20px 0', marginBottom:24 }}>
        <h2 style={{ fontSize:20, fontWeight:800 }}>Account</h2>
      </div>
      <div style={{ padding:'0 20px', marginBottom:24 }}>
        <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:'18px', display:'flex', gap:14, alignItems:'center' }}>
          <div style={{ width:54, height:54, borderRadius:16, background: OR+'22', border:'1px solid '+OR+'44', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>👤</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>Hi-Streets User</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginTop:2 }}>Newham, London</div>
          </div>
        </div>
      </div>
      <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:2, marginBottom:24 }}>
        {menus.map((m, i) => (
          <button key={i} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', color:'#fff', textAlign:'left', width:'100%', marginBottom:6 }}>
            <span style={{ fontSize:22 }}>{m.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{m.label}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.35)', marginTop:2 }}>{m.sub}</div>
            </div>
            <span style={{ color:'rgba(255,255,255,.3)', fontSize:16 }}>›</span>
          </button>
        ))}
      </div>
      <div style={{ padding:'0 20px 40px' }}>
        <button onClick={onSignOut} style={{ width:'100%', background:'rgba(231,76,60,.1)', border:'1px solid rgba(231,76,60,.3)', borderRadius:14, padding:16, fontSize:15, fontWeight:700, color:'#E74C3C', cursor:'pointer', marginBottom:12 }}>🚪 Logout</button>
        <button onClick={() => {}} style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,.2)', cursor:'pointer', fontSize:12, padding:8 }}>Delete account</button>
      </div>
    </div>
  )
}

// ===== MAIN =====

export default function MapPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('map')
  const [offers, setOffers] = useState(mockOffers)
  const [parking] = useState(mockParking)
  const [notifications] = useState(mockNotifications)
  const [selectedParking, setSelectedParking] = useState(null)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [loc, setLoc] = useState({ lat: 51.5373, lng: 0.0503 })
  const [newOfferIds, setNewOfferIds] = useState([])

  useEffect(() => {
    const guest = typeof window !== 'undefined' && localStorage.getItem('hs_guest')
    if (!guest) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) router.replace('/splash')
      })
    }
    navigator.geolocation?.getCurrentPosition(p => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {})
    fetchOffers()

    const ch = supabase.channel('offers')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'offers' }, payload => {
        const o = { ...payload.new, businesses: {}, shortLabel: payload.new.title?.slice(0,20) }
        setOffers(prev => [o, ...prev])
        setNewOfferIds(prev => [...prev, o.id])
        setTimeout(() => setNewOfferIds(prev => prev.filter(id => id !== o.id)), 8000)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchOffers() {
    const { data } = await supabase.from('offers').select('*, businesses(name)').eq('is_active',true).gt('expires_at',new Date().toISOString()).order('created_at',{ ascending:false })
    if (data && data.length) setOffers(prev => [...mockOffers, ...data.map(o => ({ ...o, businessName: o.businesses?.name || 'Local business', shortLabel: o.title?.slice(0,20) || 'Offer', distance: '0.5 mi', lat: 51.5373, lng: 0.0503 }))])
  }

  async function signOut() {
    await supabase.auth.signOut()
    typeof window !== 'undefined' && localStorage.removeItem('hs_guest')
    router.replace('/splash')
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div style={{ position:'fixed', inset:0, background: BG, display:'flex', flexDirection:'column', fontFamily:'Arial,Helvetica,sans-serif' }}>
      {activeTab === 'map' && (
        <MapTab offers={offers} parking={parking} loc={loc} selectedParking={selectedParking} setSelectedParking={setSelectedParking} selectedOffer={selectedOffer} setSelectedOffer={setSelectedOffer} showFilters={showFilters} setShowFilters={setShowFilters} showLegend={showLegend} setShowLegend={setShowLegend} />
      )}
      {activeTab === 'offers' && <OffersTab offers={offers} />}
      {activeTab === 'parking' && <ParkingTab parking={parking} />}
      {activeTab === 'alerts' && <AlertsTab notifications={notifications} />}
      {activeTab === 'account' && <AccountTab onSignOut={signOut} />}

      {/* Sheets */}
      {selectedParking && activeTab === 'map' && <ParkingSheet item={selectedParking} onClose={() => setSelectedParking(null)} />}
      {selectedOffer && activeTab === 'map' && <OfferSheet item={selectedOffer} onClose={() => setSelectedOffer(null)} />}
      {showFilters && <FiltersSheet onClose={() => setShowFilters(false)} />}
      {showLegend && <LegendSheet onClose={() => setShowLegend(false)} />}

      <BottomNav active={activeTab} setActive={(t) => { setActiveTab(t); setSelectedParking(null); setSelectedOffer(null) }} alerts={unreadCount} />
    </div>
  )
}
