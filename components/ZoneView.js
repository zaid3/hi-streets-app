'use client'
import{useState}from'react'
const OR='#ff681f'
const HOURS=Array.from({length:24},(_,i)=>i)
function ZoneTimeline({mode}){
  const now=new Date(),h=now.getHours()
  const getC=hr=>{
    if(mode==='paid')return hr>=8&&hr<18?'#4A9EFF':'#2ECC71'
    if(mode==='yellow')return'#888888'
    if(mode==='residents')return hr>=10&&hr<16?'#9B59B6':'#2ECC71'
    return'#2ECC71'
  }
  const legend=mode==='paid'?[['#4A9EFF','Pay to park'],['#2ECC71','Park for free']]:mode==='yellow'?[['#888888','No parking']]:mode==='residents'?[['#9B59B6','Permit only'],['#2ECC71','Park for free']]:[['#2ECC71','Park for free']]
  return(
    <div>
      <div style={{display:'flex',gap:10,marginBottom:8,flexWrap:'wrap'}}>
        {legend.map(([c,l])=><div key={l} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:14,height:14,background:c,borderRadius:3}}/><span style={{fontSize:12,color:'rgba(255,255,255,.6)'}}>{l}</span></div>)}
        <div style={{marginLeft:'auto',fontSize:12,color:'rgba(255,255,255,.4)',fontWeight:600}}>{h.toString().padStart(2,'0')}:{now.getMinutes().toString().padStart(2,'0')}</div>
      </div>
      <div style={{position:'relative'}}>
        <div style={{display:'flex',height:12,borderRadius:6,overflow:'hidden'}}>
          {HOURS.map(hr=><div key={hr} style={{flex:1,background:getC(hr)}}/>)}
          <div style={{position:'absolute',top:-2,left:`${(h/24)*100}%`,width:2,height:16,background:'white',borderRadius:1}}/>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
        {['0:00','8:00','18:30','23:59'].map(t=><span key={t} style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>{t}</span>)}
      </div>
    </div>
  )
}
export default function ZoneView({onClose}){
  const[chip,setChip]=useState('paid')
  const[dayTab,setDayTab]=useState('today')
  const chips=[['paid','Paid bays'],['yellow','Single yellow'],['residents','Residents']]
  const now=new Date(),h=now.getHours()
  const current=chip==='paid'?(h>=8&&h<18?'Pay to park':'Park for free'):chip==='yellow'?'No parking':(h>=10&&h<16?'Permit only':'Park for free')
  const currentColor=chip==='paid'?(h>=8&&h<18?'#4A9EFF':'#2ECC71'):chip==='yellow'?'#888888':(h>=10&&h<16?'#9B59B6':'#2ECC71')
  return(
    <div className="slide-up" style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(8,8,8,.99)',backdropFilter:'blur(30px)',borderTop:'1px solid rgba(255,255,255,.08)',borderRadius:'22px 22px 0 0',zIndex:400,maxHeight:'68vh',overflowY:'auto'}}>
      <div style={{padding:'14px 20px 32px'}}>
        <div style={{width:36,height:4,background:'rgba(255,255,255,.18)',borderRadius:2,margin:'0 auto 14px'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div>
            <h3 style={{fontSize:17,fontWeight:800,marginBottom:2}}>Zone Newham</h3>
            <p style={{fontSize:12,color:'rgba(255,255,255,.4)',margin:0}}>Zone East Ham South West, Newham</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,color:'rgba(255,255,255,.5)',cursor:'pointer'}}>✕</button>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:16,overflowX:'auto'}}>
          {chips.map(([id,lb])=>(
            <button key={id} onClick={()=>setChip(id)} style={{padding:'7px 14px',borderRadius:8,border:'none',whiteSpace:'nowrap',fontSize:13,fontWeight:600,cursor:'pointer',flexShrink:0,background:chip===id?'rgba(255,255,255,.15)':'rgba(255,255,255,.06)',color:chip===id?'#fff':'rgba(255,255,255,.6)',border:chip===id?'1px solid rgba(255,255,255,.3)':'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',gap:6}}>
              {chip===id&&<div style={{width:14,height:14,background:'rgba(255,255,255,.3)',borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="8" height="7" viewBox="0 0 8 7"><path d="M1 3.5l2 2L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg></div>}
              {lb}
            </button>
          ))}
        </div>
        <div style={{background:currentColor+'22',border:'1px solid '+currentColor+'44',borderRadius:12,padding:'12px 14px',marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:currentColor}}>{current} right now</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.55)',marginTop:3}}>
            {chip==='paid'&&(h>=8&&h<18?'Pay & Display in operation. £2.50/hr until 18:30.':'Free now. Paid parking starts at 8:00 AM.')}
            {chip==='yellow'&&'Double yellow lines on this side — no parking at any time.'}
            {chip==='residents'&&(h>=10&&h<16?'Permit holders only until 16:00.':'Free now. Restriction Mon–Fri 10am–4pm.')}
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:15,fontWeight:700}}>Operating hours</span>
          <div style={{display:'flex',gap:4}}>
            {['Today','Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><button key={d} onClick={()=>setDayTab(d.toLowerCase())} style={{padding:'4px 8px',borderRadius:6,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',background:dayTab===d.toLowerCase()?'rgba(255,255,255,.15)':'rgba(255,255,255,.05)',color:dayTab===d.toLowerCase()?'#fff':'rgba(255,255,255,.4)'}}>{d}</button>)}
          </div>
        </div>
        <ZoneTimeline mode={chip}/>
        <div style={{marginTop:16,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Found data issues?</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>Help us keep parking data accurate</div>
          </div>
          <button onClick={()=>alert('Report submitted — thank you!')} style={{background:'rgba(255,104,31,.15)',border:'1px solid rgba(255,104,31,.3)',borderRadius:10,padding:'8px 14px',color:OR,fontSize:12,fontWeight:700,cursor:'pointer'}}>Report</button>
        </div>
      </div>
    </div>
  )
}
