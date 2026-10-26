import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export default function AccountDeletionRequest() {
  const [user, setUser] = useState<User | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [requestedAt, setRequestedAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => { if (active) setUser(data.session?.user ?? null) })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    let active = true
    setConfirming(false); setRequestedAt(''); setError('')
    if (user && supabase) {
      void supabase.from('account_deletion_requests').select('requested_at').eq('user_id', user.id).maybeSingle().then(({ data, error: failure }) => {
        if (!active) return
        if (data) setRequestedAt(data.requested_at)
        if (failure) setError('Could not check existing deletion requests. You can try submitting again.')
      })
    }
    return () => { active = false }
  }, [user?.id])

  async function requestDeletion() {
    if (!supabase || !user || inFlight.current || !confirming) return
    inFlight.current = true
    setBusy(true); setError('')
    try {
      const { data, error: failure } = await supabase.from('account_deletion_requests').insert({ user_id: user.id }).select('requested_at').single()
      if (failure?.code === '23505') {
        const existing = await supabase.from('account_deletion_requests').select('requested_at').eq('user_id', user.id).single()
        if (existing.error || !existing.data) throw existing.error || new Error('Request unavailable')
        setRequestedAt(existing.data.requested_at)
      } else {
        if (failure || !data) throw failure || new Error('Request not saved')
        setRequestedAt(data.requested_at)
      }
      setConfirming(false)
    } catch {
      setError('Your deletion request could not be confirmed. Please try again. Your account has not been deleted.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  if (!user) return <div className="account-deletion"><p>Sign in above to request deletion of your account and associated personal data in the app.</p><a href="/delete-account.html">Deletion information and help if you cannot sign in</a></div>

  return <div className="account-deletion">
    {requestedAt ? <div role="status"><strong>Account deletion requested</strong><p>Your request was received on {new Date(requestedAt).toLocaleDateString('en-GB')}. We aim to complete deletion within 30 days and will email you when it is complete. Your account has not been deleted yet.</p></div> : <>
      <button type="button" className="deletion-request-button" aria-expanded={confirming} onClick={() => setConfirming(true)}>Delete account and associated data</button>
      {confirming && <div className="deletion-confirmation">
        <h3>Request permanent account deletion?</h3>
        <p>This covers your login account and associated personal data, including submitted content and files. Other people's records and independent public business information are handled separately. Any information we must legally retain will be explained.</p>
        <p>We aim to complete deletion within 30 days and will email you when it is complete. You do not need to send a separate email.</p>
        <div className="deletion-actions"><button type="button" disabled={busy} onClick={() => void requestDeletion()}>{busy ? 'Submitting request…' : 'Confirm deletion request'}</button><button type="button" disabled={busy} onClick={() => setConfirming(false)}>Keep my account</button></div>
      </div>}
    </>}
    {error && <p role="alert">{error}</p>}
  </div>
}
