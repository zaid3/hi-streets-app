import { useEffect, useState } from 'react'
import { CheckCircle2, Store, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type PendingPost = { id: string; type: string; title: string; body: string; category?: string | null; created_at?: string }
type PendingBusiness = { id: string; name: string; category: string; address?: string | null; phone?: string | null; website?: string | null; email?: string | null; registration_note?: string | null; created_at?: string }

export default function AdminPanel() {
  const [role, setRole] = useState<string>('user')
  const [posts, setPosts] = useState<PendingPost[]>([])
  const [businesses, setBusinesses] = useState<PendingBusiness[]>([])
  const [message, setMessage] = useState('')

  async function load() {
    if (!supabase) return
    const roleRes = await supabase.rpc('current_user_role')
    setRole(roleRes.data || 'user')
    if (roleRes.data !== 'admin') return

    const postsRes = await supabase.from('posts').select('id,type,title,body,category,created_at').eq('status', 'pending').order('created_at', { ascending: true }).limit(50)
    if (postsRes.error) setMessage(postsRes.error.message)
    else setPosts(postsRes.data || [])

    const businessRes = await supabase.from('businesses').select('id,name,category,address,phone,website,email,registration_note,created_at').eq('verification_status', 'pending').order('created_at', { ascending: true }).limit(50)
    if (businessRes.error) setMessage(businessRes.error.message)
    else setBusinesses(businessRes.data || [])
  }

  useEffect(() => { load() }, [])

  async function moderatePost(id: string, status: 'live' | 'rejected') {
    if (!supabase) return
    const { error } = await supabase.rpc('admin_moderate_post', { p_post_id: id, p_status: status })
    if (error) return setMessage(error.message)
    setPosts(list => list.filter(p => p.id !== id))
  }

  async function moderateBusiness(id: string, status: 'verified' | 'rejected') {
    if (!supabase) return
    const { error } = await supabase.rpc('admin_moderate_business_registration', { p_business_id: id, p_status: status })
    if (error) return setMessage(error.message)
    setBusinesses(list => list.filter(b => b.id !== id))
    setMessage(status === 'verified' ? 'Business approved and visible publicly.' : 'Business rejected.')
  }

  if (role !== 'admin') return null

  return <div className="privacy-card"><h2>Admin moderation</h2><p>Approve real business registrations and pending posts before they appear publicly.</p>{message && <p className="form-status">{message}</p>}
    <h3><Store size={17} /> Pending business registrations</h3>
    {businesses.length === 0 ? <p className="muted">No pending business registrations.</p> : businesses.map(business => <article className="post-card" key={business.id}><div><Store size={20} /></div><div><h3>{business.name}</h3><p>{business.category} · {business.address}</p>{business.phone && <p>{business.phone}</p>}{business.website && <p>{business.website}</p>}{business.email && <p>{business.email}</p>}{business.registration_note && <p className="missing-note">{business.registration_note}</p>}<div className="sheet-actions"><button onClick={() => moderateBusiness(business.id, 'verified')}><CheckCircle2 size={18} /> Approve business</button><button onClick={() => moderateBusiness(business.id, 'rejected')} className="danger"><XCircle size={18} /> Reject</button></div></div></article>)}
    <h3>Pending posts</h3>
    {posts.length === 0 ? <p className="muted">No pending posts.</p> : posts.map(post => <article className="post-card" key={post.id}><div><strong>{post.type}</strong></div><div><h3>{post.title}</h3><p>{post.body}</p><div className="sheet-actions"><button onClick={() => moderatePost(post.id, 'live')}><CheckCircle2 size={18} /> Approve post</button><button onClick={() => moderatePost(post.id, 'rejected')} className="danger"><XCircle size={18} /> Reject</button></div></div></article>)}
  </div>
}
