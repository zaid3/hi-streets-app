'use client'
import { useState } from 'react'
const OR = '#ff681f'
const PANEL = 'rgba(10,10,10,.97)'

const HOURS = Array.from({length:24},(_,i)=>i)

function Timeline({ rules, currentHour }) {
  return (
    <div style={{ marginTop:12 }}>
      <div style={{ display:'flex', height:16, borderRadius:6, overflow:'hidden', border:'1px solid rgba(255,255,255,.1)' }}>
        {HOURS.map(h => {
          const isWorkHour = h >= 8 && h < 18
          let color = '#2ECC71'
          let label = 'free'
          for (const rule of rules) {
            if (rule.startH !== undefined && rule.endH !== undefined) {
              if (h >= rule.startH && h < rule.endH) { color = rule.color; label = rule.label; break }
            }
          }
          const isCurrent = h === currentHour
          return (
            <div key={h} style={{ flex:1, background:color, opacity: isCurrent ? 1 : 0.65, position:'relative', cursor:'pointer' }} title={h+':00 — '+label}>
              {isCurrent && <div style={{ position:'absolute', top:-3, left:'50%', transform:'translateX(-50%)', width:3, height:22, background:'white', borderRadius:2, boxShadow:'0 0 6px rgba(255,255,255,.8)' }} />}
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        {['12am','6am','12pm','6pm','12am'].map(t => <span key={t} style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>{t}</span>)}
      </div>
    </div>
  )
}

const MOCK_RULES = [
  { startH:8, endH:18, color:'#4A9EFF', label:'Pay to park', days:'Mon–Sat' },
]

export default function ZoneView({ center, onClose }) {
  const [chip, setChip] = useState('paid')
  const [dayTab, setDayTab] = useState('today')
  const now = new Date()
  const currentHour = now.getHours()
  const chips = ['Paid bays','Single yellow','Residents']
  const chipIds = ['paid','yellow','residents']

  const rulesByChip = {
    paid: [{ startH:8, endH:18, color:'#4A9EFF', label:'Pay to park' }],
    yellow: [{ startH:0, endH:24, color:'#888888', label:'No parking' }],
    residents: [{ startH:10, endH:16, color:'#9B59B6', label:'Permit only', days:'Mon–Fri' }],
  }

  const currentRule = rulesByChip[chip]
  const activeAtNow = currentRule.find(r => currentHour >= r.startH && currentHour < r.endH)

  return (
    <div style={{ position:'absolute', bottom:0, left:0, right:0, background:PANEL, backdropFilter:'blur(30px)', borderTop:'1px solid rgba(255,255,255,.08)', borderRadius:'22px 22px 0 0', zIndex:400, maxHeight:'70vh', overflowY:'auto' }}>
      <div style={{ padding:'14px 20px 30px' }}>
        <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 14px' }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <h3 style={{ fontSize:17, fontWeight:800, margin:'0 0 3px' }}>Parking Zone</h3>
            <p style={{ fontSize:12, color:'rgba(255,255,255,.45)', margin:0 }}>Zone Newham · Updated today</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.08)', border:'none', width:30, height:30, borderRadius:'50%', color:'#fff', cursor:'pointer', fontSize:14 }}>✕</button>
        </div>

        {/* Chips */}
        <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto' }}>
          {chips.map((c,i) => (
            <button key={c} onClick={() => setChip(chipIds[i])} style={{ padding:'7px 14px', borderRadius:20, border:'none', whiteSpace:'nowrap', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0, background:chip===chipIds[i]?'linear-gradient(135deg,'+OR+',#FF8C00)':'rgba(255,255,255,.07)', color:'#fff', border:chip===chipIds[i]?'none':'1px solid rgba(255,255,255,.1)' }}>
              {c}
            </button>
          ))}
        </div>

        {/* Current status */}
        <div style={{ background: activeAtNow ? (activeAtNow.color+'22') : 'rgba(46,204,113,.15)', border:'1px solid '+(activeAtNow ? activeAtNow.color+'44' : 'rgba(46,204,113,.3)'), borderRadius:14, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:15, fontWeight:700, color: activeAtNow ? activeAtNow.color : '#2ECC71', marginBottom:4 }}>
            {activeAtNow ? activeAtNow.label : 'Park for free'} right now
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>
            {chip === 'paid' && (currentHour >= 8 && currentHour < 18 ? 'Pay & Display in operation. £2.50/hr until 6:30 PM.' : 'Free now. Paid parking starts at 8:00 AM.')}
            {chip === 'yellow' && 'No parking on this side at any time (double yellow).'}
            {chip === 'residents' && (currentHour >= 10 && currentHour < 16 ? 'Permit holders only until 4:00 PM.' : 'Free now. Restriction: Mon–Fri 10am–4pm.')}
          </div>
        </div>

        {/* Day toggle */}
        <div style={{ display:'flex', gap:6, marginBottom:12 }}>
          {['Today','Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <button key={d} onClick={() => setDayTab(d.toLowerCase())} style={{ padding:'5px 10px', borderRadius:10, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0, background:dayTab===d.toLowerCase()?OR:'rgba(255,255,255,.07)', color:'#fff' }}>{d}</button>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Operating Hours</div>
          <Timeline rules={currentRule} currentHour={currentHour} />
          <div style={{ display:'flex', gap:14, marginTop:10, flexWrap:'wrap' }}>
            {[['#2ECC71','Park for free'],['#4A9EFF','Pay to park'],['#9B59B6','Permit only'],['#888888','No parking']].map(([c,l]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:12, height:12, borderRadius:3, background:c }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data issue card */}
        <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Spot a data issue?</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>Help us keep parking data accurate</div>
          </div>
          <button onClick={() => alert('Report submitted — thank you!')} style={{ background:OR, border:'none', borderRadius:10, padding:'8px 14px', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>Report</button>
        </div>
      </div>
    </div>
  )
}
