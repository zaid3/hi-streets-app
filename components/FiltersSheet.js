'use client'
import { useState } from 'react'
const OR = '#ff681f'
const GROUPS = [
  { label:'Price', items:[['free','🟢','Park for free'],['paid','🔵','Pay to park']] },
  { label:'Parking Type', items:[['carpark','🅿️','Car parks'],['permit','🟣','Permit bays'],['restricted','⛔','No parking areas'],['loading','🟠','Loading bays']] },
  { label:'Special', items:[['disabled','♿','Disabled bays'],['ev','⚡','EV charging'],['resident','🏠','Resident bays']] },
  { label:'Show on Map', items:[['pois','🏪','Local businesses'],['offers','🛍️','Live offers'],['segments','🛣️','Street parking'],['carparks','🅿️','Car park pins']] },
]
export default function FiltersSheet({ activeFilters, onApply, onClose }) {
  const [sel, setSel] = useState(activeFilters||['free','paid','carpark','pois','offers','segments','carparks'])
  const tog = id => setSel(s => s.includes(id)?s.filter(x=>x!==id):[...s,id])
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.65)' }} />
      <div className="slide-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(10,10,10,.98)', backdropFilter:'blur(30px)', borderRadius:'22px 22px 0 0', padding:'16px 20px 40px', zIndex:1001, maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 16px' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:18, fontWeight:800, margin:0 }}>Map Filters</h3>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.08)', border:'none', width:32, height:32, borderRadius:'50%', color:'#fff', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
        {GROUPS.map(g => <div key={g.label} style={{ marginBottom:18 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>{g.label}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {g.items.map(([id,ic,lb]) => <button key={id} onClick={()=>tog(id)} style={{ background:sel.includes(id)?'rgba(255,104,31,.15)':'rgba(255,255,255,.04)', border:sel.includes(id)?'2px solid '+OR:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, color:'#fff', textAlign:'left' }}><span style={{ fontSize:18 }}>{ic}</span><span style={{ fontSize:13, fontWeight:sel.includes(id)?700:400 }}>{lb}</span></button>)}
          </div>
        </div>)}
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button onClick={onClose} style={{ flex:1, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:15, fontSize:14, color:'rgba(255,255,255,.6)', cursor:'pointer' }}>Cancel</button>
          <button onClick={()=>{ onApply(sel); onClose() }} style={{ flex:2, background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:12, padding:15, fontSize:15, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)' }}>Apply</button>
        </div>
      </div>
    </div>
  )
}
