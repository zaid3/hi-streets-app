import { useEffect, useState } from 'react'
import { CheckCircle2, Store, XCircle } from 'lucide-react'
import { loadAdminOwnershipRequests, moderateOwnershipRequest } from '../lib/ownership'
import type { AdminBusinessOwnershipRequest } from '../types'

export default function AdminOwnershipRequests() {
  const [items, setItems] = useState<AdminBusinessOwnershipRequest[]>([])
  const [status, setStatus] = useState('Loading ownership requests…')
  const [actionId, setActionId] = useState('')

  async function refresh() {
    try {
      const rows = await loadAdminOwnershipRequests()
      setItems(rows)
      setStatus(rows.length ? '' : 'No ownership requests waiting for review.')
    } catch {
      setStatus('Could not load ownership requests.')
    }
  }

  useEffect(() => { void refresh() }, [])

  async function moderate(item: AdminBusinessOwnershipRequest, nextStatus: 'approved' | 'rejected') {
    if (actionId) return
    if (nextStatus === 'rejected' && !window.confirm(`Reject the ownership request for ${item.business_name}?`)) return
    setActionId(item.id)
    setStatus(nextStatus === 'approved' ? 'Approving ownership…' : 'Rejecting ownership request…')
    try {
      await moderateOwnershipRequest(item.id, nextStatus)
      await refresh()
      setStatus(nextStatus === 'approved' ? 'Ownership approved and business linked to the requester.' : 'Ownership request rejected.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not update ownership request.')
    } finally {
      setActionId('')
    }
  }

  return <div className="privacy-card admin-ownership-panel">
    <h2><Store size={20} /> Ownership requests</h2>
    <p className="muted">Requests for approved businesses already on HiStreets. Approving links the existing listing to the requester instead of creating a duplicate.</p>
    {status && <p className="form-status">{status}</p>}
    {items.map(item => <article className="post-card" key={item.id}><div><Store size={20} /></div><div><h3>{item.business_name}</h3><p>{item.business_category} · {item.business_address || 'Newham'}</p>{item.requester_email && <p>Requester: {item.requester_email}</p>}<div className="verification-note"><strong>Ownership verification note</strong><p>{item.note}</p></div><div className="sheet-actions"><button type="button" disabled={Boolean(actionId)} onClick={() => void moderate(item, 'approved')}><CheckCircle2 size={18} /> {actionId === item.id ? 'Working…' : 'Approve ownership'}</button><button type="button" disabled={Boolean(actionId)} className="danger" onClick={() => void moderate(item, 'rejected')}><XCircle size={18} /> Reject</button></div></div></article>)}
  </div>
}
