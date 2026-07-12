import { useEffect, useState } from 'react'
import { BadgeCheck, Globe, Mail, MapPin, Phone, ShieldCheck, Tag } from 'lucide-react'
import { directionsUrl } from '../lib/newham'
import { fetchBusinessClaimOption, startBusinessClaim } from '../lib/data'
import type { Business, BusinessClaimOption, ClaimMethod, Post } from '../types'

function cleanWebsite(url?: string | null) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function methodLabel(method: ClaimMethod) {
  if (method === 'phone_otp') return 'Phone verification'
  if (method === 'domain_email') return 'Domain email'
  if (method === 'website_code') return 'Website code'
  return 'Document review'
}

function fsaBadge(business: Business) {
  if (business.fsa_rating == null || Number(business.fsa_match_confidence || 0) < 0.85) return null
  return <span className="trust-badge hygiene">Hygiene {business.fsa_rating}/5</span>
}

export default function BusinessDetailSheet({ business, posts }: { business: Business; posts: Post[] }) {
  const [claimOption, setClaimOption] = useState<BusinessClaimOption | null>(null)
  const [claimStatus, setClaimStatus] = useState('')
  const [loadingMethod, setLoadingMethod] = useState<ClaimMethod | null>(null)

  useEffect(() => {
    fetchBusinessClaimOption(business.id).then(setClaimOption)
  }, [business.id])

  async function startClaim(method: ClaimMethod) {
    try {
      setLoadingMethod(method)
      setClaimStatus(`Starting ${methodLabel(method)}…`)
      await startBusinessClaim(business.id, method)
      if (method === 'phone_otp') setClaimStatus('Phone verification claim started. OTP delivery will activate after SMS/WhatsApp provider is configured.')
      else if (method === 'website_code') setClaimStatus('Website-code claim started. Code-checker will be connected in the next step.')
      else if (method === 'domain_email') setClaimStatus('Domain email claim started. Magic-link sending will be connected in the next step.')
      else setClaimStatus('Document review claim started. Upload screen is the next build step.')
    } catch (error) {
      setClaimStatus(error instanceof Error ? error.message : 'Could not start claim')
    } finally {
      setLoadingMethod(null)
    }
  }

  const website = cleanWebsite(business.website)
  const offers = posts.filter(p => p.type === 'offer')
  const jobs = posts.filter(p => p.type === 'job')
  const isVerified = business.verification_status === 'verified'
  const isClaimed = Boolean(business.is_claimed) || isVerified || business.verification_status === 'contested'
  const canClaim = claimOption && !isVerified && business.verification_status !== 'contested'

  return (
    <>
      <div className="sheet-handle" />
      {business.photo_url && <img className="business-photo" src={business.photo_url} alt={business.name} />}
      <div className="business-title-row">
        <h2>{business.name}</h2>
        {isVerified && <span className="verified-badge"><BadgeCheck size={16} /> Verified</span>}
      </div>

      <div className="business-chip-row">
        <span className="trust-badge">{business.category}</span>
        {business.cuisine && <span className="trust-badge">{business.cuisine}</span>}
        {business.brand && <span className="trust-badge">{business.brand}</span>}
        {business.wheelchair && <span className="trust-badge">Wheelchair: {business.wheelchair}</span>}
        {fsaBadge(business)}
      </div>

      {business.address && <p className="business-info"><MapPin size={16} /> {business.address}</p>}
      {business.opening_hours && <p className="business-info"><ShieldCheck size={16} /> Opening hours: {business.opening_hours}</p>}
      {business.phone && <p className="business-info"><Phone size={16} /> <a href={`tel:${business.phone}`}>{business.phone}</a></p>}
      {business.email && <p className="business-info"><Mail size={16} /> <a href={`mailto:${business.email}`}>{business.email}</a></p>}
      {website && <p className="business-info"><Globe size={16} /> <a href={website} target="_blank" rel="noreferrer">Website</a></p>}
      {business.fsa_rating_date && business.fsa_rating != null && Number(business.fsa_match_confidence || 0) >= 0.85 && <p className="trust">Food hygiene source: Food Standards Agency · Rated on {new Date(business.fsa_rating_date).toLocaleDateString()}</p>}

      {offers.map(p => <article className="mini-card" key={p.id}><Tag size={16} /> <strong>{p.title}</strong><span>{p.body}</span></article>)}
      {jobs.map(p => <article className="mini-card" key={p.id}><Tag size={16} /> <strong>{p.title}</strong><span>{p.body}</span></article>)}

      <div className="sheet-actions wrap">
        <a href={directionsUrl(business.lat, business.lng)} target="_blank" rel="noreferrer">Open in Google Maps</a>
        {business.phone && <a href={`tel:${business.phone}`}>Call</a>}
        {website && <a href={website} target="_blank" rel="noreferrer">Website</a>}
      </div>

      <div className="claim-box">
        <h3>{isClaimed ? 'Business ownership' : 'Claim this business'}</h3>
        {isVerified && <p className="muted">This listing is verified. New ownership requests will be treated as contested claims.</p>}
        {business.verification_status === 'contested' && <p className="muted">Ownership is contested. New posts are frozen until admin review.</p>}
        {canClaim && <p className="muted">Verification only uses phone/website already stored before the claim starts. You cannot add your own number to verify someone else’s business.</p>}
        {canClaim && claimOption?.can_phone_otp && <button onClick={() => startClaim('phone_otp')} disabled={loadingMethod !== null}>{loadingMethod === 'phone_otp' ? 'Starting…' : 'Verify by existing phone'}</button>}
        {canClaim && claimOption?.website_domain && <button onClick={() => startClaim('website_code')} disabled={loadingMethod !== null}>{loadingMethod === 'website_code' ? 'Starting…' : `Verify website ${claimOption.website_domain}`}</button>}
        {canClaim && claimOption?.website_domain && <button onClick={() => startClaim('domain_email')} disabled={loadingMethod !== null}>{loadingMethod === 'domain_email' ? 'Starting…' : `Verify with @${claimOption.website_domain} email`}</button>}
        {canClaim && <button onClick={() => startClaim('document')} disabled={loadingMethod !== null}>{loadingMethod === 'document' ? 'Starting…' : 'Use document review'}</button>}
        {!claimOption && <p className="muted">Loading claim options…</p>}
        {claimStatus && <p className="form-status">{claimStatus}</p>}
      </div>
    </>
  )
}
