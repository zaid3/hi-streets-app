'use client'
import{useState}from'react'

const OR='#ff681f'

const BAY_TYPES=[
  {id:'free',icon:'✓',color:'#2ECC71',label:'Park for free',sub:'Free bays only'},
  {id:'paid',icon:'£',color:'#4A9EFF',label:'Pay to park',sub:'Paid bays'},
  {id:'carpark',icon:'P',color:'#2a5fba',label:'Car parks',sub:'Off-street'},
  {id:'disabled',icon:'♿',color:'#9B59B6',label:'Disabled bays',sub:'Blue badge'},
  {id:'ev',icon:'⚡',color:'#27AE60',label:'EV charging',sub:'Electric vehicles'},
  {id:'loading',icon:'📦',color:'#E67E22',label:'Loading bays',sub:'Commercial loading'},
  {id:'resident',icon:'🏠',color:'#8E44AD',label:'Resident bays',sub:'Permit holders'},
  {id:'yellow_single',icon:'—',color:'#F1C40F',label:'Single yellow',sub:'Time restrictions'},
  {id:'yellow_double',icon:'═',color:'#F39C12',label:'Double yellow',sub:'No waiting'},
  {id:'red_route',icon:'🚫',color:'#E74C3C',label:'Red routes',sub:'No stopping'},
  {id:'no_parking',icon:'⊘',color:'#aaa',label:'No parking',sub:'Applies at all times'},
]

