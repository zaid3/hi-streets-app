import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { createPost, loadMyVerifiedBusinesses } from '../lib/data'
import type { Business, PostType } from '../types'

type Props = {
  onClose: () => void
  onSubmitted: () => void
}

function defaultExpiry() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export default function PostComposer({ onClose, onSubmitted }: Props) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [type, setType] = useState<PostType>('offer')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('')
  const [expiresAt, setExpiresAt] = useState(defaultExpiry())
  const [applyUrl, setApplyUrl] = useState('')
  const [applyPhone, setApplyPhone] = useState('')
  const [recurrence, setRecurrence] = useState('')
  const [status, setStatus] = useState('Loading your verified businesses…')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadMyVerifiedBusinesses().then(rows => {
      setBusinesses(rows)
      setBusinessId(rows[0]?.id || '')
      setStatus(rows.length ? '' : 'No verified business found. Claim and verify a business before posting.')
    }).catch(() => setStatus('Could not load your verified businesses.'))
  }, [])

  async function submit() {
    try {
      setSubmitting(true)
      setStatus('Submitting for review…')
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
      setStatus('Submitted. It is pending admin review.')
      onSubmitted()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not submit post')
    } finally {
      setSubmitting(false)
    }
  }

  const needsApply = type === 'job'
  const needsRecurrence = type === 'free_meal' || type === 'community'
  const disabled = submitting || !businessId || !title.trim() || !body.trim() || !expiresAt || (needsApply && !applyUrl.trim() && !applyPhone.trim())

  return (
    <div className="bottom-sheet post-composer">
      <button className="sheet-close" onClick={onClose}>×</button>
      <div className="sheet-handle" />
      <h2>Post from verified business</h2>
      <p className="muted">Offers, jobs and community posts must come from a verified claimed listing.</p>

      <label>Verified business
        <select value={businessId} onChange={e => setBusinessId(e.target.value)}>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>

      <label>Post type
        <select value={type} onChange={e => setType(e.target.value as PostType)}>
          <option value="offer">Offer</option>
          <option value="job">Job</option>
          <option value="free_meal">Free meal</option>
          <option value="community">Community support</option>
        </select>
      </label>

      <label>Title
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 20% off lunch today" maxLength={90} />
      </label>

      <label>Description
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write the key details clearly…" />
      </label>

      <label>Category
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Food, retail, youth job" />
      </label>

      <label>End date
        <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
      </label>

      {needsApply && <>
        <label>Apply link
          <input value={applyUrl} onChange={e => setApplyUrl(e.target.value)} placeholder="https://…" />
        </label>
        <label>Apply phone
          <input value={applyPhone} onChange={e => setApplyPhone(e.target.value)} placeholder="Phone number for applications" />
        </label>
      </>}

      {needsRecurrence && <label>Recurrence
        <input value={recurrence} onChange={e => setRecurrence(e.target.value)} placeholder="e.g. Every Saturday 12–2pm" />
      </label>}

      <button onClick={submit} disabled={disabled}><Send size={17} /> Submit for review</button>
      {status && <p className="form-status">{status}</p>}
    </div>
  )
}
