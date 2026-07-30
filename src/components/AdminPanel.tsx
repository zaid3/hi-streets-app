import { useEffect, useState } from 'react'
import { BarChart3, Camera, CheckCircle2, FileText, Store, XCircle } from 'lucide-react'
import { deleteBusinessVerificationEvidence, getBusinessEvidenceSignedUrl, getCurrentRole, loadBusinessVerificationEvidence, loadSuperAdminBusinesses, loadSuperAdminOverview, loadSuperAdminPosts } from '../lib/data'
import { supabase } from '../lib/supabase'
import type { BusinessVerificationEvidence, Role, SuperAdminBusinessRow, SuperAdminOverview, SuperAdminPostRow } from '../types'

export default function AdminPanel() {
  const [role, setRole] = useState<Role | null>(null)
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null)
  const [pendingPosts, setPendingPosts] = useState<SuperAdminPostRow[]>([])
  const [pendingBusinesses, setPendingBusinesses] = useState<SuperAdminBusinessRow[]>([])
  const [latestPosts, setLatestPosts] = useState<SuperAdminPostRow[]>([])
  const [latestBusinesses, setLatestBusinesses] = useState<SuperAdminBusinessRow[]>([])
  const [evidenceByBusiness, setEvidenceByBusiness] = useState<Record<string, BusinessVerificationEvidence[]>>({})
  const [evidenceLoading, setEvidenceLoading] = useState('')
  const [message, setMessage] = useState('Loading dashboard…')
  const [actionId, setActionId] = useState('')

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
      setMessage(error instanceof Error ? error.message : 'Could not load admin dashboard.')
    }
  }

  useEffect(() => { void load() }, [])

  async function reviewEvidence(businessId: string) {
    if (evidenceLoading) return
    try {
      setEvidenceLoading(businessId)
      setMessage('Loading private verification evidence…')
      const rows = await loadBusinessVerificationEvidence(businessId)
      setEvidenceByBusiness(prev => ({ ...prev, [businessId]: rows }))
      setMessage(rows.length ? 'Private evidence loaded. Open the photo you need to review.' : 'No verification photos were submitted for this business.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load verification evidence.')
    } finally {
      setEvidenceLoading('')
    }
  }

  async function openEvidence(item: BusinessVerificationEvidence) {
    const popup = window.open('', '_blank')
    if (popup) popup.opener = null
    try {
      setMessage('Opening verification evidence securely…')
      const url = await getBusinessEvidenceSignedUrl(item.storage_path)
      if (popup) popup.location.href = url
      else window.location.assign(url)
      setMessage('')
    } catch (error) {
      popup?.close()
      setMessage(error instanceof Error ? error.message : 'Could not open verification evidence.')
    }
  }

  async function moderatePost(id: string, status: 'live' | 'rejected') {
    if (!supabase || actionId) return
    if (status === 'rejected' && !window.confirm('Reject this post?')) return
    setActionId(id)
    const { error } = await supabase.rpc('admin_moderate_post', { p_post_id: id, p_status: status })
    if (error) {
      setMessage(error.message)
      setActionId('')
      return
    }
    await load()
    setActionId('')
    setMessage(status === 'live' ? 'Post approved.' : 'Post rejected.')
  }

  async function moderateBusiness(id: string, status: 'verified' | 'rejected') {
    if (!supabase || actionId) return
    if (status === 'rejected' && !window.confirm('Reject this business registration? Verification evidence will be deleted after the decision.')) return
    setActionId(id)
    setMessage(status === 'verified' ? 'Approving business…' : 'Rejecting business…')
    const { error } = await supabase.rpc('admin_moderate_business_registration', { p_business_id: id, p_status: status })
    if (error) {
      setMessage(error.message)
      setActionId('')
      return
    }

    let cleanupFailed = false
    try {
      await deleteBusinessVerificationEvidence(id)
      setEvidenceByBusiness(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch {
      cleanupFailed = true
    }

    await load()
    setActionId('')
    if (cleanupFailed) {
      setMessage(`${status === 'verified' ? 'Business approved' : 'Business rejected'}, but verification photo cleanup needs admin attention.`)
    } else {
      setMessage(status === 'verified' ? 'Business approved. Verification evidence deleted.' : 'Business rejected. Verification evidence deleted.')
    }
  }

  if (role !== 'admin' && role !== 'super_admin') return null

  return <div className="privacy-card super-admin-panel">
    <h2><BarChart3 size={20} /> {role === 'super_admin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}</h2>
    <p className="muted">Review registrations and posts before acting. Verification photos are private and removed after the business decision.</p>
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
    {pendingBusinesses.length === 0 ? <p className="muted">No pending business registrations.</p> : pendingBusinesses.map(business => {
      const evidence = evidenceByBusiness[business.id]
      return <article className="post-card" key={business.id}><div><Store size={20} /></div><div><h3>{business.name}</h3><p>{business.category} · {business.address || 'Address not provided'}</p>{business.phone && <p>Phone: {business.phone}</p>}{business.website && <p>Website: {business.website}</p>}{business.email && <p>Email: {business.email}</p>}{business.registration_note && <div className="verification-note"><strong>Verification note</strong><p>{business.registration_note}</p></div>}<div className="evidence-actions"><button type="button" disabled={Boolean(evidenceLoading)} onClick={() => void reviewEvidence(business.id)}><Camera size={17} /> {evidenceLoading === business.id ? 'Loading…' : evidence ? 'Refresh photos' : 'Review photos'}</button>{evidence && evidence.length === 0 && <span className="muted">No photos submitted</span>}{evidence?.map(item => <button type="button" key={item.id} onClick={() => void openEvidence(item)}><Camera size={16} /> {item.kind === 'shopfront' ? 'Open shop-front photo' : 'Open inside photo'}</button>)}</div><div className="tags"><span>{business.verification_status}</span><span>{business.source || 'registration'}</span></div><div className="sheet-actions"><button disabled={Boolean(actionId)} onClick={() => void moderateBusiness(business.id, 'verified')}><CheckCircle2 size={18} /> {actionId === business.id ? 'Working…' : 'Approve business'}</button><button disabled={Boolean(actionId)} onClick={() => void moderateBusiness(business.id, 'rejected')} className="danger"><XCircle size={18} /> Reject</button></div></div></article>
    })}

    <h3><FileText size={17} /> Posts needing review</h3>
    {pendingPosts.length === 0 ? <p className="muted">No posts waiting for review.</p> : pendingPosts.map(post => <article className="post-card" key={post.id}><div><strong>{post.type}</strong></div><div><h3>{post.title}</h3><p>{post.body}</p><p className="muted">{post.business_name || 'Business'}</p><div className="sheet-actions"><button disabled={Boolean(actionId)} onClick={() => void moderatePost(post.id, 'live')}><CheckCircle2 size={18} /> {actionId === post.id ? 'Working…' : 'Approve post'}</button><button disabled={Boolean(actionId)} onClick={() => void moderatePost(post.id, 'rejected')} className="danger"><XCircle size={18} /> Reject</button></div></div></article>)}

    <h3>Latest registered businesses</h3>
    {latestBusinesses.slice(0, 8).map(business => <div className="admin-row" key={business.id}><strong>{business.name}</strong><span>{business.verification_status} · {business.category}</span></div>)}

    <h3>Latest posts</h3>
    {latestPosts.slice(0, 8).map(post => <div className="admin-row" key={post.id}><strong>{post.title}</strong><span>{post.status} · {post.type} · {post.business_name || 'Business'}</span></div>)}
  </div>
}
