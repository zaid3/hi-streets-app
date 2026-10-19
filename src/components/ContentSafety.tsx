import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Flag, ShieldOff, X } from 'lucide-react'
import { setBusinessBlocked, submitContentReport, type ReportTarget } from '../lib/contentSafety'

export default function ContentSafety({ target, businessId }: { target: ReportTarget; businessId?: string | null }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  function closeReport() { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()) }
  return <div className="content-safety-actions">
    <button ref={trigger} type="button" onClick={() => setOpen(true)}><Flag size={16} />{target.kind === 'ai' ? 'Report AI response' : 'Report'}</button>
    {businessId && <button type="button" onClick={() => {
      if (!window.confirm('Block this business? Its listing and posts will be hidden on this device. You can unblock it in Business → Privacy & safety.')) return
      try { setBusinessBlocked(businessId, true) } catch { setMessage('Could not save this choice. Device storage may be unavailable.') }
    }}><ShieldOff size={16} />Block business</button>}
    {message && <p role="alert">{message}</p>}
    {open && createPortal(<ReportDialog target={target} onClose={closeReport} />, document.body)}
  </div>
}

function ReportDialog({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState('misleading')
  const [details, setDetails] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close() }, [])
  async function send() {
    setSending(true); setMessage('')
    try { await submitContentReport(target, reason, details); setSent(true); setMessage('Report received. The HiStreets team will review it.') }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Report could not be sent.') }
    finally { setSending(false) }
  }
  return <dialog ref={ref} className="safety-dialog" role="dialog" aria-labelledby="report-title" onCancel={onClose}>
    <button type="button" className="safety-close" aria-label="Close report" onClick={onClose}><X size={22} /></button>
    <h2 id="report-title">Report {target.kind === 'ai' ? 'AI response' : target.kind}</h2>
    <p>{target.label}</p>
    {!sent && <>
      <label>Reason<select value={reason} onChange={e => setReason(e.target.value)}>
        <option value="misleading">Misleading or fraudulent</option><option value="unsafe">Unsafe or illegal</option>
        <option value="abuse">Abuse, hate or harassment</option><option value="sexual">Sexual or exploitative content</option>
        <option value="privacy">Personal information or privacy</option><option value="spam">Spam</option><option value="other">Other</option>
      </select></label>
      <label>Details (optional)<textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={1500} placeholder="Tell us what needs reviewing. Do not include passwords or private documents." /></label>
      {target.kind === 'ai' && <p>The displayed AI response will be included. Your original question is not attached automatically.</p>}
      <button type="button" className="safety-primary" disabled={sending} onClick={() => void send()}>{sending ? 'Sending…' : 'Send report'}</button>
    </>}
    {message && <p role={sent ? 'status' : 'alert'}>{message}</p>}
    {sent && <button type="button" onClick={onClose}>Done</button>}
  </dialog>
}
