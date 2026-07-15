import { useMemo, useState } from 'react'
import { Briefcase, CalendarClock, HandHeart, LocateFixed, Plus, Send, Tag } from 'lucide-react'
import { emptyStateText, submitJobApplication } from '../lib/data'
import type { Post, PostType } from '../types'

const icon = { offer: Tag, job: Briefcase, free_meal: HandHeart, community: HandHeart }
const titles = { offer: 'Offers near you', job: 'Jobs in Newham', free_meal: 'Community', community: 'Community' }

type FeedProps = {
  type: PostType | 'community-group'
  posts: Post[]
  onPost?: (type: PostType) => void
}

function kmDistance(post: Post, point: { lat: number; lng: number } | null) {
  if (!point || typeof post.lat !== 'number' || typeof post.lng !== 'number') return Number.POSITIVE_INFINITY
  return Math.hypot((post.lat - point.lat) * 111, (post.lng - point.lng) * 70)
}

export function Feed({ type, posts, onPost }: FeedProps) {
  const [userPoint, setUserPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState('')
  const [applyingPost, setApplyingPost] = useState<Post | null>(null)
  const actualTypes = type === 'community-group' ? ['free_meal', 'community'] : [type]
  const emptyKey = type === 'offer' ? 'offers' : type === 'job' ? 'jobs' : 'community'
  const items = useMemo(() => {
    const filtered = posts.filter(p => actualTypes.includes(p.type))
    if (!userPoint) return filtered
    return [...filtered].sort((a, b) => kmDistance(a, userPoint) - kmDistance(b, userPoint))
  }, [posts, type, userPoint])

  function useLocation() {
    if (!navigator.geolocation) return setLocationStatus('Location is not supported on this browser.')
    setLocationStatus('Finding nearby posts…')
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserPoint({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocationStatus('Showing nearest first.')
      },
      error => setLocationStatus(error.code === error.PERMISSION_DENIED ? 'Location permission denied.' : 'Could not get location.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <section className="feed-screen">
      <header className="screen-header">
        <h1>{type === 'community-group' ? 'Community' : titles[type]}</h1>
        <p>{type === 'job' ? 'Simple local jobs from approved Newham businesses. Apply without sign-up. CV is required.' : type === 'offer' ? 'Allow location to show the nearest offers first.' : 'Free meals and community support from approved local businesses.'}</p>
        <div className="sheet-actions">
          {(type === 'offer' || type === 'job') && <button onClick={useLocation}><LocateFixed size={17} /> Use my location</button>}
          {type === 'job' && onPost && <button onClick={() => onPost('job')}><Plus size={17} /> Post a job</button>}
          {type === 'offer' && onPost && <button onClick={() => onPost('offer')}><Plus size={17} /> Post an offer</button>}
          {type === 'community-group' && onPost && <><button onClick={() => onPost('free_meal')}><Plus size={17} /> Post free meal</button><button onClick={() => onPost('community')}><Plus size={17} /> Post support</button></>}
        </div>
        {locationStatus && <p className="form-status">{locationStatus}</p>}
      </header>
      <div className="chip-row"><button className={!userPoint ? 'active' : ''}>Newest</button><button className={userPoint ? 'active' : ''}>Nearest</button><button>Ending soon</button>{type === 'job' && <button>Easy apply</button>}</div>
      {items.length === 0 ? <Empty message={emptyStateText[emptyKey]} /> : items.map(post => <PostCard key={post.id} post={post} distance={userPoint ? kmDistance(post, userPoint) : null} onApply={setApplyingPost} />)}
      {applyingPost && <JobApplySheet post={applyingPost} onClose={() => setApplyingPost(null)} />}
    </section>
  )
}

function Empty({ message }: { message: string }) {
  return <div className="empty"><strong>{message}</strong><span>HiStreets does not show random unconfirmed businesses. Businesses register, admin approves, then they can post.</span></div>
}

function PostCard({ post, distance, onApply }: { post: Post; distance: number | null; onApply: (post: Post) => void }) {
  const Icon = icon[post.type]
  const expires = new Date(post.expires_at)
  return <article className={`post-card ${post.type}`}><div className="post-icon"><Icon size={20} /></div><div><h3>{post.title}</h3><p>{post.body}</p><div className="post-meta"><span>{post.business?.name || 'Approved Newham business'}</span>{Number.isFinite(distance) && <span>{distance!.toFixed(1)} km away</span>}<span><CalendarClock size={14} /> Ends {Number.isNaN(expires.getTime()) ? 'soon' : expires.toLocaleDateString()}</span></div>{post.type === 'job' && <><div className="tags"><span>Newham</span><span>Easy apply</span><span>CV required</span></div><button onClick={() => onApply(post)}><Send size={17} /> Apply in app</button></>}</div></article>
}

function JobApplySheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [coverNote, setCoverNote] = useState('')
  const [cv, setCv] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    try {
      setSubmitting(true)
      setStatus('Submitting application…')
      if (!cv) throw new Error('CV is mandatory')
      await submitJobApplication({
        post_id: post.id,
        applicant_name: name,
        applicant_email: email,
        applicant_phone: phone,
        cover_note: coverNote,
        cv_file: cv,
      })
      setStatus('Application submitted. The business will review your details and CV.')
      setTimeout(onClose, 1000)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const disabled = submitting || !name.trim() || !email.trim() || !phone.trim() || !cv

  return <div className="bottom-sheet"><button className="sheet-close" onClick={onClose}>×</button><div className="sheet-handle" /><h2>Apply for this job</h2><p className="muted">No sign-up needed. Fill your details and upload your CV. CV is mandatory.</p><div className="no-live-posts"><strong>{post.title}</strong><span>{post.business?.name || 'Approved Newham business'}</span></div><label>Your full name<input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Phone or WhatsApp<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your contact number" /></label><label>Short note<textarea value={coverNote} onChange={e => setCoverNote(e.target.value)} placeholder="Optional: your availability or short message" /></label><label>Upload CV<input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required onChange={e => setCv(e.target.files?.[0] || null)} /></label><button onClick={submit} disabled={disabled}><Send size={17} /> {submitting ? 'Submitting…' : 'Submit application'}</button>{status && <p className="form-status">{status}</p>}</div>
}
