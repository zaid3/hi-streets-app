'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseWhatsAppOffer, publishOffer } from '../../lib/offersAdapter.js'


const OR = '#ff681f'
const PANEL = 'rgba(10,10,10,.97)'

const BIZ_OFFERS = [
  { id:1, title:'20% off Lunch', status:'live', schedule:'Today, 11:30 AM - 5:00 PM', views:256, taps:512 },
  { id:2, title:'Happy Hour 1+1', status:'scheduled', schedule:'Today, 5:00 PM - 8:30 PM', startsIn:'3h 20m' },
  { id:3, title:'Weekend Brunch', status:'draft', updated:'2d ago' },
  { id:4, title:'Free Coffee', status:'expired', expiredOn:'18 May', views:1300, taps:245 },
  { id:5, title:'Old Offer', status:'rejected', reason:'Misleading terms' },
]

const STATUS = {
  live:      { bg:'rgba(46,204,113,.15)',  color:'#2ECC71', label:'LIVE' },
  scheduled: { bg:'rgba(74,158,255,.15)',  color:'#4A9EFF', label:'SCHEDULED' },
  draft:     { bg:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.5)', label:'DRAFT' },
  expired:   { bg:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.3)', label:'EXPIRED' },
  rejected:  { bg:'rgba(231,76,60,.1)',    color:'#E74C3C', label:'REJECTED' },
}

function Logo() {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', fontFamily:'Arial,Helvetica,sans-serif', lineHeight:1 }}>
      <div style={{ position:'relative', width:34, height:30, flexShrink:0 }}>
        <div style={{ position:'absolute', top:0, left:0, width:7, height:7, borderTop:'2px solid '+OR, borderLeft:'2px solid '+OR }} />
        <span style={{ position:'absolute', left:5, bottom:3, fontSize:24, fontWeight:800, color:OR, letterSpacing:'-0.08em' }}>Hi</span>
        <div style={{ position:'absolute', right:0, bottom:2, width:7, height:7, borderBottom:'2px solid '+OR, borderRight:'2px solid '+OR }} />
      </div>
      <span style={{ fontSize:22, fontWeight:400, color:'#fff', letterSpacing:'-0.055em' }}>Streets</span>
      <span style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginLeft:8 }}>Business</span>
    </div>
  )
}

