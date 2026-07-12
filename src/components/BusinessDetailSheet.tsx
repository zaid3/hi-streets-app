import { useEffect, useState } from 'react'
import { BadgeCheck, Globe, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { directionsUrl } from '../lib/newham'
import { fetchBusinessClaimOption, startBusinessClaim } from '../lib/data'
import type { Business, BusinessClaimOption, ClaimMethod, Post, PostType } from '../types'

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
  return <span className="listing-chip hygiene">Hygiene {business.fsa_rating}/5</span>
}

function missingFields(business: Business) {
  const missing: string[] = []
  if (!business.address) missing.push('address')
  if (!business.phone) missing.push('phone')
  if (!business.website) missing.push('website')
  if (!business.opening_hours) missing.push('opening hours')
  return missing
}

function postLabel(type: PostType) {
  if (type === 'offer') return 'Local offer'
  if (type === 'job') return 'Local job'
  if (type === 'free_meal') return 'Free meal'
  return 'Community help'
}

function postEmoji(type: PostType) {
  if (type === 'offer') return '🔥'
  if (type === 'job') return '💼'
  if (type === 'free_meal') return '🍽️'
  return '🤝'
}

function listingStatus(business: Business) {
  if (business.verification_status === 'verified') return 'Verified business'
  if (business.verification_status === 'contested') return 'Ownership under review'
  if (business.verification_status === 'pending') return 'Claim pending'
  return 'Unclaimed listing'
}

function categoryLabel(category?: string | null, name?: string | null) {
  const text = `${category || ''} ${name || ''}`.toLowerCase()
  if (/mcdonald|kfc|burger king|subway|domino|pizza hut|takeaway|fast.?food|chicken|pizza|kebab|burger/.test(text)) return 'Takeaway / fast food'
  if (/cafe|coffee|tea|costa|starbucks|nero/.test(text)) return 'Cafe'
  if (/bakery|greggs|cake|dessert/.test(text)) return 'Bakery'
  if (/restaurant|bar|pub|grill|bistro/.test(text)) return 'Restaurant'
  if (/supermarket|grocery|convenience|off.?licen[cs]e|mini.?market|butcher|greengrocer/.test(text)) return 'Grocery / convenience'
  if (/tailor|tailoring|alteration|sewing/.test(text)) return 'Tailoring'
  if (/hairdresser|barber|beauty|nail|salon|spa/.test(text)) return 'Beauty / barber'
  if (/dentist|dental/.test(text)) return 'Dentist'
  if (/optician|optical|glasses/.test(text)) return 'Optician'
  if (/pharmacy|chemist/.test(text)) return 'Pharmacy'
  if (/clinic|doctor|gp|health|medical|care/.test(text)) return 'Health'
  if (/solicitor|lawyer|legal|immigration/.test(text)) return 'Solicitor / legal'
  if (/accountant|accounting|tax|book.?keeping/.test(text)) return 'Accountant'
  if (/estate agent|real estate|letting|property/.test(text)) return 'Estate agent'
  if (/mechanic|garage|mot|car repair|vehicle|tyre|motorcycle|bike/.test(text)) return 'Mechanic / vehicle service'
  if (/laundry|dry.?clean/.test(text)) return 'Laundry / cleaning'
  if (/church|mosque|temple|place.?of.?worship|charity|community/.test(text)) return 'Community place'
  if (!category) return 'Local business'
  const c = category.replace(/_/g, ' ').trim()
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Local business'
}

