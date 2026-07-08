'use client'
import{useEffect,useState}from'react'

const BLUE='#2547d8'
const TYPES=[
  {id:'carpark',icon:'P',color:'#0b73d9',label:'Car parks',sub:'Pay at location only'},
  {id:'paid',icon:'£',color:'#0b73d9',label:'Pay to park',sub:'Paid bays'},
  {id:'free',icon:'✓',color:'#078d16',label:'Park for free',sub:'Currently free bays'},
  {id:'disabled',icon:'♿',color:'#d65291',label:'Disabled bays',sub:'Blue badge'},
  {id:'ev',icon:'⚡',color:'#29c9b2',label:'EV bays',sub:'Electric charging'},
  {id:'loading',icon:'□',color:'#d69a34',label:'Loading bays',sub:'Loading only'},
  {id:'resident',icon:'⌂',color:'#aaa4c9',label:'Resident bays',sub:'Permit areas'},
  {id:'yellow_single',icon:'—',color:'#f0c327',label:'Single yellow lines',sub:'Time restrictions'},
  {id:'yellow_double',icon:'═',color:'#f0c327',label:'Double yellow lines',sub:'Usually no waiting'},
  {id:'red_route',icon:'⊗',color:'#f05a5a',label:'Red routes',sub:'No stopping'},
  {id:'no_parking',icon:'⊘',color:'#9d9da5',label:'No parking',sub:'Applies at all times'},
]
const initial={types:TYPES.map(t=>t.id),maxWalk:10,blueBadge:false,fuelType:'Petrol',vehicleType:'Car',priceFilter:['free','paid'],logic:['limitedDuration','parkLater']}

export default function FiltersSheet({open,onClose,filters,onApply}){
  const[local,setLocal]=useState(filters||initial)
  useEffect(()=>{if(open)setLocal(filters||initial)},[open,filters])
  function toggle(list,id){return list?.includes(id)?list.filter(x=>x!==id):[...(list||[]),id]}
  if(!open)return null
  return(
    <div style={{position:'absolute',inset:0,zIndex:470,display:'flex',flexDirection:'column'}}>
      <div onClick={onClose} style={{flex:1,background:'rgba(0,0,0,.35)'}}/>
      <div className="bottom-card" style={{position:'relative',boxShadow:'none',borderRadius:'18px 18px 0 0',maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
        <div className="sheet-handle"/>
        <div style={{padding:'0 35px 24px',borderBottom:'1px solid #eeeaf7'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h2 style={{fontSize:31,fontWeight:900,margin:'18px 0'}}>Filters</h2>
            <button onClick={()=>setLocal(initial)} style={{border:0,background:'transparent',fontSize:20,fontWeight:800,color:'#77768a',cursor:'pointer'}}>Reset</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'28px 35px 120px'}}>
          <h3 style={{fontSize:25,fontWeight:900,margin:'0 0 22px'}}>Parking preferences</h3>
          <div style={{display:'grid',gap:22,marginBottom:34}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:21,fontWeight:800}}>
              <span>🚘 Show parking for:</span>
              <span style={{color:BLUE}}>{local.fuelType||'Petrol'}⌄ &nbsp;&nbsp; {local.vehicleType||'Car'}⌄</span>
            </div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:21,fontWeight:800,marginBottom:18}}><span>🚶 Max walking time</span><span style={{color:BLUE}}>{local.maxWalk>=30?'10 mins +':`${local.maxWalk} mins`}</span></div>
              <input type="range" min="2" max="30" step="2" value={local.maxWalk||10} onChange={e=>setLocal(f=>({...f,maxWalk:+e.target.value}))} style={{width:'100%',accentColor:'#33c651'}}/>
            </div>
            <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:21,fontWeight:800,cursor:'pointer'}}>
              <span>♿ Blue badge</span>
              <input type="checkbox" checked={!!local.blueBadge} onChange={e=>setLocal(f=>({...f,blueBadge:e.target.checked}))} style={{width:34,height:34,accentColor:BLUE}}/>
            </label>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',margin:'8px 0 18px'}}>
            <h3 style={{fontSize:25,fontWeight:900,margin:0}}>Price</h3>
            <button onClick={()=>setLocal(f=>({...f,priceFilter:['free','paid']}))} style={{border:0,background:'transparent',fontSize:19,color:'#77768a',fontWeight:800,cursor:'pointer'}}>Reset</button>
          </div>
          {[
            ['free','✓','#078d16','Park for free'],['paid','£','#0b73d9','Pay to park']
          ].map(([id,icon,color,label])=>(
            <label key={id} style={{display:'flex',alignItems:'center',gap:18,padding:'14px 0',fontSize:21,fontWeight:800,cursor:'pointer'}}>
              <span style={{width:38,height:38,borderRadius:99,background:color+'18',color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>{icon}</span>
              <span style={{flex:1}}>{label}</span>
              <input type="checkbox" checked={local.priceFilter?.includes(id)} onChange={()=>setLocal(f=>({...f,priceFilter:toggle(f.priceFilter,id)}))} style={{width:34,height:34,accentColor:BLUE}}/>
            </label>
          ))}
          <h3 style={{fontSize:25,fontWeight:900,margin:'34px 0 14px'}}>Type</h3>
          {TYPES.map(t=>(
            <label key={t.id} style={{display:'flex',alignItems:'center',gap:18,padding:'13px 0',fontSize:21,fontWeight:800,cursor:'pointer'}}>
              <span style={{width:40,height:40,borderRadius:99,background:t.color+'17',color:t.color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>{t.icon}</span>
              <span style={{flex:1}}>{t.label}<small style={{display:'block',fontSize:16,color:'#77768a',fontWeight:700,marginTop:2}}>{t.sub}</small></span>
              <input type="checkbox" checked={local.types?.includes(t.id)} onChange={()=>setLocal(f=>({...f,types:toggle(f.types,t.id)}))} style={{width:34,height:34,accentColor:BLUE}}/>
            </label>
          ))}
          <h3 style={{fontSize:25,fontWeight:900,margin:'34px 0 6px'}}>Enhanced logic</h3>
          <p style={{fontSize:18,color:'#77768a',margin:'0 0 14px'}}>Improve your chances of finding parking.</p>
          {[['limitedDuration','Limited duration parking','At least 80% of your selected duration'],['parkLater','Park later','Parking is possible ≥1hr after selected start time']].map(([id,label,sub])=>(
            <label key={id} style={{display:'flex',alignItems:'center',gap:18,padding:'13px 0',fontSize:21,fontWeight:800,cursor:'pointer'}}>
              <span style={{width:40,height:40,borderRadius:99,background:'#f1efff',display:'flex',alignItems:'center',justifyContent:'center'}}>⏱</span>
              <span style={{flex:1}}>{label}<small style={{display:'block',fontSize:16,color:'#77768a',fontWeight:700,marginTop:2}}>{sub}</small></span>
              <input type="checkbox" checked={local.logic?.includes(id)} onChange={()=>setLocal(f=>({...f,logic:toggle(f.logic,id)}))} style={{width:34,height:34,accentColor:BLUE}}/>
            </label>
          ))}
        </div>
        <div style={{position:'absolute',left:0,right:0,bottom:0,background:'#fff',padding:'18px 35px max(18px,env(safe-area-inset-bottom))',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,borderTop:'1px solid #eeeaf7'}}>
          <button onClick={onClose} className="outline-btn">Cancel</button>
          <button onClick={()=>{onApply(local);onClose()}} className="solid-btn">Apply</button>
        </div>
      </div>
    </div>
  )
}