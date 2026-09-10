import { useMemo, useState } from 'react'
import { Briefcase, CalendarClock, HandHeart, LocateFixed, MapPin, Send, Tag } from 'lucide-react'
import { emptyStateText, submitJobApplication } from '../lib/data'
import { getReliableUserPosition, locationErrorMessage } from '../lib/geolocation'
import { directionsUrl } from '../lib/newham'
import type { Post, PostType } from '../types'

const icon = { offer: Tag, job: Briefcase, free_meal: HandHeart, community: HandHeart }
const titles = { offer: 'Offers near you', job: 'Jobs in Newham', free_meal: 'Community', community: 'Community' }
type SortMode = 'newest' | 'nearest' | 'ending'

type FeedProps = {
  type: PostType | 'community-group'
  posts: Post[]
}

function kmDistance(post: Post, point: { lat: number; lng: number } | null) {
  if (!point || typeof post.lat !== 'number' || typeof post.lng !== 'number') return Number.POSITIVE_INFINITY
  return Math.hypot((post.lat - point.lat) * 111, (post.lng - point.lng) * 70)
}

function dateValue(value?: string | null) {
  const time = value ? new Date(value).getTime() : Number.POSITIVE_INFINITY
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY
}

export function Feed({ type, posts }: FeedProps) {
  const [userPoint, setUserPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState('')
  const [locating, setLocating] = useState(false)
  const [applyingPost, setApplyingPost] = useState<Post | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const actualTypes: PostType[] = type === 'community-group' ? ['free_meal', 'community'] : [type]
  const emptyKey = type === 'offer' ? 'offers' : type === 'job' ? 'jobs' : 'community'
  const items = useMemo(() => {
    let filtered = posts.filter(p => actualTypes.includes(p.type))
    if (sortMode === 'ending') filtered = [...filtered].sort((a, b) => dateValue(a.expires_at) - dateValue(b.expires_at))
    if (sortMode === 'nearest') filtered = [...filtered].sort((a, b) => kmDistance(a, userPoint) - kmDistance(b, userPoint))
    return filtered
  }, [posts, type, userPoint, sortMode])

  async function useLocation(nextMode: SortMode = 'nearest') {
    if (locating) return
    setSortMode(nextMode)
    setLocating(true)
    setLocationStatus('Finding nearby posts…')
    try {
      const position = await getReliableUserPosition()
      setUserPoint({ lat: position.coords.latitude, lng: position.coords.longitude })
      setLocationStatus('Showing nearest first.')
    } catch (error) {
      setLocationStatus(locationErrorMessage(error, 'Could not get location. You can still browse all Newham posts.'))
    } finally {
      setLocating(false)
    }
  }

  return (
    <section className="feed-screen">
      <header className="screen-header">
        <h1>{type === 'community-group' ? 'Community' : titles[type]}</h1>
        <p>{type === 'job' ? 'Find local jobs and apply without creating an account. Each employer states whether a CV is needed.' : type === 'offer' ? 'Use your location to show the nearest offers first.' : 'Find free meals and community support near you.'}</p>
        <div className="sheet-actions">
          <button type="button" onClick={() => useLocation('nearest')} disabled={locating}><LocateFixed size={17} /> {locating ? 'Finding…' : 'Use my location'}</button>
        </div>
        {locationStatus && <p className="form-status" role="status" aria-live="polite">{locationStatus}</p>}
      </header>
      <div className="chip-row">
        <button type="button" onClick={() => setSortMode('newest')} className={sortMode === 'newest' ? 'active' : ''}>Newest</button>
        <button type="button" onClick={() => useLocation('nearest')} disabled={locating} className={sortMode === 'nearest' ? 'active' : ''}>Nearest</button>
        <button type="button" onClick={() => setSortMode('ending')} className={sortMode === 'ending' ? 'active' : ''}>Ending soon</button>
      </div>
      {items.length === 0 ? <Empty message={emptyStateText[emptyKey]} /> : items.map(post => <PostCard key={post.id} post={post} distance={userPoint ? kmDistance(post, userPoint) : null} onApply={setApplyingPost} />)}
      {applyingPost && <JobApplySheet post={applyingPost} onClose={() => setApplyingPost(null)} />}
    </section>
  )
}

function Empty({ message }: { message: string }) {
  return <div className="empty"><strong>{message}</strong><span>Check the map, try another tab, or come back later.</span></div>
}

function PostCard({ post, distance, onApply }: { post: Post; distance: number | null; onApply: (post: Post) => void }) {
  const Icon = icon[post.type]
  const expires = new Date(post.expires_at)
  const details = post.details || {}
  const cvRequired = details.cv_required !== false
  const destination = [post.business?.name, post.business?.address || 'Newham London'].filter(Boolean).join(', ')
  return <article className={`post-card ${post.type}`}><div className="post-icon"><Icon size={20} /></div><div><h3>{post.title}</h3><p>{post.body}</p><div className="post-meta"><span>{post.business?.name || 'Newham business'}</span>{Number.isFinite(distance) && <span>{distance!.toFixed(1)} km away</span>}<span><CalendarClock size={14} /> Ends {Number.isNaN(expires.getTime()) ? 'soon' : expires.toLocaleDateString()}</span></div><div className="tags">{post.type === 'job' && <><span>{details.pay || 'Pay not stated'}</span>{details.hours && <span>{details.hours}</span>}{details.employment_type && <span>{details.employment_type}</span>}{details.workplace && <span>{details.workplace}</span>}<span>{cvRequired ? 'CV required' : 'CV optional'}</span></>}{post.type === 'offer' && <>{details.original_price && <span>Was {details.original_price}</span>}{details.offer_price && <span>Now {details.offer_price}</span>}{details.redemption && <span>{details.redemption}</span>}</>}{(post.type === 'community' || post.type === 'free_meal') && <>{details.cost && <span>{details.cost}</span>}{details.schedule && <span>{details.schedule}</span>}</>}</div>{post.type === 'job' ? <div className="post-actions"><button type="button" onClick={() => onApply(post)}><Send size={17} /> Apply in HiStreets</button>{post.apply_url && <a href={post.apply_url} target="_blank" rel="noreferrer">External application</a>}</div> : typeof post.lat === 'number' && typeof post.lng === 'number' ? <div className="post-actions"><a href={directionsUrl(post.lat, post.lng, destination)} target="_blank" rel="noreferrer"><MapPin size={16} /> Directions</a></div> : null}</div></article>
}

function JobApplySheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [coverNote, setCoverNote] = useState('')
  const [cv, setCv] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const cvRequired = post.details?.cv_required !== false

  async function submit() {
    try {
      setSubmitting(true)
      setStatus('Checking application…')
      if (name.trim().length < 2) throw new Error('Enter your full name')
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) throw new Error('Enter a valid email address')
      if (phone.replace(/\D/g, '').length < 6) throw new Error('Enter a valid phone or WhatsApp number')
      if (cvRequired && !cv) throw new Error('CV is required for this job')
      if (cv && cv.size > 10 * 1024 * 1024) throw new Error('CV must be under 10MB')
      const ext = cv?.name.split('.').pop()?.toLowerCase()
      if (cv && (!ext || !['pdf', 'doc', 'docx'].includes(ext))) throw new Error('CV must be PDF, DOC or DOCX')
      setStatus('Submitting application…')
      await submitJobApplication({
        post_id: post.id,
        applicant_name: name,
        applicant_email: email,
        applicant_phone: phone,
        cover_note: coverNote,
        cv_file: cv,
      })
      setStatus('Application submitted. The business will contact you directly if they move forward.')
      window.setTimeout(onClose, 1800)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const disabled = submitting || !name.trim() || !email.trim() || !phone.trim() || (cvRequired && !cv)

  return <div className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="job-apply-title"><button type="button" className="sheet-close" onClick={onClose} aria-label="Close job application">×</button><div className="sheet-handle" /><h2 id="job-apply-title">Apply for this job</h2><p className="muted">No account needed. Add your contact details{cvRequired ? ' and CV' : ''}. The business will contact you directly if shortlisted.</p><div className="no-live-posts"><strong>{post.title}</strong><span>{post.business?.name || 'Newham business'}</span></div><label>Your full name<input value={name} maxLength={120} autoComplete="name" onChange={e => setName(e.target.value)} placeholder="Your name" /></label><label>Email<input type="email" value={email} maxLength={160} autoComplete="email" onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Phone or WhatsApp<input value={phone} maxLength={50} autoComplete="tel" onChange={e => setPhone(e.target.value)} placeholder="Your contact number" /></label><label>Short note<textarea value={coverNote} maxLength={1500} onChange={e => setCoverNote(e.target.value)} placeholder="Optional: your availability or short message" /></label><label>{cvRequired ? 'Upload CV' : 'Upload CV (optional)'}<input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required={cvRequired} onChange={e => setCv(e.target.files?.[0] || null)} /></label><button type="button" onClick={submit} disabled={disabled}><Send size={17} /> {submitting ? 'Submitting…' : 'Submit application'}</button>{status && <p className="form-status" role="status" aria-live="polite">{status}</p>}</div>
}
