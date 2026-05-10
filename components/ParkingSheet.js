'use client'
import { useState } from 'react'
const OR = '#ff681f'
const PANEL = 'rgba(10,10,10,.97)'

const HOURS = Array.from({length:24},(_,i)=>i)

function MiniTimeline({ color, startH, endH, currentH }) {
  return (
    <div>
      <div style={{ display:'flex', height:10, borderRadius:4, overflow:'hidden' }}>
        {HOURS.map(h => {
          const inRange = startH !== undefined && endH !== undefined && h >= startH && h < endH
          const bg = inRange ? color : '#2ECC71'
          const isCur = h === currentH
          return <div key={h} style={{ flex:1, background:bg, opacity: isCur ? 1 : 0.6, position:'relative' }}>
            {isCur && <div style={{ position:'absolute', top:-2, left:'50%', transform:'translateX(-50%)', width:2, height:14, background:'white', borderRadius:1 }} />}
          </div>
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
        <span style={{ fontSize:9, color:'rgba(255,255,255,.3)' }}>12am</span>
        <span style={{ fontSize:9, color:'rgba(255,255,255,.3)' }}>12pm</span>
        <span style={{ fontSize:9, color:'rgba(255,255,255,.3)' }}>12am</span>
      </div>
    </div>
  )
}

function DirectionsPicker({ item, onClose }) {
  const apps = [
    { name:'Google Maps', icon:'🗺️', url:`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}` },
    { name:'Apple Maps', icon:'🍎', url:`maps://maps.apple.com/?daddr=${item.lat},${item.lng}` },
    { name:'Waze', icon:'🚗', url:`https://waze.com/ul?ll=${item.lat},${item.lng}&navigate=yes` },
    { name:'Citymapper', icon:'🚌', url:`https://citymapper.com/directions?endcoord=${item.lat},${item.lng}` },
  ]
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1200 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.7)' }} />
      <div className="slide-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:PANEL, borderRadius:'22px 22px 0 0', padding:'16px 20px 44px', zIndex:1201 }}>
        <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 16px' }} />
        <h3 style={{ fontSize:17, fontWeight:800, marginBottom:20 }}>Open navigation in...</h3>
        {apps.map(a => (
          <button key={a.name} onClick={() => { window.open(a.url); onClose() }}
            style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:'16px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:14, color:'#fff', textAlign:'left', marginBottom:10 }}>
            <span style={{ fontSize:26 }}>{a.icon}</span><span style={{ fontSize:16, fontWeight:600 }}>{a.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ParkingSheet({ item, onClose, onReport }) {
  const [showDirPicker, setShowDirPicker] = useState(false)
  const [timerActive, setTimerActive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState(null)

  const timerRef = useState(null)
  if (!item) return null

  const now = new Date()
  const currentH = now.getHours()
  const colors = { free:'#2ECC71', paid:'#4A9EFF', permit:'#9B59B6', restricted:'#888888', loading:'#F39C12', carpark:'#F39C12' }
  const statusColor = item.color || colors[item.type] || colors[item.statusColor] || '#4A9EFF'
  const isRestricted = item.type === 'restricted'
  const isFree = item.type === 'free'
  const isPaid = item.type === 'paid'
  const isPermit = item.type === 'permit'

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2800) }

  function startTimer() {
    setTimerActive(true); setElapsed(0)
    const id = setInterval(() => setElapsed(e => e+1), 1000)
    timerRef[1](id)
    showToast('Parking timer started!')
  }
  function stopTimer() {
    setTimerActive(false)
    clearInterval(timerRef[0])
    showToast('Timer stopped.')
  }

  const fmtE = () => { const h=Math.floor(elapsed/3600),m=Math.floor((elapsed%3600)/60),s=elapsed%60; return `${h>0?h+'h ':''}${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` }

  // Determine hours for timeline
  const ruleStartH = item.tags?.['parking:condition:right'] ? 8 : isPaid ? 8 : isPermit ? 10 : undefined
  const ruleEndH = item.tags?.['parking:condition:right'] ? 18 : isPaid ? 18 : isPermit ? 16 : undefined

  const bayTypeLabel = {
    free: 'Free bay', paid: 'Paid bay', permit: 'Resident bay',
    restricted: item.tags?.['parking:lane:right'] === 'no_parking' ? 'Double yellow line' : 'Restricted area',
    loading: 'Loading bay', carpark: 'Off-street car park',
  }[item.type] || 'Bay'

  const nextNote = {
    free: 'No parking restrictions until 08:00 tomorrow.',
    paid: `Paid parking until ${ruleEndH ? ruleEndH+':00' : '18:30'}. Free outside hours.`,
    permit: `Permit holders restriction Mon–Fri ${ruleStartH||10}am–${ruleEndH||16 > 12 ? (ruleEndH||16)-12+'pm' : (ruleEndH||16)+'am'}.`,
    restricted: 'No parking at any time.',
    loading: 'Loading/unloading only. 30 min max.',
    carpark: 'Open all day.',
  }[item.type] || ''

  return (
    <>
      {showDirPicker && <DirectionsPicker item={item} onClose={() => setShowDirPicker(false)} />}
      {toast && <div style={{ position:'fixed', top:'20%', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,'+OR+',#FF8C00)', color:'#fff', borderRadius:20, padding:'10px 22px', fontSize:14, fontWeight:700, zIndex:1100, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(255,104,31,.5)' }}>{toast}</div>}

      <div className="slide-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:PANEL, backdropFilter:'blur(30px)', borderTop:'1px solid rgba(255,255,255,.08)', borderRadius:'22px 22px 0 0', zIndex:500, maxHeight:'82vh', overflowY:'auto' }}>
        <div style={{ padding:'14px 20px 44px' }}>
          <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 14px' }} />
          <button onClick={onClose} style={{ position:'absolute', top:14, right:20, background:'rgba(255,255,255,.08)', border:'none', width:32, height:32, borderRadius:'50%', color:'#fff', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>

          {/* Status */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:statusColor+'22', color:statusColor, border:'1px solid '+statusColor+'44', borderRadius:20, padding:'5px 14px', fontSize:13, fontWeight:700, marginBottom:12 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:statusColor }} /> {item.label || item.statusLabel}
          </div>

          {/* Bay type */}
          <div style={{ fontSize:16, fontWeight:800, marginBottom:2 }}>{bayTypeLabel}</div>
          {item.name && <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:4 }}>{item.name}{item.side ? ` · ${item.side} side` : ''}</div>}
          {item.address && <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:12 }}>📍 {item.address}</div>}

          {/* Info box */}
          <div style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'13px 15px', marginBottom:14 }}>
            <p style={{ fontSize:14, color:'rgba(255,255,255,.8)', lineHeight:1.6, margin:0 }}>
              {item.info || nextNote}
            </p>
          </div>

          {/* Details grid — hide for restricted */}
          {!isRestricted && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[
                ['Bay type', bayTypeLabel],
                ['Payment', item.cost > 0 ? '£'+item.cost+'/hr' : 'No charge'],
                ['Stay up to', item.maxStay || 'No limit'],
                ['No return', item.noReturn || 'None'],
                ['Side of road', item.side ? item.side.charAt(0).toUpperCase()+item.side.slice(1)+' side' : 'Both sides'],
                ['Data source', item.source === 'osm' ? 'OpenStreetMap' : 'Hi-Streets'],
              ].map(([k,v]) => (
                <div key={k} style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:'10px 12px' }}>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:4 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Operating hours timeline */}
          {!isRestricted && (ruleStartH !== undefined) && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Operating Hours</div>
              <MiniTimeline color={statusColor} startH={ruleStartH} endH={ruleEndH} currentH={currentH} />
              <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginTop:8 }}>
                {isPaid && `Paid: Mon–Sat ${ruleStartH}am–${(ruleEndH||18)-12 > 0 ? (ruleEndH||18)-12+':30pm' : '6:30pm'}. Free all other times.`}
                {isPermit && `Restricted: Mon–Fri ${ruleStartH}am–${ruleEndH ? ruleEndH > 12 ? (ruleEndH-12)+'pm' : ruleEndH+'am' : '4pm'}.`}
              </div>
            </div>
          )}

          {/* Timer */}
          {!isRestricted && (
            timerActive ? (
              <div style={{ background:'rgba(255,104,31,.1)', border:'1px solid rgba(255,104,31,.3)', borderRadius:14, padding:'14px 16px', marginBottom:14, textAlign:'center' }}>
                <div style={{ fontSize:10, color:OR, fontWeight:600, letterSpacing:'1px', marginBottom:6 }}>PARKING TIMER</div>
                <div style={{ fontSize:36, fontWeight:800, fontFamily:'monospace', color:OR }}>{fmtE()}</div>
                <button onClick={stopTimer} style={{ marginTop:10, background:'none', border:'1px solid rgba(255,104,31,.4)', borderRadius:10, padding:'8px 20px', color:OR, cursor:'pointer', fontSize:13 }}>Stop</button>
              </div>
            ) : (
              <button onClick={startTimer} style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:700, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                ⏱ Start Parking Timer
              </button>
            )
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:10, marginBottom:10 }}>
            <button onClick={() => setShowDirPicker(true)} style={{ flex:1, background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:12, padding:15, fontSize:15, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              🧭 Directions
            </button>
            <button onClick={() => { setSaved(true); showToast('Saved to your places!') }} style={{ background:saved?'rgba(255,104,31,.2)':'rgba(255,255,255,.07)', border:'1px solid '+(saved?OR+'44':'rgba(255,255,255,.1)'), borderRadius:12, padding:'15px 18px', cursor:'pointer', color:saved?OR:'rgba(255,255,255,.6)', fontSize:20 }}>
              {saved?'❤️':'🔖'}
            </button>
          </div>

          {/* Walking time */}
          <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'12px 14px', marginBottom:10, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>🚶</span>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>Walking time</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>~3 min walk from destination</div>
            </div>
          </div>

          {/* Report */}
          <button onClick={() => { onReport && onReport(item); showToast('Report submitted. Thank you!') }}
            style={{ width:'100%', background:'none', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px', fontSize:13, color:'rgba(255,255,255,.4)', cursor:'pointer' }}>
            ⚠️ Report incorrect data
          </button>
        </div>
      </div>
    </>
  )
}
