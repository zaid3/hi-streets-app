import { useEffect, useState } from 'react'
import { Building2, MailCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { acceptBusinessInvitations } from '../lib/workspaces'

type Invitation = { id: string; business_id: string; role: string; expires_at: string; businesses?: { name?: string } | null }

export default function BusinessInvitationInbox() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [status, setStatus] = useState('')
  const [working, setWorking] = useState(false)
  useEffect(() => {
    if (!supabase) return
    supabase.from('business_invitations').select('id,business_id,role,expires_at,businesses(name)').eq('status', 'pending').gt('expires_at', new Date().toISOString()).then(({ data }) => setInvitations((data || []) as Invitation[]))
  }, [])
  if (!invitations.length && !status) return null
  async function accept() {
    try { setWorking(true); const count = await acceptBusinessInvitations(); setInvitations([]); setStatus(`${count} business invitation${count === 1 ? '' : 's'} accepted. Refreshing your workspace…`); window.setTimeout(() => window.location.reload(), 700) }
    catch { setStatus('Could not accept the invitation. Ask the business owner to send it again.') }
    finally { setWorking(false) }
  }
  return <section className="invitation-inbox" aria-labelledby="invitation-title"><MailCheck size={23} /><div><h2 id="invitation-title">You have a business invitation</h2>{invitations.map(item => <p key={item.id}><Building2 size={15} /> <strong>{item.businesses?.name || 'HiStreets business'}</strong> · {item.role} access</p>)}{status && <p role="status">{status}</p>}</div>{invitations.length > 0 && <button type="button" disabled={working} onClick={() => void accept()}>{working ? 'Accepting…' : 'Accept invitation'}</button>}</section>
}
