'use client'
import { useState } from 'react'
const OR = '#ff681f'
const FAQS = [
  { q:'What do the parking colours mean?', a:'Green = free parking. Blue = paid parking. Grey = restricted/no parking. Purple = permit holders only. Orange dashed = loading bay.' },
  { q:'How do I check if I can park now?', a:'Tap any parking segment or marker. A card opens showing your current status based on the exact time right now: Park for free, Pay to park, No parking, or Permit only.' },
  { q:'How do I read lane-side parking segments?', a:'Coloured lines run alongside the road edge. They show the parking rules for that stretch. Tap the line for full details, side of road, max stay, and cost.' },
  { q:'Why can parking status change?', a:'UK parking rules depend on day and time. A free bay on Sunday may be paid Monday–Saturday 8am–6:30pm. Hi-Streets calculates the status for the exact time you check.' },
  { q:'Why is parking data sometimes wrong?', a:'Data comes from OpenStreetMap and council sources. Rules change. Use the Report button on any parking card if you spot an error.' },
  { q:'How do businesses publish offers?', a:'Two ways: (1) Business Dashboard in the app, or (2) Send a WhatsApp message starting with #OFFER to our number.' },
  { q:'How does WhatsApp publishing work?', a:'Send #OFFER followed by your offer text to the Hi-Streets business number. Example: #OFFER 20% off lunch today until 5pm. The offer appears live on the map within seconds.' },
  { q:'How do I report wrong parking data?', a:'Tap any parking segment, scroll to the bottom of the detail card, tap "Report incorrect data". We review and update.' },
  { q:'How do I contact support?', a:'Email support@histreets.uk or use Contact Support in the Account tab.' },
]
export default function HelpFAQ({ onClose }) {
  const [open, setOpen] = useState(null)
  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', zIndex:2000, display:'flex', flexDirection:'column' }}>
      <div style={{ background:'rgba(12,12,12,.97)', borderBottom:'1px solid rgba(255,255,255,.08)', padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,.08)', border:'none', width:40, height:40, borderRadius:12, cursor:'pointer', color:'#fff', fontSize:18 }}>←</button>
        <div><h2 style={{ fontSize:20, fontWeight:800, margin:0 }}>Help & FAQ</h2><p style={{ fontSize:12, color:'rgba(255,255,255,.4)', margin:0 }}>Parking colours, how it works</p></div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px 40px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:12 }}>Parking Colour Guide</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
          {[['🟢','Free','Green'],['🔵','Paid','Blue'],['⬜','No parking','Grey'],['🟣','Permit only','Purple'],['🟠','Loading','Orange'],['🅿️','Car park','P marker']].map(([ic,lb,cl]) => (
            <div key={lb} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>{ic}</span><div><div style={{ fontSize:13, fontWeight:600 }}>{lb}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{cl}</div></div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:12 }}>Frequently Asked Questions</div>
        {FAQS.map((f,i) => (
          <div key={i} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, marginBottom:8, overflow:'hidden' }}>
            <button onClick={()=>setOpen(open===i?null:i)} style={{ width:'100%', background:'none', border:'none', padding:'14px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, color:'#fff', textAlign:'left' }}>
              <span style={{ fontSize:14, fontWeight:600, flex:1 }}>{f.q}</span>
              <span style={{ fontSize:14, color:'rgba(255,255,255,.4)', flexShrink:0 }}>{open===i?'▲':'▼'}</span>
            </button>
            {open===i&&<div style={{ padding:'0 16px 14px', fontSize:13, color:'rgba(255,255,255,.6)', lineHeight:1.6 }}>{f.a}</div>}
          </div>
        ))}
        <div style={{ marginTop:20, background:'rgba(255,104,31,.08)', border:'1px solid rgba(255,104,31,.2)', borderRadius:14, padding:'16px 18px' }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>Still need help?</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.55)', marginBottom:14 }}>Support team available Mon–Fri 9am–5pm.</div>
          <button onClick={()=>window.location.href='mailto:support@histreets.uk'} style={{ background:OR, border:'none', borderRadius:12, padding:'12px 24px', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 16px rgba(255,104,31,.35)' }}>📧 Contact Support</button>
        </div>
      </div>
    </div>
  )
}
