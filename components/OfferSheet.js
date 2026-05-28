'use client'
import{useState}from'react'
import{getCatIcon}from'../data/mockOffers'

function timeLeft(exp){
  if(!exp)return''
  const diff=new Date(exp)-new Date()
  if(diff<=0)return'Expired'
  const h=Math.floor(diff/3600000)
  const m=Math.floor((diff%3600000)/60000)
  if(h>=24)return`${Math.floor(h/24)}d left`
  if(h>0)return`${h}h ${m}m left`
  return`${Math.max(1,m)}m left`
}

export default function OfferSheet({offer,onClose,onDirections}){
  const[claimed,setClaimed]=useState(false)
  if(!offer)return null
  const icon=getCatIcon(offer.category)
  const tl=timeLeft(offer.expiresAt)
  return(
    <div className="premium-sheet open offer-detail-sheet">
      <div className="sheet-grabber"/>
      <div className="sheet-topline">
        <div className="sheet-icon orange">{icon}</div>
        <div className="sheet-title-block">
          <div className="eyebrow">Live local offer</div>
          <h2>{offer.businessName||'Local business'}</h2>
          <p>{offer.category||'Business'}{offer.address?` · ${offer.address}`:''}</p>
        </div>
        <button className="round-close" onClick={onClose} aria-label="Close offer details">✕</button>
      </div>

      <div className="offer-hero-card">
        <span>{offer.shortLabel||offer.discount||'Offer'}</span>
        <strong>{offer.title||'Live offer'}</strong>
        {offer.description&&<p>{offer.description}</p>}
      </div>

      <div className="detail-grid two">
        <div><span>Expires</span><strong>{tl||'Check in store'}</strong></div>
        <div><span>Source</span><strong>{offer.source||'business'}</strong></div>
      </div>

      <div className="sheet-actions">
        <button className="primary-action orange" onClick={()=>setClaimed(true)}>{claimed?'Claim saved':'Claim offer'}</button>
        <button className="secondary-action" onClick={()=>onDirections?.(offer)}>Directions</button>
        <button className="secondary-action" onClick={()=>navigator.share?.({title:offer.title||offer.businessName,text:offer.description||offer.shortLabel,url:window.location.href})}>Share</button>
      </div>
    </div>
  )
}
