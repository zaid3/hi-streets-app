'use client'
import{useState,useEffect}from'react'

const GREEN='#078d16',BLUE='#0b73d9',GREY='#9d9da5',INK='#0b0628'

function controlledNow(){const d=new Date(),m=d.getHours()*60+d.getMinutes();return m>=8*60&&m<18*60+30}
function currentTime(){const d=new Date();return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}
function isNoParking(type){return['restricted','no_parking','yellow_double','red_route'].includes(type)}
function isYellow(type){return['yellow_single','yellow_double'].includes(type)}
function bayKind(seg){
  if(seg.isCarPark)return'Off-street parking'
  if(seg.type==='disabled')return'Disabled bay'
  if(seg.type==='loading')return'Loading bay'
  if(seg.type==='resident'||seg.type==='permit')return'Resident bay'
  if(seg.type==='paid')return'Paid bay'
  if(seg.type==='yellow_single')return'Single yellow line'
  if(seg.type==='yellow_double')return'Double yellow line'
  return'Resident bay'
}
function getStatus(seg){
  const ctrl=controlledNow()
  if(seg.isCarPark)return{title:'Off-street parking',sub:seg.name||'Car park',color:BLUE,icon:'P',pill:'Pay at location or pre-book'}
  if(isNoParking(seg.type))return{title:'No parking',sub:bayKind(seg),color:GREY,icon:'⊘',pill:'Applies at all times'}
  if(seg.type==='paid'&&ctrl)return{title:'Pay to park',sub:'Paid bay',color:BLUE,icon:'£',pill:'Park for free after 18:30'}
  if((seg.type==='resident'||seg.type==='permit')&&ctrl)return{title:'Permit only',sub:'Resident bay',color:'#8E44AD',icon:'✓',pill:'Permit holders during controlled hours'}
  if(seg.type==='loading'&&ctrl)return{title:'Loading only',sub:'Loading bay',color:'#E67E22',icon:'L',pill:'Check signs before stopping'}
  if(seg.type==='disabled')return{title:'Blue badge parking',sub:'Disabled bay',color:'#8E44AD',icon:'♿',pill:'Blue badge holders only'}
  return{title:'Park for free',sub:bayKind(seg),color:GREEN,icon:'✓',pill:seg.type==='paid'?'Pay to park after 08:00 tomorrow':seg.type==='resident'||seg.type==='permit'?'No parking after 08:00 tomorrow':'Check signs before parking'}
}
function stayUpTo(seg){
  if(seg.isCarPark)return seg.maxStay||'Open now'
  if(isNoParking(seg.type))return'No parking'
  if(seg.maxStay)return seg.maxStay
  if(seg.type==='paid'||seg.type==='resident'||seg.type==='permit'){
    const d=new Date(),m=d.getHours()*60+d.getMinutes()
    const next=8*60
    if(m>=18*60+30){const mins=(24*60-m)+next;return `${Math.floor(mins/60)}h ${mins%60}m`}
    if(m<next){const mins=next-m;return `${Math.floor(mins/60)}h ${mins%60}m`}
    const mins=18*60+30-m;return `${Math.floor(mins/60)}h ${mins%60}m`
  }
  return'No limit'
}
function nextLabel(seg){
  if(isNoParking(seg.type))return'Applies at all times'
  if(seg.isCarPark)return seg.restriction||'Open now'
  const ctrl=controlledNow()
  if(seg.type==='paid')return ctrl?'Park for free after 18:30':'Pay to park after 08:00 tomorrow'
  if(seg.type==='resident'||seg.type==='permit')return ctrl?'Permit holders only until 18:30':'No parking after 08:00 tomorrow'
  return seg.restriction||'Check local signs'
}
function point(seg){const p=seg.coords?.[0];return{lat:seg.lat||p?.[0],lng:seg.lng||p?.[1]}}

function HoursTimeline({seg}){
  const pct=((new Date().getHours()*60+new Date().getMinutes())/(24*60))*100
  const no=isNoParking(seg.type)
  const paid=seg.type==='paid'||seg.isCarPark
  const restricted=seg.type==='resident'||seg.type==='permit'||seg.type==='loading'||isYellow(seg.type)
  const parts=no?[['100%',GREY]]:paid?[['32%',GREEN],['43%',BLUE],['25%',GREEN]]:restricted?[['32%',GREEN],['43%',GREY],['25%',GREEN]]:[['100%',GREEN]]
  return(
    <div>
      <div className="legend">
        <span><span className="legend-dot" style={{background:GREEN}}/>Park for free</span>
        {paid&&<span><span className="legend-dot" style={{background:BLUE}}/>Pay to park</span>}
        {(restricted||no)&&<span><span className="legend-dot" style={{background:GREY}}/>No parking</span>}
      </div>
      <div className="timeline-track">
        {parts.map(([w,c],i)=><div key={i} className="timeline-part" style={{width:w,background:c}}/>)}
        <div className="timeline-marker" style={{left:`${pct}%`}}><span>{currentTime()}</span></div>
      </div>
      <div className="timeline-labels"><span>0:00</span><span>8:00</span><span>18:30</span><span>23:59</span></div>
    </div>
  )
}

function NavigateModal({segment,onClose}){
  const p=point(segment)
  function open(app){
    if(!p.lat||!p.lng)return
    const urls={
      apple:`maps://maps.apple.com/?daddr=${p.lat},${p.lng}`,
      google:`https://maps.google.com/?q=${p.lat},${p.lng}`,
      waze:`https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`,
    }
    window.open(urls[app],'_blank');onClose()
  }
  return(
    <div className="modal-dim">
      <div className="modal-card">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-title">Navigate to selected bay</div>
        <div className="nav-illustration"><div className="nav-route"/><div className="nav-badge">£ Paid Bay</div><div className="nav-car">🚕</div></div>
        <p className="modal-copy">Choose your favourite navigation app and get turn-by-turn directions to your selected parking bay</p>
        <div style={{display:'grid',gap:12,marginTop:18}}>
          {['apple','google','waze'].map(id=><button key={id} onClick={()=>open(id)} className="primary-line-btn">{id==='apple'?'Apple Maps':id==='google'?'Google Maps':'Waze'}</button>)}
        </div>
      </div>
    </div>
  )
}

