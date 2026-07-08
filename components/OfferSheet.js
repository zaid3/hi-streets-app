'use client'
import{useState}from'react'
import{getCatIcon,getCatColor}from'../data/mockOffers'
const BLUE='#2547d8',OR='#ff681f'
function timeLeft(exp){if(!exp)return'Live today';const d=new Date(exp)-new Date();if(d<=0)return'Expired';const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000);return h>0?`${h}h ${m}m left`:`${m}m left`}
export default function OfferSheet({offer,onClose,onDirections,onLogin}){
  const[claimed,setClaimed]=useState(false)
  const[saved,setSaved]=useState(false)
  if(!offer)return null
  const color=getCatColor(offer.category)||OR,icon=getCatIcon(offer.category)||'🛍️'
  return(
    <div className="bottom-sheet">
      <div className="sheet-handle"/>
      <div className="card-pad">
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:18}}>
          <div style={{display:'flex',gap:18,alignItems:'center',minWidth:0}}>
            <div className="status-tile" style={{background:color,fontSize:42}}>{icon}</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:32,fontWeight:900,lineHeight:1.05}}>{offer.shortLabel||offer.discount||'Live offer'}</div>
              <div style={{fontSize:22,color:'#77768a',fontWeight:800,marginTop:8}}>{offer.businessName}</div>
              <div className="info-chip" style={{marginTop:14,background:'#fff4df'}}>{timeLeft(offer.expiresAt)}</div>
            </div>
          </div>
          <button className="close-x" onClick={onClose}>×</button>
        </div>
        <div style={{borderTop:'1px solid #eeeaf7',borderBottom:'1px solid #eeeaf7',padding:'28px 0',marginTop:24}}>
          <h3 style={{fontSize:27,fontWeight:900,margin:'0 0 10px'}}>{offer.title}</h3>
          <p style={{fontSize:20,lineHeight:1.45,color:'#39364c',fontWeight:700,margin:0}}>{offer.description}</p>
          {offer.address&&<div style={{fontSize:18,color:'#77768a',fontWeight:800,marginTop:18}}>📍 {offer.address}</div>}
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:18}}>
            {offer.source==='whatsapp'&&<span className="info-chip" style={{background:'#e8fff1',fontSize:16}}>WhatsApp AI verified</span>}
            {offer.googlePlaceId&&<span className="info-chip" style={{background:'#eef2ff',fontSize:16}}>Google place linked</span>}
            {offer.verified&&<span className="info-chip" style={{background:'#e8fff1',fontSize:16}}>Business verified</span>}
          </div>
        </div>
        <div className="stat-grid">
          <div><div className="stat-label">Claim</div><div className="stat-value">{claimed?'Done':'Free'}</div></div>
          <div><div className="stat-label">Source</div><div className="stat-value">{offer.source||'portal'}</div></div>
          <div><div className="stat-label">Status</div><div className="stat-value">Live</div></div>
        </div>
        <button onClick={()=>{if(!localStorage.getItem('hs_guest'))return onLogin?.();setClaimed(true)}} className="solid-btn" style={{width:'100%',marginTop:28,background:claimed?'#078d16':OR,borderColor:claimed?'#078d16':OR}}>{claimed?'✓ Offer claimed':'Claim this offer'}</button>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:14}}>
          <button onClick={()=>setSaved(s=>!s)} className="outline-btn" style={{fontSize:17}}>{saved?'♥ Saved':'♡ Save'}</button>
          <button onClick={()=>onDirections?.(offer)} className="outline-btn" style={{fontSize:17}}>↱ Directions</button>
          <button onClick={()=>navigator.share?.({title:offer.title,text:offer.description,url:location.href})} className="outline-btn" style={{fontSize:17}}>Share</button>
        </div>
        <div style={{fontSize:13,color:'#77768a',lineHeight:1.4,marginTop:16,textAlign:'center'}}>Offers are shown from verified local businesses or demo seed data. Always check the terms in store.</div>
      </div>
    </div>
  )
}