export default function FiltersSheet({open,onClose,filters,onApply}){
  const[local,setLocal]=useState(filters||{
    types:['free','paid','carpark','disabled','ev','resident'],
    maxWalk:10,blueBadge:false,fuelType:'Petrol',vehicleType:'Car',priceFilter:['free','paid'],
  })

  function toggleType(id){
    setLocal(f=>({...f,types:f.types.includes(id)?f.types.filter(t=>t!==id):[...f.types,id]}))
  }

  if(!open)return null

  const RESET={types:['free','paid','carpark','disabled','ev','resident'],maxWalk:10,blueBadge:false,fuelType:'Petrol',vehicleType:'Car',priceFilter:['free','paid']}

  return(
    <div style={{position:'fixed',inset:0,zIndex:450,display:'flex',flexDirection:'column'}}>
      <div onClick={onClose} style={{flex:1,background:'rgba(0,0,0,.4)'}}/>

      <div style={{background:'white',borderRadius:'20px 20px 0 0',border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 -4px 32px rgba(0,0,0,.10)',maxHeight:'88dvh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'10px 20px 0',flexShrink:0}}>
          <div style={{width:36,height:4,background:'rgba(0,0,0,.12)',borderRadius:2,margin:'0 auto 14px'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{color:'#111',fontSize:18,fontWeight:700}}>Filters</div>
            <button onClick={()=>setLocal(RESET)} style={{background:'none',border:'none',color:OR,fontSize:13,cursor:'pointer',fontWeight:600}}>Reset all</button>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'0 20px'}}>

          {/* Vehicle type */}
          <div style={{marginBottom:20}}>
            <div style={{color:'rgba(0,0,0,.4)',fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',marginBottom:12}}>Parking preferences</div>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              {[['🔋','EV'],['⛽','Petrol'],['🚗','Car'],['🏍','Motorbike']].map(([icon,label])=>(
                <button key={label} onClick={()=>setLocal(f=>({...f,fuelType:label}))}
                  style={{flex:1,padding:'8px 4px',borderRadius:10,border:`1.5px solid ${local.fuelType===label?OR:'rgba(0,0,0,.1)'}`,background:local.fuelType===label?'rgba(255,104,31,.08)':'#f8f8f8',color:local.fuelType===label?OR:'rgba(0,0,0,.5)',fontSize:11,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,fontWeight:500}}>
                  <span style={{fontSize:16}}>{icon}</span>{label}
                </button>
              ))}
            </div>

            {/* Walking time */}
            <div style={{background:'#f8f8f8',borderRadius:12,padding:'12px 14px',marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <div style={{color:'#111',fontSize:13,fontWeight:500}}>🚶 Max walking time</div>
                <div style={{color:OR,fontSize:13,fontWeight:600}}>{local.maxWalk>=30?'Any':`${local.maxWalk} mins`}</div>
              </div>
              <input type="range" min={2} max={30} step={2} value={local.maxWalk}
                onChange={e=>setLocal(f=>({...f,maxWalk:+e.target.value}))}
                style={{width:'100%',accentColor:OR}}/>
            </div>

            {/* Blue badge */}
            <div style={{background:'#f8f8f8',borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18}}>♿</span>
                <div>
                  <div style={{color:'#111',fontSize:13,fontWeight:500}}>Blue badge</div>
                  <div style={{color:'rgba(0,0,0,.35)',fontSize:11}}>Show disabled bays</div>
                </div>
              </div>
              <div onClick={()=>setLocal(f=>({...f,blueBadge:!f.blueBadge}))}
                style={{width:46,height:26,borderRadius:13,background:local.blueBadge?OR:'rgba(0,0,0,.15)',cursor:'pointer',position:'relative',transition:'background .2s'}}>
                <div style={{position:'absolute',top:3,left:local.blueBadge?22:3,width:20,height:20,borderRadius:50,background:'white',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.25)'}}/>
              </div>
            </div>
          </div>

          {/* Price */}
          <div style={{marginBottom:20}}>
            <div style={{color:'rgba(0,0,0,.4)',fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',marginBottom:12}}>Price</div>
            <div style={{display:'flex',gap:10}}>
              {[['free','✓','#2ECC71','Free'],['paid','£','#4A9EFF','Paid']].map(([id,icon,color,label])=>(
                <button key={id} onClick={()=>setLocal(f=>({...f,priceFilter:f.priceFilter.includes(id)?f.priceFilter.filter(x=>x!==id):[...f.priceFilter,id]}))}
                  style={{flex:1,padding:'12px',borderRadius:12,border:`1.5px solid ${local.priceFilter.includes(id)?color:'rgba(0,0,0,.1)'}`,background:local.priceFilter.includes(id)?color+'15':'#f8f8f8',color:local.priceFilter.includes(id)?color:'rgba(0,0,0,.5)',cursor:'pointer',display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600}}>
                  <span style={{width:24,height:24,borderRadius:50,background:local.priceFilter.includes(id)?color:'rgba(0,0,0,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'white'}}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Bay types */}
          <div style={{marginBottom:32}}>
            <div style={{color:'rgba(0,0,0,.4)',fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',marginBottom:12}}>Bay types</div>
            <div style={{display:'flex',flexDirection:'column',gap:2}}>
              {BAY_TYPES.map(t=>(
                <button key={t.id} onClick={()=>toggleType(t.id)}
                  style={{width:'100%',background:'#f8f8f8',border:'none',borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',marginBottom:2}}>
                  <div style={{width:28,height:28,borderRadius:8,background:t.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:t.color,fontWeight:700,flexShrink:0,border:`1px solid ${t.color}30`}}>
                    {t.icon}
                  </div>
                  <div style={{flex:1,textAlign:'left'}}>
                    <div style={{color:'#111',fontSize:13,fontWeight:500}}>{t.label}</div>
                    <div style={{color:'rgba(0,0,0,.35)',fontSize:11}}>{t.sub}</div>
                  </div>
                  <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${local.types.includes(t.id)?OR:'rgba(0,0,0,.15)'}`,background:local.types.includes(t.id)?OR:'white',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13,flexShrink:0}}>
                    {local.types.includes(t.id)&&'✓'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Apply */}
        <div style={{padding:'16px 20px',paddingBottom:'max(20px,env(safe-area-inset-bottom))',borderTop:'1px solid rgba(0,0,0,.07)',display:'flex',gap:12,background:'white',flexShrink:0}}>
          <button onClick={onClose}
            style={{flex:1,padding:'15px',borderRadius:14,border:'1px solid rgba(0,0,0,.12)',background:'white',color:'rgba(0,0,0,.6)',fontSize:16,cursor:'pointer',fontWeight:500}}>
            Cancel
          </button>
          <button onClick={()=>{onApply(local);onClose()}}
            style={{flex:2,padding:'15px',borderRadius:14,border:'none',background:OR,color:'white',fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:`0 4px 14px ${OR}50`}}>
            Apply filters
          </button>
        </div>
      </div>
    </div>
  )
}
