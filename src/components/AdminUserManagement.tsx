import { useEffect, useMemo, useState } from 'react'
import { Ban, Building2, ChevronRight, KeyRound, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, UserCog, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Role } from '../types'

type AdminUser = { id: string; email: string; display_name: string; role: Role; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null; suspended_at: string | null; suspension_reason: string; business_count: number }
type UserDetail = { user: AdminUser; memberships: Array<{ business_id: string; role: string; status: string; created_at: string; businesses?: { name?: string } | null }> }

function date(value?: string | null) { return value ? new Date(value).toLocaleString() : 'Never' }
function roleLabel(role: Role) { if (role === 'super_admin') return 'Founder'; if (role === 'admin') return 'Platform Admin'; return 'User' }

export default function AdminUserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [message, setMessage] = useState('')
  const [total, setTotal] = useState(0)
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  async function invoke(body: Record<string, unknown>) {
    if (!supabase) throw new Error('Account controls are unavailable.')
    const { data, error } = await supabase.functions.invoke('histreets-admin-users', { body })
    if (error || data?.error) throw new Error(data?.error || error?.message || 'The account service could not complete this action.')
    return data
  }

  async function load() {
    setLoading(true); setMessage('')
    try { const data = await invoke({ action: 'list', per_page: 100 }); setUsers(data.users || []); setTotal(Number(data.total || data.users?.length || 0)) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load users.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(user => `${user.email} ${user.display_name} ${roleLabel(user.role)}`.toLowerCase().includes(q))
  }, [query, users])

  async function openDetail(userId: string) {
    try { setWorkingId(userId); setMessage(''); setDetail(await invoke({ action: 'detail', user_id: userId })); setDeleteConfirmation('') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load user details.') }
    finally { setWorkingId('') }
  }

  async function changeRole(user: AdminUser, role: 'user' | 'admin') {
    if (workingId || !window.confirm(`${role === 'admin' ? 'Grant Platform Admin access to' : 'Remove Platform Admin access from'} ${user.email}?`)) return
    try { setWorkingId(user.id); await invoke({ action: 'set_role', user_id: user.id, role }); await load(); setMessage('Platform access updated.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update access.') }
    finally { setWorkingId('') }
  }

  async function accountAction(action: 'send_password_reset' | 'suspend' | 'reactivate' | 'soft_delete') {
    if (!detail || workingId) return
    const user = detail.user
    let payload: Record<string, unknown> = { action, user_id: user.id }
    if (action === 'suspend') {
      const reason = window.prompt(`Why are you suspending ${user.email}?`)
      if (!reason) return
      payload = { ...payload, reason }
    }
    if (action === 'soft_delete') {
      if (deleteConfirmation.toLowerCase() !== user.email.toLowerCase()) return setMessage('Type the exact email address before deleting the account.')
      if (!window.confirm(`Soft-delete ${user.email}? This cannot be undone.`)) return
      payload = { ...payload, confirmation: deleteConfirmation }
    }
    try {
      setWorkingId(user.id); await invoke(payload)
      if (action === 'soft_delete') setDetail(null)
      else await openDetail(user.id)
      await load()
      setMessage(action === 'send_password_reset' ? 'Password reset email sent.' : action === 'suspend' ? 'Account suspended.' : action === 'reactivate' ? 'Account reactivated.' : 'Account soft-deleted.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The account action failed.') }
    finally { setWorkingId('') }
  }

  return <section className="workspace-card admin-control-card" aria-labelledby="user-management-title">
    <div className="admin-control-head"><div><span className="eyebrow"><UserCog size={14} /> Founder control</span><h2 id="user-management-title">People & access</h2><p>{total.toLocaleString()} account{total === 1 ? '' : 's'}. Business membership is managed separately inside each business workspace.</p></div><button className="icon-action" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={17} /> Refresh</button></div>
    <label className="admin-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email or platform role" aria-label="Search users" /></label>
    {message && <p className="form-status" role="status">{message}</p>}
    {loading ? <div className="admin-empty">Loading accounts…</div> : filtered.length === 0 ? <div className="admin-empty">No matching accounts.</div> : <div className="admin-user-list">{filtered.map(user => <article className={`admin-user-row ${user.suspended_at ? 'suspended' : ''}`} key={user.id}><div className="admin-user-avatar">{(user.display_name || user.email || '?').slice(0, 1).toUpperCase()}</div><div className="admin-user-copy"><strong>{user.display_name || user.email.split('@')[0]}</strong><span>{user.email}</span><small>{user.suspended_at ? 'Suspended' : user.email_confirmed_at ? 'Email verified' : 'Email not verified'} · {user.business_count} business workspace{user.business_count === 1 ? '' : 's'}</small></div><div className="user-access-cell">{user.role === 'super_admin' ? <span className="founder-badge"><ShieldCheck size={14} /> Founder</span> : <select value={user.role === 'admin' ? 'admin' : 'user'} disabled={workingId === user.id || Boolean(user.suspended_at)} aria-label={`Platform access for ${user.email}`} onChange={event => void changeRole(user, event.target.value as 'user' | 'admin')}><option value="user">User</option><option value="admin">Platform Admin</option></select>}<button type="button" className="user-detail-button" onClick={() => void openDetail(user.id)} disabled={workingId === user.id}>Details <ChevronRight size={16} /></button></div></article>)}</div>}
    <div className="admin-guardrail"><ShieldCheck size={18} /><span>Founder access cannot be granted, removed or deleted from this screen. Platform Admins handle moderation but cannot manage accounts.</span></div>

    {detail && <div className="user-detail-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDetail(null) }}><aside className="user-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="user-detail-title"><button type="button" className="drawer-close" aria-label="Close user details" onClick={() => setDetail(null)}><X size={20} /></button><span className="eyebrow"><UserCog size={14} /> Account details</span><h2 id="user-detail-title">{detail.user.display_name || detail.user.email.split('@')[0]}</h2><p>{detail.user.email}</p><div className="account-fact-grid"><div><span>Platform access</span><strong>{roleLabel(detail.user.role)}</strong></div><div><span>Email</span><strong>{detail.user.email_confirmed_at ? 'Verified' : 'Not verified'}</strong></div><div><span>Joined</span><strong>{date(detail.user.created_at)}</strong></div><div><span>Last sign-in</span><strong>{date(detail.user.last_sign_in_at)}</strong></div></div>
      <h3>Business workspaces</h3>{detail.memberships.length ? <div className="detail-memberships">{detail.memberships.map(item => <div key={item.business_id}><Building2 size={16} /><span><strong>{item.businesses?.name || 'Business'}</strong><small>{item.role} · {item.status}</small></span></div>)}</div> : <p className="muted">No business workspace access.</p>}
      {detail.user.suspended_at && <div className="suspension-note"><Ban size={17} /><div><strong>Account suspended</strong><span>{detail.user.suspension_reason || 'No reason recorded.'}</span></div></div>}
      {detail.user.role !== 'super_admin' && <div className="account-actions"><button type="button" onClick={() => void accountAction('send_password_reset')} disabled={workingId === detail.user.id}><KeyRound size={17} /> Send password reset</button>{detail.user.suspended_at ? <button type="button" onClick={() => void accountAction('reactivate')} disabled={workingId === detail.user.id}><UserCheck size={17} /> Reactivate account</button> : <button type="button" onClick={() => void accountAction('suspend')} disabled={workingId === detail.user.id}><Ban size={17} /> Suspend account</button>}<div className="delete-account-control"><label>Type <strong>{detail.user.email}</strong> to confirm<input value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} /></label><button type="button" className="danger" disabled={workingId === detail.user.id || deleteConfirmation.toLowerCase() !== detail.user.email.toLowerCase()} onClick={() => void accountAction('soft_delete')}><Trash2 size={17} /> Soft-delete account</button></div></div>}
    </aside></div>}
  </section>
}
