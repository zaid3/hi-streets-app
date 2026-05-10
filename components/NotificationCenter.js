'use client'
import { useState } from 'react'
const OR = '#ff681f'
export default function NotificationCenter({ notifications, onClose, onUpdate }) {
  const [filter, setFilter] = useState('All')
  const tabs = ['All','Offers','Parking','Updates']
  function markAllRead() { onUpdate&&onUpdate(notifications.map(n=>({...n,read:true}))) }
  function markRead(id) { onUpdate&&onUpdate(notifications.map(n=>n.id===id?{...n,read:true}:n)) }
  const filtered = filter==='All'?notifications:notifications.filter(n=>n.type===filter.toLowerCase())
  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', zIndex:2000, display:'flex', flexDirection:'column' }}>
      <div style={{ background:'rgba(12,12,12,.97)', borderBottom:'1px solid rgba(255,255,255,.08)', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.08)', border:'none', width:40, height:40, borderRadius:12, cursor:'pointer', color:'#fff', fontSize:18 }}>←</button>
          <h2 style={{ fontSize:20, fontWeight:800, margin:0 }}>Notifications</h2>
        </div>
        <button onClick={markAllRead} style={{ background:'none', border:'none', color:OR, fontSize:13, cursor:'pointer', fontWeight:600 }}>Mark all read</button>
      </div>
      <div style={{ display:'flex', gap:8, padding:'12px 20px 0', overflowX:'auto' }}>
        {tabs.map(t=><button key={t} onClick={()=>setFilter(t)} style={{ padding:'7px 14px', borderRadius:20, border:'none', whiteSpace:'nowrap', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0, background:filter===t?'linear-gradient(135deg,'+OR+',#FF8C00)':'rgba(255,255,255,.07)', color:'#fff', border:filter===t?'none':'1px solid rgba(255,255,255,.1)', boxShadow:filter===t?'0 4px 12px rgba(255,104,31,.35)':'none' }}>{t}</button>)}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'12px 0' }}>
        {filtered.length===0?<div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:60, textAlign:'center', color:'rgba(255,255,255,.4)' }}><div style={{ fontSize:48, marginBottom:12 }}>🔔</div>All caught up</div>
        :filtered.map(n=><div key={n.id} onClick={()=>markRead(n.id)} style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.05)', display:'flex', gap:12, alignItems:'flex-start', background:!n.read?'rgba(255,104,31,.04)':'transparent', cursor:'pointer' }}>
          <div style={{ width:44, height:44, borderRadius:12, background:!n.read?OR+'22':'rgba(255,255,255,.06)', border:'1px solid '+(!n.read?OR+'44':'rgba(255,255,255,.07)'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{n.icon}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:3 }}>
              <div style={{ fontSize:14, fontWeight:!n.read?700:500 }}>{n.title}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', flexShrink:0 }}>{n.time}</div>
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', lineHeight:1.4 }}>{n.body}</div>
          </div>
          {!n.read&&<div style={{ width:8, height:8, background:OR, borderRadius:'50%', flexShrink:0, marginTop:6 }} />}
        </div>)}
      </div>
    </div>
  )
}
