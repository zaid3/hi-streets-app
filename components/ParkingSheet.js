'use client'
import{useState,useRef}from'react'
const OR='#ff681f'

function Timeline({type,note}){
  const HOURS=Array.from({length:24},(_,i)=>i)
  const now=new Date(),h=now.getHours()
  // Determine colors for each hour
  const getColor=hour=>{
    const isWH=hour>=8&&hour<18
    if(type==='free')return isWH?'#9BA8BF':'#2ECC71'  // grey=restricted, green=free
    if(type==='paid')return isWH?'#4A9EFF':'#2ECC71'
    if(type==='permit')return hour>=10&&hour<16?'#9B59B6':'#2ECC71'
    return '#888888'
  }
  const legend=type==='free'?[['#2ECC71','Park for free'],['#9BA8BF','No parking']]:
    type==='paid'?[['#2ECC71','Park for free'],['#4A9EFF','Pay to park']]:
    type==='permit'?[['#2ECC71','Park for free'],['#9B59B6','Permit only']]:
    [['#888888','No parking']]

  return(
    <div style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontSize:15,fontWeight:700}}>Operating hours</span>
        <div style={{display:'flex',gap:4}}>
          <button style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,padding:'5px 12px',fontSize:12,color:'#fff',cursor:'pointer',fontWeight:600}}>Day</button>
          <button style={{background:'none',border:'none',padding:'5px 12px',fontSize:12,color:'rgba(255,255,255,.4)',cursor:'pointer'}}>Week</button>
        </div>
      </div>
      <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        {legend.map(([c,l])=><div key={l} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:14,height:14,background:c,borderRadius:3}}/><span style={{fontSize:12,color:'rgba(255,255,255,.6)'}}>{l}</span></div>)}
      </div>
      {/* Time position tooltip */}
      <div style={{position:'relative',marginBottom:2}}>
        <div style={{position:'absolute',right:0,top:-18,fontSize:11,color:'rgba(255,255,255,.5)',fontWeight:600}}>{now.getHours().toString().padStart(2,'0')}:{now.getMinutes().toString().padStart(2,'0')}</div>
      </div>
      {/* Timeline bar */}
      <div style={{display:'flex',height:12,borderRadius:6,overflow:'hidden',position:'relative'}}>
        {HOURS.map(hr=><div key={hr} style={{flex:1,background:getColor(hr)}} />)}
        {/* Current time marker */}
        <div style={{position:'absolute',top:-2,left:`${(h/24)*100}%`,width:2,height:16,background:'white',borderRadius:1,boxShadow:'0 0 6px rgba(255,255,255,.8)'}}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
        {['0:00','8:00','18:30','23:59'].map(t=><span key={t} style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>{t}</span>)}
      </div>
    </div>
  )
}

function NavPicker({item,onClose}){
  const apps=[
    {name:'Apple Maps',icon:'🍎',url:`maps://maps.apple.com/?daddr=${item?.lat},${item?.lng}`},
    {name:'Google Maps',icon:'🗺️',url:`https://www.google.com/maps/dir/?api=1&destination=${item?.lat},${item?.lng}`},
    {name:'Waze',icon:'🚗',url:`https://waze.com/ul?ll=${item?.lat},${item?.lng}&navigate=yes`},
    {name:'Citymapper',icon:'🚌',url:`https://citymapper.com/directions?endcoord=${item?.lat},${item?.lng}`},
  ]
  return(
    <div style={{position:'fixed',inset:0,zIndex:1500}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.6)'}}/>
      <div className="slide-up" style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(10,10,10,.98)',borderRadius:'22px 22px 0 0',padding:'16px 20px 44px',zIndex:1501}}>
        <div style={{width:36,height:4,background:'rgba(255,255,255,.2)',borderRadius:2,margin:'0 auto 16px'}}/>
        <p style={{textAlign:'center',fontSize:13,color:'rgba(255,255,255,.45)',marginBottom:20}}>Choose your navigation app</p>
        {apps.map(a=>(
          <button key={a.name} onClick={()=>{window.open(a.url,'_blank');onClose()}}
            style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:'16px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:14,color:'#fff',textAlign:'left',marginBottom:10}}>
            <span style={{fontSize:24}}>{a.icon}</span>
            <span style={{fontSize:16,fontWeight:600}}>{a.name}</span>
          </button>
        ))}
        <button onClick={onClose} style={{width:'100%',background:'none',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,padding:'14px',fontSize:15,color:'rgba(255,255,255,.5)',cursor:'pointer',marginTop:4}}>Cancel</button>
      </div>
    </div>
  )
}

