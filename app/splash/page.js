'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const OR = '#ff681f'
const slides = [
  { icon:'🅿️', title:'Free parking nearby', body:'Find free parking spots across the UK and park with confidence.', bg:'rgba(46,204,113,.12)' },
  { icon:'🛍️', title:'Live local offers', body:'Discover real-time offers from shops, cafés and local businesses.', bg:'rgba(255,104,31,.12)' },
  { icon:'💬', title:'Businesses post offers', body:'Businesses post live offers via app or WhatsApp — instantly on the map.', bg:'rgba(37,211,102,.12)' },
]

function Logo({ size=50 }) {
  const cs = Math.round(size * 0.22), sw = size > 40 ? 3 : 2
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', fontFamily:'Arial,Helvetica,sans-serif', lineHeight:1 }}>
      <div style={{ display:'flex', alignItems:'center' }}>
        <div style={{ position:'relative', width:size*1.2, height:size*1.05, flexShrink:0 }}>
          <div style={{ position:'absolute', top:0, left:0, width:cs, height:cs, borderTop:sw+'px solid '+OR, borderLeft:sw+'px solid '+OR }} />
          <span style={{ position:'absolute', left:cs*.7, bottom:cs*.4, fontSize:size, fontWeight:800, color:OR, letterSpacing:'-0.08em' }}>Hi</span>
          <div style={{ position:'absolute', right:0, bottom:cs*.3, width:cs, height:cs, borderBottom:sw+'px solid '+OR, borderRight:sw+'px solid '+OR }} />
        </div>
        <span style={{ fontSize:size*.9, fontWeight:400, color:'#fff', letterSpacing:'-0.055em' }}>Streets</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:size*.18 }}>
        <div style={{ width:size*.6, height:1.5, background:OR, opacity:.7 }} />
        <span style={{ fontSize:size*.14, color:OR, fontWeight:600, letterSpacing:'0.24em', textTransform:'uppercase', whiteSpace:'nowrap' }}>LIVE OFFERS & FREE PARKING NEARBY</span>
      </div>
    </div>
  )
}

export { Logo }

export default function SplashPage() {
  const router = useRouter()
  const [phase, setPhase] = useState('splash')
  const [slide, setSlide] = useState(0)
  const [role, setRole] = useState(null)

  if (phase === 'splash') return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:48 }}>
      <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:500, height:500, background:'radial-gradient(circle,rgba(255,104,31,.12) 0%,transparent 70%)', pointerEvents:'none' }} />
      <Logo size={58} />
      <button onClick={() => setPhase('slides')} style={{ background:OR, color:'#fff', border:'none', borderRadius:14, padding:'18px 56px', fontSize:17, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 32px rgba(255,104,31,.4)' }}>Get Started</button>
    </div>
  )

  if (phase === 'slides') {
    const s = slides[slide], last = slide === slides.length - 1
    return (
      <div style={{ position:'fixed', inset:0, background:'#0a0a0a', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:36, textAlign:'center', position:'relative' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 40%,'+s.bg+' 0%,transparent 70%)' }} />
          <div style={{ fontSize:88, marginBottom:36, position:'relative' }}>{s.icon}</div>
          <h2 style={{ fontSize:27, fontWeight:800, marginBottom:14, position:'relative' }}>{s.title}</h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,.6)', lineHeight:1.65, maxWidth:280, position:'relative' }}>{s.body}</p>
        </div>
        <div style={{ padding:'20px 24px 52px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:4 }}>
            {slides.map((_,i) => <div key={i} style={{ width:i===slide?22:7, height:7, borderRadius:4, background:i===slide?OR:'rgba(255,255,255,.2)', transition:'all .3s' }} />)}
          </div>
          <button onClick={() => last ? setPhase('role') : setSlide(s=>s+1)} style={{ background:OR, color:'#fff', border:'none', borderRadius:14, padding:18, fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.4)' }}>{last ? 'Get Started' : 'Next'}</button>
        </div>
      </div>
    )
  }

  if (phase === 'role') return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', display:'flex', flexDirection:'column', padding:'48px 24px 48px', justifyContent:'center' }}>
      <div style={{ marginBottom:40 }}><Logo size={42} /></div>
      <h2 style={{ fontSize:24, fontWeight:800, marginBottom:6 }}>Welcome to Hi-Streets</h2>
      <p style={{ fontSize:14, color:'rgba(255,255,255,.45)', marginBottom:32 }}>Sign in or create an account to continue.</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
        {[{id:'user',icon:'👤',label:'User',sub:'Find parking & offers'},{id:'business',icon:'🏪',label:'Business',sub:'Post offers & reach locals'}].map(r => (
          <button key={r.id} onClick={() => setRole(r.id)} style={{ background:role===r.id?'rgba(255,104,31,.15)':'rgba(255,255,255,.05)', border:role===r.id?'2px solid '+OR:'2px solid rgba(255,255,255,.1)', borderRadius:16, padding:'20px 12px', cursor:'pointer', color:'#fff', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>{r.icon}</div>
            <div style={{ fontWeight:700, fontSize:15 }}>{r.label}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginTop:4 }}>{r.sub}</div>
          </button>
        ))}
      </div>
      <button onClick={() => setPhase('location')} disabled={!role} style={{ width:'100%', background:role?OR:'rgba(255,104,31,.3)', border:'none', borderRadius:14, padding:18, fontSize:16, fontWeight:700, color:'#fff', cursor:role?'pointer':'not-allowed', boxShadow:role?'0 4px 20px rgba(255,104,31,.35)':'none', marginBottom:10 }}>Continue</button>
      <button onClick={() => { localStorage.setItem('hs_guest','1'); router.replace('/map') }} style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,.3)', cursor:'pointer', fontSize:13, padding:12 }}>Browse as guest</button>
    </div>
  )

  if (phase === 'location') return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, textAlign:'center' }}>
      <div style={{ fontSize:88, marginBottom:28 }}>📍</div>
      <h2 style={{ fontSize:24, fontWeight:800, marginBottom:12 }}>Allow location access</h2>
      <p style={{ fontSize:15, color:'rgba(255,255,255,.5)', lineHeight:1.65, maxWidth:280, marginBottom:44 }}>We use your location to show free parking spots and nearby offers across the UK.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:320 }}>
        <button onClick={() => { navigator.geolocation?.getCurrentPosition(()=>{}); setPhase('notify') }} style={{ background:OR, border:'none', borderRadius:14, padding:18, fontSize:16, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)' }}>Allow Location</button>
        <button onClick={() => setPhase('notify')} style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:18, fontSize:16, color:'#fff', cursor:'pointer' }}>Not Now</button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, textAlign:'center' }}>
      <div style={{ fontSize:88, marginBottom:28 }}>🔔</div>
      <h2 style={{ fontSize:24, fontWeight:800, marginBottom:12 }}>Stay in the know</h2>
      <p style={{ fontSize:15, color:'rgba(255,255,255,.5)', lineHeight:1.65, maxWidth:280, marginBottom:44 }}>Enable notifications to get alerts for nearby offers and parking reminders.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:320 }}>
        <button onClick={() => router.push(role === 'business' ? '/business' : '/login')} style={{ background:OR, border:'none', borderRadius:14, padding:18, fontSize:16, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)' }}>Allow Notifications</button>
        <button onClick={() => router.push(role === 'business' ? '/business' : '/login')} style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:18, fontSize:16, color:'#fff', cursor:'pointer' }}>Not Now</button>
      </div>
    </div>
  )
}
