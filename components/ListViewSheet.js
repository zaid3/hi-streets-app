'use client'
import{useState}from'react'
import ParkingSheet from'./ParkingSheet.js'
const OR='#ff681f'
export default function ListViewSheet({segments,carParks,onSelect,filters,onFilterChange}){
  const[sort,setSort]=useState('free-first')
  const[selected,setSelected]=useState(null)
  const all=[...segments.map(s=>({...s,itemType:'seg'})),...(carParks||[]).map(c=>({...c,itemType:'cp'}))]
  const sorted=[...all].sort((a,b)=>{
    if(sort==='free-first')return(a.type==='free'?0:a.type==='paid'?1:2)-(b.type==='free'?0:b.type==='paid'?1:2)
    if(sort==='cheapest')return(a.cost||0)-(b.cost||0)
    return 0
  })
  const icons={free:<div style={{width:44,height:44,background:'#2ECC71',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="22" height="18" viewBox="0 0 22 18" fill="none"><path d="M2 9l6 6L20 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>,paid:<div style={{width:44,height:44,background:'#4A9EFF',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{color:'white',fontSize:20,fontWeight:700}}>£</span></div>,restricted:<div style={{width:44,height:44,background:'#888',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" stroke="white" strokeWidth="2" fill="none"/><line x1="4" y1="18" x2="18" y2="4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg></div>,carpark:<div style={{width:44,height:44,background:'#2a5fba',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{color:'white',fontSize:22,fontWeight:900}}>P</span></div>,permit:<div style={{width:44,height:44,background:'#9B59B6',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="22" height="18" viewBox="0 0 22 18" fill="none"><path d="M2 9l6 6L20 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}

  function openDir(item){window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.lat||item.midLat},${item.lng||item.midLng}`,'_blank')}

  return(
    <>
    {selected&&<ParkingSheet item={selected} onClose={()=>setSelected(null)} onReport={()=>{}}/>}
    <div style={{position:'absolute',bottom:0,left:0,right:0,height:'62vh',background:'rgba(8,8,8,.99)',backdropFilter:'blur(30px)',borderTop:'1px solid rgba(255,255,255,.08)',borderRadius:'22px 22px 0 0',zIndex:400,display:'flex',flexDirection:'column'}}>
      <div style={{padding:'14px 20px 0',flexShrink:0}}>
        <div style={{width:36,height:4,background:'rgba(255,255,255,.18)',borderRadius:2,margin:'0 auto 12px'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={()=>setSort(s=>s==='cheapest'?'free-first':'cheapest')}>
            <span style={{fontSize:16,opacity:.4}}>≡</span>
            <span style={{fontSize:14,color:'rgba(255,255,255,.7)'}}>Sort by <strong style={{color:'#fff'}}>{sort==='cheapest'?'Cheapest':'Free first'}</strong></span>
          </div>
          <button onClick={()=>onFilterChange&&onFilterChange(filters)} style={{width:36,height:36,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>⚙️</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'0 0 24px'}}>
        {sorted.map(item=>{
          const isR=item.type==='restricted',ic=icons[item.type]||icons.free
          return(
            <div key={item.id} onClick={()=>{setSelected(item);onSelect&&onSelect(item)}} style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                {ic}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:800,marginBottom:2}}>{item.label}</div>
                      <div style={{fontSize:13,color:'rgba(255,255,255,.5)',marginBottom:6}}>{item.bayType||'Bay'}</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();openDir(item)}} style={{width:36,height:36,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16}}>◆</button>
                  </div>
                  {item.note&&<div style={{display:'inline-block',background:'rgba(255,255,255,.06)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'rgba(255,255,255,.5)',marginBottom:8}}>{item.note}</div>}
                  {item.appliesAllTime&&<div style={{display:'inline-block',background:'rgba(200,50,50,.12)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'rgba(255,160,160,.9)',marginBottom:8}}>Applies at all times</div>}
                  {!isR&&<>
                    <div style={{display:'flex',gap:16}}>
                      {item.maxStay&&<div><span style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>Stay up to </span><span style={{fontSize:13,fontWeight:600}}>{item.maxStay}</span></div>}
                    </div>
                    {item.address&&<div style={{fontSize:12,color:'rgba(255,255,255,.35)',marginTop:4}}>📍 {item.address}</div>}
                  </>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
    </>
  )
}
