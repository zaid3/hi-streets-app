'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase'

const Map = dynamic(() => import('../../components/Map'), { ssr: false })

const CATS = [
  { id: 'all', label: 'All', icon: '🗺️' },
  { id: 'food', label: 'Food', icon: '🍕' },
  { id: 'retail', label: 'Retail', icon: '🛍️' },
  { id: 'services', label: 'Services', icon: '🔧' },
  { id: 'beauty', label: 'Beauty', icon: '💅' },
  { id: 'health', label: 'Health', icon: '💊' },
]

function LogoF() {
  return (
    <div style={{ display:'inline-block', lineHeight:1, fontFamily:'Arial,Helvetica,sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', gap:0, whiteSpace:'nowrap' }}>
        <div style={{ position:'relative', width:40, height:36, flexShrink:0 }}>
          <div style={{ position:'absolute', top:0, left:0, width:8, height:8, borderTop:'2px solid #ff681f', borderLeft:'2px solid #ff681f' }} />
          <span style={{ position:'absolute', left:6, bottom:4, color:'#ff681f', fontSize:28, fontWeight:800, letterSpacing:'-0.08em' }}>Hi</span>
          <div style={{ position:'absolute', right:2, bottom:2, width:8, height:8, borderBottom:'2px solid #ff681f', borderRight:'2px solid #ff681f' }} />
        </div>
        <span style={{ color:'white', fontSize:26, fontWeight:400, letterSpacing:'-0.055em' }}>Streets</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, color:'#ff681f', fontSize:7, fontWeight:600, letterSpacing:'0.24em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
        <div style={{ width:20, height:1, background:'#ff681f', opacity:0.7, flexShrink:0 }} />
        <span>Live Offers &amp; Free Parking Nearby</span>
      </div>
    </div>
  )
}

