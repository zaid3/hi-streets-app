'use client'
import{useMemo,useState}from'react'
const GREEN='#078d16',BLUE='#0b73d9',GREY='#9d9da5',INK='#0b0628'
function controlledNow(){const d=new Date(),m=d.getHours()*60+d.getMinutes();return m>=8*60&&m<18*60+30}
function point(seg){const p=seg.coords?.[0];return{lat:seg.lat||p?.[0],lng:seg.lng||p?.[1]}}
function isNo(seg){return['restricted','no_parking','yellow_double','red_route'].includes(seg.type)}
function status(seg){
  if(seg.isCarPark)return{title:'Off-street parking',sub:seg.name||'Car park',icon:'P',color:BLUE,pill:'Pay at location'}
  if(isNo(seg))return{title:'No parking',sub:seg.type==='yellow_double'?'Double yellow line':'Disabled bay',icon:'⊘',color:GREY,pill:'Applies at all times'}
  if(seg.type==='paid'&&controlledNow())return{title:'Pay to park',sub:'Paid bay',icon:'£',color:BLUE,pill:'Park for free after 18:30'}
  return{title:'Park for free',sub:seg.type==='paid'?'Paid bay':seg.type==='disabled'?'Disabled bay':seg.type==='loading'?'Loading bay':seg.type==='resident'||seg.type==='permit'?'Resident bay':'Parking bay',icon:'✓',color:GREEN,pill:seg.type==='paid'?'Pay to park after 08:00 tomorrow':seg.type==='resident'||seg.type==='permit'?'No parking after 08:00 tomorrow':'Check signs before parking'}
}
function distance(seg,center){
  const p=point(seg);if(!center||!p.lat||!p.lng)return 999999
  const R=6371000,dLat=(p.lat-center.lat)*Math.PI/180,dLng=(p.lng-center.lng)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(center.lat*Math.PI/180)*Math.cos(p.lat*Math.PI/180)*Math.sin(dLng/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}
function walk(seg,center){const d=distance(seg,center);return d>999000?null:Math.max(1,Math.round(d/84))}
function stay(seg){if(isNo(seg))return'No parking';if(seg.maxStay)return seg.maxStay;if(seg.type==='paid'||seg.type==='resident'||seg.type==='permit')return'10h 1m';return'No limit'}
const OPTIONS=['Cheapest','Nearest','Longest stay']
export default function ListViewSheet({segments,center,onSelect,onDirections,onBack}){
  const[sort,setSort]=useState('Cheapest')
  const[open,setOpen]=useState(false)
  const rows=useMemo(()=>{
    const data=[...(segments||[])]
    if(sort==='Nearest')return data.sort((a,b)=>distance(a,center)-distance(b,center))
    if(sort==='Longest stay')return data.sort((a,b)=>(stay(b)==='No limit'?999:parseInt(stay(b))||0)-(stay(a)==='No limit'?999:parseInt(stay(a))||0))
    return data.sort((a,b)=>{const aw=status(a),bw=status(b);const o={'Park for free':0,'Pay to park':1,'Off-street parking':2,'No parking':3};return(o[aw.title]??4)-(o[bw.title]??4)})
  },[segments,sort,center])
  return(
    <div style={{position:'absolute',inset:0,zIndex:360,background:'#f7f6fc',display:'flex',flexDirection:'column',paddingTop:'max(155px,env(safe-area-inset-top) + 142px)'}}>
      <div style={{height:112,background:'#fff',boxShadow:'0 6px 22px rgba(27,23,55,.07)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:'0 26px'}}>
        <button onClick={()=>setOpen(o=>!o)} style={{height:56,border:'1px solid #e5e1ef',background:'#fff',borderRadius:9,padding:'0 22px',display:'flex',alignItems:'center',gap:14,fontSize:18,fontWeight:800,color:INK,cursor:'pointer'}}>☰ <span style={{fontWeight:600,color:'#77768a'}}>Sort by</span> {sort}</button>
        <button onClick={onBack} className="float-btn" style={{position:'static',width:58,height:58,fontSize:25}}>⚙</button>
      </div>
      {open&&<div style={{background:'#fff',borderBottom:'1px solid #eeeaf7',padding:'8px 28px'}}>{OPTIONS.map(o=><button key={o} onClick={()=>{setSort(o);setOpen(false)}} style={{display:'flex',width:'100%',justifyContent:'space-between',border:0,background:'#fff',padding:'13px 0',fontSize:19,fontWeight:800,color:o===sort?BLUE:INK,cursor:'pointer'}}>{o}{o===sort?'✓':''}</button>)}</div>}
      <div style={{flex:1,overflowY:'auto'}}>
        {rows.map((seg,i)=>{const s=status(seg),wm=walk(seg,center);return(
          <div key={seg.id||i} onClick={()=>onSelect?.(seg)} style={{background:'#fff',borderBottom:'6px solid #f0eef9',padding:'28px 35px 24px',display:'grid',gridTemplateColumns:'86px 1fr 62px',gap:26,cursor:'pointer'}}>
            <div style={{width:86,height:86,borderRadius:10,background:s.color,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:52,fontWeight:900}}>{s.icon}</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:27,fontWeight:900,lineHeight:1.05,color:INK}}>{s.title}</div>
              <div style={{fontSize:21,color:'#77768a',fontWeight:700,marginTop:8}}>{s.sub}</div>
              <div className="info-chip" style={{fontSize:17,marginTop:14,background:s.title==='No parking'?'#ffe8e8':'#fff4df'}}>{s.pill}</div>
              <div style={{display:'flex',gap:24,flexWrap:'wrap',marginTop:28,fontSize:18,color:'#77768a',fontWeight:700}}><span>Stay up to <b style={{color:INK}}>{stay(seg)}</b></span><span>Address <b style={{color:INK}}>{seg.name||'Newham'}</b></span>{wm&&<span>Walk <b style={{color:INK}}>{wm} min</b></span>}</div>
            </div>
            <button onClick={e=>{e.stopPropagation();onDirections?.(seg)}} style={{width:62,height:62,border:'1px solid #eeeaf7',background:'#fff',borderRadius:8,color:BLUE,fontSize:28,fontWeight:900,cursor:'pointer'}}>↱</button>
          </div>
        )})}
        {!rows.length&&<div style={{padding:60,textAlign:'center',color:'#77768a',fontSize:19,fontWeight:700}}>No parking found in this area. Move the map or adjust filters.</div>}
      </div>
    </div>
  )
}