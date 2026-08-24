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
  const [status, setStatus] = useState('Loading your approved businesses…')
  const [submitting, setSubmitting] = useState(false)
  const [copilotPrompt, setCopilotPrompt] = useState('')
  const [copilotDraft, setCopilotDraft] = useState<BusinessCopilotDraft | null>(null)
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotStatus, setCopilotStatus] = useState('')

  useEffect(() => {
    loadMyVerifiedBusinesses().then(rows => {
      setBusinesses(rows)
      setBusinessId(rows[0]?.id || '')
      setStatus(rows.length ? '' : 'No approved business found yet.')
    }).catch(() => setStatus('Could not load your approved businesses.')).finally(() => setLoadingBusinesses(false))
  }, [])

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
      <div className="bottom-sheet post-composer">
        <button className="sheet-close" onClick={onClose}>×</button>
        <div className="sheet-handle" />
        <h2>Post from your business</h2>
        <div className="empty-action-card">
          <Store size={24} />
          <strong>No approved business yet</strong>
          <p>Register or claim your business first. After Super Admin approval, you can post offers, jobs, free meals and community support from here.</p>
          <button onClick={goToRegisterForm}>Go to register / claim form</button>
        </div>
        {status && <p className="form-status">{status}</p>}
      </div>
    )
  }

  return (
    <div className="bottom-sheet post-composer">
      <button className="sheet-close" onClick={onClose}>×</button>
      <div className="sheet-handle" />
      <h2>{type === 'job' ? 'Post a local job' : type === 'offer' ? 'Post an offer' : 'Post locally'}</h2>
      <p className="muted">Approved businesses can post quickly. Clean posts go live automatically. Risky or incomplete posts wait for review.</p>

      <label>Approved business
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
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Food, retail, youth job" />
      </label>

      <label>End date
        <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
      </label>

      {type === 'job' && <div className="missing-note">Applicants apply inside HiStreets without sign-up. They must provide name, email, phone/WhatsApp and CV. Your business contacts them directly if shortlisted.</div>}

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
