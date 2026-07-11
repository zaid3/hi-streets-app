import { useState } from 'react'
import { Briefcase, CalendarClock, HandHeart, Tag } from 'lucide-react'
import { createPost, emptyStateText } from '../lib/data'
import type { Post, PostType } from '../types'

const icon = { offer: Tag, job: Briefcase, free_meal: HandHeart, community: HandHeart }
const titles = { offer: 'Offers', job: 'Jobs in Newham', free_meal: 'Community', community: 'Community' }

export function Feed({ type, posts }: { type: PostType | 'community-group'; posts: Post[] }) {
  const actualTypes = type === 'community-group' ? ['free_meal', 'community'] : [type]
  const items = posts.filter(p => actualTypes.includes(p.type))
  const emptyKey = type === 'offer' ? 'offers' : type === 'job' ? 'jobs' : 'community'
  return (
    <section className="feed-screen">
      <header className="screen-header"><h1>{type === 'community-group' ? 'Community' : titles[type]}</h1><p>{type === 'job' ? 'Youth-friendly and entry-level opportunities are highlighted first.' : 'Everything is reviewed before going live.'}</p></header>
      <div className="chip-row"><button className="active">Newest</button><button>Nearest</button><button>Ending soon</button>{type === 'job' && <button>Youth opportunities</button>}</div>
      {items.length === 0 ? <Empty message={emptyStateText[emptyKey]} /> : items.map(post => <PostCard key={post.id} post={post} />)}
    </section>
  )
}

function Empty({ message }: { message: string }) { return <div className="empty"><strong>{message}</strong><span>Empty states are intentional. HiStreets does not fake data.</span></div> }

function PostCard({ post }: { post: Post }) {
  const Icon = icon[post.type]
  const expires = new Date(post.expires_at)
  return <article className={`post-card ${post.type}`}><div className="post-icon"><Icon size={20} /></div><div><h3>{post.title}</h3><p>{post.body}</p><div className="post-meta"><span>{post.business?.name || 'Newham'}</span><span><CalendarClock size={14} /> Ends {Number.isNaN(expires.getTime()) ? 'soon' : expires.toLocaleDateString()}</span></div>{post.type === 'job' && <div className="tags"><span>Newham</span><span>No fake jobs</span></div>}</div></article>
}

export function PostForm() {
  const [type, setType] = useState<PostType>('offer')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [expires, setExpires] = useState('')
  const [status, setStatus] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Submitting…')
    try {
      await createPost({ type, title, body, category, expires_at: new Date(expires).toISOString() })
      setStatus('Submitted for review. It will not appear until approved.')
      setTitle(''); setBody(''); setExpires('')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not submit')
    }
  }

  return <form className="post-form" onSubmit={submit}><h2>Post for review</h2><p>Only verified businesses/charities/admins can post. All posts start pending.</p><select value={type} onChange={e => setType(e.target.value as PostType)}><option value="offer">Offer</option><option value="job">Job</option><option value="free_meal">Free meal</option><option value="community">Community support</option></select><input required placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} /><textarea required maxLength={500} placeholder="Description" value={body} onChange={e => setBody(e.target.value)} /><input placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} /><input required type="datetime-local" value={expires} onChange={e => setExpires(e.target.value)} /><button type="submit">Submit for review</button>{status && <p className="form-status">{status}</p>}</form>
}
