import { useEffect, useState } from 'react'
import { Bot, Send, Sparkles, Store } from 'lucide-react'
import { draftBusinessPost, type BusinessCopilotDraft } from '../lib/ai'
import { createPost, loadMyVerifiedBusinesses } from '../lib/data'
import type { Business, PostType } from '../types'

type Props = {
  onClose: () => void
  onSubmitted: () => void
  initialType?: PostType
}

function defaultExpiry(type: PostType = 'offer') {
  const d = new Date()
  d.setDate(d.getDate() + (type === 'job' ? 30 : 7))
  return d.toISOString().slice(0, 10)
}

function expiryFromDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + Math.max(1, Math.min(60, days)))
  return d.toISOString().slice(0, 10)
}

function defaultCategory(type: PostType) {
  if (type === 'job') return 'Local job'
  if (type === 'free_meal') return 'Free meal'
  if (type === 'community') return 'Community support'
  return 'Local offer'
}

function titlePlaceholder(type: PostType) {
  if (type === 'job') return 'e.g. Part-time counter assistant wanted'
  if (type === 'free_meal') return 'e.g. Free hot meals every Friday'
  if (type === 'community') return 'e.g. Free CV help for local youth'
  return 'e.g. 20% off lunch today'
}

function bodyPlaceholder(type: PostType) {
  if (type === 'job') return 'Write the role, hours, pay if available, location, and who should apply…'
  if (type === 'free_meal') return 'Write who it is for, when it is available, and any simple conditions…'
  if (type === 'community') return 'Write the support clearly so residents can understand quickly…'
  return 'Write the offer clearly, e.g. what is discounted, when it ends, and how to claim…'
}

