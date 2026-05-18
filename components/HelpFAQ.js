'use client'
import{useState}from'react'
const OR='#ff681f'
const FAQS=[
  {q:'What do the parking colours mean?',a:'Green = free parking. Blue = paid parking. Grey = restricted / no parking. Purple = permit holders only. Orange dashed = loading bay. Blue square P = off-street car park.'},
  {q:'What are the green checkmark circles?',a:'Green circles with a tick mean parking is currently allowed at that bay. Grey circles with a cross mean no parking. These update based on the current day and time.'},
  {q:'How do I check if I can park now?',a:'Tap any bay segment or circle marker. A card opens showing: Park for free, Pay to park, No parking, or Permit only — calculated for the exact time right now, with a leave-by time.'},
  {q:'How do I read lane-side parking?',a:'Coloured rectangles sit along the road edge. Tap any rectangle or the circle marker on it for full bay details including side of road, max stay, cost, and restrictions.'},
  {q:'Why can parking status change?',a:'UK rules depend on day and time. A free bay Sunday may be paid Monday–Saturday 8am–6:30pm. Hi-Streets calculates status for the exact time you check.'},
  {q:'Why is parking data sometimes wrong?',a:'Data comes from OpenStreetMap and council sources. Use Report on any bay card to flag errors — we review and update.'},
  {q:'How do businesses publish offers?',a:'Two ways: Business Dashboard inside the app, or send WhatsApp starting with #OFFER to our business number.'},
  {q:'How does WhatsApp offer publishing work?',a:'Send #OFFER followed by your offer text to the Hi-Streets number. Example: #OFFER 20% off lunch today until 5pm. Appears live on map within seconds.'},
  {q:'How do I contact support?',a:'Email support@histreets.uk or use Contact Support in your Account tab.'},
]
export default function HelpFAQ({onClose}){
  const[open,setOpen]=useState(null)
  return(
    <div style={{position:'fixed',inset:0,background:'#0a0a0a',zIndex:2000,display:'flex',flexDirection:'column'}}>
      <div style={{background:'rgba(10,10,10,.97)',borderBottom:'1px solid rgba(255,255,255,.08)',padding:'16px 20px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onClose} style={{background:'rgba(255,255,255,.06)',border:'none',width:40,height:40,borderRadius:12,cursor:'pointer',color:'#fff',fontSize:18}}>←</button>
        <div><h2 style={{fontSize:20,fontWeight:800,margin:0}}>Help & FAQ</h2><p style={{fontSize:12,color:'rgba(255,255,255,.4)',margin:0}}>Parking colours, how it works</p></div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px 40px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
          {[['🟢','Free','Green bay'],['🔵','Paid','Blue bay'],['⬜','No parking','Grey bay'],['🟣','Permit only','Purple bay'],['🟠','Loading','Orange dashed'],['🟦','Car park','Blue P marker']].map(([ic,lb,cl])=>(
            <div key={lb} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:'10px 12px',display:'flex',gap:10,alignItems:'center'}}>
              <span style={{fontSize:18}}>{ic}</span><div><div style={{fontSize:13,fontWeight:600}}>{lb}</div><div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{cl}</div></div>
            </div>
          ))}
        </div>
        {FAQS.map((f,i)=>(
          <div key={i} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,marginBottom:8,overflow:'hidden'}}>
            <button onClick={()=>setOpen(open===i?null:i)} style={{width:'100%',background:'none',border:'none',padding:'14px 16px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,color:'#fff',textAlign:'left'}}>
              <span style={{fontSize:14,fontWeight:600,flex:1}}>{f.q}</span>
              <span style={{fontSize:14,color:'rgba(255,255,255,.4)',flexShrink:0}}>{open===i?'▲':'▼'}</span>
            </button>
            {open===i&&<div style={{padding:'0 16px 14px',fontSize:13,color:'rgba(255,255,255,.6)',lineHeight:1.6}}>{f.a}</div>}
          </div>
        ))}
        <div style={{marginTop:20,background:'rgba(255,104,31,.08)',border:'1px solid rgba(255,104,31,.2)',borderRadius:14,padding:'16px 18px'}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Still need help?</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.55)',marginBottom:14}}>Support team available Mon–Fri 9am–5pm.</div>
          <button onClick={()=>window.location.href='mailto:support@histreets.uk'} style={{background:OR,border:'none',borderRadius:12,padding:'12px 24px',fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer'}}>📧 Contact Support</button>
        </div>
      </div>
    </div>
  )
}
