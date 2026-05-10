'use client'
import { useState, useRef, useEffect } from 'react'
import { searchUK } from '../lib/mapAdapters.js'
const QUICK = [{label:'📍 Near me',type:'location'},{label:'🚉 Stations nearby',query:'train station'},{label:'🅿️ Car parks',query:'car park'},{label:'🛒 Supermarkets',query:'supermarket'}]
export default function SearchOverlay({ onSelect, onClose, currentLocation }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState(() => { try { return JSON.parse(localStorage.getItem('hs_recent')||'[]') } catch { return [] } })
  const timer = useRef(null), inp = useRef(null)
  useEffect(() => { inp.current?.focus() }, [])
  useEffect(() => {
    clearTimeout(timer.current)
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    timer.current = setTimeout(async () => { setResults(await searchUK(query)); setLoading(false) }, 400)
  }, [query])
  function select(item) {
    const e = { name:item.name, lat:item.lat, lng:item.lng }
    const up = [e,...recent.filter(r=>r.name!==item.name)].slice(0,6)
    setRecent(up); try { localStorage.setItem('hs_recent',JSON.stringify(up)) } catch {}
    onSelect(item)
  }
  const OR = '#ff681f'
  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', zIndex:2000, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'16px 16px 0', display:'flex', gap:10, alignItems:'center' }}>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,.08)', border:'none', width:40, height:40, borderRadius:12, cursor:'pointer', color:'#fff', fontSize:18 }}>←</button>
        <div style={{ flex:1, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:14, display:'flex', alignItems:'center', padding:'0 14px', gap:10 }}>
          <span style={{ opacity:.5 }}>🔍</span>
          <input ref={inp} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search UK postcode, road, town, city..." style={{ background:'none', border:'none', outline:'none', color:'#fff', fontSize:15, flex:1, padding:'13px 0' }} />
          {query && <button onClick={()=>setQuery('')} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:18, padding:0 }}>✕</button>}
        </div>
      </div>
      {!query && <div style={{ padding:'16px 16px 0' }}>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>Quick Search</div>
        {QUICK.map((q,i) => <button key={i} onClick={() => q.type==='location'?select({name:'Current Location',lat:currentLocation?.lat||51.5074,lng:currentLocation?.lng||-0.1278}):setQuery(q.query)} style={{ width:'100%', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'12px 16px', marginBottom:6, cursor:'pointer', color:'#fff', textAlign:'left', fontSize:14 }}>{q.label}</button>)}
        {recent.length>0 && <><div style={{ fontSize:11, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10, marginTop:14 }}>Recent</div>
        {recent.map((r,i) => <button key={i} onClick={()=>select(r)} style={{ width:'100%', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:12, padding:'12px 16px', marginBottom:6, cursor:'pointer', color:'rgba(255,255,255,.7)', textAlign:'left', fontSize:14, display:'flex', gap:10 }}>🕐 {r.name}</button>)}</>}
      </div>}
      {loading && <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.4)' }}>Searching UK...</div>}
      {!loading && results.length>0 && <div style={{ flex:1, overflowY:'auto', padding:'8px 16px 24px' }}>
        {results.map((r,i) => <button key={i} onClick={()=>select(r)} style={{ width:'100%', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'13px 16px', marginBottom:6, cursor:'pointer', textAlign:'left', display:'flex', gap:12, alignItems:'center', color:'#fff' }}>
          <span style={{ fontSize:18 }}>{r.class==='railway'?'🚉':r.class==='amenity'?'🏪':'📍'}</span>
          <div><div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{r.name}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{r.fullName.slice(0,60)}</div></div>
        </button>)}
      </div>}
      {!loading && query.length>2 && results.length===0 && <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.4)', gap:10 }}><div style={{ fontSize:40 }}>🔍</div>No results for "{query}"</div>}
    </div>
  )
}
