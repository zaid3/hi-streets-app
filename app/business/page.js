'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mockBusinessStats, mockBusinessOffers } from '../../lib/mockData'

const OR = '#ff681f'
const PANEL = 'rgba(12,12,12,0.97)'

function Logo() {
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', fontFamily:'Arial,Helvetica,sans-serif', lineHeight:1 }}>
      <div style={{ display:'flex', alignItems:'center' }}>
        <div style={{ position:'relative', width:34, height:30, flexShrink:0 }}>
          <div style={{ position:'absolute', top:0, left:0, width:7, height:7, borderTop:'1.8px solid '+OR, borderLeft:'1.8px solid '+OR }} />
          <span style={{ position:'absolute', left:5, bottom:3, fontSize:24, fontWeight:800, color:OR, letterSpacing:'-0.08em' }}>Hi</span>
          <div style={{ position:'absolute', right:0, bottom:2, width:7, height:7, borderBottom:'1.8px solid '+OR, borderRight:'1.8px solid '+OR }} />
        </div>
        <span style={{ fontSize:22, fontWeight:400, color:'#fff', letterSpacing:'-0.055em' }}>Streets</span>
      </div>
    </div>
  )
}

const STATUS_STYLES = {
  live: { bg:'rgba(46,204,113,.15)', color:'#2ECC71', border:'1px solid rgba(46,204,113,.3)', label:'LIVE' },
  scheduled: { bg:'rgba(74,158,255,.15)', color:'#4A9EFF', border:'1px solid rgba(74,158,255,.3)', label:'SCHEDULED' },
  draft: { bg:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.5)', border:'1px solid rgba(255,255,255,.1)', label:'DRAFT' },
  expired: { bg:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.3)', border:'1px solid rgba(255,255,255,.08)', label:'EXPIRED' },
  rejected: { bg:'rgba(231,76,60,.1)', color:'#E74C3C', border:'1px solid rgba(231,76,60,.2)', label:'REJECTED' },
}

