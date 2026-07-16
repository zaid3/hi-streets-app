import { useMemo, useState } from 'react'
import { Briefcase, CalendarClock, HandHeart, LocateFixed, MapPin, Tag } from 'lucide-react'
import type { Post, TabKey } from '../types'

function kmDistance(post: Post, point: { lat: number; lng: number } | null) {
  if (!point || typeof post.lat !== 'number' || typeof post.lng !== 'number') return Number.POSITIVE_INFINITY
  return Math.hypot((post.lat - point.lat) * 111, (post.lng - point.lng) * 70)
}

function shortList(posts: Post[], type: 'offer' | 'job' | 'community', point: { lat: number; lng: number } | null) {
  const allowed = type === 'community' ? ['free_meal', 'community'] : [type]
  const filtered = posts.filter(post => allowed.includes(post.type))
  const sorted = point ? [...filtered].sort((a, b) => kmDistance(a, point) - kmDistance(b, point)) : filtered
  return sorted.slice(0, 4)
}

export default function Discover({ posts, onOpenTab }: { posts: Post[]; onOpenTab: (tab: TabKey) => void }) {
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [status, setStatus] = useState('')
  const offers = useMemo(() => shortList(posts, 'offer', point), [posts, point])
  const jobs = useMemo(() => shortList(posts, 'job', point), [posts, point])
  const community = useMemo(() => shortList(posts, 'community', point), [posts, point])

  function useLocation() {
    if (!navigator.geolocation) return setStatus('Location is not available on this browser.')
    setStatus('Finding offers and jobs near you…')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('Showing nearby posts first.')
      },
      err => setStatus(err.code === err.PERMISSION_DENIED ? 'Location permission denied. You can still browse Newham posts.' : 'Could not get location. You can still browse Newham posts.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <section className="discover-screen">
      <header className="discover-hero">
        <div className="discover-badge"><MapPin size={16} /> Newham local marketplace</div>
        <h1>Find nearby offers, jobs and free meals</h1>
        <p>No login needed to browse or apply for jobs. Share your location to see the closest live posts first.</p>
        <button onClick={useLocation}><LocateFixed size={18} /> Show what is near me</button>
        {status && <p className="form-status">{status}</p>}
      </header>

      <div className="discover-grid">
        <DiscoverSection title="Offers near you" icon="offer" posts={offers} empty="No live offers yet." onSeeAll={() => onOpenTab('offers')} point={point} />
        <DiscoverSection title="Jobs you can apply for" icon="job" posts={jobs} empty="No live jobs yet." onSeeAll={() => onOpenTab('jobs')} point={point} />
        <DiscoverSection title="Free meals & community help" icon="community" posts={community} empty="No community posts yet." onSeeAll={() => onOpenTab('community')} point={point} />
      </div>

      <div className="business-entry-card">
        <strong>Are you a Newham business?</strong>
        <span>Register your business, complete your details, then post offers, jobs, free meals or community support from the Business portal.</span>
        <button onClick={() => onOpenTab('profile')}>Open business portal</button>
      </div>
    </section>
  )
}

function DiscoverSection({ title, icon, posts, empty, onSeeAll, point }: { title: string; icon: 'offer' | 'job' | 'community'; posts: Post[]; empty: string; onSeeAll: () => void; point: { lat: number; lng: number } | null }) {
  const Icon = icon === 'job' ? Briefcase : icon === 'community' ? HandHeart : Tag
  return <section className="discover-section"><div className="discover-section-head"><h2><Icon size={19} /> {title}</h2><button onClick={onSeeAll}>See all</button></div>{posts.length === 0 ? <p className="discover-empty">{empty}</p> : posts.map(post => <MiniPost key={post.id} post={post} point={point} />)}</section>
}

function MiniPost({ post, point }: { post: Post; point: { lat: number; lng: number } | null }) {
  const expires = new Date(post.expires_at)
  const distance = kmDistance(post, point)
  return <article className={`discover-post ${post.type}`}><strong>{post.title}</strong><p>{post.body}</p><div className="post-meta"><span>{post.business?.name || 'Approved Newham business'}</span>{Number.isFinite(distance) && <span>{distance.toFixed(1)} km away</span>}<span><CalendarClock size={14} /> Ends {Number.isNaN(expires.getTime()) ? 'soon' : expires.toLocaleDateString()}</span></div>{post.type === 'job' && <small>Apply in app · CV required</small>}</article>
}
