import { Activity, ArrowRight, BriefcaseBusiness, Building2, HandHeart, ShieldCheck, Sparkles, Tag, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { loadBusinessesGeoJson } from '../lib/data'
import { buildHiPulseSnapshot, type HiPulseBusiness } from '../lib/hiPulse'
import type { Post, TabKey } from '../types'

export default function HiPulse({ posts, postsLoading = false, postsError = '', blockedBusinessIds = [], onNavigate }: {
  posts: Post[]
  postsLoading?: boolean
  postsError?: string
  blockedBusinessIds?: string[]
  onNavigate: (tab: TabKey) => void
}) {
  const [open, setOpen] = useState(false)
  const [businesses, setBusinesses] = useState<HiPulseBusiness[]>([])
  const [businessesLoading, setBusinessesLoading] = useState(true)
  const [businessesError, setBusinessesError] = useState(false)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    let cancelled = false
    loadBusinessesGeoJson().then(data => {
      if (cancelled) return
      const rows = (data.features || []).map((feature: any) => ({
        id: String(feature?.properties?.id || feature?.id || ''),
        category: String(feature?.properties?.category || ''),
      })).filter((business: HiPulseBusiness) => business.id)
      setBusinesses(rows)
    }).catch(() => {
      if (!cancelled) setBusinessesError(true)
    }).finally(() => {
      if (!cancelled) setBusinessesLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [open])

  const snapshot = useMemo(() => buildHiPulseSnapshot(
    posts, businesses.filter(business => !blockedBusinessIds.includes(business.id)), now,
  ), [posts, businesses, blockedBusinessIds, now])
  const loading = postsLoading || businessesLoading
  const unavailable = Boolean(postsError) || businessesError
  const ready = !loading && !unavailable
  const factorUnits = { activity: 'live posts', diversity: 'categories', coverage: 'map listings', balance: 'active post types' }

  function go(tab: TabKey) {
    setOpen(false)
    onNavigate(tab)
  }

  return (
    <>
      <button
        className="hipulse-fab"
        type="button"
        aria-label={ready ? `Open HiPulse. Newham pulse score ${snapshot.score} out of 100` : 'Open HiPulse'}
        onClick={() => setOpen(true)}
      >
        <span className="hipulse-fab-icon"><Activity size={18} /></span>
        <span className="hipulse-fab-copy"><small>HiPulse</small><strong>{ready ? snapshot.score : '—'}</strong></span>
      </button>

      {open && (
        <div className="hipulse-layer" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) setOpen(false)
        }}>
          <section className="hipulse-sheet" role="dialog" aria-modal="true" aria-labelledby="hipulse-title">
            <div className="hipulse-handle" aria-hidden="true" />
            <header className="hipulse-header">
              <div className="hipulse-brandmark"><Sparkles size={19} /></div>
              <div>
                <span>Local activity and map coverage</span>
                <h2 id="hipulse-title">HiPulse · Newham</h2>
              </div>
              <button type="button" className="hipulse-close" aria-label="Close HiPulse" onClick={() => setOpen(false)}><X size={20} /></button>
            </header>

            {!ready && <p className="hipulse-disclaimer" role={unavailable ? 'alert' : 'status'}>
              {unavailable ? 'HiPulse data could not be loaded. Reload the page to try again.' : 'Loading HiPulse data…'}
            </p>}
            {ready && <>
            <div className="hipulse-hero">
              <div className="hipulse-score" aria-label={`Pulse score ${snapshot.score} out of 100`}>
                <div className="hipulse-score-ring" style={{ '--pulse-score': `${snapshot.score * 3.6}deg` } as React.CSSProperties}>
                  <div><strong>{snapshot.score}</strong><span>/100</span></div>
                </div>
                <div className="hipulse-score-copy">
                  <span className="hipulse-state">{snapshot.label} · Platform snapshot</span>
                  <h3>{snapshot.headline}</h3>
                  <p>Based on loaded public posts and map listings. Listings can be unclaimed.</p>
                </div>
              </div>
            </div>

            <div className="hipulse-stat-grid" aria-label="Current HiPulse signal counts">
              <button type="button" onClick={() => go('offers')}><Tag size={18} /><strong>{snapshot.counts.offers}</strong><span>Live offers</span></button>
              <button type="button" onClick={() => go('jobs')}><BriefcaseBusiness size={18} /><strong>{snapshot.counts.jobs}</strong><span>Jobs</span></button>
              <button type="button" onClick={() => go('community')}><HandHeart size={18} /><strong>{snapshot.counts.community}</strong><span>Support</span></button>
              <button type="button" onClick={() => go('map')}><Building2 size={18} /><strong>{snapshot.counts.businesses}</strong><span>Map listings</span></button>
            </div>

            <div className="hipulse-section-head">
              <div><span>Explainable by design</span><h3>Why this pulse score?</h3></div>
              <ShieldCheck size={20} />
            </div>

            <div className="hipulse-factors">
              {snapshot.factors.map(factor => (
                <div className="hipulse-factor" key={factor.id}>
                  <div className="hipulse-factor-top"><strong>{factor.label}</strong><span>{factor.points}/{factor.maxPoints} pts</span></div>
                  <div className="hipulse-factor-track"><i style={{ width: `${factor.maxPoints ? (factor.points / factor.maxPoints) * 100 : 0}%` }} /></div>
                  <small>{factor.value} {factorUnits[factor.id]}</small>
                </div>
              ))}
            </div>

            <div className="hipulse-action-card">
              <div><span>Need → action</span><h3>Explore the underlying information</h3><p>Open the current posts or browse local map listings.</p></div>
              <button type="button" onClick={() => go(snapshot.strongestSignal)}>
                {snapshot.strongestSignal === 'map' ? 'Explore map listings' : 'Explore strongest signal'} <ArrowRight size={18} />
              </button>
            </div>
            </>}
            <p className="hipulse-disclaimer">HiPulse combines map coverage and activity in the latest 100 public posts loaded by the app. Map listings are not a count of verified owners or users. It is not an official council statistic, ranking or forecast.</p>
          </section>
        </div>
      )}
    </>
  )
}
