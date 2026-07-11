'use client'
import{useState,useEffect}from'react'

const GREEN='#078d16',BLUE='#0b73d9',GREY='#9d9da5',INK='#0b0628'

function controlledNow(){const d=new Date(),m=d.getHours()*60+d.getMinutes();return m>=8*60&&m<18*60+30}
function currentTime(){const d=new Date();return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}
function isNoParking(type){return['restricted','no_parking','yellow_double','red_route'].includes(type)}
function isYellow(type){return['yellow_single','yellow_double'].includes(type)}
function isCpz(seg){return seg.source==='newham_cpz'}
function sourceInfo(seg){
  if(isCpz(seg))return{label:'Newham CPZ',tone:'#e8fff1',color:GREEN,trust:'Official zone'}
  if(seg.source==='dtro')return{label:'DfT D-TRO',tone:'#e8fff1',color:GREEN,trust:'Official data'}
  if(seg.source==='council')return{label:seg.sourceName||'Council open data',tone:'#e8fff1',color:GREEN,trust:'Official council data'}
  if(seg.source==='paybyphone')return{label:'PayByPhone import',tone:'#eef4ff',color:BLUE,trust:'Verified paid bay'}
  if(seg.source==='google')return{label:'Google Places',tone:'#eef4ff',color:BLUE,trust:'Parking place'}
  if(seg.source==='osm')return{label:'OpenStreetMap',tone:'#f2f1f8',color:'#635f78',trust:'Community map data'}
  return{label:'Parking data',tone:'#f2f1f8',color:'#635f78',trust:'Check signs'}
}
function bayKind(seg){
  if(isCpz(seg))return'Controlled Parking Zone'
  if(seg.isCarPark)return'Off-street parking'
  if(seg.type==='disabled')return'Disabled bay'
  if(seg.type==='loading')return'Loading bay'
  if(seg.type==='resident'||seg.type==='permit')return'Resident bay'
  if(seg.type==='paid')return'Paid bay'
  if(seg.type==='yellow_single')return'Single yellow line'
  if(seg.type==='yellow_double')return'Double yellow line'
  return'Parking bay'
}
function getStatus(seg){
  const ctrl=controlledNow()
  if(isCpz(seg))return{title:'Controlled Parking Zone',sub:bayKind(seg),color:GREEN,icon:'CPZ',pill:'Official zone area'}
  if(seg.isCarPark)return{title:'Off-street parking',sub:seg.name||'Car park',color:BLUE,icon:'P',pill:'Pay at location or pre-book'}
  if(isNoParking(seg.type))return{title:'No parking',sub:bayKind(seg),color:GREY,icon:'x',pill:'Applies at all times'}
  if(seg.type==='paid'&&ctrl)return{title:'Pay to park',sub:'Paid bay',color:BLUE,icon:'£',pill:'Check tariff and signs'}
  if((seg.type==='resident'||seg.type==='permit')&&ctrl)return{title:'Permit only',sub:'Resident bay',color:'#8E44AD',icon:'P',pill:'Permit holders during controlled hours'}
  if(seg.type==='loading'&&ctrl)return{title:'Loading only',sub:'Loading bay',color:'#E67E22',icon:'L',pill:'Check signs before stopping'}
  if(seg.type==='disabled')return{title:'Blue badge parking',sub:'Disabled bay',color:'#8E44AD',icon:'BB',pill:'Blue badge holders only'}
  return{title:'Park for free',sub:bayKind(seg),color:GREEN,icon:'P',pill:seg.type==='paid'?'Check when payment starts':seg.type==='resident'||seg.type==='permit'?'Check when permit control starts':'Check signs before parking'}
}
function paymentLabel(seg,st){
  if(isCpz(seg))return'Zone rule'
  if(seg.tariff)return seg.tariff
  if(st.title==='Pay to park')return'Pay by app'
  if(st.title==='Off-street parking')return'Pay at car park'
  return'No charge'
}
function stayUpTo(seg){
  if(isCpz(seg))return'Check bays/signs'
  if(seg.isCarPark)return seg.maxStay||'Open now'
  if(isNoParking(seg.type))return'No parking'
  if(seg.maxStay)return seg.maxStay
  if(seg.type==='paid'||seg.type==='resident'||seg.type==='permit')return'Check signs'
  return'No limit'
}
function nextLabel(seg,cpzHour){
  if(isCpz(seg))return cpzHour?.operating_hours?`Operating hours: ${cpzHour.operating_hours}`:(seg.hours||seg.restriction||'Official CPZ zone. Check zone operating hours and bay signs before parking.')
  if(isNoParking(seg.type))return'Applies at all times'
  if(seg.isCarPark)return seg.restriction||'Open now'
  return seg.restriction||'Check local signs'
}
function point(seg){const p=seg.coords?.[0];return{lat:seg.lat||p?.[0],lng:seg.lng||p?.[1]}}
function HoursTimeline({seg}){
  const pct=((new Date().getHours()*60+new Date().getMinutes())/(24*60))*100
  const no=isNoParking(seg.type),paid=seg.type==='paid'||seg.isCarPark,restricted=seg.type==='resident'||seg.type==='permit'||seg.type==='loading'||isYellow(seg.type)||isCpz(seg)
  const parts=no?[['100%',GREY]]:paid?[['32%',GREEN],['43%',BLUE],['25%',GREEN]]:restricted?[['32%',GREEN],['43%',GREY],['25%',GREEN]]:[['100%',GREEN]]
  return <div><div className="legend"><span><span className="legend-dot" style={{background:GREEN}}/>Park for free</span>{paid&&<span><span className="legend-dot" style={{background:BLUE}}/>Pay to park</span>}{(restricted||no)&&<span><span className="legend-dot" style={{background:GREY}}/>Restricted / check signs</span>}</div><div className="timeline-track">{parts.map(([w,c],i)=><div key={i} className="timeline-part" style={{width:w,background:c}}/>)}<div className="timeline-marker" style={{left:`${pct}%`}}><span>{currentTime()}</span></div></div><div className="timeline-labels"><span>00:00</span><span>08:00</span><span>18:30</span><span>24:00</span></div></div>
}
export default function ParkingSheet({segment,onClose,onDirections}){
  const[expanded,setExpanded]=useState(false)
  const[cpzHour,setCpzHour]=useState(null)
  const st=getStatus(segment),src=sourceInfo(segment),p=point(segment)
  useEffect(()=>{setExpanded(false);setCpzHour(null);if(isCpz(segment)&&segment.cpz){fetch(`/api/parking/cpz-hours?zone=${encodeURIComponent(segment.cpz)}`).then(r=>r.json()).then(json=>setCpzHour(json?.items?.[0]||null)).catch(()=>{})}},[segment?.id,segment?.cpz])
  return <div className="bottom-card"><div className="card-pad"><div className="sheet-handle"/><div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}><div style={{display:'flex',gap:14,alignItems:'center'}}><div className="status-tile" style={{background:st.color,fontSize:String(st.icon).length>2?18:String(st.icon).length>1?22:38}}>{st.icon}</div><div><div style={{fontSize:25,fontWeight:900,lineHeight:1.05,color:INK}}>{st.title}</div><div style={{fontSize:15,fontWeight:800,color:'#77768a',marginTop:5}}>{st.sub}</div></div></div><button className="close-x" onClick={onClose}>×</button></div><div style={{marginTop:14,display:'flex',gap:8,flexWrap:'wrap'}}><span className="info-chip" style={{background:src.tone,color:src.color}}>{src.label} · {src.trust}</span><span className="info-chip">{st.pill}</span></div><h2 style={{fontSize:28,lineHeight:1.05,margin:'20px 0 6px',fontWeight:900,color:INK}}>{segment.name||'Parking location'}</h2><p style={{fontSize:16,fontWeight:700,color:'#5d596e',lineHeight:1.42,margin:'0 0 18px'}}>{nextLabel(segment,cpzHour)}</p>{isCpz(segment)&&cpzHour?.notes&&<p style={{fontSize:14,fontWeight:800,color:'#77768a',lineHeight:1.35,margin:'-8px 0 18px'}}>{cpzHour.notes}</p>}<div className="stat-grid"><div><div className="stat-label">Payment</div><div className="stat-value">{paymentLabel(segment,st)}</div></div><div><div className="stat-label">Stay up to</div><div className="stat-value">{stayUpTo(segment)}</div></div><div><div className="stat-label">Source</div><div className="stat-value">{src.trust}</div></div></div><div className="timeline-card"><div className="timeline-title"><h3>Parking times today</h3></div><HoursTimeline seg={segment}/></div>{segment.dataNote&&<div style={{fontSize:13,fontWeight:800,color:'#77768a',lineHeight:1.35,marginTop:14}}>{segment.dataNote}</div>}{!isCpz(segment)&&<button onClick={()=>onDirections?.(segment)} className="primary-line-btn" style={{marginTop:18}}>Navigate to this area</button>}{expanded&&<div style={{fontSize:13,color:'#77768a',fontWeight:700,marginTop:12,lineHeight:1.4}}>Zone: {segment.cpz||''}<br/>Lat/Lng: {p.lat||'n/a'}, {p.lng||'n/a'}<br/>Restriction: {segment.restriction||'Check signs'}<br/>Hours: {cpzHour?.operating_hours||segment.hours||'Check signs'}</div>}<button onClick={()=>setExpanded(e=>!e)} className="plain-collapse">{expanded?'Hide details':'Show details'}</button></div></div>
}
