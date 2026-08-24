import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, ShieldCheck, UserCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Role } from '../types'

type AdminUser = {
  id: string
  email: string
  display_name: string
  role: Role
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}

const roleOptions: Role[] = ['user', 'business', 'charity', 'admin', 'super_admin']

export default function AdminUserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    if (!supabase) return
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.functions.invoke('histreets-admin-users', { body: { action: 'list', per_page: 100 } })
    if (error || data?.error) setMessage(data?.error || error?.message || 'Could not load users.')
    else setUsers((data?.users || []) as AdminUser[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(user => `${user.email} ${user.display_name} ${user.role}`.toLowerCase().includes(q))
  }, [query, users])

  async function changeRole(userId: string, role: Role) {
    if (!supabase || workingId) return
    setWorkingId(userId)
    setMessage('Updating access…')
    const { data, error } = await supabase.functions.invoke('histreets-admin-users', { body: { action: 'set_role', user_id: userId, role } })
    if (error || data?.error) setMessage(data?.error || error?.message || 'Could not update role.')
    else {
      setUsers(rows => rows.map(row => row.id === userId ? { ...row, role } : row))
      setMessage('Role updated.')
    }
    setWorkingId('')
  }

  return <section className="admin-control-card" aria-labelledby="user-management-title">
    <div className="admin-control-head">
      <div><span className="eyebrow"><UserCog size={14} /> Developer control</span><h2 id="user-management-title">Users & access</h2><p>Manage app roles without SQL or code changes.</p></div>
      <button className="icon-action" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={17} /> Refresh</button>
    </div>

    <label className="admin-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search email, name or role" aria-label="Search users" /></label>
    {message && <p className="form-status" role="status">{message}</p>}
    {loading ? <div className="admin-empty">Loading users…</div> : filtered.length === 0 ? <div className="admin-empty">No matching users.</div> : <div className="admin-user-list">
      {filtered.map(user => <article className="admin-user-row" key={user.id}>
        <div className="admin-user-avatar">{(user.display_name || user.email || '?').slice(0, 1).toUpperCase()}</div>
        <div className="admin-user-copy"><strong>{user.display_name || user.email.split('@')[0]}</strong><span>{user.email}</span><small>{user.email_confirmed_at ? 'Email verified' : 'Email not verified'} · {user.last_sign_in_at ? 'Signed in before' : 'Never signed in'}</small></div>
        <label className="role-control"><span>Role</span><select value={user.role} disabled={workingId === user.id} onChange={e => void changeRole(user.id, e.target.value as Role)}>{roleOptions.map(role => <option value={role} key={role}>{role.replace('_', ' ')}</option>)}</select></label>
      </article>)}
    </div>}
    <div className="admin-guardrail"><ShieldCheck size={18} /><span>Your own Super Admin role cannot be removed from this screen, preventing accidental lockout.</span></div>
  </section>
}