export default function ParkingSheet({item,onClose,onReport}){
  const[navOpen,setNavOpen]=useState(false)
  const[timerOn,setTimerOn]=useState(false)
  const[elapsed,setElapsed]=useState(0)
  const[saved,setSaved]=useState(false)
  const[toast,setToast]=useState(null)
  const timerId=useRef(null)
  if(!item)return null

  const isRestricted=item.type==='restricted'
  const isCP=item.type==='carpark'
  const sc=item.color||'#2ECC71'

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),2500)}
  function startTimer(){setTimerOn(true);setElapsed(0);timerId.current=setInterval(()=>setElapsed(e=>e+1),1000);showToast('Parking timer started!')}
  function stopTimer(){setTimerOn(false);clearInterval(timerId.current);showToast('Timer stopped.')}
  const fmtE=()=>{const h=Math.floor(elapsed/3600),m=Math.floor((elapsed%3600)/60),s=elapsed%60;return`${h>0?h+'h ':''}`+`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`}

  // Status icon
  const StatusIcon=()=>{
    if(isRestricted||isCP&&!item.free)
      return<div style={{width:52,height:52,background:isRestricted?'#888':'#2a5fba',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{isCP?<span style={{color:'white',fontSize:24,fontWeight:900}}>P</span>:<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="none"/><line x1="5" y1="19" x2="19" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}</div>
    return<div style={{width:52,height:52,background:sc,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="24" height="20" viewBox="0 0 24 20" fill="none"><path d="M2 10l7 7L22 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
  }

  return(
    <>
      {navOpen&&<NavPicker item={item} onClose={()=>setNavOpen(false)}/>}
      {toast&&<div style={{position:'fixed',top:'15%',left:'50%',transform:'translateX(-50%)',background:'rgba(10,10,10,.97)',border:'1px solid rgba(255,255,255,.1)',color:'#fff',borderRadius:20,padding:'10px 22px',fontSize:14,fontWeight:600,zIndex:600,whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>{toast}</div>}

      <div className="slide-up" style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(8,8,8,.99)',backdropFilter:'blur(30px)',borderTop:'1px solid rgba(255,255,255,.08)',borderRadius:'22px 22px 0 0',zIndex:500,maxHeight:'85vh',overflowY:'auto'}}>
        <div style={{padding:'14px 20px 44px'}}>
          <div style={{width:36,height:4,background:'rgba(255,255,255,.18)',borderRadius:2,margin:'0 auto 16px'}}/>
          <button onClick={onClose} style={{position:'absolute',top:14,right:20,background:'none',border:'none',fontSize:20,color:'rgba(255,255,255,.5)',cursor:'pointer'}}>✕</button>

          {/* Status header */}
          <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:16}}>
            <StatusIcon/>
            <div>
              <h3 style={{fontSize:20,fontWeight:800,marginBottom:2}}>{item.label}</h3>
              <p style={{fontSize:14,color:'rgba(255,255,255,.5)',margin:0}}>{item.bayType||'Parking bay'}</p>
              {item.note&&<div style={{display:'inline-block',background:'rgba(255,104,31,.12)',border:'1px solid rgba(255,104,31,.25)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'rgba(255,200,180,1)',marginTop:8,fontWeight:500}}>{item.note}</div>}
              {item.appliesAllTime&&<div style={{display:'inline-block',background:'rgba(200,50,50,.12)',border:'1px solid rgba(200,50,50,.2)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'rgba(255,160,160,1)',marginTop:8,fontWeight:500}}>Applies at all times</div>}
            </div>
          </div>

          {/* Stats grid */}
          {!isRestricted&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,background:'rgba(255,255,255,.06)',borderRadius:14,overflow:'hidden',marginBottom:20}}>
              {[['Payment',item.cost>0?`£${item.cost}/hr`:'No charge'],['Stay up to',item.maxStay||'No limit'],['No return',item.noReturn||'None']].map(([k,v])=>(
                <div key={k} style={{background:'rgba(255,255,255,.03)',padding:'12px 14px',textAlign:'center'}}>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:4}}>{k}</div>
                  <div style={{fontSize:15,fontWeight:700}}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Operating hours timeline */}
          {!isRestricted&&!isCP&&<Timeline type={item.type} note={item.note}/>}

          {/* Timer */}
          {!isRestricted&&(
            timerOn?(
              <div style={{background:'rgba(255,104,31,.08)',border:'1px solid rgba(255,104,31,.2)',borderRadius:14,padding:'14px 16px',marginBottom:16,textAlign:'center'}}>
                <div style={{fontSize:10,color:OR,fontWeight:600,letterSpacing:'1px',marginBottom:6}}>PARKING TIMER</div>
                <div style={{fontSize:36,fontWeight:800,fontFamily:'monospace',color:OR}}>{fmtE()}</div>
                <button onClick={stopTimer} style={{marginTop:10,background:'none',border:'1px solid rgba(255,104,31,.4)',borderRadius:10,padding:'8px 20px',color:OR,cursor:'pointer',fontSize:13}}>Stop timer</button>
              </div>
            ):(
              <button onClick={startTimer} style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'12px',fontSize:14,color:'rgba(255,255,255,.6)',cursor:'pointer',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                ⏱ Start parking timer
              </button>
            )
          )}

          {/* Walking time section */}
          {!isRestricted&&(
            <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'14px 16px',marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <span style={{fontSize:15,fontWeight:700}}>Walking time</span>
                <button onClick={()=>showToast('Set destination coming soon')} style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'6px 12px',fontSize:12,color:'rgba(255,255,255,.6)',cursor:'pointer'}}>📍 Set destination</button>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{display:'flex',flexDirection:'column',gap:3,alignItems:'center'}}>
                  <div style={{width:8,height:8,background:sc,borderRadius:'50%'}}/>
                  <div style={{width:1,height:24,background:'rgba(255,255,255,.15)'}}/>
                  <div style={{width:8,height:8,background:'rgba(255,255,255,.3)',borderRadius:'50%'}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:2}}>Selected bay</div>
                    <div style={{fontSize:13,fontWeight:600}}>{item.address||item.name}</div>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:2}}>Destination</div>
                    <div style={{fontSize:13,color:'rgba(255,255,255,.4)'}}>Set destination to view walking time</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data issues */}
          <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'14px 16px',marginBottom:16,display:'flex',gap:14,alignItems:'center'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Found data issues?</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.4)',marginBottom:10}}>Take a photo of the issue and get in touch so we can fix it</div>
              <button onClick={()=>{onReport&&onReport(item);showToast('Report submitted — thank you!')}} style={{background:'none',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,padding:'7px 14px',fontSize:12,color:'rgba(255,255,255,.6)',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>✏️ Contact us</button>
            </div>
            <div style={{fontSize:40,opacity:.4}}>📱</div>
          </div>

          {/* Directions button */}
          <button onClick={()=>setNavOpen(true)} style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',borderRadius:14,padding:'16px',fontSize:15,fontWeight:700,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <span style={{fontSize:18}}>◆</span> Directions
          </button>

          {!isRestricted&&!isCP&&(
            <div style={{display:'flex',gap:10,marginTop:10}}>
              <button onClick={()=>{setSaved(!saved);showToast(saved?'Removed from saved':'Saved to your places!')}} style={{flex:1,background:saved?'rgba(255,104,31,.15)':'rgba(255,255,255,.04)',border:`1px solid ${saved?'rgba(255,104,31,.4)':'rgba(255,255,255,.1)'}`,borderRadius:14,padding:'13px',fontSize:13,fontWeight:600,color:saved?OR:'rgba(255,255,255,.6)',cursor:'pointer'}}>{saved?'❤️ Saved':'🔖 Save spot'}</button>
              <button onClick={startTimer} style={{flex:1,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,padding:'13px',fontSize:13,fontWeight:600,color:'rgba(255,255,255,.6)',cursor:'pointer'}}>⏱ Timer</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
