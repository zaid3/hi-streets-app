'use client'
import{useState,useEffect}from'react'

const OR='#ff681f'

// ── Duration picker ───────────────────────────────────────
function TimerDurationPicker({onStart,onCancel}){
  const[mins,setMins]=useState(60)
  const options=[30,60,90,120,180,240]
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'flex-end',padding:'0 0 max(16px,env(safe-area-inset-bottom))'}}>
      <div style={{width:'100%',background:'white',borderRadius:'20px 20px 0 0',overflow:'hidden',padding:'20px 20px 8px'}}>
        <div style={{width:36,height:4,borderRadius:2,background:'rgba(0,0,0,.12)',margin:'0 auto 16px'}}/>
        <div style={{fontSize:17,fontWeight:700,color:'#111',marginBottom:4,textAlign:'center'}}>Start parking timer</div>
        <div style={{fontSize:13,color:'rgba(0,0,0,.4)',textAlign:'center',marginBottom:20}}>We'll alert you when time is running out</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:20}}>
          {options.map(o=>(
            <button key={o} onClick={()=>setMins(o)}
              style={{flex:'1 1 calc(33% - 8px)',padding:'12px 8px',borderRadius:12,border:`1.5px solid ${mins===o?OR:'rgba(0,0,0,.1)'}`,background:mins===o?`${OR}12`:'#f5f5f5',color:mins===o?OR:'#333',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              {o<60?`${o} min`:`${o/60} hr`}
            </button>
          ))}
        </div>
        <button onClick={()=>onStart(mins)}
          style={{width:'100%',padding:'15px',borderRadius:14,border:'none',background:OR,color:'white',fontSize:16,fontWeight:700,cursor:'pointer',marginBottom:10}}>
          ⏱ Start timer
        </button>
        <button onClick={onCancel}
          style={{width:'100%',padding:'14px',borderRadius:14,border:'none',background:'transparent',color:'rgba(0,0,0,.4)',fontSize:15,cursor:'pointer'}}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Operating hours timeline ──────────────────────────────
function HoursTimeline({type}){
  const now=new Date()
  const totalMins=24*60
  const currentMins=now.getHours()*60+now.getMinutes()
  const pct=(currentMins/totalMins)*100

  const segments=[]
  if(type==='free'){
    segments.push({start:0,end:100,color:'#2ECC71'})
  } else if(type==='paid'){
    const s=(8*60)/totalMins*100
    const e=(18.5*60)/totalMins*100
    segments.push({start:0,end:s,color:'#2ECC71'})
    segments.push({start:s,end:e,color:'#4A9EFF'})
    segments.push({start:e,end:100,color:'#2ECC71'})
  } else if(type==='permit'||type==='restricted'){
    const s=(8*60)/totalMins*100
    const e=(18.5*60)/totalMins*100
    segments.push({start:0,end:s,color:'#2ECC71'})
    segments.push({start:s,end:e,color:'#ddd'})
    segments.push({start:e,end:100,color:'#2ECC71'})
  } else {
    segments.push({start:0,end:100,color:'#ddd'})
  }

  const nextChange=type==='paid'||(type==='permit')
    ? currentMins<8*60?`Pay from 08:00`:currentMins<18*60+30?`Free from 18:30`:`Pay from 08:00 tomorrow`
    : null

  return(
    <div style={{marginTop:4}}>
      {/* Legend */}
      <div style={{display:'flex',gap:16,marginBottom:10,fontSize:12}}>
        <span style={{color:'#2ECC71',display:'flex',alignItems:'center',gap:5}}>
          <span style={{width:12,height:3,background:'#2ECC71',borderRadius:2,display:'inline-block'}}/>
          Park for free
        </span>
        {type==='paid'&&(
          <span style={{color:'#4A9EFF',display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:12,height:3,background:'#4A9EFF',borderRadius:2,display:'inline-block'}}/>
            Pay to park
          </span>
        )}
        {nextChange&&(
          <button style={{marginLeft:'auto',background:'none',border:'none',color:'rgba(0,0,0,.35)',fontSize:11,cursor:'pointer',padding:0}}>ℹ</button>
        )}
      </div>

      {/* Bar */}
      <div style={{position:'relative',marginBottom:8}}>
        <div style={{display:'flex',height:12,borderRadius:6,overflow:'hidden',gap:1}}>
          {segments.map((s,i)=>(
            <div key={i} style={{width:`${s.end-s.start}%`,background:s.color}}/>
          ))}
        </div>
        {/* Current time marker */}
        <div style={{position:'absolute',top:-5,bottom:-5,width:2,background:'#333',borderRadius:2,left:`${pct}%`,zIndex:2}}>
          <div style={{position:'absolute',top:-20,left:'50%',transform:'translateX(-50%)',background:'#1a1a1a',color:'white',fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4,whiteSpace:'nowrap'}}>
            {now.getHours().toString().padStart(2,'0')}:{now.getMinutes().toString().padStart(2,'0')}
          </div>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(0,0,0,.35)'}}>
        <span>0:00</span><span>8:00</span><span>18:30</span><span>23:59</span>
      </div>
    </div>
  )
}

// ── Navigate — two-step: confirm then app picker ──────────
function NavigateModal({segment,onClose}){
  const[step,setStep]=useState('confirm')
  const lat=segment.lat||segment.coords?.[0]?.[0]
  const lng=segment.lng||segment.coords?.[0]?.[1]
  const typeLabel=segment.type==='free'?'Free Bay':segment.type==='paid'?'Paid Bay':'Parking Bay'
  const color=segment.type==='free'?'#2ECC71':segment.type==='paid'?'#4A9EFF':'#9B59B6'

  function openApp(app){
    if(!lat||!lng)return
    const urls={
      apple:`maps://maps.apple.com/?daddr=${lat},${lng}`,
      google:`https://maps.google.com/?q=${lat},${lng}`,
      waze:`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    }
    window.open(urls[app],'_blank')
    onClose()
  }

  if(step==='confirm'){
    return(
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <div style={{width:'100%',maxWidth:360,background:'white',borderRadius:24,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
          {/* Close */}
          <div style={{display:'flex',justifyContent:'flex-end',padding:'16px 16px 0'}}>
            <button onClick={onClose} style={{width:32,height:32,background:'#f0f0f0',border:'none',borderRadius:50,cursor:'pointer',fontSize:16,color:'#666',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>

          {/* Title */}
          <div style={{padding:'0 24px 16px',textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:700,color:'#111',marginBottom:6}}>Navigate to selected bay</div>
          </div>

          {/* Illustration */}
          <div style={{margin:'0 24px 20px',background:'#f8f8f0',borderRadius:16,padding:'20px 16px',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',minHeight:140}}>
            {/* Mini map illustration */}
            <svg width="100%" height="120" viewBox="0 0 280 120">
              <rect width="280" height="120" fill="#e8f5e9" rx="8"/>
              {/* Roads */}
              <rect x="0" y="50" width="280" height="20" fill="#fff" opacity=".7"/>
              <rect x="120" y="0" width="20" height="120" fill="#fff" opacity=".7"/>
              {/* Route line */}
              <polyline points="220,90 140,90 140,35" fill="none" stroke="#5c6bc0" strokeWidth="3" strokeDasharray="6,3" strokeLinecap="round"/>
              {/* Destination pin */}
              <circle cx="140" cy="30" r="12" fill={color}/>
              <text x="140" y="34" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">£</text>
              <text x="148" y="28" fontSize="9" fill="#333" fontWeight="600">{typeLabel}</text>
              {/* Car emoji */}
              <text x="210" y="96" fontSize="24">🚕</text>
            </svg>
          </div>

          <div style={{padding:'0 24px 8px',textAlign:'center',color:'rgba(0,0,0,.5)',fontSize:13,lineHeight:1.5}}>
            Choose your favourite navigation app and get turn-by-turn directions to your selected parking bay
          </div>

          {/* Buttons */}
          <div style={{padding:'16px 24px 28px',display:'flex',gap:12}}>
            <button onClick={onClose}
              style={{flex:1,padding:'13px',borderRadius:14,border:'1.5px solid #c7cde8',background:'white',color:'#5c6bc0',fontSize:15,fontWeight:600,cursor:'pointer'}}>
              No, thanks
            </button>
            <button onClick={()=>setStep('pick')}
              style={{flex:1,padding:'13px',borderRadius:14,border:'none',background:'#3949ab',color:'white',fontSize:15,fontWeight:700,cursor:'pointer'}}>
              Let's go
            </button>
          </div>
        </div>
      </div>
    )
  }

  // App picker — iOS action sheet style
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:600,display:'flex',alignItems:'flex-end',padding:'0 8px max(16px,env(safe-area-inset-bottom))'}}>
      <div style={{width:'100%'}}>
        <div style={{background:'rgba(242,242,247,.96)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderRadius:16,overflow:'hidden',marginBottom:8}}>
          <div style={{padding:'14px 16px 8px',textAlign:'center',color:'rgba(0,0,0,.4)',fontSize:13,fontWeight:500,borderBottom:'1px solid rgba(0,0,0,.08)'}}>
            Choose your navigation app
          </div>
          {[
            {id:'apple',label:'Apple Maps'},
            {id:'google',label:'Google Maps'},
            {id:'waze',label:'Waze'},
          ].map((app,i,arr)=>(
            <button key={app.id} onClick={()=>openApp(app.id)}
              style={{width:'100%',padding:'16px',background:'none',border:'none',borderBottom:i<arr.length-1?'1px solid rgba(0,0,0,.08)':'none',color:'#007aff',fontSize:18,cursor:'pointer',textAlign:'center',fontWeight:400}}>
              {app.label}
            </button>
          ))}
        </div>
        <button onClick={onClose}
          style={{width:'100%',padding:'16px',background:'rgba(242,242,247,.96)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderRadius:16,border:'none',color:'#007aff',fontSize:18,fontWeight:600,cursor:'pointer'}}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Stay up to calculator ─────────────────────────────────
function stayUpTo(type){
  const now=new Date()
  const h=now.getHours(),m=now.getMinutes()
  if(type==='free')return'No limit'
  if(type==='restricted'||type==='no_parking')return'No parking'
  const endH=18,endM=30
  if(h>endH||(h===endH&&m>=endM))return'Free until 08:00'
  const diffM=(endH*60+endM)-(h*60+m)
  const dh=Math.floor(diffM/60),dm=diffM%60
  return`${dh}h ${dm}m`
}

// ── Main component ────────────────────────────────────────
export default function ParkingSheet({segment,onClose,destination,onStartTimer}){
  const[showNav,setShowNav]=useState(false)
  const[showTimerPicker,setShowTimerPicker]=useState(false)
  const[reported,setReported]=useState(false)
  const[walkMins,setWalkMins]=useState(null)

  useEffect(()=>{
    if(!destination||!segment)return
    const lat1=destination.lat,lng1=destination.lng
    const lat2=segment.lat||segment.coords?.[0]?.[0]
    const lng2=segment.lng||segment.coords?.[0]?.[1]
    if(!lat2||!lng2)return
    const R=6371000
    const dLat=(lat2-lat1)*Math.PI/180
    const dLng=(lng2-lng1)*Math.PI/180
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    const dist=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
    setWalkMins(Math.max(1,Math.round(dist/84)))
  },[destination,segment])

  if(!segment)return null

  const isFree=segment.type==='free'
  const isPaid=segment.type==='paid'
  const isPermit=segment.type==='permit'
  const isRestricted=segment.type==='restricted'||segment.type==='no_parking'
  const isCarPark=segment.isCarPark

  const statusColor=isFree?'#2ECC71':isPaid?'#4A9EFF':isPermit?'#9B59B6':isRestricted?'#aaa':'#2a5fba'
  const statusIcon=isFree?'✓':isPaid?'£':isPermit?'P':isRestricted?'⊘':'P'
  const statusText=isFree?'Park for free':isPaid?'Pay to park':isPermit?'Permit only':isRestricted?'No parking':'Off-street parking'
  const subText=isCarPark?'Car park':isPaid?'Paid bay':isFree?'Resident bay':isPermit?'Permit bay':'Restricted'
  const stayText=stayUpTo(segment.type)
  const canPark=!isRestricted

  // Restriction notice text
  const restrictionNote=
    isFree?'No parking after 08:00 tomorrow':
    isPaid?'Free parking from 18:30 today':
    isPermit?'Permit holders only 08:00–18:30':
    isRestricted?'No parking at this location':null

  return(
    <>
    <div className="bottom-sheet open">
      <div className="sheet-handle"/>

      <div style={{padding:'16px 20px',paddingBottom:'max(80px,calc(env(safe-area-inset-bottom) + 72px))'}}>

        {/* ── Header ─────────────────────────────────────── */}
        <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:restrictionNote?12:16}}>
          {/* Status icon */}
          <div style={{width:52,height:52,borderRadius:14,background:statusColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:'white',fontWeight:800,flexShrink:0,boxShadow:`0 4px 16px ${statusColor}50`}}>
            {statusIcon}
          </div>

          <div style={{flex:1,minWidth:0}}>
            <div style={{color:'#111',fontSize:20,fontWeight:800,marginBottom:1}}>{statusText}</div>
            <div style={{color:'rgba(0,0,0,.4)',fontSize:13,fontWeight:400}}>
              {subText}
              {walkMins&&<span style={{marginLeft:8}}>· 🚶 {walkMins} min walk</span>}
            </div>
          </div>

          <button onClick={onClose}
            style={{width:32,height:32,background:'#f0f0f0',border:'none',color:'#666',borderRadius:50,cursor:'pointer',fontSize:16,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            ✕
          </button>
        </div>

        {/* Restriction notice */}
        {restrictionNote&&(
          <div style={{background:'#fff8e8',border:'1px solid rgba(0,0,0,.07)',borderRadius:10,padding:'8px 12px',marginBottom:16,fontSize:13,color:'#7a5800',fontWeight:500}}>
            {restrictionNote}
          </div>
        )}

        {/* ── Stats row ──────────────────────────────────── */}
        {canPark&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'rgba(0,0,0,.07)',borderRadius:14,overflow:'hidden',marginBottom:20}}>
            {[
              ['Payment',isPaid?'Pay & display':isCarPark?'Pay on entry':'No charge'],
              ['Stay up to',stayText],
              ['No return',isCarPark?'N/A':isFree?'None':'1 hour'],
            ].map(([l,v])=>(
              <div key={l} style={{background:'white',padding:'12px 10px'}}>
                <div style={{fontSize:11,color:'rgba(0,0,0,.4)',marginBottom:4,fontWeight:500}}>{l}</div>
                <div style={{color:'#111',fontSize:14,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Operating hours ─────────────────────────────── */}
        {!isCarPark&&(
          <div style={{marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{color:'#111',fontSize:15,fontWeight:700}}>Operating hours</div>
              <div style={{display:'flex',background:'#f0f0f0',borderRadius:20,padding:2,gap:1}}>
                {['Day','Week'].map(t=>(
                  <button key={t}
                    style={{padding:'4px 14px',borderRadius:18,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:t==='Day'?'white':'transparent',color:t==='Day'?'#111':'rgba(0,0,0,.4)',boxShadow:t==='Day'?'0 1px 4px rgba(0,0,0,.1)':'none'}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <HoursTimeline type={segment.type}/>
          </div>
        )}

        {/* ── Report ─────────────────────────────────────── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderTop:'1px solid rgba(0,0,0,.06)',marginBottom:16}}>
          <div style={{color:'rgba(0,0,0,.4)',fontSize:13}}>Found incorrect data?</div>
          <button onClick={()=>setReported(true)}
            style={{background:'none',border:'none',color:reported?'#2ECC71':OR,fontSize:13,fontWeight:600,cursor:'pointer'}}>
            {reported?'✓ Reported':'Report issue'}
          </button>
        </div>

        {/* ── Actions ────────────────────────────────────── */}
        {canPark?(
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setShowNav(true)}
              style={{flex:1,padding:'15px',borderRadius:14,border:'1.5px solid rgba(0,0,0,.12)',background:'white',color:'#111',fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              ➤ Directions
            </button>
            {(isFree||isPaid)&&(
              <button onClick={()=>setShowTimerPicker(true)}
                style={{flex:1,padding:'15px',borderRadius:14,border:'none',background:OR,color:'white',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:`0 4px 14px ${OR}50`}}>
                ⏱ Park here
              </button>
            )}
          </div>
        ):(
          <div style={{padding:'14px',borderRadius:14,background:'#f5f5f5',textAlign:'center',color:'rgba(0,0,0,.4)',fontSize:14}}>
            No parking permitted here
          </div>
        )}
      </div>
    </div>

    {showNav&&<NavigateModal segment={segment} onClose={()=>setShowNav(false)}/>}
    {showTimerPicker&&(
      <TimerDurationPicker
        onStart={mins=>{
          onStartTimer&&onStartTimer(mins,segment.name||'Parking bay',segment.type)
          setShowTimerPicker(false)
          onClose()
        }}
        onCancel={()=>setShowTimerPicker(false)}
      />
    )}
    </>
  )
}
