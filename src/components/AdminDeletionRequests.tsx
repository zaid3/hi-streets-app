import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Request = { user_id: string; contact_email: string; requested_at: string }

export default function AdminDeletionRequests() {
  const [requests, setRequests] = useState<Request[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    if (!supabase) { setLoading(false); return }
    void supabase.from('account_deletion_requests').select('user_id,contact_email,requested_at').order('requested_at').then(({ data, error: failure }) => {
      if (!active) return
      if (failure) setError('Could not load account deletion requests. Please reload this page.')
      else setRequests(data || [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])
  return <section className="workspace-card" aria-labelledby="deletion-queue-title">
    <h2 id="deletion-queue-title">Account deletion requests</h2>
    <p>Review this queue daily. Complete the account and personal data removal within the stated 30-day target, then confirm completion to the account holder. A request does not erase their data automatically.</p>
    {loading && <p role="status">Loading requests…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !requests.length && <p>No pending deletion requests.</p>}
    {requests.map(request => <article className="deletion-queue-item" key={request.user_id}><strong>{request.contact_email}</strong><p>Received {new Date(request.requested_at).toLocaleDateString('en-GB')}</p><p>Target: {new Date(new Date(request.requested_at).getTime() + 30 * 86400000).toLocaleDateString('en-GB')}</p><small>Account reference: {request.user_id}</small></article>)}
  </section>
}
