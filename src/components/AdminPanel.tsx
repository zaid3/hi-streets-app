import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type PendingPost = { id: string; type: string; title: string; body: string; category?: string | null; created_at?: string }

export default function AdminPanel() {
  const [role, setRole] = useState<string>('user')
  const [posts, setPosts] = useState<PendingPost[]>([])
  const [message, setMessage] = useState('')

  async function load() {
    if (!supabase) return
    const roleRes = await supabase.rpc('current_user_role')
    setRole(roleRes.data || 'user')
    if (roleRes.data !== 'admin') return
    const { data, error } = await supabase.from('posts').select('id,type,title,body,category,created_at').eq('status', 'pending').order('created_at', { ascending: true }).limit(50)
    if (error) setMessage(error.message)
    else setPosts(data || [])
  }

  useEffect(() => { load() }, [])

  async function moderate(id: string, status: 'live' | 'rejected') {
    if (!supabase) return
    const { error } = await supabase.rpc('admin_moderate_post', { p_post_id: id, p_status: status })
    if (error) return setMessage(error.message)
    setPosts(list => list.filter(p => p.id !== id))
  }

  if (role !== 'admin') return null

  return <div className="privacy-card"><h2>Admin moderation</h2><p>Pending posts must be approved before they appear publicly.</p>{message && <p className="form-status">{message}</p>}{posts.length === 0 ? <p className="muted">No pending posts.</p> : posts.map(post => <article className="post-card" key={post.id}><div><strong>{post.type}</strong></div><div><h3>{post.title}</h3><p>{post.body}</p><div className="sheet-actions"><button onClick={() => moderate(post.id, 'live')}><CheckCircle2 size={18} /> Approve</button><button onClick={() => moderate(post.id, 'rejected')} className="danger"><XCircle size={18} /> Reject</button></div></div></article>)}</div>
}
