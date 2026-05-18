'use client'
import{useState}from'react'
const OR='#ff681f'
export default function FiltersSheet({activeFilters,onApply,onClose}){
  const[sel,setSel]=useState(activeFilters||['free','paid','carpark','permit','restricted','loading','offers','segments','carparks','pois'])
  const[vehicle,setVehicle]=useState('petrol')
  const[walkTime,setWalkTime]=useState(10)
  const[blueBadge,setBlueBadge]=useState(false)
  const tog=id=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])

  const CheckRow=({id,icon,label,sub})=>(
    <button onClick={()=>tog(id)} style={{width:'100%',background:'none',border:'none',padding:'13px 0',cursor:'pointer',display:'flex',alignItems:'center',gap:14,color:'#fff',textAlign:'left',borderBottom:'1px solid rgba(255,255,255,.06)'}}>
      <span style={{fontSize:22,width:28,textAlign:'center',flexShrink:0}}>{icon}</span>
      <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{label}</div>{sub&&<div style={{fontSize:12,color:'rgba(255,255,255,.35)',marginTop:1}}>{sub}</div>}</div>
      <div style={{width:22,height:22,background:sel.includes(id)?OR:'rgba(255,255,255,.08)',border:`2px solid ${sel.includes(id)?OR:'rgba(255,255,255,.2)'}`,borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {sel.includes(id)&&<svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
    </button>
  )

  return(
    <div style={{position:'fixed',inset:0,zIndex:1000}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.65)'}}/>
      <div className="slide-up" style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(8,8,8,.99)',backdropFilter:'blur(30px)',borderRadius:'22px 22px 0 0',padding:'16px 20px 0',zIndex:1001,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{width:36,height:4,background:'rgba(255,255,255,.18)',borderRadius:2,margin:'0 auto 16px'}}/>
        <h3 style={{fontSize:18,fontWeight:800,marginBottom:20}}>Filters</h3>

        <div style={{marginBottom:20}}>
          <h4 style={{fontSize:14,fontWeight:700,marginBottom:14,color:'rgba(255,255,255,.7)'}}>Parking preferences</h4>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,paddingBottom:14,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            <span style={{fontSize:22}}>🚗</span>
            <div style={{flex:1,fontSize:14}}>Show parking for:</div>
            <div style={{display:'flex',gap:6}}>
              {['Petrol','EV','Car'].map(v=><button key={v} onClick={()=>setVehicle(v.toLowerCase())} style={{padding:'5px 10px',borderRadius:8,border:`1px solid ${vehicle===v.toLowerCase()?OR:'rgba(255,255,255,.15)'}`,background:vehicle===v.toLowerCase()?OR+'22':'none',color:vehicle===v.toLowerCase()?OR:'rgba(255,255,255,.5)',fontSize:12,fontWeight:600,cursor:'pointer'}}>{v}</button>)}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,paddingBottom:14,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            <span style={{fontSize:22}}>🚶</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14}}>Max walking time</div>
              <input type="range" min="2" max="20" value={walkTime} onChange={e=>setWalkTime(+e.target.value)} style={{width:'100%',marginTop:8,accentColor:OR}}/>
            </div>
            <div style={{fontSize:13,fontWeight:600,color:OR,flexShrink:0}}>{walkTime} mins{walkTime>=20?'+':''}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,paddingBottom:14,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            <span style={{fontSize:22}}>♿</span>
            <div style={{flex:1,fontSize:14}}>Blue badge</div>
            <div onClick={()=>setBlueBadge(b=>!b)} style={{width:44,height:24,background:blueBadge?OR:'rgba(255,255,255,.15)',borderRadius:12,cursor:'pointer',position:'relative',transition:'background .2s'}}>
              <div style={{position:'absolute',top:2,left:blueBadge?22:2,width:20,height:20,background:'white',borderRadius:'50%',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
            </div>
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h4 style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.7)',margin:0}}>Price</h4>
            <button onClick={()=>setSel(s=>[...s.filter(x=>x!=='free'&&x!=='paid'),'free','paid'])} style={{background:'none',border:'none',color:'rgba(255,255,255,.35)',cursor:'pointer',fontSize:12}}>Reset</button>
          </div>
          <CheckRow id="free" icon="✅" label="Park for free"/>
          <CheckRow id="paid" icon="💷" label="Pay to park"/>
        </div>

        <div style={{marginBottom:20}}>
          <h4 style={{fontSize:14,fontWeight:700,marginBottom:14,color:'rgba(255,255,255,.7)'}}>Type</h4>
          <CheckRow id="carpark" icon="🅿️" label="Car parks" sub="Pay at location only"/>
          <CheckRow id="disabled" icon="♿" label="Disabled bays"/>
          <CheckRow id="ev" icon="⚡" label="EV bays"/>
          <CheckRow id="loading" icon="📦" label="Loading bays"/>
          <CheckRow id="permit" icon="🏠" label="Resident bays"/>
          <CheckRow id="yellow_single" icon="━" label="Single yellow lines"/>
          <CheckRow id="yellow_double" icon="══" label="Double yellow lines"/>
          <CheckRow id="red_route" icon="🔴" label="Red routes"/>
          <CheckRow id="restricted" icon="⛔" label="No parking"/>
        </div>

        <div style={{marginBottom:24}}>
          <h4 style={{fontSize:14,fontWeight:700,marginBottom:6,color:'rgba(255,255,255,.7)'}}>Enhanced logic</h4>
          <p style={{fontSize:12,color:'rgba(255,255,255,.35)',marginBottom:14}}>Improve your chances of finding parking</p>
          <CheckRow id="limited" icon="⏱" label="Limited duration parking" sub="At least 80% of your selected duration"/>
          <CheckRow id="park_later" icon="🕐" label="Park later" sub="Parking is possible 1hr+ after selected start time"/>
        </div>

        <div style={{position:'sticky',bottom:0,background:'rgba(8,8,8,.99)',padding:'16px 0 40px',display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,background:'none',border:'1px solid rgba(255,255,255,.15)',borderRadius:14,padding:15,fontSize:15,fontWeight:700,color:'rgba(255,255,255,.7)',cursor:'pointer'}}>Cancel</button>
          <button onClick={()=>{onApply(sel);onClose()}} style={{flex:2,background:'linear-gradient(135deg,'+OR+',#FF8C00)',border:'none',borderRadius:14,padding:15,fontSize:15,fontWeight:700,color:'#fff',cursor:'pointer',boxShadow:'0 4px 20px rgba(255,104,31,.35)'}}>Apply</button>
        </div>
      </div>
    </div>
  )
}
