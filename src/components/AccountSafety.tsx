import { useState } from 'react'
import { setBusinessBlocked, useBlockedBusinesses } from '../lib/contentSafety'
import AccountDeletionRequest from './AccountDeletionRequest'

export default function AccountSafety() {
  const blocked = useBlockedBusinesses()
  const [message, setMessage] = useState('')
  return <section className="privacy-card account-safety" aria-labelledby="account-safety-title">
    <h2 id="account-safety-title">Privacy & safety</h2>
    <p>Manage your account, data and blocked businesses.</p>
    <AccountDeletionRequest />
    <details><summary>Blocked businesses ({blocked.length})</summary>
      <p>Blocks apply to this device. Unblocking makes that business and its posts visible again.</p>
      {blocked.map(id => <div className="blocked-row" key={id}><span>Business {id.slice(0, 8)}</span><button type="button" onClick={() => {
        try { setBusinessBlocked(id, false) } catch { setMessage('Could not save this choice.') }
      }}>Unblock</button></div>)}
    </details>
    {message && <p role="alert">{message}</p>}
  </section>
}
