'use client'
import{useState,useMemo}from'react'

const OR='#ff681f'

function stayText(type){
  const now=new Date(),h=now.getHours()
  if(type==='free')return'Until 08:00 tomorrow'
  if(type==='restricted')return'No parking'
  if(type==='paid'){
    if(h>=18)return'Free until 08:00'
    return`Free after 18:30`
  }
  return'Check signs'
}

function nextRestriction(type){
  const now=new Date(),h=now.getHours()
  if(type==='free')return'Pay to park after 08:00 tomorrow'
  if(type==='paid'){
    if(h>=18)return'Pay to park after 08:00 tomorrow'
    return`Pay to park — free from 18:30`
  }
  if(type==='restricted')return'No parking applies at all times'
  return null
}

function distText(seg,center){
  if(!center||!seg.coords?.length)return'Nearby'
  const[lat,lng]=seg.coords[0]
  const R=6371000
  const dLat=(lat-center.lat)*Math.PI/180
  const dLng=(lng-center.lng)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(center.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2
  const dist=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
  if(dist<50)return'<50 m'
  if(dist<1000)return`${Math.round(dist/10)*10} m`
  return`${(dist/1000).toFixed(1)} km`
}

function walkMins(seg,center){
  if(!center||!seg.coords?.length)return null
  const[lat,lng]=seg.coords[0]
  const R=6371000
  const dLat=(lat-center.lat)*Math.PI/180
  const dLng=(lng-center.lng)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(center.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2
  const dist=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
  return Math.max(1,Math.round(dist/84))
}

const SORT_OPTIONS=['Cheapest','Nearest','Longest stay']

export default function ListViewSheet({segments,center,onSelect,onDirections}){
  const[sort,setSort]=useState('Cheapest')
  const[showSort,setShowSort]=useState(false)

  const sorted=useMemo(()=>{
    if(!segments)return[]
    const filtered=segments.filter(s=>!s.isCarPark||s.lat)
    if(sort==='Cheapest')return[...filtered].sort((a,b)=>{
      const order={free:0,paid:1,permit:2,restricted:3}
      return(order[a.type]||0)-(order[b.type]||0)
    })
    if(sort==='Nearest')return[...filtered].sort((a,b)=>{
      const wa=walkMins(a,center)||999
      const wb=walkMins(b,center)||999
      return wa-wb
    })
    if(sort==='Longest stay')return[...filtered].sort((a,b)=>{
      const score={free:3,paid:2,permit:1,restricted:0}
      return(score[b.type]||0)-(score[a.type]||0)
    })
    return filtered
  },[segments,sort,center])

  // Slides up from below the top bar; tab bar (z-index 500) always shows on top
  return(
    <div style={{
      position:'fixed',
      top:'max(110px,calc(env(safe-area-inset-top) + 112px))',
      bottom:0,left:0,right:0,
      background:'#0f0f0f',
      zIndex:380,
      display:'flex',flexDirection:'column',
      borderRadius:'20px 20px 0 0',
      borderTop:'1px solid rgba(255,255,255,.1)',
    }}>
      {/* Handle */}
      <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,.2)',margin:'10px auto 0',flexShrink:0}}/>

      {/* Sort header */}
      <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#141414',borderRadius:'20px 20px 0 0',flexShrink:0}}>
        <button onClick={()=>setShowSort(s=>!s)}
          style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',borderRadius:20,padding:'7px 14px',color:'white',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:14}}>☰</span>
          <span>Sort by <strong>{sort}</strong></span>
        </button>
        <div style={{color:'rgba(255,255,255,.35)',fontSize:13}}>{sorted.length} bays</div>
      </div>

      {/* Sort picker */}
      {showSort&&(
        <div style={{background:'#1a1a1a',borderBottom:'1px solid rgba(255,255,255,.08)',padding:'8px 16px',flexShrink:0}}>
          {SORT_OPTIONS.map(o=>(
            <button key={o} onClick={()=>{setSort(o);setShowSort(false)}}
              style={{width:'100%',background:'none',border:'none',color:sort===o?OR:'rgba(255,255,255,.7)',fontSize:14,padding:'10px 0',cursor:'pointer',textAlign:'left',fontWeight:sort===o?700:400,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              {o}{sort===o&&<span style={{color:OR}}>✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable list — padding-bottom ensures last item clears fixed tab bar */}
      <div style={{flex:1,overflowY:'auto',paddingBottom:'max(72px,calc(env(safe-area-inset-bottom) + 68px))'}}>
        {sorted.map((seg,i)=>{
          const isFree=seg.type==='free'
          const isPaid=seg.type==='paid'
          const isNo=seg.type==='restricted'||seg.type==='no_parking'
          const statusColor=isFree?'#2ECC71':isPaid?'#4A9EFF':isNo?'#888':'#9B59B6'
          const statusBg=isFree?'#1a4a2e':isPaid?'#1a2e4a':isNo?'#2a2a2a':'#2e1a4a'
          const icon=isFree?'✓':isPaid?'£':isNo?'⊘':'P'
          const label=isFree?'Park for free':isPaid?'Pay to park':isNo?'No parking':'Permit'
          const nr=nextRestriction(seg.type)
          const wm=walkMins(seg,center)

          return(
            <div key={seg.id||i}
              onClick={()=>onSelect&&onSelect(seg)}
              style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'flex-start',gap:14,transition:'background .15s',WebkitTapHighlightColor:'rgba(255,255,255,.04)'}}>
              {/* Icon */}
              <div style={{width:46,height:46,borderRadius:13,background:statusBg,border:`1.5px solid ${statusColor}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:statusColor,fontWeight:700,flexShrink:0}}>
                {icon}
              </div>

              {/* Content */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:2}}>
                  <div style={{color:'white',fontSize:15,fontWeight:700}}>{label}</div>
                  <button onClick={e=>{e.stopPropagation();onDirections&&onDirections(seg)}}
                    style={{width:32,height:32,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,.6)',fontSize:16,flexShrink:0}}>
                    🧭
                  </button>
                </div>
                <div style={{color:'rgba(255,255,255,.4)',fontSize:12,marginBottom:4}}>{seg.name||'Parking bay'}</div>
                {nr&&(
                  <div style={{background:isFree?'rgba(46,204,113,.08)':isPaid?'rgba(255,200,0,.08)':'rgba(255,100,50,.08)',borderRadius:8,padding:'3px 8px',fontSize:11,color:isFree?'#2ECC71':isPaid?'#FFD700':'#FF6432',display:'inline-block',marginBottom:4}}>
                    {nr}
                  </div>
                )}
                <div style={{display:'flex',gap:12,marginTop:2}}>
                  <span style={{color:'rgba(255,255,255,.3)',fontSize:11}}>{stayText(seg.type)}</span>
                  {wm&&<span style={{color:'rgba(255,255,255,.3)',fontSize:11}}>🚶 {wm} min</span>}
                </div>
              </div>
            </div>
          )
        })}
        {sorted.length===0&&(
          <div style={{textAlign:'center',color:'rgba(255,255,255,.25)',padding:48,fontSize:14}}>
            No parking found in this area.<br/>Move the map to search nearby.
          </div>
        )}
      </div>
    </div>
  )
}
