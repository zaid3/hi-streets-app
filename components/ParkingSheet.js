'use client'
import{useState}from'react'

const OR='#ff681f'

function Timeline({hours}){
  const slots=[]
  for(let h=6;h<=22;h++){
    const isPaid=h>=8&&h<18
    slots.push(
      <div key={h} style={{flex:1,height:8,background:isPaid?'#4A9EFF':'#2ECC71',opacity:.85,borderRadius:1}}/>
    )
  }
  const now=new Date()
  const pct=((now.getHours()-6)/(22-6))*100
  return(
    <div style={{position:'relative',marginTop:8}}>
      <div style={{display:'flex',gap:1,borderRadius:4,overflow:'hidden'}}>{slots}</div>
      <div style={{position:'absolute',top:-4,bottom:-4,width:3,background:'white',borderRadius:2,left:`${Math.min(98,Math.max(0,pct))}%`,boxShadow:'0 0 6px rgba(0,0,0,.4)'}}/>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,color:'rgba(255,255,255,.4)'}}>
        <span>6am</span><span>12pm</span><span>6pm</span><span>10pm</span>
      </div>
    </div>
  )
}

export default function ParkingSheet({segment,onClose,onDirections}){
  const[reported,setReported]=useState(false)
  if(!segment)return null

  const isFree=segment.type==='free'
  const isPaid=segment.type==='paid'
  const isPermit=segment.type==='permit'
  const isRestricted=segment.type==='restricted'
  const isCarPark=segment.isCarPark

  const statusColor=isFree?'#2ECC71':isPaid?'#4A9EFF':isPermit?'#9B59B6':isRestricted?'#888':'#2a5fba'
  const statusIcon=isFree?'✓':isPaid?'£':isPermit?'P':isRestricted?'⊘':'P'
  const statusText=isFree?'Free parking':isPaid?'Paid parking':isPermit?'Permit only':isRestricted?'No parking':'Car park'

  return(
    <div className={`bottom-sheet open`}>
      <div className="sheet-handle"/>
      <div style={{padding:'16px 20px 32px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:statusColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'white',fontWeight:700}}>
              {statusIcon}
            </div>
            <div>
              <div style={{color:'white',fontSize:16,fontWeight:600}}>{statusText}</div>
              <div style={{color:'rgba(255,255,255,.5)',fontSize:13}}>{segment.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.1)',border:'none',color:'white',width:32,height:32,borderRadius:50,cursor:'pointer',fontSize:16}}>✕</button>
        </div>

        {/* Restriction chip */}
        <div style={{background:'rgba(255,255,255,.07)',borderRadius:8,padding:'8px 12px',marginBottom:16,fontSize:13,color:'rgba(255,255,255,.7)',borderLeft:`3px solid ${statusColor}`}}>
          {segment.restriction}
        </div>

        {/* Grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
          {[
            ['Hours',segment.hours||'Any time'],
            ['Stay up to',segment.maxStay||'No limit'],
            [isPaid?'Payment':'Status',isPaid?'Pay & display':statusText],
            ['No return',isCarPark?'N/A':'1 hour'],
          ].map(([l,v])=>(
            <div key={l} style={{background:'rgba(255,255,255,.05)',borderRadius:8,padding:'10px 12px'}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:3}}>{l}</div>
              <div style={{color:'white',fontSize:13,fontWeight:500}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div style={{background:'rgba(255,255,255,.05)',borderRadius:8,padding:'10px 12px',marginBottom:16}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:4}}>Today's schedule</div>
          <Timeline hours={segment.hours}/>
          <div style={{display:'flex',gap:12,marginTop:8,fontSize:11}}>
            <span style={{color:'#2ECC71'}}>● Free</span>
            <span style={{color:'#4A9EFF'}}>● Paid</span>
          </div>
        </div>

        {/* Directions */}
        <button onClick={()=>onDirections&&onDirections(segment)}
          style={{width:'100%',padding:'14px',borderRadius:12,border:'none',background:OR,color:'white',fontSize:16,fontWeight:600,cursor:'pointer',marginBottom:10}}>
          Get directions
        </button>

        {/* Report */}
        <button onClick={()=>setReported(true)}
          style={{width:'100%',padding:'12px',borderRadius:12,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'rgba(255,255,255,.5)',fontSize:13,cursor:'pointer'}}>
          {reported?'✓ Thanks for reporting':'Data wrong? Report it'}
        </button>
      </div>
    </div>
  )
}