export default function MapPage() {
  const router = useRouter()
  const [offers, setOffers] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [newIds, setNewIds] = useState([])
  const [loc, setLoc] = useState({ lat: 51.5374, lng: 0.0055 })
  const [toast, setToast] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login')
    })
    navigator.geolocation?.getCurrentPosition(
      p => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}
    )
    fetchOffers()
    const ch = supabase.channel('offers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offers' }, p => {
        setOffers(prev => [{ ...p.new, businesses: {} }, ...prev])
        setNewIds(prev => [...prev, p.new.id])
        setToast('🎉 New offer posted nearby!')
        setTimeout(() => setToast(null), 3500)
        setTimeout(() => setNewIds(prev => prev.filter(id => id !== p.new.id)), 8000)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchOffers() {
    setLoading(true)
    const { data } = await supabase
      .from('offers')
      .select('*, businesses(name, whatsapp_number)')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    setOffers(data || [])
    setLoading(false)
  }

  const filtered = offers.filter(o => {
    const mc = filter === 'all' || o.category === filter
    const ms = !search || o.title?.toLowerCase().includes(search.toLowerCase()) || o.address?.toLowerCase().includes(search.toLowerCase())
    return mc && ms
  })

  function timeLeft(exp) {
    const d = new Date(exp) - new Date()
    if (d < 0) return 'Expired'
    const h = Math.floor(d / 3600000)
    const m = Math.floor((d % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`
  }

  const catIcon = c => ({ food:'🍕', retail:'🛍️', services:'🔧', beauty:'💅', health:'💊' }[c] || '🏪')

  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', display:'flex', flexDirection:'column', fontFamily:'Arial,Helvetica,sans-serif' }}>

      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:1000, padding:'12px 12px 0', pointerEvents:'none' }}>

        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', pointerEvents:'all' }}>
          {/* Logo F in nav */}
          <div style={{ background:'rgba(12,12,12,0.95)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'14px', padding:'8px 14px', flexShrink:0, boxShadow:'0 4px 20px rgba(0,0,0,.4)' }}>
            <LogoF />
          </div>

          <div style={{ flex:1, background:'rgba(12,12,12,0.95)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'14px', display:'flex', alignItems:'center', padding:'10px 12px', gap:'8px', boxShadow:'0 4px 16px rgba(0,0,0,.4)' }}>
            <span style={{ fontSize:'14px', opacity:0.5 }}>🔍</span>
            <input placeholder="Search offers..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background:'none', border:'none', outline:'none', color:'white', fontSize:'14px', flex:1, minWidth:0 }} />
            {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:'16px', padding:0 }}>✕</button>}
          </div>

          <button onClick={() => supabase.auth.signOut().then(() => router.replace('/login'))}
            style={{ width:44, height:44, background:'rgba(12,12,12,0.95)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0, boxShadow:'0 4px 16px rgba(0,0,0,.4)' }}>
            👤
          </button>
        </div>

        <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'4px', scrollbarWidth:'none', pointerEvents:'all' }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              style={{ padding:'7px 14px', borderRadius:'20px', whiteSpace:'nowrap', fontSize:'13px', fontWeight:600, cursor:'pointer', flexShrink:0,
                background: filter === c.id ? 'linear-gradient(135deg,#ff681f,#FF8C00)' : 'rgba(12,12,12,0.95)',
                color: 'white',
                border: filter === c.id ? 'none' : '1px solid rgba(255,255,255,.1)',
                boxShadow: filter === c.id ? '0 4px 12px rgba(255,104,31,.35)' : '0 2px 8px rgba(0,0,0,.3)'
              }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, position:'relative' }}>
        <Map offers={filtered} center={loc} onOfferClick={setSelected} newOfferIds={newIds} />

        {toast && (
          <div style={{ position:'absolute', top:'130px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#ff681f,#FF8C00)', color:'white', borderRadius:'20px', padding:'10px 20px', fontSize:'14px', fontWeight:600, zIndex:1001, boxShadow:'0 4px 20px rgba(255,104,31,.5)', whiteSpace:'nowrap' }}>
            {toast}
          </div>
        )}

        {!selected && (
          <div style={{ position:'absolute', bottom:'24px', left:'50%', transform:'translateX(-50%)', background:'rgba(12,12,12,0.95)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'20px', padding:'8px 18px', display:'flex', gap:'14px', alignItems:'center', zIndex:999, boxShadow:'0 4px 20px rgba(0,0,0,.4)', whiteSpace:'nowrap' }}>
            <span style={{ fontSize:'13px', color:'rgba(255,255,255,.6)' }}>
              <span style={{ color:'#ff681f', fontWeight:700 }}>●</span> {filtered.length} live offers
            </span>
            <div style={{ width:1, height:14, background:'rgba(255,255,255,.15)' }}/>
            <span style={{ fontSize:'13px', color:'rgba(255,255,255,.6)' }}>🅿️ Parking shown</span>
          </div>
        )}

        {selected && (
          <div className="slide-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(10,10,10,0.98)', backdropFilter:'blur(30px)', borderTop:'1px solid rgba(255,255,255,.08)', borderRadius:'24px 24px 0 0', padding:'16px 20px 40px', zIndex:1000 }}>
            <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 16px' }}/>
            <button onClick={() => setSelected(null)} style={{ position:'absolute', top:16, right:20, background:'rgba(255,255,255,.1)', border:'none', width:30, height:30, borderRadius:'50%', color:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
              <div style={{ width:52, height:52, borderRadius:'14px', background:'rgba(255,104,31,.15)', border:'1px solid rgba(255,104,31,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', flexShrink:0 }}>
                {catIcon(selected.category)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <h3 style={{ fontSize:'17px', fontWeight:700, margin:'0 0 2px', color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selected.title}</h3>
                <p style={{ fontSize:'13px', color:'rgba(255,255,255,.45)', margin:0 }}>{selected.businesses?.name || 'Local business'}</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', marginTop:'14px', flexWrap:'wrap' }}>
              {selected.price_offer && <span style={{ background:'rgba(255,104,31,.15)', color:'#ff681f', border:'1px solid rgba(255,104,31,.3)', borderRadius:'10px', padding:'6px 12px', fontSize:'14px', fontWeight:700 }}>{selected.price_offer}</span>}
              {selected.expires_at && <span style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'10px', padding:'6px 12px', fontSize:'13px', color:'rgba(255,255,255,.55)' }}>⏱ {timeLeft(selected.expires_at)}</span>}
            </div>
            {selected.description && <p style={{ fontSize:'14px', color:'rgba(255,255,255,.55)', marginTop:'12px', lineHeight:1.5 }}>{selected.description}</p>}
            {selected.address && <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'10px', fontSize:'13px', color:'rgba(255,255,255,.4)' }}>📍 {selected.address}</div>}
          </div>
        )}

        {!loading && filtered.length === 0 && !selected && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'rgba(10,10,10,0.95)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'20px', padding:'28px 32px', textAlign:'center', zIndex:999 }}>
            <div style={{ fontSize:'44px', marginBottom:'10px' }}>🏪</div>
            <div style={{ fontWeight:700, fontSize:'16px', marginBottom:'6px' }}>No offers nearby yet</div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,.35)' }}>Businesses post via WhatsApp</div>
          </div>
        )}
      </div>
      <style>{`::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}
