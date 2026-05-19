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
            <div style={{width:48,height:48,borderRadius:14,background:color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>
              {icon}
            </div>
            <div style={{minWidth:0}}>
              <div style={{color:'white',fontSize:16,fontWeight:700,lineHeight:1.2,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {offer.title}
              </div>
              <div style={{color:'rgba(255,255,255,.5)',fontSize:13}}>{offer.businessName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.1)',border:'none',color:'white',width:32,height:32,borderRadius:50,cursor:'pointer',fontSize:16,flexShrink:0,marginLeft:8}}>✕</button>
        </div>

        {/* Chips */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          <span style={{background:color+'22',color,borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600}}>{offer.discount||offer.shortLabel}</span>
          {tl&&<span style={{background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.6)',borderRadius:20,padding:'4px 12px',fontSize:12}}>⏱ {tl}</span>}
          {offer.source==='whatsapp'&&<span style={{background:'#25D36620',color:'#25D366',borderRadius:20,padding:'4px 12px',fontSize:12}}>via WhatsApp</span>}
        </div>

        {/* Description */}
        <div style={{background:'rgba(255,255,255,.05)',borderRadius:12,padding:'12px 14px',marginBottom:16,color:'rgba(255,255,255,.8)',fontSize:14,lineHeight:1.6}}>
          {offer.description}
        </div>

        {/* Address */}
        {offer.address&&(
          <div style={{color:'rgba(255,255,255,.4)',fontSize:13,marginBottom:16}}>
            📍 {offer.address}
          </div>
        )}

        {/* Actions */}
        <button
          onClick={()=>{
            if(!localStorage.getItem('hs_guest')&&!document.cookie.includes('supabase'))return onLogin?.()
            setClaimed(true)
          }}
          style={{width:'100%',padding:'14px',borderRadius:12,border:'none',background:claimed?'#2ECC71':OR,color:'white',fontSize:16,fontWeight:700,cursor:'pointer',marginBottom:10,transition:'background .2s'}}>
          {claimed?'✓ Offer claimed!':'Claim this offer'}
        </button>

        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>setSaved(s=>!s)}
            style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(255,255,255,.1)',background:saved?'rgba(255,104,31,.15)':'transparent',color:saved?OR:'rgba(255,255,255,.5)',fontSize:14,cursor:'pointer'}}>
            {saved?'♥ Saved':'♡ Save'}
          </button>
          <button onClick={()=>onDirections&&onDirections(offer)}
            style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'rgba(255,255,255,.5)',fontSize:14,cursor:'pointer'}}>
            🧭 Directions
          </button>
          <button onClick={()=>navigator.share?.({title:offer.title,text:offer.description,url:window.location.href})}
            style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'rgba(255,255,255,.5)',fontSize:14,cursor:'pointer'}}>
            ↗ Share
          </button>
        </div>
      </div>
    </div>
  )
}