export default function PostComposer({ onClose, onSubmitted, initialType = 'offer' }: Props) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [loadingBusinesses, setLoadingBusinesses] = useState(true)
  const [type, setType] = useState<PostType>(initialType)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(defaultCategory(initialType))
  const [expiresAt, setExpiresAt] = useState(defaultExpiry(initialType))
  const [applyUrl, setApplyUrl] = useState('')
  const [applyPhone, setApplyPhone] = useState('')
  const [recurrence, setRecurrence] = useState('')
  const [jobPay, setJobPay] = useState('')
  const [jobHours, setJobHours] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [workplace, setWorkplace] = useState('On-site')
  const [jobLocation, setJobLocation] = useState('')
  const [cvRequired, setCvRequired] = useState(true)
  const [originalPrice, setOriginalPrice] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [redemption, setRedemption] = useState('')
  const [terms, setTerms] = useState('')
  const [communityCost, setCommunityCost] = useState('Free')
  const [eligibility, setEligibility] = useState('')
  const [schedule, setSchedule] = useState('')
  const [booking, setBooking] = useState('')
  const [status, setStatus] = useState('Loading your verified businesses…')
  const [submitting, setSubmitting] = useState(false)
  const [copilotPrompt, setCopilotPrompt] = useState('')
  const [copilotDraft, setCopilotDraft] = useState<BusinessCopilotDraft | null>(null)
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotStatus, setCopilotStatus] = useState('')

  useEffect(() => {
    loadMyVerifiedBusinesses().then(rows => {
      setBusinesses(rows)
      setBusinessId(rows[0]?.id || '')
      setStatus(rows.length ? '' : 'No verified business found yet.')
    }).catch(() => setStatus('Could not load your verified businesses.')).finally(() => setLoadingBusinesses(false))
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function goToRegisterForm() {
    onClose()
    window.setTimeout(() => {
      document.getElementById('business-register-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
  }

  async function askCopilot() {
    if (!copilotPrompt.trim()) return setCopilotStatus('Tell the Copilot what you want to post.')
    try {
      setCopilotLoading(true)
      setCopilotStatus('Creating a factual draft from your instructions…')
      setCopilotDraft(null)
      const response = await draftBusinessPost(copilotPrompt, businessId)
      setCopilotDraft(response.draft)
      setCopilotStatus(response.draft.missing_fields.length ? `Draft ready. Check the missing details before publishing: ${response.draft.missing_fields.join(', ')}.` : 'Draft ready. Review it before using it.')
    } catch (error) {
      setCopilotStatus(error instanceof Error ? error.message : 'Business Copilot is temporarily unavailable.')
    } finally {
      setCopilotLoading(false)
    }
  }

  function useCopilotDraft() {
    if (!copilotDraft) return
    setType(copilotDraft.type)
    setTitle(copilotDraft.title)
    setBody(copilotDraft.body)
    setCategory(copilotDraft.category || defaultCategory(copilotDraft.type))
    setExpiresAt(expiryFromDays(copilotDraft.expiry_days))
    setRecurrence(copilotDraft.recurrence || '')
    setCopilotStatus('Draft copied into the post form. You are still in control — review and submit when ready.')
  }

  async function submit() {
    try {
      setSubmitting(true)
      setStatus('Checking post details…')
      const details = type === 'job'
        ? { pay: jobPay.trim(), hours: jobHours.trim(), employment_type: employmentType, workplace, job_location: jobLocation.trim(), cv_required: cvRequired }
        : type === 'offer'
          ? { original_price: originalPrice.trim(), offer_price: offerPrice.trim(), redemption: redemption.trim(), terms: terms.trim() }
          : { cost: communityCost.trim(), eligibility: eligibility.trim(), schedule: schedule.trim(), booking: booking.trim() }
      await createPost({
        business_id: businessId,
        type,
        title: title.trim(),
        body: body.trim(),
        category: category.trim(),
        expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
        apply_url: applyUrl.trim(),
        apply_phone: applyPhone.trim(),
        recurrence: recurrence.trim(),
        details,
      })
      setStatus('Submitted. If the post follows HiStreets rules, it goes live automatically. If not, it waits for review.')
      onSubmitted()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not submit post')
    } finally {
      setSubmitting(false)
    }
  }

  const needsRecurrence = type === 'free_meal' || type === 'community'
  const disabled = submitting || !businessId || !title.trim() || !body.trim() || !expiresAt || (needsRecurrence && !recurrence.trim())

  if (!loadingBusinesses && businesses.length === 0) {
    return (
      <div className="bottom-sheet post-composer" role="dialog" aria-modal="true" aria-labelledby="post-composer-empty-title">
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close post composer">×</button>
        <div className="sheet-handle" />
        <h2 id="post-composer-empty-title">Post from your business</h2>
        <div className="empty-action-card">
          <Store size={24} />
          <strong>No verified business yet</strong>
          <p>Register or claim your business first. After verification, you can post offers, jobs, free meals and community support from here.</p>
          <button onClick={goToRegisterForm}>Go to register / claim form</button>
        </div>
        {status && <p className="form-status">{status}</p>}
      </div>
    )
  }

  return (
    <div className="bottom-sheet post-composer" role="dialog" aria-modal="true" aria-labelledby="post-composer-title">
      <button type="button" className="sheet-close" onClick={onClose} aria-label="Close post composer">×</button>
      <div className="sheet-handle" />
      <h2 id="post-composer-title">{type === 'job' ? 'Post a local job' : type === 'offer' ? 'Post an offer' : 'Post locally'}</h2>
      <p className="muted">Verified businesses can post quickly. Posts that pass the safety checks go live; risky or incomplete posts wait for review.</p>

      <label>Verified business
        <select value={businessId} onChange={e => { setBusinessId(e.target.value); setCopilotDraft(null) }} disabled={loadingBusinesses}>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>

      <section className="business-copilot-card" aria-labelledby="business-copilot-title">
        <div className="business-copilot-head"><span><Bot size={20} /></span><div><small>AI assistant</small><h3 id="business-copilot-title">QuickPost with Business Copilot</h3></div></div>
        <p>Write naturally. Example: “20% off biryani after 5pm today” or “need a part-time waiter Friday to Sunday, around 20 hours”.</p>
        <textarea value={copilotPrompt} onChange={e => setCopilotPrompt(e.target.value)} placeholder="Tell HiStreets what you want to post…" maxLength={800} />
        <button type="button" className="copilot-generate" onClick={() => void askCopilot()} disabled={copilotLoading || !businessId}><Sparkles size={17} /> {copilotLoading ? 'Drafting…' : 'Create draft with AI'}</button>
        {copilotDraft && <div className="copilot-preview">
          <small>{copilotDraft.type.replace('_', ' ')} · {copilotDraft.category}</small>
          <strong>{copilotDraft.title}</strong>
          <p>{copilotDraft.body}</p>
          {copilotDraft.missing_fields.length > 0 && <div className="copilot-missing"><b>Before publishing:</b> {copilotDraft.missing_fields.join(', ')}</div>}
          <button type="button" onClick={useCopilotDraft}>Use this draft</button>
        </div>}
        {copilotStatus && <p className="form-status" role="status" aria-live="polite">{copilotStatus}</p>}
        <small className="copilot-trust">AI drafts only from what you provide and your verified business profile. It cannot publish without your review.</small>
      </section>

      <label>Post type
        <select value={type} onChange={e => {
          const next = e.target.value as PostType
          setType(next)
          setCategory(defaultCategory(next))
          setExpiresAt(defaultExpiry(next))
        }}>
          <option value="offer">Offer / discount</option>
          <option value="job">Local job</option>
          <option value="free_meal">Free meal</option>
          <option value="community">Community support</option>
        </select>
      </label>

      <label>Title
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={titlePlaceholder(type)} maxLength={90} />
      </label>

      <label>Description
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={bodyPlaceholder(type)} />
      </label>

      <label>Category
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value={defaultCategory(type)}>{defaultCategory(type)}</option>
          {type === 'job' && <><option value="Hospitality">Hospitality</option><option value="Retail">Retail</option><option value="Office & administration">Office & administration</option><option value="Care & support">Care & support</option><option value="Skilled trade">Skilled trade</option></>}
          {type === 'offer' && <><option value="Food & drink">Food & drink</option><option value="Retail">Retail</option><option value="Beauty & wellbeing">Beauty & wellbeing</option><option value="Local services">Local services</option></>}
          {(type === 'community' || type === 'free_meal') && <><option value="Food support">Food support</option><option value="Advice & support">Advice & support</option><option value="Skills & education">Skills & education</option><option value="Community event">Community event</option></>}
        </select>
      </label>

      <label>End date
        <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
      </label>

      {type === 'job' && <div className="structured-fields" aria-label="Job details">
        <h3>Job details</h3>
        <label>Pay or salary<input value={jobPay} onChange={e => setJobPay(e.target.value)} placeholder="e.g. £12.50 per hour" maxLength={120} /></label>
        <label>Hours<input value={jobHours} onChange={e => setJobHours(e.target.value)} placeholder="e.g. 20 hours per week" maxLength={120} /></label>
        <label>Employment type<select value={employmentType} onChange={e => setEmploymentType(e.target.value)}><option value="">Choose type</option><option>Permanent</option><option>Temporary</option><option>Fixed-term</option><option>Apprenticeship</option><option>Volunteer</option></select></label>
        <label>Workplace<select value={workplace} onChange={e => setWorkplace(e.target.value)}><option>On-site</option><option>Hybrid</option><option>Remote</option></select></label>
        <label>Work location<input value={jobLocation} onChange={e => setJobLocation(e.target.value)} placeholder="Business address or Newham area" maxLength={160} /></label>
        <label className="service-area-toggle"><span><input type="checkbox" checked={cvRequired} onChange={e => setCvRequired(e.target.checked)} /> Require applicants to upload a CV</span><small>Turn this off for entry-level roles where a CV is unnecessary.</small></label>
        <div className="missing-note">Applicants apply inside HiStreets without signing up. They provide name, email and phone/WhatsApp. Your business contacts shortlisted applicants directly.</div>
      </div>}

      {type === 'offer' && <div className="structured-fields" aria-label="Offer details">
        <h3>Offer details</h3>
        <label>Normal price<input value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="Optional, e.g. £20" maxLength={60} /></label>
        <label>Offer price or discount<input value={offerPrice} onChange={e => setOfferPrice(e.target.value)} placeholder="e.g. £15 or 25% off" maxLength={80} /></label>
        <label>How to claim<input value={redemption} onChange={e => setRedemption(e.target.value)} placeholder="e.g. Show this offer in store" maxLength={160} /></label>
        <label>Short terms<textarea value={terms} onChange={e => setTerms(e.target.value)} placeholder="Optional limits or exclusions" maxLength={400} /></label>
      </div>}

      {(type === 'free_meal' || type === 'community') && <div className="structured-fields" aria-label="Community details">
        <h3>Access details</h3>
        <label>Cost<input value={communityCost} onChange={e => setCommunityCost(e.target.value)} placeholder="Free" maxLength={60} /></label>
        <label>Who can attend<input value={eligibility} onChange={e => setEligibility(e.target.value)} placeholder="e.g. Open to all Newham residents" maxLength={180} /></label>
        <label>Days and times<input value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="e.g. Fridays, 12pm–2pm" maxLength={160} /></label>
        <label>Booking or contact<input value={booking} onChange={e => setBooking(e.target.value)} placeholder="e.g. Walk in, no booking required" maxLength={180} /></label>
      </div>}

      {type === 'job' && <>
        <label>Optional external apply link
          <input value={applyUrl} onChange={e => setApplyUrl(e.target.value)} placeholder="Optional: https://…" />
        </label>
        <label>Optional business contact for questions
          <input value={applyPhone} onChange={e => setApplyPhone(e.target.value)} placeholder="Optional phone or WhatsApp" />
        </label>
      </>}

      {needsRecurrence && <label>When is this available?
        <input value={recurrence} onChange={e => setRecurrence(e.target.value)} placeholder="e.g. Every Saturday 12–2pm" />
      </label>}

      <button onClick={submit} disabled={disabled}><Send size={17} /> Submit post</button>
      {status && <p className="form-status">{status}</p>}
    </div>
  )
}