export default function BusinessPage() {
  const router = useRouter()
  const [screen, setScreen] = useState('dashboard')
  const [offerTab, setOfferTab] = useState('live')
  const [form, setForm] = useState({ title:'', description:'', type:'Discount', value:'', validTill:'', terms:'' })
  const [waMsg, setWaMsg] = useState('')
  const [waParsed, setWaParsed] = useState(null)
  const [toast, setToast] = useState(null)
  const [publishing, setPublishing] = useState(false)

  function showToast(msg, type='success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  async function handlePublish() {
    if (!form.title || !form.validTill) { showToast('Please fill in title and valid till date', 'error'); return }
    setPublishing(true)
    const result = await publishOffer({ title: form.title, description: form.description, expires_at: form.validTill, terms: form.terms, source: 'app', is_active: true })
    setPublishing(false)
    if (result.success) { showToast('Offer published! It is now live on the map.'); setScreen('offers') }
    else showToast('Saved as draft. You can publish later.', 'info')
  }

  function parseWA() {
    const result = parseWhatsAppOffer(waMsg)
    setWaParsed(result)
  }

  const screens = {
    dashboard: (
      <div style={{ flex:1, overflowY:'auto', padding:'0 20px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, marginBottom:2 }}>Hello, Jordan 👋</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>Here's what's happening today.</div>
          </div>
          <button style={{ width:40, height:40, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>🔔</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          {[['Offers Live','2',OR],['Profile Views','1,248','rgba(255,255,255,.7)']].map(([k,v,c]) => (
            <div key={k} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:16 }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>{k}</div>
              <div style={{ fontSize:28, fontWeight:800, color:c }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:14 }}>Quick Stats (This Week)</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[['Views','12.4K','+18%'],['Taps','3.2K','+12%'],['Saves','842','+9%'],['Map Opens','1.6K','+15%']].map(([k,v,ch]) => (
              <div key={k}><div style={{ fontSize:22, fontWeight:800 }}>{v}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:2 }}>{k}</div><div style={{ fontSize:11, color:'#2ECC71', fontWeight:600 }}>{ch}</div></div>
            ))}
          </div>
        </div>
        <button onClick={() => setScreen('create')} style={{ width:'100%', background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:14, padding:16, fontSize:16, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <span style={{ fontSize:20 }}>+</span> Create Offer
        </button>
      </div>
    ),

    create: (
      <div style={{ flex:1, overflowY:'auto', padding:'0 20px 24px' }}>
        <h3 style={{ fontSize:18, fontWeight:800, marginBottom:20 }}>Create Offer</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[['Offer title *','e.g. 20% off Lunch','title',false],['Description','e.g. Enjoy 20% off all lunch orders until 5pm.','description',true],['Terms (optional)','e.g. Not valid with other offers.','terms',true]].map(([lb,ph,key,multi]) => (
            <div key={key}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', marginBottom:8 }}>{lb}</label>
              {multi ? <textarea value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} rows={3} style={{ width:'100%', padding:14, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#fff', fontSize:14, outline:'none', resize:'none' }} />
                     : <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:14, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#fff', fontSize:14, outline:'none' }} />}
            </div>
          ))}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', marginBottom:8 }}>Offer Type</label>
            <div style={{ display:'flex', gap:8 }}>
              {['Discount','BOGO','Other'].map(t => <button key={t} onClick={() => setForm(f=>({...f,type:t}))} style={{ flex:1, background:form.type===t?OR+'22':'rgba(255,255,255,.07)', border:form.type===t?'2px solid '+OR:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:10, color:form.type===t?OR:'#fff', fontSize:13, fontWeight:form.type===t?700:400, cursor:'pointer' }}>{t}</button>)}
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', marginBottom:8 }}>Valid Till *</label>
            <input type="datetime-local" value={form.validTill} onChange={e=>setForm(f=>({...f,validTill:e.target.value}))} style={{ width:'100%', padding:14, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#fff', fontSize:13, outline:'none' }} />
          </div>
          <button onClick={handlePublish} disabled={publishing} style={{ background:publishing?'rgba(255,104,31,.35)':'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:14, padding:16, fontSize:16, fontWeight:700, color:'#fff', cursor:publishing?'not-allowed':'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)' }}>
            {publishing ? 'Publishing...' : '🚀 Publish Offer'}
          </button>
        </div>
      </div>
    ),

    whatsapp: (
      <div style={{ flex:1, overflowY:'auto', padding:'0 20px 24px' }}>
        <h3 style={{ fontSize:18, fontWeight:800, marginBottom:20 }}>WhatsApp Publishing</h3>
        <div style={{ background:'rgba(37,211,102,.08)', border:'1px solid rgba(37,211,102,.25)', borderRadius:16, padding:18, marginBottom:16 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:6 }}>Your official Hi-Streets number</div>
          <div style={{ fontSize:20, fontWeight:800, color:'#25D366' }}>+44 7700 900123</div>
          <button onClick={() => { navigator.clipboard?.writeText('+44 7700 900123'); showToast('Number copied!') }} style={{ marginTop:8, background:'none', border:'1px solid rgba(37,211,102,.3)', borderRadius:8, padding:'6px 14px', color:'#25D366', cursor:'pointer', fontSize:12 }}>📋 Copy number</button>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', marginBottom:8 }}>Paste your WhatsApp message here to preview</label>
          <textarea value={waMsg} onChange={e=>setWaMsg(e.target.value)} placeholder="#OFFER 20% off lunch today until 5pm" rows={3} style={{ width:'100%', padding:14, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#fff', fontSize:14, outline:'none', resize:'none', fontFamily:'monospace' }} />
          <button onClick={parseWA} style={{ marginTop:8, background:OR, border:'none', borderRadius:10, padding:'10px 20px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>Parse & Preview</button>
        </div>
        {waParsed && (
          <div style={{ background: waParsed.valid ? 'rgba(46,204,113,.1)' : 'rgba(231,76,60,.1)', border:'1px solid '+(waParsed.valid?'rgba(46,204,113,.3)':'rgba(231,76,60,.3)'), borderRadius:14, padding:16, marginBottom:16 }}>
            {waParsed.valid ? (<>
              <div style={{ fontSize:14, fontWeight:700, color:'#2ECC71', marginBottom:8 }}>✅ Valid offer format</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', marginBottom:4 }}><strong>Title:</strong> {waParsed.title}</div>
              {waParsed.expiresAt && <div style={{ fontSize:13, color:'rgba(255,255,255,.7)' }}><strong>Expires:</strong> {new Date(waParsed.expiresAt).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}</div>}
            </>) : (<>
              <div style={{ fontSize:14, fontWeight:700, color:'#E74C3C', marginBottom:8 }}>❌ Invalid format</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginBottom:4 }}>{waParsed.error}</div>
              {waParsed.example && <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', fontFamily:'monospace' }}>Example: {waParsed.example}</div>}
            </>)}
          </div>
        )}
        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>How it works</div>
          {['Copy the Hi-Streets WhatsApp number above','Open WhatsApp Business on your phone','Send: #OFFER [your offer text]','Your offer appears live on the map within seconds 🎉'].map((t,i) => (
            <div key={i} style={{ display:'flex', gap:12, marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:800, color:OR, width:20, flexShrink:0 }}>{i+1}.</span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,.6)', lineHeight:1.4 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),

    offers: (
      <div style={{ flex:1, overflowY:'auto' }}>
        <div style={{ padding:'0 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <h3 style={{ fontSize:18, fontWeight:800, margin:0 }}>Manage Offers</h3>
          <button onClick={() => setScreen('create')} style={{ background:OR, border:'none', borderRadius:10, padding:'8px 14px', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>+ Create</button>
        </div>
        <div style={{ display:'flex', gap:8, padding:'0 20px', marginBottom:14, overflowX:'auto' }}>
          {['live','scheduled','draft','expired','rejected'].map(t => <button key={t} onClick={() => setOfferTab(t)} style={{ padding:'7px 14px', borderRadius:20, border:'none', whiteSpace:'nowrap', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0, background:offerTab===t?'linear-gradient(135deg,'+OR+',#FF8C00)':'rgba(255,255,255,.07)', color:'#fff', border:offerTab===t?'none':'1px solid rgba(255,255,255,.1)', boxShadow:offerTab===t?'0 4px 12px rgba(255,104,31,.35)':'none', textTransform:'capitalize' }}>{t}</button>)}
        </div>
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {BIZ_OFFERS.filter(o => o.status===offerTab).map(o => {
            const st = STATUS[o.status]
            return (
              <div key={o.id} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div style={{ fontSize:15, fontWeight:700, flex:1, marginRight:10 }}>{o.title}</div>
                  <span style={{ background:st.bg, color:st.color, borderRadius:8, padding:'3px 9px', fontSize:10, fontWeight:800 }}>{st.label}</span>
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.35)' }}>{o.schedule || o.updated || o.expiredOn || o.reason}</div>
                {o.views && <div style={{ display:'flex', gap:14, marginTop:8 }}><span style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>👁 {o.views}</span><span style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>👆 {o.taps}</span></div>}
              </div>
            )
          })}
          {BIZ_OFFERS.filter(o => o.status===offerTab).length === 0 && <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,.3)', fontSize:14 }}>No {offerTab} offers</div>}
        </div>
      </div>
    ),

    analytics: (
      <div style={{ flex:1, overflowY:'auto', padding:'0 20px 24px' }}>
        <h3 style={{ fontSize:18, fontWeight:800, marginBottom:20 }}>Analytics</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          {[['Views','12,436','+18%'],['Taps','3,245','+12%'],['Saves','842','+9%'],['Map Opens','1,610','+15%']].map(([k,v,ch]) => (
            <div key={k} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:14 }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>{k}</div>
              <div style={{ fontSize:22, fontWeight:800, marginBottom:2 }}>{v}</div>
              <div style={{ fontSize:11, color:'#2ECC71', fontWeight:600 }}>{ch} this week</div>
            </div>
          ))}
        </div>
        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Top Offers By Views</div>
          {[['20% off Lunch',2140],['Happy Hour 1+1',1680],['Weekend Brunch',1230]].map(([t,v]) => (
            <div key={t} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
              <div style={{ fontSize:14 }}>{t}</div>
              <div style={{ fontSize:14, fontWeight:700, color:OR }}>{v.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    settings: (
      <div style={{ flex:1, overflowY:'auto', padding:'0 20px 24px' }}>
        <h3 style={{ fontSize:18, fontWeight:800, marginBottom:20 }}>Settings</h3>
        <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:16, marginBottom:16, display:'flex', gap:14, alignItems:'center' }}>
          <div style={{ width:50, height:50, borderRadius:14, background:OR+'22', border:'1px solid '+OR+'44', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🏪</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>The Coffee Corner</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.4)' }}>Main Branch · business@example.com</div>
            <div style={{ fontSize:11, color:'#2ECC71', marginTop:4 }}>✅ Verified business</div>
          </div>
        </div>
        {[['Business information','Edit your profile'],['Locations','Manage branches'],['Team members','Add staff'],['Notifications','Alert preferences'],['Help & FAQs','Get support'],['Contact Support','Talk to us']].map(([k,v]) => (
          <button key={k} onClick={() => showToast(k+' — coming soon')} style={{ width:'100%', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:12, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', color:'#fff', marginBottom:8 }}>
            <div style={{ textAlign:'left' }}><div style={{ fontSize:14, fontWeight:600 }}>{k}</div><div style={{ fontSize:12, color:'rgba(255,255,255,.35)', marginTop:2 }}>{v}</div></div>
            <span style={{ color:'rgba(255,255,255,.3)' }}>›</span>
          </button>
        ))}
        <button onClick={() => router.push('/map')} style={{ width:'100%', marginTop:8, background:'rgba(231,76,60,.1)', border:'1px solid rgba(231,76,60,.3)', borderRadius:12, padding:16, fontSize:14, fontWeight:700, color:'#E74C3C', cursor:'pointer' }}>🚪 Logout</button>
      </div>
    ),
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', display:'flex', flexDirection:'column', fontFamily:'Arial,Helvetica,sans-serif' }}>
      {toast && <div style={{ position:'fixed', top:'10%', left:'50%', transform:'translateX(-50%)', background: toast.type==='error'?'#E74C3C':'linear-gradient(135deg,'+OR+',#FF8C00)', color:'#fff', borderRadius:20, padding:'10px 22px', fontSize:14, fontWeight:700, zIndex:9999, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,.4)' }}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ background: PANEL, borderBottom:'1px solid rgba(255,255,255,.08)', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <Logo />
        <button onClick={() => router.push('/map')} style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'8px 14px', fontSize:13, color:'rgba(255,255,255,.6)', cursor:'pointer' }}>← Exit</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', padding:'16px 0 0' }}>
        {screens[screen] || screens.dashboard}
      </div>

      {/* Business nav */}
      <div style={{ background: PANEL, borderTop:'1px solid rgba(255,255,255,.08)', display:'flex', paddingBottom:'env(safe-area-inset-bottom,10px)' }}>
        {[['🏠','Home','dashboard'],['🛍️','Offers','offers'],['📊','Analytics','analytics'],['💬','WhatsApp','whatsapp'],['⚙️','Settings','settings']].map(([ic,lb,sc]) => (
          <button key={sc} onClick={() => setScreen(sc)} style={{ flex:1, background:'none', border:'none', cursor:'pointer', padding:'10px 0 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <span style={{ fontSize:22, filter:screen===sc?'none':'grayscale(1) opacity(.45)' }}>{ic}</span>
            <span style={{ fontSize:10, fontWeight:screen===sc?700:400, color:screen===sc?OR:'rgba(255,255,255,.4)' }}>{lb}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
