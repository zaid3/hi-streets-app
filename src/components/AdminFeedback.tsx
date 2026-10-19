import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { feedbackText, type UserFeedback } from '../lib/feedback'

export default function AdminFeedback() {
  const [items, setItems] = useState<UserFeedback[]>([])
  const [working, setWorking] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  async function load() {
    if (!supabase) { setError('Feedback is unavailable.'); setWorking(false); return }
    setWorking(true); setError('')
    try {
      const { data, error: failure } = await supabase.from('user_feedback').select('id,name,email,organisation,role,started_on,features_used,experience,improvements,planned_use,quote_consent,created_at').order('created_at', { ascending: false }).limit(100)
      if (failure) throw failure
      setItems(data || [])
    } catch { setError('Feedback could not be loaded. Please try again.') }
    finally { setWorking(false) }
  }
  useEffect(() => { void load() }, [])
  async function copy(item: UserFeedback) {
    try { await navigator.clipboard.writeText(feedbackText(item)); setCopied(item.id) }
    catch { setError('Copy failed. You can select and copy the feedback text.') }
  }
  return <section className="privacy-card"><h2>User feedback</h2><p>Latest 100 responses, visible only to the founder. Names, email addresses and usage dates are supplied by respondents and are not independently verified.</p><p><a href="/feedback" target="_blank" rel="noreferrer">Open feedback form</a></p><button type="button" disabled={working} onClick={() => void load()}>{working ? 'Loading…' : 'Refresh feedback'}</button>
    {error && <p role="alert">{error}</p>}{!working && !error && items.length === 0 && <p>No feedback has been submitted yet.</p>}
    {items.map(item => <article className="report-review" key={item.id}><h3>{item.name}{item.organisation ? ` · ${item.organisation}` : ''}</h3><p>{item.role}</p><p>{item.created_at && new Date(item.created_at).toLocaleString('en-GB')} · <a href={`mailto:${encodeURIComponent(item.email)}?subject=Your%20HiStreets%20feedback`}>{item.email}</a></p><p><strong>Started using:</strong> {item.started_on || 'Not provided'}</p><p><strong>Used:</strong> {item.features_used.join(', ') || 'No features selected'}</p><h4>Experience</h4><p style={{whiteSpace:'pre-wrap'}}>{item.experience}</p>{item.improvements && <><h4>Suggested improvements</h4><p style={{whiteSpace:'pre-wrap'}}>{item.improvements}</p></>}{item.planned_use && <><h4>Future plans</h4><p style={{whiteSpace:'pre-wrap'}}>{item.planned_use}</p></>}<p><strong>Permission to quote with name and organisation:</strong> {item.quote_consent ? 'Yes' : 'No'}</p><p>Reference: {item.id}</p><button type="button" onClick={() => void copy(item)}>{copied === item.id ? 'Copied' : 'Copy original response'}</button></article>)}
  </section>
}
