import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, MessageSquare, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { feedbackFeatures, feedbackFromForm, feedbackText, type UserFeedback as Feedback } from '../lib/feedback'
import '../user-feedback.css'

export default function UserFeedback() {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState<Feedback | null>(null)
  const [copied, setCopied] = useState(false)
  const result = useRef<HTMLDivElement>(null)
  const inFlight = useRef(false)
  const requestId = useRef(crypto.randomUUID())
  const lastAttempt = useRef('')
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  useEffect(() => { document.title = 'Share your feedback | HiStreets' }, [])
  useEffect(() => {
    if (sent || error) { result.current?.focus(); result.current?.scrollIntoView({ block: 'center', behavior: 'instant' }) }
  }, [sent, error])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const form = event.currentTarget
    setError('')
    if (String(new FormData(form).get('website') || '')) { setError('Please leave the website field empty and try again.'); return }
    const payload = feedbackFromForm(form, requestId.current)
    const fingerprint = JSON.stringify({ ...payload, id: '' })
    if (lastAttempt.current && lastAttempt.current !== fingerprint) {
      requestId.current = crypto.randomUUID()
      payload.id = requestId.current
    }
    lastAttempt.current = fingerprint
    if (payload.name.length < 2 || payload.experience.length < 10) { setError('Please enter your name and at least 10 characters about your experience.'); return }
    if (!supabase) { setError('The form is unavailable. Please email your feedback to ahaque@atomicmail.io.'); return }
    inFlight.current = true
    setWorking(true)
    try {
      // No select(): submitted names, email addresses and comments are private.
      const { error: failure } = await supabase.from('user_feedback').insert(payload).abortSignal(AbortSignal.timeout(20000))
      if (failure && failure.code !== '23505') {
        if (failure.message.includes('Feedback limit')) throw new Error('You have sent several responses recently. Please try again tomorrow or email us.')
        throw new Error('Your feedback could not be sent. Your answers are still here. Please try again or email ahaque@atomicmail.io.')
      }
      setSent(payload)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your feedback could not be sent. Please try again.')
    } finally { setWorking(false); inFlight.current = false }
  }

  async function copyResponse() {
    if (!sent) return
    try { await navigator.clipboard.writeText(feedbackText(sent)); setCopied(true) }
    catch { setError('Copy was unavailable. You can select and copy your response below.') }
  }

  return <main className="feedback-page">
    <div className="feedback-wrap">
      <nav className="feedback-nav" aria-label="Feedback navigation"><a href="/map" className="feedback-brand">HiStreets<span>Local connections. Shared possibilities.</span></a><a href="/map"><ArrowLeft size={16} aria-hidden="true" /> Back to HiStreets</a></nav>
      <header className="feedback-heading"><span className="feedback-eyebrow"><MessageSquare size={16} aria-hidden="true" /> YOUR EXPERIENCE MATTERS</span><h1>Help shape HiStreets.</h1><p>What worked for you? What could be better? Share your honest experience in your own words.</p><p className="feedback-small">About 2 minutes · No sign-in needed · Sent privately to HiStreets</p></header>
      {sent ? <section className="feedback-card">
        <div ref={result} tabIndex={-1} role="status" className="feedback-success"><CheckCircle2 size={32} aria-hidden="true" /><h2>Thank you. Your feedback is saved.</h2><p>Your comments will help us improve HiStreets. They have not been posted publicly.</p><p className="feedback-small">Reference: {sent.id}</p></div>
        <details className="feedback-response"><summary>Your response</summary><pre>{feedbackText(sent)}</pre></details>
        <div className="feedback-actions"><button type="button" onClick={() => void copyResponse()}>{copied ? 'Copied' : 'Copy my response'}</button><a href="/map">Return to HiStreets</a></div>
        {error && <p role="alert">{error}</p>}
      </section> : <form className="feedback-card" onSubmit={event => void submit(event)}>
        <p className="feedback-small feedback-required">Fields marked * are required. All other fields are optional.</p>
        {error && <div className="feedback-error" ref={result} tabIndex={-1} role="alert">{error}</div>}
        <fieldset disabled={working} className="feedback-fields"><legend className="feedback-section-title">A little about you</legend>
          <div className="feedback-grid"><label htmlFor="feedback-name">Your name *<input id="feedback-name" name="name" autoComplete="name" required minLength={2} maxLength={120} /></label><label htmlFor="feedback-email">Email *<input id="feedback-email" name="email" type="email" autoComplete="email" required maxLength={254} aria-describedby="feedback-email-help" /><span id="feedback-email-help" className="feedback-hint">Use your business email if you are responding for an organisation. Your email will not be published.</span></label></div>
          <div className="feedback-grid"><label htmlFor="feedback-organisation">Business or organisation<input id="feedback-organisation" name="organisation" autoComplete="organization" maxLength={160} /></label><label htmlFor="feedback-role">Your role<input id="feedback-role" name="role" autoComplete="organization-title" maxLength={100} /></label></div>
          <label htmlFor="feedback-start">When did you start using HiStreets?<input id="feedback-start" name="started_on" type="date" min="2020-01-01" max={today} /><span className="feedback-hint">Leave this blank if you are unsure.</span></label>
          <fieldset className="feedback-feature-options"><legend>Which features have you used?</legend><p className="feedback-hint">Select only the features you have actually tried. You can leave these blank.</p><div className="feedback-grid">{feedbackFeatures.map(feature => <label className="feedback-checkbox" key={feature}><input name="features_used" type="checkbox" value={feature} /><span>{feature}</span></label>)}</div></fieldset>
          <label htmlFor="feedback-experience">Tell us about your experience *<textarea id="feedback-experience" name="experience" required minLength={10} maxLength={2000} rows={4} aria-describedby="feedback-experience-help" /><span id="feedback-experience-help" className="feedback-hint">What did you use HiStreets for? Was anything useful or difficult? A specific example helps.</span></label>
          <label htmlFor="feedback-improvements">What could we improve?<textarea id="feedback-improvements" name="improvements" maxLength={1500} rows={3} /></label>
          <label htmlFor="feedback-plans">How would you like to use HiStreets next?<textarea id="feedback-plans" name="planned_use" maxLength={1500} rows={3} /><span className="feedback-hint">Future plans are separate from what you have already used.</span></label>
          <div className="feedback-honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className="feedback-checkbox feedback-permission"><input type="checkbox" name="quote_consent" /><span>HiStreets may quote my feedback with my name and organisation in its website, presentations and other project materials. <strong>Optional.</strong></span></label>
          <p className="feedback-small">We use these details to review your feedback and reply if needed. Feedback is stored privately; permission to quote is optional. Do not include passwords or sensitive information. See our <a href="/privacy.html">Privacy Policy</a>.</p>
          <button className="feedback-submit" type="submit" disabled={working}><Send size={18} aria-hidden="true" />{working ? 'Sending feedback…' : 'Send feedback'}</button>
          <p className="feedback-small">Prefer email? <a href="mailto:ahaque@atomicmail.io?subject=HiStreets%20feedback">ahaque@atomicmail.io</a></p>
        </fieldset>
      </form>}
      <footer className="feedback-footer">Made for local businesses and communities. <a href="/privacy.html">Privacy</a></footer>
    </div>
  </main>
}
