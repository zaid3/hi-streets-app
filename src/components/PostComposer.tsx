import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
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

  useEffect(() => {
    loadMyVerifiedBusinesses().then(rows => {
      setBusinesses(rows)
      setBusinessId(rows[0]?.id || '')
      setStatus(rows.length ? '' : 'No approved business found. Register your business first. Once approved, you can post.')
    }).catch(() => setStatus('Could not load your approved businesses.'))
  }, [])

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

  return (
    <div className="bottom-sheet post-composer">
      <button className="sheet-close" onClick={onClose}>×</button>
      <div className="sheet-handle" />
      <h2>{type === 'job' ? 'Post a local job' : type === 'offer' ? 'Post an offer' : 'Post locally'}</h2>
      <p className="muted">Approved businesses can post quickly. Clean posts go live automatically. Risky or incomplete posts wait for review.</p>

      <label>Approved business
        <select value={businessId} onChange={e => setBusinessId(e.target.value)}>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>

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
