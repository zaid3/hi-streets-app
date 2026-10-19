import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'
import '../auth-feedback.css'

type Props = { message: string; working: boolean; emailWait: number; onDismiss: () => void }

export default function AuthFeedback({ message, working, emailWait, onDismiss }: Props) {
  if (!message) return null
  // The Business screen owns its scroll area. A body portal keeps feedback in
  // the viewport even when that screen is scrolled to a form's submit button.
  return createPortal(
    <aside className="auth-feedback" aria-label="Account notification">
      <Info size={22} aria-hidden="true" />
      <div>
        <p role="status" aria-live="polite" aria-atomic="true">{message}</p>
        {emailWait > 0 && <p className="auth-feedback-timer" aria-live="off">You can request another email in {emailWait}s.</p>}
      </div>
      <button type="button" aria-label="Dismiss notification" disabled={working} onClick={onDismiss}><X size={20} aria-hidden="true" /></button>
    </aside>,
    document.body,
  )
}