export default function BusinessPage() {
  const router = useRouter()
  const [screen, setScreen] = useState('dashboard') // dashboard | create | whatsapp | offers | analytics | settings
  const [offerTab, setOfferTab] = useState('live')
  const [form, setForm] = useState({ title:'', description:'', type:'Discount', value:'', validTill:'', terms:'' })
  const stats = mockBusinessStats
  const bizOffers = mockBusinessOffers

  const screens = {
    dashboard: (
      <div style={{ flex:1, overflowY:'auto' }}>
        <div style={{ padding:'16px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
            <div>
              <div style={{ fontSize:22, fontWeight:800, marginBottom:2 }}>Hello, Jordan 👋</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>Here's what's happening today.</div>
            </div>
            <button style={{ width:40, height:40, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>🔔</button>
          </div>

          {/* Key stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
            {[['Offers Live', stats.offersLive, 'View all', OR],['Profile Views', stats.profileViews.toLocaleString(), 'This week', 'rgba(255,255,255,.5)']].map(([k,v,sub,c]) => (
              <div key={k} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:'16px' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>{k}</div>
                <div style={{ fontSize:28, fontWeight:800, color:c, marginBottom:2 }}>{v}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:'16px', marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:14 }}>Quick Stats (This Week)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {[['Views',stats.views.toLocaleString(),'+18%'],['Taps',stats.taps.toLocaleString(),'+12%'],['Saves',stats.saves,'+9%'],['Map Opens',stats.mapOpens.toLocaleString(),'+15%']].map(([k,v,ch]) => (
                <div key={k}>
                  <div style={{ fontSize:22, fontWeight:800, marginBottom:2 }}>{v}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:11, color:'#2ECC71', fontWeight:600 }}>{ch}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Recent Activity</div>
            {bizOffers.filter(o => o.status === 'live').slice(0,1).map(o => (
              <div key={o.id} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{o.title}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>is now live · 10:00 AM</div>
                </div>
                <span style={{ background:'rgba(46,204,113,.15)', color:'#2ECC71', border:'1px solid rgba(46,204,113,.3)', borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:700 }}>LIVE</span>
              </div>
            ))}
          </div>

          <button onClick={() => setScreen('create')} style={{ width:'100%', background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:14, padding:16, fontSize:16, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <span style={{ fontSize:20 }}>+</span> Create Offer
          </button>
        </div>
      </div>
    ),

    create: (
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => setScreen('dashboard')} style={{ background:'rgba(255,255,255,.07)', border:'none', width:36, height:36, borderRadius:10, cursor:'pointer', color:'#fff', fontSize:18 }}>‹</button>
          <h2 style={{ fontSize:20, fontWeight:800, margin:0 }}>Create Offer</h2>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[['Offer title','e.g. 20% off Lunch','title'],['Description','e.g. Enjoy 20% off all lunch orders until 5pm.','description'],['Terms & conditions (optional)','e.g. Not valid with other offers.','terms']].map(([label,ph,key]) => (
            <div key={key}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', marginBottom:8 }}>{label}</label>
              {key === 'description' || key === 'terms'
                ? <textarea value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} placeholder={ph} rows={3} style={{ width:'100%', padding:'14px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#fff', fontSize:14, outline:'none', resize:'none' }} />
                : <input value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:'14px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#fff', fontSize:14, outline:'none' }} />}
            </div>
          ))}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', marginBottom:8 }}>Offer Type</label>
            <div style={{ display:'flex', gap:8 }}>
              {['Discount','BOGO','Other'].map(t => (
                <button key={t} onClick={() => setForm(f => ({...f,type:t}))} style={{ flex:1, background: form.type===t ? OR+'22' : 'rgba(255,255,255,.07)', border: form.type===t ? '2px solid '+OR : '1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'10px', color: form.type===t ? OR : '#fff', fontSize:13, fontWeight: form.type===t ? 700 : 400, cursor:'pointer' }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', marginBottom:8 }}>Value / %</label>
              <input value={form.value} onChange={e => setForm(f => ({...f,value:e.target.value}))} placeholder="20" style={{ width:'100%', padding:'14px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#fff', fontSize:14, outline:'none' }} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', marginBottom:8 }}>Valid Till</label>
              <input type="datetime-local" value={form.validTill} onChange={e => setForm(f => ({...f,validTill:e.target.value}))} style={{ width:'100%', padding:'14px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#fff', fontSize:13, outline:'none' }} />
            </div>
          </div>
          <button style={{ background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:14, padding:16, fontSize:16, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)', marginTop:8 }}>Next: Schedule →</button>
        </div>
      </div>
    ),

    whatsapp: (
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => setScreen('dashboard')} style={{ background:'rgba(255,255,255,.07)', border:'none', width:36, height:36, borderRadius:10, cursor:'pointer', color:'#fff', fontSize:18 }}>‹</button>
          <h2 style={{ fontSize:20, fontWeight:800, margin:0 }}>Share on WhatsApp</h2>
        </div>
        <div style={{ background:'rgba(37,211,102,.08)', border:'1px solid rgba(37,211,102,.25)', borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:6 }}>Your official number</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:24 }}>📱</span>
            <span style={{ fontSize:18, fontWeight:800, color:'#25D366' }}>+44 7700 900123</span>
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.35)', marginTop:6 }}>Tap to copy</div>
        </div>
        <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:10 }}>Your message (copy & send)</div>
          <div style={{ background:'rgba(37,211,102,.08)', border:'1px solid rgba(37,211,102,.2)', borderRadius:12, padding:'14px', fontFamily:'monospace', fontSize:15, color:'#25D366', letterSpacing:'.3px', marginBottom:10 }}>#OFFER 20% off lunch today until 5pm</div>
          <button style={{ width:'100%', background:'rgba(37,211,102,.15)', border:'1px solid rgba(37,211,102,.3)', borderRadius:10, padding:'12px', fontSize:14, fontWeight:700, color:'#25D366', cursor:'pointer' }}>📋 Tap to copy message</button>
        </div>
        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>How it works</div>
          {[['1.','Copy the message above'],['2.','Open WhatsApp Business'],['3.','Paste and send to our number'],['4.','Your offer goes LIVE on Hi-Streets 🎉']].map(([n,t]) => (
            <div key={n} style={{ display:'flex', gap:12, marginBottom:12, alignItems:'flex-start' }}>
              <span style={{ fontSize:13, fontWeight:800, color:OR, width:20, flexShrink:0 }}>{n}</span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,.6)', lineHeight:1.4 }}>{t}</span>
            </div>
          ))}
          <div style={{ marginTop:14, padding:'10px 14px', background: OR+'11', borderRadius:10, border:'1px solid '+OR+'22' }}>
            <div style={{ fontSize:11, fontWeight:700, color:OR, marginBottom:3 }}>💡 Tip</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', lineHeight:1.4 }}>Use #OFFER at the start for faster publishing.</div>
          </div>
        </div>
      </div>
    ),

    offers: (
      <div style={{ flex:1, overflowY:'auto' }}>
        <div style={{ padding:'16px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setScreen('dashboard')} style={{ background:'rgba(255,255,255,.07)', border:'none', width:36, height:36, borderRadius:10, cursor:'pointer', color:'#fff', fontSize:18 }}>‹</button>
            <h2 style={{ fontSize:20, fontWeight:800, margin:0 }}>Offers</h2>
          </div>
          <button onClick={() => setScreen('create')} style={{ background: OR, border:'none', borderRadius:10, padding:'8px 14px', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>+ Create</button>
        </div>
        <div style={{ display:'flex', gap:8, padding:'0 20px', marginBottom:16, overflowX:'auto' }}>
          {['live','scheduled','draft','expired','rejected'].map(t => (
            <button key={t} onClick={() => setOfferTab(t)} style={{ padding:'7px 14px', borderRadius:20, border:'none', whiteSpace:'nowrap', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0, background: offerTab===t ? 'linear-gradient(135deg,'+OR+',#FF8C00)' : 'rgba(255,255,255,.07)', color:'#fff', border: offerTab===t ? 'none' : '1px solid rgba(255,255,255,.1)', boxShadow: offerTab===t ? '0 4px 12px rgba(255,104,31,.35)' : 'none', textTransform:'capitalize' }}>{t}</button>
          ))}
        </div>
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {bizOffers.filter(o => o.status === offerTab).map(o => {
            const st = STATUS_STYLES[o.status] || STATUS_STYLES.draft
            return (
              <div key={o.id} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div style={{ fontSize:15, fontWeight:700, flex:1, marginRight:10 }}>{o.title}</div>
                  <span style={{ background: st.bg, color: st.color, border: st.border, borderRadius:8, padding:'3px 9px', fontSize:10, fontWeight:800 }}>{st.label}</span>
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.35)', marginBottom:o.views ? 10 : 0 }}>{o.schedule || o.updated || o.expiredOn || o.reason}</div>
                {o.views && <div style={{ display:'flex', gap:16 }}>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>👁 {o.views}</span>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>👆 {o.taps}</span>
                </div>}
              </div>
            )
          })}
        </div>
      </div>
    ),
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', display:'flex', flexDirection:'column', fontFamily:'Arial,Helvetica,sans-serif' }}>
      {/* Header */}
      <div style={{ background: PANEL, borderBottom:'1px solid rgba(255,255,255,.08)', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <Logo />
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => router.push('/map')} style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'8px 14px', fontSize:13, color:'rgba(255,255,255,.6)', cursor:'pointer' }}>Exit</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
        {screens[screen] || screens.dashboard}
      </div>

      {/* Business Bottom Nav */}
      <div style={{ background: PANEL, borderTop:'1px solid rgba(255,255,255,.08)', display:'flex', paddingBottom:'env(safe-area-inset-bottom,10px)' }}>
        {[['🏠','Home','dashboard'],['🛍️','Offers','offers'],['📊','Analytics','analytics'],['💬','WhatsApp','whatsapp'],['⚙️','Settings','settings']].map(([ic,lb,sc]) => (
          <button key={sc} onClick={() => setScreen(sc)} style={{ flex:1, background:'none', border:'none', cursor:'pointer', padding:'10px 0 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <span style={{ fontSize:22, filter: screen===sc ? 'none' : 'grayscale(1) opacity(.5)' }}>{ic}</span>
            <span style={{ fontSize:10, fontWeight: screen===sc ? 700 : 400, color: screen===sc ? OR : 'rgba(255,255,255,.4)' }}>{lb}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
