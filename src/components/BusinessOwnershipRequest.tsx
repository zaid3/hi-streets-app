import { useEffect, useState } from 'react'
import { CheckCircle2, Search, Store } from 'lucide-react'
import { loadMyOwnershipRequests, requestBusinessOwnership, searchClaimableBusinesses } from '../lib/ownership'
import type { Business, BusinessOwnershipRequest } from '../types'

export default function BusinessOwnershipRequest() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Business[]>([])
  const [requests, setRequests] = useState<BusinessOwnershipRequest[]>([])
  const [selected, setSelected] = useState<Business | null>(null)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function refreshRequests() {
    setRequests(await loadMyOwnershipRequests())
  }

  useEffect(() => { void refreshRequests() }, [])

  async function search() {
    if (query.trim().length < 2) return setStatus('Enter at least 2 characters from the business name or address.')
    setBusy(true)
    setStatus('Searching existing HiStreets businesses…')
    try {
      const rows = await searchClaimableBusinesses(query)
      setResults(rows)
      setStatus(rows.length ? '' : 'No unclaimed approved business matched. Register it as a new business below.')
    } finally {
      setBusy(false)
    }
  }

  async function submitRequest() {
    if (!selected) return
    if (note.trim().length < 10) return setStatus('Add a short note explaining how HiStreets can confirm you represent this business.')
    setBusy(true)
    setStatus('Sending ownership request…')
    try {
      await requestBusinessOwnership(selected.id, note)
      setStatus('Ownership request sent for Super Admin review.')
      setSelected(null)
      setNote('')
      setResults([])
      setQuery('')
      await refreshRequests()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send ownership request.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="privacy-card ownership-card">
    <h2><Store size={20} /> Already on HiStreets?</h2>
    <p className="muted">Find an existing approved business and request ownership. This avoids creating a duplicate listing.</p>

    {requests.length > 0 && <div className="business-facts"><h3>Your ownership requests</h3>{requests.map(request => <p key={request.id}><strong>{request.business_name}</strong> — {request.status}</p>)}</div>}

    <div className="ownership-search-row">
      <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void search() }} placeholder="Business name or address" maxLength={120} />
      <button type="button" onClick={() => void search()} disabled={busy}><Search size={17} /> Search</button>
    </div>

    {results.map(business => <div className="ownership-result" key={business.id}><div><strong>{business.name}</strong><span>{business.category} · {business.address || 'Newham'}</span></div><button type="button" onClick={() => { setSelected(business); setStatus('') }}>Request ownership</button></div>)}

    {selected && <div className="ownership-request-box"><strong>Request ownership of {selected.name}</strong><p>{selected.address || 'Newham'}</p><label>How can we verify you represent this business?<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={700} placeholder="Example: I am the owner. The business email, phone or website can confirm this." /></label><div className="sheet-actions"><button type="button" onClick={() => void submitRequest()} disabled={busy || note.trim().length < 10}><CheckCircle2 size={17} /> Send request</button><button type="button" className="secondary" onClick={() => { setSelected(null); setNote('') }}>Cancel</button></div></div>}

    {status && <p className="form-status">{status}</p>}
  </div>
}