export default function ParkingSheet({segment,onClose,destination}){
  const[showNav,setShowNav]=useState(false)
  const[week,setWeek]=useState(false)
  const[reported,setReported]=useState(false)
  const[walk,setWalk]=useState(null)
  useEffect(()=>{
    if(!destination||!segment)return
    const p=point(segment);if(!p.lat||!p.lng)return
    const R=6371000,dLat=(p.lat-destination.lat)*Math.PI/180,dLng=(p.lng-destination.lng)*Math.PI/180
    const a=Math.sin(dLat/2)**2+Math.cos(destination.lat*Math.PI/180)*Math.cos(p.lat*Math.PI/180)*Math.sin(dLng/2)**2
    setWalk(Math.max(1,Math.round((R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)))/84)))
  },[destination,segment])
  if(!segment)return null
  const st=getStatus(segment),no=isNoParking(segment.type)
  return(
    <>
      <div className="bottom-sheet">
        <div className="sheet-handle"/>
        <div className="card-pad">
          <div style={{display:'flex',alignItems:'flex-start',gap:18,justifyContent:'space-between'}}>
            <div style={{display:'flex',gap:18,alignItems:'center',minWidth:0}}>
              <div className="status-tile" style={{background:st.color}}>{st.icon}</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:34,fontWeight:900,letterSpacing:'-.8px',lineHeight:1.02}}>{st.title}</div>
                <div style={{fontSize:22,color:'#77768a',fontWeight:700,marginTop:8}}>{st.sub}</div>
                <div className="info-chip" style={{marginTop:14,background:no?'#ffe8e8':'#fff4df'}}>{nextLabel(segment)}</div>
              </div>
            </div>
            <button className="close-x" onClick={onClose}>×</button>
          </div>

          <div className="timeline-card">
            <div className="timeline-title">
              <h3>Operating hours</h3>
              <div className="segment-switch">
                <button className={!week?'active':''} onClick={()=>setWeek(false)}>Day</button>
                <button className={week?'active':''} onClick={()=>setWeek(true)}>Week</button>
              </div>
            </div>
            <HoursTimeline seg={segment}/>
          </div>

          <div style={{padding:'28px 0',borderBottom:'1px solid #eeeaf7'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <h3 style={{fontSize:27,fontWeight:900,margin:0}}>Walking time</h3>
              <button onClick={()=>window.dispatchEvent(new CustomEvent('hi-streets-search-destination'))} style={{border:'1px solid #e9e5f2',background:'#fff',borderRadius:8,padding:'12px 16px',fontSize:18,fontWeight:800,color:INK,cursor:'pointer'}}>⌖ Set destination</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'20px 1fr auto',gap:'0 16px',alignItems:'start'}}>
              <div style={{width:18,height:18,borderRadius:99,background:GREEN,marginTop:3}}/>
              <div><div style={{fontSize:18,color:'#77768a'}}>Selected bay</div><div style={{fontSize:20,fontWeight:900}}>{segment.name||st.sub}</div></div>
              {walk&&<div style={{fontSize:20,fontWeight:900,color:GREEN}}>🚶 {walk} min</div>}
              <div style={{width:3,height:34,background:'#d9d5e5',margin:'6px auto'}}/>
              <div/>
              <div/>
              <div style={{width:18,height:18,borderRadius:99,background:'#14083d',marginTop:3}}/>
              <div><div style={{fontSize:18,color:'#77768a'}}>Destination</div><div style={{fontSize:20,fontWeight:800,color:destination?INK:'#77768a'}}>{destination?'Destination selected':'Set destination to view walking time'}</div></div>
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:22,padding:'28px 0',borderBottom:'1px solid #eeeaf7'}}>
            <div style={{fontSize:50}}>📋</div>
            <div style={{flex:1}}><div style={{fontSize:27,fontWeight:900}}>Found data issues?</div><div style={{fontSize:18,color:'#77768a',lineHeight:1.35,marginTop:8}}>Take a photo of the issue and get in touch so we can fix it.</div></div>
            <button onClick={()=>setReported(true)} style={{border:'1px solid #e8e4f1',background:'#fff',borderRadius:8,padding:'12px 18px',fontSize:18,fontWeight:900,color:reported?GREEN:BLUE,cursor:'pointer'}}>{reported?'✓ Sent':'Contact us'}</button>
          </div>

          <div className="stat-grid">
            <div><div className="stat-label">Payment</div><div className="stat-value">{st.title==='Pay to park'?'Pay by app':st.title==='Off-street parking'?'Pay at car park':'No charge'}</div></div>
            <div><div className="stat-label">Stay up to</div><div className="stat-value">{stayUpTo(segment)}</div></div>
            <div><div className="stat-label">No return</div><div className="stat-value">{no?'None':segment.noReturn||'None'}</div></div>
          </div>
          <button onClick={()=>setShowNav(true)} className="primary-line-btn" style={{marginTop:28}}>↱ Directions</button>
          <div style={{fontSize:13,color:'#77768a',lineHeight:1.4,marginTop:16,textAlign:'center'}}>Always check road signs before parking. This MVP uses open/demo parking data until council feeds are connected.</div>
        </div>
      </div>
      {showNav&&<NavigateModal segment={segment} onClose={()=>setShowNav(false)}/>} 
    </>
  )
}