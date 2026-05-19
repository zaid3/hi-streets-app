'use client'
import{useState,useEffect}from'react'

const OR='#ff681f'

// ── Duration picker for timer ────────────────────────────
function TimerDurationPicker({onStart,onCancel}){
  const[mins,setMins]=useState(60)
  const options=[30,60,90,120,180,240]
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:700,display:'flex',alignItems:'flex-end',padding:16}}>
      <div style={{width:'100%',background:'#1a1a1a',borderRadius:20,overflow:'hidden',padding:'20px 20px 24px'}}>
        <div style={{fontSize:16,fontWeight:700,color:'white',marginBottom:4,textAlign:'center'}}>Start parking timer</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.4)',textAlign:'center',marginBottom:20}}>We'll remind you when time is running out</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:20}}>
          {options.map(o=>(
            <button key={o} onClick={()=>setMins(o)}
              style={{flex:'1 1 calc(33% - 8px)',padding:'12px 8px',borderRadius:12,border:`1.5px solid ${mins===o?OR:'rgba(255,255,255,.12)'}`,background:mins===o?`${OR}20`:'transparent',color:mins===o?OR:'rgba(255,255,255,.7)',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              {o<60?`${o}m`:`${o/60}h`}{o===60?' (1h)':''}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>onStart(mins)}
            style={{flex:2,padding:'14px',borderRadius:14,border:'none',background:OR,color:'white',fontSize:15,fontWeight:700,cursor:'pointer'}}>
            ⏱ Start timer
          </button>
          <button onClick={onCancel}
            style={{flex:1,padding:'14px',borderRadius:14,border:'1px solid rgba(255,255,255,.12)',background:'transparent',color:'rgba(255,255,255,.5)',fontSize:14,cursor:'pointer'}}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Operating hours timeline ─────────────────────────────
function HoursTimeline({type,hours}){
  const now=new Date()
  const totalMins=24*60
  const currentMins=now.getHours()*60+now.getMinutes()
  const pct=(currentMins/totalMins)*100

  // Parse restriction windows
  // Default: paid Mon-Sat 8am-6:30pm, free otherwise
  const segments=[]
  if(type==='free'){
    segments.push({start:0,end:100,color:'#2ECC71',label:'Free'})
  } else if(type==='paid'){
    const paidStart=(8*60)/totalMins*100
    const paidEnd=(18.5*60)/totalMins*100
    segments.push({start:0,end:paidStart,color:'#2ECC71',label:'Free'})
    segments.push({start:paidStart,end:paidEnd,color:'#4A9EFF',label:'Paid'})
    segments.push({start:paidEnd,end:100,color:'#2ECC71',label:'Free'})
  } else if(type==='permit'||type==='restricted'){
    const resStart=(8*60)/totalMins*100
    const resEnd=(18.5*60)/totalMins*100
    segments.push({start:0,end:resStart,color:'#2ECC71',label:'Free'})
    segments.push({start:resStart,end:resEnd,color:'#888',label:'No parking'})
    segments.push({start:resEnd,end:100,color:'#2ECC71',label:'Free'})
  } else {
    segments.push({start:0,end:100,color:'#888',label:'No parking'})
  }

  const currentIsFree=type==='free'||(type!=='restricted'&&(currentMins<8*60||currentMins>=18.5*60))
  const nextChange=type==='paid'||(type==='permit')
    ? currentMins<8*60?`Pay from 08:00`:currentMins<18*60+30?`Free from 18:30`:`Pay from 08:00 tomorrow`
    : null

  return(
    <div style={{marginTop:4}}>
      {/* Legend */}
      <div style={{display:'flex',gap:12,marginBottom:8,fontSize:11}}>
        <span style={{color:'#2ECC71',display:'flex',alignItems:'center',gap:4}}>
          <span style={{width:12,height:3,background:'#2ECC71',borderRadius:2,display:'inline-block'}}/>
          Park for free
        </span>
        {(type==='paid'||type==='permit')&&(
          <span style={{color:type==='paid'?'#4A9EFF':'#888',display:'flex',alignItems:'center',gap:4}}>
            <span style={{width:12,height:3,background:type==='paid'?'#4A9EFF':'#888',borderRadius:2,display:'inline-block'}}/>
            {type==='paid'?'Pay to park':'No parking'}
          </span>
        )}
      </div>

      {/* Timeline bar */}
      <div style={{position:'relative',marginBottom:6}}>
        <div style={{display:'flex',height:12,borderRadius:6,overflow:'hidden',gap:1}}>
          {segments.map((s,i)=>(
            <div key={i} style={{width:`${s.end-s.start}%`,background:s.color,opacity:.9}}/>
          ))}
        </div>
        {/* Current time cursor */}
        <div style={{position:'absolute',top:-4,bottom:-4,width:2.5,background:'white',borderRadius:2,left:`${pct}%`,boxShadow:'0 0 6px rgba(0,0,0,.5)',zIndex:2}}>
          <div style={{position:'absolute',top:-18,left:'50%',transform:'translateX(-50%)',background:'#222',color:'white',fontSize:10,fontWeight:600,padding:'2px 5px',borderRadius:4,whiteSpace:'nowrap'}}>
            {now.getHours().toString().padStart(2,'0')}:{now.getMinutes().toString().padStart(2,'0')}
          </div>
        </div>
      </div>

      {/* Time labels */}
      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,.35)',marginBottom:8}}>
        <span>0:00</span><span>8:00</span><span>18:30</span><span>23:59</span>
      </div>

      {/* Next change pill */}
      {nextChange&&(
        <div style={{background:'rgba(255,200,0,.12)',border:'1px solid rgba(255,200,0,.2)',borderRadius:8,padding:'6px 10px',fontSize:12,color:'#FFD700',display:'inline-block'}}>
          ⏱ {nextChange}
        </div>
      )}
    </div>
  )
}

// ── Navigate modal ───────────────────────────────────────
function NavigateModal({segment,onClose}){
  const lat=segment.lat||segment.coords?.[0]?.[0]
  const lng=segment.lng||segment.coords?.[0]?.[1]

  function open(app){
    if(!lat||!lng)return
    const urls={
      apple:`maps://maps.apple.com/?daddr=${lat},${lng}`,
      google:`https://maps.google.com/?q=${lat},${lng}`,
      waze:`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    }
    window.open(urls[app],'_blank')
    onClose()
  }

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:600,display:'flex',alignItems:'flex-end',padding:16}}>
      <div style={{width:'100%',background:'#1a1a1a',borderRadius:20,overflow:'hidden'}}>
        <div style={{padding:'20px 20px 4px',textAlign:'center',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
          <div style={{fontSize:16,fontWeight:600,color:'white',marginBottom:4}}>Navigate to bay</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.4)'}}>Choose your navigation app</div>
        </div>
        {[
          {id:'apple',label:'Apple Maps',icon:'🍎'},
          {id:'google',label:'Google Maps',icon:'🗺️'},
          {id:'waze',label:'Waze',icon:'🚗'},
        ].map(app=>(
          <button key={app.id} onClick={()=>open(app.id)}
            style={{width:'100%',padding:'16px 20px',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,.06)',color:'white',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left'}}>
            <span style={{fontSize:22}}>{app.icon}</span>
            <span>{app.label}</span>
          </button>
        ))}
        <button onClick={onClose}
          style={{width:'100%',padding:'16px',background:'none',border:'none',color:'rgba(255,255,255,.4)',fontSize:15,cursor:'pointer',marginBottom:8}}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Stay up to calculator ────────────────────────────────
function stayUpTo(type){
  const now=new Date()
  const h=now.getHours(),m=now.getMinutes()
  if(type==='free')return'No limit'
  if(type==='restricted'||type==='no_parking')return'No parking'
  // paid: restriction ends 18:30
  const endH=18,endM=30
  if(h>=endH&&m>=endM)return'Free until 08:00'
  const diffM=(endH*60+endM)-(h*60+m)
  const dh=Math.floor(diffM/60),dm=diffM%60
  return`${dh}h ${dm}m`
}

// ── Main component ───────────────────────────────────────
export default function ParkingSheet({segment,onClose,destination,onStartTimer}){
  const[showNav,setShowNav]=useState(false)
  const[showWeek,setShowWeek]=useState(false)
  const[reported,setReported]=useState(false)
  const[walkMins,setWalkMins]=useState(null)
  const[showTimerPicker,setShowTimerPicker]=useState(false)

  useEffect(()=>{
    if(!destination||!segment)return
    // Rough walking time: 1.4m/s = 84m/min, haversine-ish
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

  const statusColor=isFree?'#2ECC71':isPaid?'#4A9EFF':isPermit?'#9B59B6':isRestricted?'#888':'#2a5fba'
  const statusBg=isFree?'#1a4a2e':isPaid?'#1a2e4a':isPermit?'#2e1a4a':isRestricted?'#2a2a2a':'#1a2a4a'
  const statusIcon=isFree?'✓':isPaid?'£':isPermit?'P':isRestricted?'⊘':'P'
  const statusText=isFree?'Park for free':isPaid?'Pay to park':isPermit?'Permit only':isRestricted?'No parking':'Off-street parking'
  const subText=isCarPark?'Car park':isPaid?'Paid bay':isFree?'Resident bay':isPermit?'Permit bay':'Double yellow line'
  const stayText=stayUpTo(segment.type)

  return(
    <>
    <div className="bottom-sheet open" style={{background:'#141414'}}>
      <div className="sheet-handle"/>
      <div style={{padding:'16px 20px 32px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            <div style={{width:52,height:52,borderRadius:14,background:statusBg,border:`1.5px solid ${statusColor}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:statusColor,fontWeight:700,flexShrink:0}}>
              {statusIcon}
            </div>
            <div>
              <div style={{color:'white',fontSize:18,fontWeight:700,marginBottom:2}}>{statusText}</div>
              <div style={{color:'rgba(255,255,255,.45)',fontSize:13}}>{subText}</div>
              {segment.restriction&&(
                <div style={{marginTop:6,background:isFree?'rgba(46,204,113,.12)':isPaid?'rgba(255,200,0,.1)':'rgba(255,100,50,.1)',border:`1px solid ${isFree?'rgba(46,204,113,.2)':isPaid?'rgba(255,200,0,.2)':'rgba(255,100,50,.2)'}`,borderRadius:8,padding:'4px 10px',fontSize:12,color:isFree?'#2ECC71':isPaid?'#FFD700':'#FF6432',display:'inline-block'}}>
                  {segment.restriction}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.1)',border:'none',color:'rgba(255,255,255,.6)',width:32,height:32,borderRadius:50,cursor:'pointer',fontSize:18,flexShrink:0}}>✕</button>
        </div>

        {/* Stats grid */}
        {!isRestricted&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
            {[
              ['Payment',isPaid?'Pay & display':isCarPark?'Pay on entry':'No charge'],
              ['Stay up to',stayText],
              ['No return',isCarPark?'N/A':isFree?'None':'1 hour'],
            ].map(([l,v])=>(
              <div key={l} style={{background:'rgba(255,255,255,.05)',borderRadius:10,padding:'10px 10px'}}>
                <div style={{fontSize:10,color:'rgba(255,255,255,.35)',marginBottom:3,fontWeight:500}}>{l}</div>
                <div style={{color:'white',fontSize:13,fontWeight:600}}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Operating hours */}
        {!isCarPark&&(
          <div style={{background:'rgba(255,255,255,.04)',borderRadius:12,padding:'12px 14px',marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{color:'white',fontSize:14,fontWeight:600}}>Operating hours</div>
              <div style={{display:'flex',background:'rgba(255,255,255,.08)',borderRadius:20,padding:2,gap:2}}>
                {['Day','Week'].map(t=>(
                  <button key={t} onClick={()=>setShowWeek(t==='Week')}
                    style={{padding:'4px 12px',borderRadius:16,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',background:showWeek===(t==='Week')?'rgba(255,255,255,.15)':'transparent',color:showWeek===(t==='Week')?'white':'rgba(255,255,255,.4)'}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <HoursTimeline type={segment.type} hours={segment.hours}/>
          </div>
        )}

        {/* Walking time */}
        <div style={{background:'rgba(255,255,255,.04)',borderRadius:12,padding:'12px 14px',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{color:'white',fontSize:14,fontWeight:600}}>Walking time</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:12,height:12,borderRadius:50,background:'#2ECC71',flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>Selected bay</div>
                <div style={{fontSize:13,color:'white',fontWeight:500}}>{segment.name||'Parking bay'}</div>
              </div>
              {walkMins&&<div style={{fontSize:13,color:'#2ECC71',fontWeight:600}}>🚶 {walkMins} min</div>}
            </div>
            <div style={{width:1.5,height:16,background:'rgba(255,255,255,.15)',marginLeft:5}}/>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:12,height:12,borderRadius:50,background:'rgba(255,255,255,.2)',border:'1.5px solid rgba(255,255,255,.3)',flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>Destination</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,.4)'}}>
                  {destination?`${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`:'Set destination to view walking time'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report data issues */}
        <div style={{background:'rgba(255,255,255,.04)',borderRadius:12,padding:'12px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:14}}>
          <div style={{fontSize:28}}>📋</div>
          <div style={{flex:1}}>
            <div style={{color:'white',fontSize:13,fontWeight:600,marginBottom:2}}>Found data issues?</div>
            <div style={{color:'rgba(255,255,255,.4)',fontSize:12,lineHeight:1.4}}>Tap to report wrong data — we'll fix it.</div>
          </div>
          <button onClick={()=>setReported(true)}
            style={{background:reported?'#2ECC7120':'rgba(255,104,31,.15)',border:`1px solid ${reported?'#2ECC7140':'rgba(255,104,31,.3)'}`,borderRadius:10,padding:'8px 14px',color:reported?'#2ECC71':OR,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
            {reported?'✓ Reported':'Report'}
          </button>
        </div>

        {/* Actions */}
        {!isRestricted&&(
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setShowNav(true)}
              style={{flex:1,padding:'15px',borderRadius:14,border:'none',background:isFree?'#2ECC71':isPaid?'#4A9EFF':OR,color:'white',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              🧭 Directions
            </button>
            {(isFree||isPaid)&&(
              <button onClick={()=>setShowTimerPicker(true)}
                style={{flex:1,padding:'15px',borderRadius:14,border:`1.5px solid ${OR}60`,background:`${OR}15`,color:OR,fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                ⏱ Park here
              </button>
            )}
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
