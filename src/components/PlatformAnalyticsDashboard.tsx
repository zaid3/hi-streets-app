import { useEffect, useState } from 'react'
import { Building2, ClipboardCheck, Eye, FileText, ShieldCheck, UserRoundCheck, Users } from 'lucide-react'
import { loadPlatformDashboard } from '../lib/workspaces'
import type { PlatformAnalyticsPoint, PlatformDashboardOverview } from '../types'
import AnalyticsSparkline from './AnalyticsSparkline'

export default function PlatformAnalyticsDashboard({ founder }: { founder: boolean }) {
  const [days, setDays] = useState(30)
  const [overview, setOverview] = useState<PlatformDashboardOverview | null>(null)
  const [series, setSeries] = useState<PlatformAnalyticsPoint[]>([])
  const [status, setStatus] = useState('Loading platform health…')
  useEffect(() => {
    setStatus('Refreshing platform health…')
    loadPlatformDashboard(days).then(result => { setOverview(result.overview); setSeries(result.series); setStatus('') }).catch(() => setStatus('Platform analytics are temporarily unavailable.'))
  }, [days])
  return <section className="workspace-overview" aria-labelledby="platform-overview-title">
    <div className="workspace-section-head"><div><span className="eyebrow"><ShieldCheck size={14} /> {founder ? 'Founder intelligence' : 'Operations intelligence'}</span><h2 id="platform-overview-title">Platform health</h2><p>Separate directory coverage from real customers, activity and work requiring attention.</p></div><label className="period-select">Period<select value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label></div>
    {status && <div className="dashboard-notice" role="status"><Eye size={19} />{status}</div>}
    {overview && <>
      <div className="metric-grid platform-metrics">
        <article><span><Users size={18} /> Accounts</span><strong>{overview.auth_users.toLocaleString()}</strong><small>People with a HiStreets login</small></article>
        <article><span><Building2 size={18} /> Directory coverage</span><strong>{overview.directory_businesses.toLocaleString()}</strong><small>Imported and registered listings</small></article>
        <article><span><UserRoundCheck size={18} /> Claimed businesses</span><strong>{overview.claimed_businesses.toLocaleString()}</strong><small>Real owner relationships</small></article>
        <article className={overview.pending_businesses + overview.pending_ownership + overview.pending_posts ? 'needs-attention' : ''}><span><ClipboardCheck size={18} /> Work queue</span><strong>{(overview.pending_businesses + overview.pending_ownership + overview.pending_posts).toLocaleString()}</strong><small>Businesses, claims and posts to review</small></article>
        <article><span><FileText size={18} /> Live content</span><strong>{overview.live_posts.toLocaleString()}</strong><small>Offers, jobs and community posts</small></article>
        <article><span><Eye size={18} /> Engagement</span><strong>{overview.engagement_events.toLocaleString()}</strong><small>Privacy-safe activity in this period</small></article>
      </div>
      <article className="analytics-panel"><div className="analytics-panel-head"><div><h3>Platform momentum</h3><p>New accounts, business claims, published content and engagement.</p></div><span>{days}-day view</span></div><AnalyticsSparkline labels={series.map(point => point.day)} ariaLabel="HiStreets platform activity" series={[
        { label: 'Engagement', values: series.map(point => Number(point.engagement)), color: '#0f7774' },
        { label: 'New accounts', values: series.map(point => Number(point.new_users)), color: '#ff7a35' },
        { label: 'Claims', values: series.map(point => Number(point.claims)), color: '#173f4d' },
      ]} /></article>
      {!overview.claimed_businesses && <div className="dashboard-notice opportunity"><Building2 size={19} /><div><strong>Acquisition is the immediate priority</strong><span>The directory is strong, but no business has completed a claim yet. Focus on owner outreach and a simple claim journey before judging engagement.</span></div></div>}
    </>}
  </section>
}
