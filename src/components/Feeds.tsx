import { useMemo, useState } from 'react'
import { Briefcase, CalendarClock, HandHeart, LocateFixed, Plus, Tag } from 'lucide-react'
import { emptyStateText } from '../lib/data'
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
        <p>{type === 'job' ? 'Simple local jobs from approved Newham businesses.' : type === 'offer' ? 'Allow location to show the nearest offers first.' : 'Everything is reviewed before going live.'}</p>
        <div className="sheet-actions">
          {(type === 'offer' || type === 'job') && <button onClick={useLocation}><LocateFixed size={17} /> Use my location</button>}
          {type === 'job' && onPost && <button onClick={() => onPost('job')}><Plus size={17} /> Post a job</button>}
          {type === 'offer' && onPost && <button onClick={() => onPost('offer')}><Plus size={17} /> Post an offer</button>}
        </div>
        {locationStatus && <p className="form-status">{locationStatus}</p>}
      </header>
      <div className="chip-row"><button className={!userPoint ? 'active' : ''}>Newest</button><button className={userPoint ? 'active' : ''}>Nearest</button><button>Ending soon</button>{type === 'job' && <button>Youth opportunities</button>}</div>
      {items.length === 0 ? <Empty message={emptyStateText[emptyKey]} /> : items.map(post => <PostCard key={post.id} post={post} distance={userPoint ? kmDistance(post, userPoint) : null} />)}
    </section>
  )
}

function Empty({ message }: { message: string }) {
  return <div className="empty"><strong>{message}</strong><span>HiStreets does not show random unconfirmed businesses. Businesses register, admin approves, then they can post.</span></div>
}

function PostCard({ post, distance }: { post: Post; distance: number | null }) {
  const Icon = icon[post.type]
  const expires = new Date(post.expires_at)
  return <article className={`post-card ${post.type}`}><div className="post-icon"><Icon size={20} /></div><div><h3>{post.title}</h3><p>{post.body}</p><div className="post-meta"><span>{post.business?.name || 'Approved Newham business'}</span>{Number.isFinite(distance) && <span>{distance!.toFixed(1)} km away</span>}<span><CalendarClock size={14} /> Ends {Number.isNaN(expires.getTime()) ? 'soon' : expires.toLocaleDateString()}</span></div>{post.type === 'job' && <div className="tags"><span>Newham</span><span>Easy apply</span>{post.apply_phone && <span>Phone/WhatsApp</span>}{post.apply_url && <span>Apply link</span>}</div>}</div></article>
}
