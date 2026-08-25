import { useEffect, useState } from 'react'
import { Building2, ChevronDown, ChevronUp, Clock3, ShieldCheck } from 'lucide-react'
import { loadMyBusinesses } from '../lib/data'
import { loadMyOwnershipRequests } from '../lib/ownership'
import type { Business, BusinessOwnershipRequest } from '../types'
import BusinessOwnershipRequestForm from './BusinessOwnershipRequest'
import BusinessRegistration from './BusinessRegistration'

function businessStatus(status?: Business['verification_status']) {
  if (status === 'verified') return { label: 'Verified', tone: 'verified' }
  if (status === 'pending') return { label: 'Waiting for approval', tone: 'pending' }
  if (status === 'rejected') return { label: 'Needs attention', tone: 'attention' }
  if (status === 'contested' || status === 'revoked') return { label: 'Needs review', tone: 'attention' }
  return { label: 'Connected', tone: 'neutral' }
}

function requestStatus(request: BusinessOwnershipRequest) {
  if (request.status === 'approved') return { label: 'Approved', tone: 'verified' }
  if (request.status === 'rejected') return { label: 'Needs attention', tone: 'attention' }
  return { label: 'Ownership request pending', tone: 'pending' }
}

export default function BusinessOnboarding() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [requests, setRequests] = useState<BusinessOwnershipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showTools, setShowTools] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([loadMyBusinesses(), loadMyOwnershipRequests()])
      .then(([businessRows, requestRows]) => {
        if (!active) return
        setBusinesses(businessRows)
        setRequests(requestRows)
        setShowTools(businessRows.length === 0 && requestRows.length === 0)
      })
      .catch(() => {
        if (!active) return
        setLoadFailed(true)
        setShowTools(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const hasHistory = businesses.length > 0 || requests.length > 0

  return <>
    <div className="portal-section-label"><span>1</span><div><strong>Connect your business</strong><small>{hasHistory ? 'Your connection is saved. Add another only when you need to.' : 'Claim an existing listing or register a new one.'}</small></div></div>

    {loading && <div className="business-connection-summary connection-loading"><Clock3 size={18} /><div><strong>Checking your business connection…</strong><span>HiStreets is preparing your workspace.</span></div></div>}

    {!loading && hasHistory && !showTools && <div className="business-connection-summary">
      <div className="connection-summary-head"><div><span className="eyebrow"><ShieldCheck size={14} /> Connected to HiStreets</span><h2>Your local business workspace is ready</h2><p>Go straight to Manage & grow below, or open the connection tools if you need to claim or add another business.</p></div></div>
      <div className="connection-summary-list">
        {businesses.map(business => {
          const status = businessStatus(business.verification_status)
          return <div className="connection-summary-row" key={business.id}><span className="connection-icon"><Building2 size={18} /></span><div><strong>{business.name}</strong><small>{business.category}{business.address ? ` · ${business.address}` : ''}</small></div><span className={`connection-status ${status.tone}`}>{status.label}</span></div>
        })}
        {requests.map(request => {
          const status = requestStatus(request)
          return <div className="connection-summary-row" key={request.id}><span className="connection-icon"><Clock3 size={18} /></span><div><strong>{request.business_name}</strong><small>{request.business_address || 'Newham ownership request'}</small></div><span className={`connection-status ${status.tone}`}>{status.label}</span></div>
        })}
      </div>
      <button className="connection-tools-toggle" type="button" onClick={() => setShowTools(true)}><ChevronDown size={17} /> Claim or add another business</button>
    </div>}

    {!loading && showTools && <>
      {hasHistory && <button className="connection-tools-toggle connection-tools-hide" type="button" onClick={() => setShowTools(false)}><ChevronUp size={17} /> Back to Manage & grow</button>}
      {loadFailed && <p className="form-status">We could not load your saved business connection just now. You can still search or register below.</p>}
      <BusinessOwnershipRequestForm />
      <BusinessRegistration />
    </>}
  </>
}
