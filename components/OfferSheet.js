'use client'
import{useState}from'react'
import{getCatIcon,getCatColor}from'../data/mockOffers'

const OR='#ff681f'

function timeLeft(exp){
  if(!exp)return''
  const diff=new Date(exp)-new Date()
  if(diff<=0)return'Expired'
  const h=Math.floor(diff/3600000)
  const m=Math.floor((diff%3600000)/60000)
  if(h>=24)return`${Math.floor(h/24)}d left`
  if(h>0)return`${h}h ${m}m left`
  return`${m}m left`
}

export default function OfferSheet({offer,onClose,onDirections,onLogin}){
  const[claimed,setClaimed]=useState(false)
  const[saved,setSaved]=useState(false)
  if(!offer)return null

  const color=getCatColor(offer.category)
  const icon=getCatIcon(offer.category)
  const tl=timeLeft(offer.expiresAt)

  return(
    <div className="bottom-sheet open">
      <div className="sheet-handle"/>
      <div style={{padding:'16px 20px',paddingBottom:'max(80px,calc(env(safe-area-inset-bottom) + 72px))'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
            <div style={{width:48,height:48,borderRadius:14,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0,border:`1px solid ${color}25`}}>
              {icon}
            </div>
            <div style={{minWidth:0}}>
              <div style={{color:'#111',fontSize:16,fontWeight:700,lineHeight:1.2,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {offer.title}
              </div>
              <div style={{color:'rgba(0,0,0,.45)',fontSize:13}}>{offer.businessName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:'#f0f0f0',border:'none',color:'#666',width:32,height:32,borderRadius:50,cursor:'pointer',fontSize:16,flexShrink:0,marginLeft:8,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* Chips */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          <span style={{background:color+'18',color,borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600,border:`1px solid ${color}25`}}>{offer.discount||offer.shortLabel}</span>
          {tl&&<span style={{background:'#f5f5f5',color:'rgba(0,0,0,.5)',borderRadius:20,padding:'4px 12px',fontSize:12}}>⏱ {tl}</span>}
          {offer.source==='whatsapp'&&<span style={{background:'#25D36615',color:'#25D366',borderRadius:20,padding:'4px 12px',fontSize:12}}>via WhatsApp</span>}
        </div>

        {/* Description */}
        <div style={{background:'#f8f8f8',borderRadius:12,padding:'12px 14px',marginBottom:16,color:'rgba(0,0,0,.75)',fontSize:14,lineHeight:1.6}}>
          {offer.description}
        </div>

        {/* Address */}
        {offer.address&&(
          <div style={{color:'rgba(0,0,0,.4)',fontSize:13,marginBottom:16}}>
            📍 {offer.address}
          </div>
        )}

        {/* Claim */}
        <button
          onClick={()=>{
            if(!localStorage.getItem('hs_guest')&&!document.cookie.includes('supabase'))return onLogin?.()
            setClaimed(true)
          }}
          style={{width:'100%',padding:'15px',borderRadius:14,border:'none',background:claimed?'#2ECC71':OR,color:'white',fontSize:16,fontWeight:700,cursor:'pointer',marginBottom:10,transition:'background .2s',boxShadow:`0 4px 14px ${claimed?'rgba(46,204,113,.35)':OR+'50'}`}}>
          {claimed?'✓ Offer claimed!':'Claim this offer'}
        </button>

        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>setSaved(s=>!s)}
            style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(0,0,0,.1)',background:saved?'rgba(255,104,31,.08)':'white',color:saved?OR:'rgba(0,0,0,.5)',fontSize:14,cursor:'pointer',fontWeight:saved?600:400}}>
            {saved?'♥ Saved':'♡ Save'}
          </button>
          <button onClick={()=>onDirections&&onDirections(offer)}
            style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(0,0,0,.1)',background:'white',color:'rgba(0,0,0,.5)',fontSize:14,cursor:'pointer'}}>
            🧭 Directions
          </button>
          <button onClick={()=>navigator.share?.({title:offer.title,text:offer.description,url:window.location.href})}
            style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(0,0,0,.1)',background:'white',color:'rgba(0,0,0,.5)',fontSize:14,cursor:'pointer'}}>
            ↗ Share
          </button>
        </div>
      </div>
    </div>
  )
}
