'use client'
import{useMemo,useState}from'react'

function point(seg){return{lat:seg.lat||seg.coords?.[0]?.[0],lng:seg.lng||seg.coords?.[0]?.[1]}}
function distanceM(seg,center){
  const p=point(seg)
  if(!p.lat||!p.lng||!center)return 999999
  const R=6371000,dLat=(p.lat-center.lat)*Math.PI/180,dLng=(p.lng-center.lng)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(center.lat*Math.PI/180)*Math.cos(p.lat*Math.PI/180)*Math.sin(dLng/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}
function label(seg){
  if(seg.isCarPark)return['Car park','blue','P']
  if(seg.type==='free')return['Free guidance','green','✓']
  if(seg.type==='paid')return['Paid parking','blue','£']
  if(seg.type==='restricted'||seg.type==='no_parking')return['Restriction warning','red','!']
  return['Check signs','grey','?']
}

export default function ListViewSheet({segments=[],center,onSelect,onDirections,onBack}){
  const[sort,setSort]=useState('nearest')
  const sorted=useMemo(()=>{
    const copy=[...segments]
    if(sort==='free')copy.sort((a,b)=>(a.type==='free'?0:1)-(b.type==='free'?0:1)||distanceM(a,center)-distanceM(b,center))
    else copy.sort((a,b)=>distanceM(a,center)-distanceM(b,center))
    return copy
  },[segments,center,sort])
  return(
    <div className="list-panel">
      <div className="panel-header">
        <button className="round-close" onClick={onBack} aria-label="Close list">←</button>
        <div><div className="eyebrow">Parking nearby</div><h2>{sorted.length} guidance spots</h2></div>
        <select value={sort} onChange={e=>setSort(e.target.value)} className="sort-select"><option value="nearest">Nearest</option><option value="free">Free first</option></select>
      </div>
      <div className="list-scroll">
        {sorted.map(seg=>{
          const [name,tone,icon]=label(seg)
          const dist=distanceM(seg,center)
          return <button className="parking-row" key={seg.id} onClick={()=>onSelect?.(seg)}>
            <span className={`row-icon ${tone}`}>{icon}</span>
            <span className="row-main"><strong>{name}</strong><small>{seg.name||'Parking location'} · {dist<1000?`${Math.round(dist/10)*10}m`:`${(dist/1000).toFixed(1)}km`}</small><em>{seg.source||'unknown'} source · check signs</em></span>
            <span className="row-action" onClick={e=>{e.stopPropagation();onDirections?.(seg)}}>↗</span>
          </button>
        })}
        {!sorted.length&&<div className="empty-state">No parking guidance matches your filters. Try widening filters or moving the map.</div>}
      </div>
    </div>
  )
}