export default function BusinessDetailSheet({ business, posts }: { business: Business; posts: Post[] }) {
  const [claimOption, setClaimOption] = useState<BusinessClaimOption | null>(null)
  const [claimLoaded, setClaimLoaded] = useState(false)
  const [claimStatus, setClaimStatus] = useState('')
  const [loadingMethod, setLoadingMethod] = useState<ClaimMethod | null>(null)

  useEffect(() => {
    setClaimLoaded(false)
    fetchBusinessClaimOption(business.id)
      .then(setClaimOption)
      .catch(() => setClaimOption(null))
      .finally(() => setClaimLoaded(true))
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
  const activePosts = posts.filter(p => ['offer', 'job', 'free_meal', 'community'].includes(p.type))
  const isVerified = business.verification_status === 'verified'
  const isClaimed = Boolean(business.is_claimed) || isVerified || business.verification_status === 'contested'
  const canClaim = Boolean(claimOption) && !isVerified && business.verification_status !== 'contested'
  const missing = missingFields(business)

  return (
    <>
      <div className="sheet-handle" />
      {business.photo_url && <img className="business-photo" src={business.photo_url} alt={business.name} />}

      <header className="business-hero">
        <div>
          <p className="eyebrow">{categoryLabel(business.category, business.name)}</p>
          <h2>{business.name}</h2>
          <div className="listing-meta-row">
            <span className={isVerified ? 'status-pill verified' : 'status-pill'}>{isVerified && <BadgeCheck size={14} />} {listingStatus(business)}</span>
            {business.wheelchair && <span className="status-pill soft">♿ Wheelchair: {business.wheelchair}</span>}
          </div>
        </div>
      </header>

      {activePosts.length > 0 ? (
        <section className="business-live-posts" aria-label="Live local posts">
          {activePosts.map(post => (
            <article className={`business-live-card ${post.type}`} key={post.id}>
              <div className="live-post-icon">{postEmoji(post.type)}</div>
              <div>
                <strong>{postLabel(post.type)}</strong>
                <h3>{post.title}</h3>
                <p>{post.body}</p>
                {post.type === 'job' && (post.apply_phone || post.apply_url) && <small>Apply by {post.apply_phone ? 'phone' : 'link'}</small>}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="no-live-posts">
          <strong>No live offers or jobs yet</strong>
          <span>Verified owners can post offers, local jobs, free meals and community help here.</span>
        </div>
      )}

      <section className="business-facts" aria-label="Business information">
        <h3>Contact & visit</h3>
        {business.address ? <p><MapPin size={16} /> <span>{business.address}</span></p> : <p><MapPin size={16} /> <span>Address not available yet</span></p>}
        {business.opening_hours ? <p><ShieldCheck size={16} /> <span>Opening hours: {business.opening_hours}</span></p> : <p><ShieldCheck size={16} /> <span>Opening hours not available yet</span></p>}
        {business.phone ? <p><Phone size={16} /> <a href={`tel:${business.phone}`}>{business.phone}</a></p> : <p><Phone size={16} /> <span>Phone not available yet</span></p>}
        {business.email && <p><Mail size={16} /> <a href={`mailto:${business.email}`}>{business.email}</a></p>}
        {website ? <p><Globe size={16} /> <a href={website} target="_blank" rel="noreferrer">Website</a></p> : <p><Globe size={16} /> <span>Website not available yet</span></p>}
      </section>

      <div className="sheet-actions primary-actions">
        <a href={directionsUrl(business.lat, business.lng)} target="_blank" rel="noreferrer">Directions</a>
        {business.phone && <a href={`tel:${business.phone}`}>Call</a>}
        {website && <a href={website} target="_blank" rel="noreferrer">Website</a>}
      </div>

      <div className="listing-chip-row">
        {business.cuisine && <span className="listing-chip">{business.cuisine}</span>}
        {business.brand && <span className="listing-chip">{business.brand}</span>}
        {fsaBadge(business)}
      </div>

      {missing.length > 0 && <p className="missing-note">Missing: {missing.join(', ')}. The verified owner can complete these details after claiming the listing.</p>}
      {business.fsa_rating_date && business.fsa_rating != null && Number(business.fsa_match_confidence || 0) >= 0.85 && <p className="trust">Food hygiene source: Food Standards Agency · Rated on {new Date(business.fsa_rating_date).toLocaleDateString()}</p>}

      <div className="claim-box compact-claim">
        <h3>{isClaimed ? 'Business ownership' : 'Own this business?'}</h3>
        {isVerified && <p className="muted">This listing is verified. New ownership requests will be treated as contested claims.</p>}
        {business.verification_status === 'contested' && <p className="muted">Ownership is contested. New posts are frozen until admin review.</p>}
        {canClaim && <p className="muted">Claim, verify, complete your profile, then post offers, local jobs, free meals and community help.</p>}
        {canClaim && <p className="muted">Security rule: verification only uses phone/website already stored before the claim starts.</p>}
        {canClaim && claimOption?.can_phone_otp && <button onClick={() => startClaim('phone_otp')} disabled={loadingMethod !== null}>{loadingMethod === 'phone_otp' ? 'Starting…' : 'Verify by existing phone'}</button>}
        {canClaim && claimOption?.website_domain && <button onClick={() => startClaim('website_code')} disabled={loadingMethod !== null}>{loadingMethod === 'website_code' ? 'Starting…' : `Verify website ${claimOption.website_domain}`}</button>}
        {canClaim && claimOption?.website_domain && <button onClick={() => startClaim('domain_email')} disabled={loadingMethod !== null}>{loadingMethod === 'domain_email' ? 'Starting…' : `Verify with @${claimOption.website_domain} email`}</button>}
        {canClaim && <button onClick={() => startClaim('document')} disabled={loadingMethod !== null}>{loadingMethod === 'document' ? 'Starting…' : 'Use document review'}</button>}
        {!claimLoaded && <p className="muted">Checking claim options…</p>}
        {claimLoaded && !canClaim && !isVerified && business.verification_status !== 'contested' && <p className="muted">Document review is available after sign in when no trusted phone or website is present.</p>}
        {claimStatus && <p className="form-status">{claimStatus}</p>}
      </div>
    </>
  )
}