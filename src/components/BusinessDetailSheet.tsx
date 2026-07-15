import { BadgeCheck, Globe, Mail, MapPin, Phone, ShieldCheck, Tag } from 'lucide-react'
import { directionsUrl } from '../lib/newham'
import type { Business, Post, PostType } from '../types'

function cleanWebsite(url?: string | null) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
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

function smartCategoryLabel(business: Business) {
  const text = `${business.category || ''} ${business.name || ''}`.toLowerCase()
  if (/mcdonald|kfc|burger king|subway|domino|pizza hut|takeaway|fast.?food|chicken|pizza|kebab|burger/.test(text)) return 'Takeaway / fast food'
  if (/restaurant|grill|diner|bistro/.test(text)) return 'Restaurant'
  if (/cafe|coffee|tea/.test(text)) return 'Cafe'
  if (/pharmacy|chemist|boots/.test(text)) return 'Pharmacy'
  if (/dentist|dental/.test(text)) return 'Dentist'
  if (/optician|optical/.test(text)) return 'Optician'
  if (/solicitor|lawyer|legal|immigration/.test(text)) return 'Solicitor / legal'
  if (/accountant|accounting|tax|book.?keeping/.test(text)) return 'Accountant'
  if (/mechanic|garage|mot|car repair|tyre|motorcycle/.test(text)) return 'Mechanic / vehicle'
  if (/tailor|tailoring|alteration|sewing/.test(text)) return 'Tailoring'
  if (/hair|barber|beauty|nail|salon/.test(text)) return 'Beauty / barber'
  if (/church|mosque|temple|place.?of.?worship|charity|community/.test(text)) return 'Community place'
  if (!business.category) return 'Local business'
  const c = business.category.replace(/_/g, ' ').trim()
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Local business'
}

export default function BusinessDetailSheet({ business, posts }: { business: Business; posts: Post[] }) {
  const website = cleanWebsite(business.website)
  const activePosts = posts.filter(p => ['offer', 'job', 'free_meal', 'community'].includes(p.type))
  const missing = missingFields(business)
  const missingCriticalContact = !business.phone || !business.opening_hours

  return (
    <>
      <div className="sheet-handle" />
      {business.photo_url && <img className="business-photo" src={business.photo_url} alt={business.name} />}

      <header className="business-hero">
        <div>
          <p className="eyebrow">{smartCategoryLabel(business)}</p>
          <h2>{business.name}</h2>
          <div className="listing-meta-row">
            <span className="status-pill verified"><BadgeCheck size={14} /> Approved business</span>
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
                {post.type === 'job' && (post.apply_phone || post.apply_url) && <small>Apply by {post.apply_phone ? 'phone/WhatsApp' : 'link'}</small>}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="no-live-posts">
          <strong>No live offers or jobs yet</strong>
          <span>Approved owners can post offers, local jobs, free meals and community help here.</span>
        </div>
      )}

      <section className="business-facts" aria-label="Business information">
        <h3>Contact & visit</h3>
        {missingCriticalContact && <div className="critical-missing"><strong>Important details missing</strong><span>The approved owner or admin can complete phone number and opening hours from Profile.</span></div>}
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
        {business.cuisine && <span className="listing-chip"><Tag size={12} /> {business.cuisine}</span>}
        {business.brand && <span className="listing-chip">{business.brand}</span>}
        {fsaBadge(business)}
      </div>

      {missing.length > 0 && <p className="missing-note">Missing: {missing.join(', ')}. The approved owner can complete these details in Profile.</p>}
      {business.fsa_rating_date && business.fsa_rating != null && Number(business.fsa_match_confidence || 0) >= 0.85 && <p className="trust">Food hygiene source: Food Standards Agency · Rated on {new Date(business.fsa_rating_date).toLocaleDateString()}</p>}
    </>
  )
}
