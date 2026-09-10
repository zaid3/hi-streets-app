import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, Eye, Lightbulb, MousePointerClick, Sparkles, Users } from 'lucide-react'
import { loadMyVerifiedBusinesses } from '../lib/data'
import { loadBusinessDashboard } from '../lib/workspaces'
import type { Business, BusinessAnalyticsPoint, BusinessDashboardOverview } from '../types'
import AnalyticsSparkline from './AnalyticsSparkline'

export default function BusinessAnalyticsDashboard({ onNavigate }: { onNavigate: (section: 'profile' | 'content' | 'applications' | 'team') => void }) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [days, setDays] = useState(30)
  const [overview, setOverview] = useState<BusinessDashboardOverview | null>(null)
  const [series, setSeries] = useState<BusinessAnalyticsPoint[]>([])
  const [status, setStatus] = useState('Loading your business overview…')

  useEffect(() => {
    loadMyVerifiedBusinesses().then(rows => {
      setBusinesses(rows)
      setBusinessId(rows[0]?.id || '')
      if (!rows.length) setStatus('Connect and verify a business to unlock analytics, team access and growth recommendations.')
    }).catch(() => setStatus('Your business overview is temporarily unavailable.'))
  }, [])

  useEffect(() => {
    if (!businessId) return
    setStatus('Refreshing your analytics…')
    loadBusinessDashboard(businessId, days).then(result => {
      setOverview(result.overview)
      setSeries(result.series)
      setStatus('')
    }).catch(() => setStatus('Analytics are temporarily unavailable. Your business tools still work.'))
  }, [businessId, days])

  const recommendations = useMemo(() => {
    if (!overview) return []
    const items: Array<{ title: string; copy: string; action: string; section: 'profile' | 'content' | 'applications' | 'team' }> = []
    if (overview.profile_completeness < 100) items.push({ title: 'Complete your public profile', copy: `${overview.profile_completeness}% complete. Better contact details help residents act.`, action: 'Update profile', section: 'profile' })
    if (!overview.live_posts) items.push({ title: 'Publish your first local update', copy: 'Create an offer, job or community post to appear beyond the map listing.', action: 'Create content', section: 'content' })
    if (overview.applications > 0) items.push({ title: `${overview.applications} application${overview.applications === 1 ? '' : 's'} to review`, copy: 'Responding quickly gives applicants a better experience.', action: 'Review applicants', section: 'applications' })
    if (overview.team_members < 2) items.push({ title: 'Share the workload', copy: 'Invite a manager, editor or viewer without sharing your password.', action: 'Invite teammate', section: 'team' })
    return items.slice(0, 3)
  }, [overview])

  return <section className="workspace-overview" aria-labelledby="business-overview-title">
    <div className="workspace-section-head">
      <div><span className="eyebrow"><Sparkles size={14} /> Business intelligence</span><h2 id="business-overview-title">Your performance at a glance</h2><p>See what residents engage with and the next action most likely to help.</p></div>
      <div className="dashboard-filters">
        {businesses.length > 1 && <label>Business<select value={businessId} onChange={event => setBusinessId(event.target.value)}>{businesses.map(business => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>}
        <label>Period<select value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
      </div>
    </div>
    {status && <div className="dashboard-notice" role="status"><Lightbulb size={19} /><span>{status}</span></div>}
    {overview && <>
      <div className="metric-grid">
        <article><span><Eye size={18} /> Listing views</span><strong>{overview.listing_views.toLocaleString()}</strong><small>People who opened your listing</small></article>
        <article><span><MousePointerClick size={18} /> Customer actions</span><strong>{overview.action_clicks.toLocaleString()}</strong><small>Calls, directions, website and WhatsApp</small></article>
        <article><span><BriefcaseBusiness size={18} /> Applications</span><strong>{overview.applications.toLocaleString()}</strong><small>Applications received in this period</small></article>
        <article><span><CheckCircle2 size={18} /> Profile strength</span><strong>{overview.profile_completeness}%</strong><small>{overview.live_posts} live post{overview.live_posts === 1 ? '' : 's'}</small></article>
      </div>
      <article className="analytics-panel">
        <div className="analytics-panel-head"><div><h3>Resident engagement</h3><p>Daily listing discovery and actions—not individual visitor identities.</p></div><span>{days}-day view</span></div>
        <AnalyticsSparkline labels={series.map(point => point.day)} ariaLabel={`Resident engagement for ${overview.business_name}`} series={[
          { label: 'Listing views', values: series.map(point => Number(point.listing_views)), color: '#0f7774' },
          { label: 'Customer actions', values: series.map(point => Number(point.action_clicks)), color: '#ff7a35' },
        ]} />
      </article>
      <div className="recommendation-grid">
        <div className="recommendation-title"><Lightbulb size={20} /><div><h3>Recommended next actions</h3><p>Practical steps based on your current workspace.</p></div></div>
        {recommendations.length ? recommendations.map(item => <article key={item.title}><div><strong>{item.title}</strong><p>{item.copy}</p></div><button type="button" onClick={() => onNavigate(item.section)}>{item.action}<ArrowUpRight size={16} /></button></article>) : <article><div><strong>Your essentials are in place</strong><p>Keep offers current and respond to applicants as engagement grows.</p></div></article>}
      </div>
      <div className="business-health-strip"><span><Users size={17} /> {overview.team_members} team member{overview.team_members === 1 ? '' : 's'}</span><span>{overview.pending_posts} post{overview.pending_posts === 1 ? '' : 's'} awaiting review</span><span>{overview.content_views} content views</span></div>
    </>}
  </section>
}
