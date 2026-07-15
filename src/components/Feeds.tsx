import { Briefcase, CalendarClock, HandHeart, Plus, Tag } from 'lucide-react'
import { emptyStateText } from '../lib/data'
import type { Post, PostType } from '../types'

const icon = { offer: Tag, job: Briefcase, free_meal: HandHeart, community: HandHeart }
const titles = { offer: 'Offers', job: 'Jobs in Newham', free_meal: 'Community', community: 'Community' }

type FeedProps = {
  type: PostType | 'community-group'
  posts: Post[]
  onPost?: (type: PostType) => void
}

export function Feed({ type, posts, onPost }: FeedProps) {
  const actualTypes = type === 'community-group' ? ['free_meal', 'community'] : [type]
  const items = posts.filter(p => actualTypes.includes(p.type))
  const emptyKey = type === 'offer' ? 'offers' : type === 'job' ? 'jobs' : 'community'
  return (
    <section className="feed-screen">
      <header className="screen-header">
        <h1>{type === 'community-group' ? 'Community' : titles[type]}</h1>
        <p>{type === 'job' ? 'Youth-friendly and entry-level opportunities are highlighted first.' : 'Everything is reviewed before going live.'}</p>
        {type === 'job' && onPost && <button onClick={() => onPost('job')}><Plus size={17} /> Post a job</button>}
      </header>
      <div className="chip-row"><button className="active">Newest</button><button>Nearest</button><button>Ending soon</button>{type === 'job' && <button>Youth opportunities</button>}</div>
      {items.length === 0 ? <Empty message={emptyStateText[emptyKey]} /> : items.map(post => <PostCard key={post.id} post={post} />)}
    </section>
  )
}

function Empty({ message }: { message: string }) {
  return <div className="empty"><strong>{message}</strong><span>Empty states are intentional. HiStreets does not fake data. Verified businesses can post from the + Post button after claiming their listing.</span></div>
}

function PostCard({ post }: { post: Post }) {
  const Icon = icon[post.type]
  const expires = new Date(post.expires_at)
  return <article className={`post-card ${post.type}`}><div className="post-icon"><Icon size={20} /></div><div><h3>{post.title}</h3><p>{post.body}</p><div className="post-meta"><span>{post.business?.name || 'Verified Newham listing'}</span><span><CalendarClock size={14} /> Ends {Number.isNaN(expires.getTime()) ? 'soon' : expires.toLocaleDateString()}</span></div>{post.type === 'job' && <div className="tags"><span>Newham</span><span>Verified business</span></div>}</div></article>
}
