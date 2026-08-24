import { useEffect, useState } from 'react'
import { Briefcase, HandHeart, Lightbulb, Megaphone, ShieldCheck, Sparkles, Utensils } from 'lucide-react'
import { loadBusinessOpportunity, type BusinessOpportunity } from '../lib/ai'
import { loadMyVerifiedBusinesses } from '../lib/data'
import type { Business, PostType } from '../types'

type Props = {
  onPost: (type: PostType) => void
}

export default function BusinessPostingDashboard({ onPost }: Props) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [opportunity, setOpportunity] = useState<BusinessOpportunity | null>(null)
  const [loadingOpportunity, setLoadingOpportunity] = useState(false)

  useEffect(() => {
    loadMyVerifiedBusinesses().then(rows => {
      setBusinesses(rows)
      setBusinessId(rows[0]?.id || '')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!businessId) {
      setOpportunity(null)
      return
    }
    let cancelled = false
    setLoadingOpportunity(true)
    loadBusinessOpportunity(businessId).then(result => {
      if (!cancelled) setOpportunity(result)
    }).catch(() => {
      if (!cancelled) setOpportunity(null)
    }).finally(() => {
      if (!cancelled) setLoadingOpportunity(false)
    })
    return () => { cancelled = true }
  }, [businessId])

  function turnOpportunityIntoOffer() {
    if (opportunity?.seed_prompt) window.sessionStorage.setItem('histreets:copilot-seed', opportunity.seed_prompt)
    onPost('offer')
  }

  return (
    <div className="privacy-card business-dashboard">
      <h2>Post from an approved business</h2>
      <p className="muted">Once your business is approved and connected to your account, publish local updates from here. Public users never see these posting controls.</p>

      {businesses.length > 1 && <label className="opportunity-business-select">Opportunity insights for
        <select value={businessId} onChange={event => setBusinessId(event.target.value)}>
          {businesses.map(business => <option key={business.id} value={business.id}>{business.name}</option>)}
        </select>
      </label>}

      {loadingOpportunity && businessId && <div className="opportunity-card loading"><Sparkles size={20} /><div><strong>Checking local opportunity signals…</strong><span>Using anonymous aggregate demand only.</span></div></div>}

      {!loadingOpportunity && opportunity?.eligible && <section className="opportunity-card" aria-label="Local opportunity insight">
        <div className="opportunity-icon"><Lightbulb size={21} /></div>
        <div className="opportunity-copy">
          <small>Opportunity Gap · {opportunity.area}</small>
          <strong>{opportunity.level === 'strong' ? 'Strong local signal' : opportunity.level === 'growing' ? 'Growing local signal' : 'Emerging local signal'}</strong>
          <p>{opportunity.suggestion}</p>
          <div className="opportunity-stats"><span><b>{opportunity.signal_count}</b> anonymous signals / 7 days</span><span><b>{opportunity.live_offer_count}</b> live offers in area</span></div>
          <button type="button" onClick={turnOpportunityIntoOffer}><Sparkles size={17} /> Turn this into an offer</button>
          <small className="opportunity-privacy"><ShieldCheck size={13} /> {opportunity.privacy_note}</small>
        </div>
      </section>}

      <div className="business-action-grid">
        <button type="button" onClick={() => onPost('offer')}><Megaphone size={18} /> Post offer</button>
        <button type="button" onClick={() => onPost('job')}><Briefcase size={18} /> Post job</button>
        <button type="button" onClick={() => onPost('free_meal')}><Utensils size={18} /> Post free meal</button>
        <button type="button" onClick={() => onPost('community')}><HandHeart size={18} /> Post community support</button>
      </div>
      <p className="missing-note">No approved business yet? Complete the registration or ownership request above. Verified businesses can publish posts that pass the platform checks automatically.</p>
    </div>
  )
}
