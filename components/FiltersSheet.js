'use client'
import{useEffect,useState}from'react'

const DEFAULT_FILTERS={types:['free','paid','carpark','disabled','resident','restricted','loading'],maxWalk:20,blueBadge:false,priceFilter:['free','paid']}
const TYPES=[
  ['free','✓','Free','Green guidance only'],
  ['paid','£','Paid','Paid bays and zones'],
  ['carpark','P','Car parks','Off-street parking'],
  ['disabled','♿','Blue badge','Accessible bays'],
  ['resident','R','Resident','Permit areas'],
  ['loading','L','Loading','Loading guidance'],
  ['restricted','!','Restrictions','No parking warnings'],
]

export default function FiltersSheet({open,onClose,filters,onApply}){
  const[local,setLocal]=useState(filters||DEFAULT_FILTERS)
  useEffect(()=>{if(open)setLocal(filters||DEFAULT_FILTERS)},[open,filters])
  if(!open)return null
  const toggle=id=>setLocal(f=>({...f,types:f.types.includes(id)?f.types.filter(t=>t!==id):[...f.types,id]}))
  const togglePrice=id=>setLocal(f=>({...f,priceFilter:f.priceFilter.includes(id)?f.priceFilter.filter(t=>t!==id):[...f.priceFilter,id]}))
  return(
    <div className="modal-backdrop">
      <button className="modal-scrim" onClick={onClose} aria-label="Close filters"/>
      <div className="premium-sheet open filters-panel">
        <div className="sheet-grabber"/>
        <div className="panel-header static">
          <div><div className="eyebrow">Refine map</div><h2>Filters</h2></div>
          <button className="text-button" onClick={()=>setLocal(DEFAULT_FILTERS)}>Reset</button>
        </div>
        <div className="filter-section">
          <label className="range-label"><span>Walking time</span><strong>{local.maxWalk>=30?'Any':`${local.maxWalk} min`}</strong></label>
          <input type="range" min="4" max="30" step="2" value={local.maxWalk} onChange={e=>setLocal(f=>({...f,maxWalk:+e.target.value}))}/>
        </div>
        <div className="filter-section"><h3>Price</h3><div className="pill-grid two">
          {['free','paid'].map(id=><button key={id} className={`filter-pill ${local.priceFilter.includes(id)?'selected':''}`} onClick={()=>togglePrice(id)}>{id==='free'?'Free':'Paid'}</button>)}
        </div></div>
        <div className="filter-section"><h3>Parking guidance</h3><div className="filter-list">
          {TYPES.map(([id,icon,label,sub])=><button key={id} className={`filter-row ${local.types.includes(id)?'selected':''}`} onClick={()=>toggle(id)}><span>{icon}</span><strong>{label}<small>{sub}</small></strong><em>{local.types.includes(id)?'✓':'+'}</em></button>)}
        </div></div>
        <label className="toggle-row"><span>Blue badge focus<small>Show accessible bays only</small></span><input type="checkbox" checked={local.blueBadge} onChange={e=>setLocal(f=>({...f,blueBadge:e.target.checked}))}/></label>
        <div className="sheet-actions sticky-actions"><button className="secondary-action" onClick={onClose}>Cancel</button><button className="primary-action orange" onClick={()=>{onApply(local);onClose()}}>Apply filters</button></div>
      </div>
    </div>
  )
}
