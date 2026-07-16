import { useEffect, useState } from 'react'
import { BarChart3, CheckCircle2, FileText, Store, XCircle } from 'lucide-react'
import { getCurrentRole, loadSuperAdminBusinesses, loadSuperAdminOverview, loadSuperAdminPosts } from '../lib/data'
import { supabase } from '../lib/supabase'
import type { Role, SuperAdminBusinessRow, SuperAdminOverview, SuperAdminPostRow } from '../types'

export default function AdminPanel() {
  const [role, setRole] = useState<Role | null>(null)
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null)
  const [pendingPosts, setPendingPosts] = useState<SuperAdminPostRow[]>([])
  const [pendingBusinesses, setPendingBusinesses] = useState<SuperAdminBusinessRow[]>([])
  const [latestPosts, setLatestPosts] = useState<SuperAdminPostRow[]>([])
  const [latestBusinesses, setLatestBusinesses] = useState<SuperAdminBusinessRow[]>([])
  const [message, setMessage] = useState('Loading Super Admin dashboard…')

  async function load() {
    try {
      const currentRole = await getCurrentRole()
      setRole(currentRole)
      if (currentRole !== 'admin' && currentRole !== 'super_admin') {
        setMessage('')
        return
      }
      const [overviewRow, pendingBizRows, pendingPostRows, latestBizRows, latestPostRows] = await Promise.all([
        loadSuperAdminOverview(),
        loadSuperAdminBusinesses('pending'),
        loadSuperAdminPosts('pending'),
        loadSuperAdminBusinesses(),
        loadSuperAdminPosts(),
      ])
      setOverview(overviewRow)
      setPendingBusinesses(pendingBizRows)
      setPendingPosts(pendingPostRows)
      setLatestBusinesses(latestBizRows)
      setLatestPosts(latestPostRows)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load Super Admin dashboard.')
    }
  }

  useEffect(() => { load() }, [])

  async function moderatePost(id: string, status: 'live' | 'rejected') {
    if (!supabase) return
    const { error } = await supabase.rpc('admin_moderate_post', { p_post_id: id, p_status: status })
    if (error) return setMessage(error.message)
    await load()
    setMessage(status === 'live' ? 'Post approved.' : 'Post rejected.')
  }

  async function moderateBusiness(id: string, status: 'verified' | 'rejected') {
    if (!supabase) return
    const { error } = await supabase.rpc('admin_moderate_business_registration', { p_business_id: id, p_status: status })
    if (error) return setMessage(error.message)
    await load()
    setMessage(status === 'verified' ? 'Business approved and visible publicly.' : 'Business rejected.')
  }

  if (role !== 'admin' && role !== 'super_admin') return null

  return <div className="privacy-card super-admin-panel">
    <h2><BarChart3 size={20} /> {role === 'super_admin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}</h2>
    <p className="muted">See approvals, live content and recent activity in one place. Verified businesses can auto-publish safe posts; risky posts appear here.</p>
    {message && <p className="form-status">{message}</p>}

    {overview && <div className="admin-stat-grid">
      <div><strong>{overview.pending_businesses}</strong><span>Pending businesses</span></div>
      <div><strong>{overview.verified_businesses}</strong><span>Verified businesses</span></div>
      <div><strong>{overview.live_posts}</strong><span>Live posts</span></div>
      <div><strong>{overview.pending_posts}</strong><span>Pending posts</span></div>
      <div><strong>{overview.job_applications}</strong><span>Job applications</span></div>
      <div><strong>{overview.total_businesses}</strong><span>Total registered</span></div>
    </div>}

    <h3><Store size={17} /> Business approvals</h3>
    {pendingBusinesses.length === 0 ? <p className="muted">No pending business registrations.</p> : pendingBusinesses.map(business => <article className="post-card" key={business.id}><div><Store size={20} /></div><div><h3>{business.name}</h3><p>{business.category} · {business.address}</p>{business.phone && <p>{business.phone}</p>}{business.website && <p>{business.website}</p>}{business.email && <p>{business.email}</p>}<div className="tags"><span>{business.verification_status}</span><span>{business.source || 'registration'}</span></div><div className="sheet-actions"><button onClick={() => moderateBusiness(business.id, 'verified')}><CheckCircle2 size={18} /> Approve business</button><button onClick={() => moderateBusiness(business.id, 'rejected')} className="danger"><XCircle size={18} /> Reject</button></div></div></article>)}

    <h3><FileText size={17} /> Posts needing review</h3>
    {pendingPosts.length === 0 ? <p className="muted">No risky or incomplete posts waiting for review.</p> : pendingPosts.map(post => <article className="post-card" key={post.id}><div><strong>{post.type}</strong></div><div><h3>{post.title}</h3><p>{post.body}</p><p className="muted">{post.business_name || 'Business'}</p><div className="sheet-actions"><button onClick={() => moderatePost(post.id, 'live')}><CheckCircle2 size={18} /> Approve post</button><button onClick={() => moderatePost(post.id, 'rejected')} className="danger"><XCircle size={18} /> Reject</button></div></div></article>)}

    <h3>Latest registered businesses</h3>
    {latestBusinesses.slice(0, 8).map(business => <div className="admin-row" key={business.id}><strong>{business.name}</strong><span>{business.verification_status} · {business.category}</span></div>)}

    <h3>Latest posts</h3>
    {latestPosts.slice(0, 8).map(post => <div className="admin-row" key={post.id}><strong>{post.title}</strong><span>{post.status} · {post.type} · {post.business_name || 'Business'}</span></div>)}
  </div>
}