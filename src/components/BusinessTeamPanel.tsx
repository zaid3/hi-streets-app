import { useEffect, useMemo, useState } from 'react'
import { Clock3, MailPlus, ShieldCheck, Trash2, UserRoundCog, Users } from 'lucide-react'
import { loadMyVerifiedBusinesses } from '../lib/data'
import { inviteBusinessMember, loadBusinessTeam, loadWorkspaceRefs, removeBusinessMember, revokeBusinessInvitation, updateBusinessMemberRole } from '../lib/workspaces'
import type { Business, BusinessMemberRole, BusinessTeamRecord, BusinessWorkspaceRef } from '../types'

const inviteRoles: Array<{ value: 'manager' | 'editor' | 'viewer'; label: string; help: string }> = [
  { value: 'manager', label: 'Manager', help: 'Profile, content, applicants and invitations' },
  { value: 'editor', label: 'Editor', help: 'Profile and content publishing' },
  { value: 'viewer', label: 'Viewer', help: 'Analytics and business information only' },
]

export default function BusinessTeamPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [refs, setRefs] = useState<BusinessWorkspaceRef[]>([])
  const [businessId, setBusinessId] = useState('')
  const [members, setMembers] = useState<BusinessTeamRecord[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'editor' | 'viewer'>('manager')
  const [working, setWorking] = useState('')
  const [status, setStatus] = useState('Loading your team…')

  useEffect(() => {
    Promise.all([loadMyVerifiedBusinesses(), loadWorkspaceRefs()]).then(([businessRows, workspaceRefs]) => {
      setBusinesses(businessRows); setRefs(workspaceRefs); setBusinessId(businessRows[0]?.id || '')
      if (!businessRows.length) setStatus('Connect and verify a business before inviting teammates.')
    }).catch(() => setStatus('Team access is temporarily unavailable.'))
  }, [])

  async function refresh(id = businessId) {
    if (!id) return
    try { setMembers(await loadBusinessTeam(id)); setStatus('') }
    catch { setStatus('Could not load this business team.') }
  }
  useEffect(() => { if (businessId) void refresh(businessId) }, [businessId])

  const myRole = useMemo(() => refs.find(item => item.business_id === businessId)?.membership_role || 'viewer', [refs, businessId])
  const canInvite = myRole === 'owner' || myRole === 'manager'
  const isOwner = myRole === 'owner'

  async function invite() {
    if (!businessId || !email.trim() || working) return
    try {
      setWorking('invite'); setStatus('Sending invitation…')
      const result = await inviteBusinessMember(businessId, email.trim(), role)
      setEmail(''); await refresh()
      setStatus(result.delivery === 'email' ? 'Invitation sent by email.' : 'Invitation created. This existing user will see it when they sign in.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not send the invitation.') }
    finally { setWorking('') }
  }

  async function changeRole(member: BusinessTeamRecord, nextRole: BusinessMemberRole) {
    if (!member.user_id || working || !window.confirm(`Change ${member.email || member.display_name} to ${nextRole}?`)) return
    try { setWorking(member.record_id); await updateBusinessMemberRole(businessId, member.user_id, nextRole); await refresh(); setStatus('Team access updated.') }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Could not update team access.') }
    finally { setWorking('') }
  }

  async function remove(member: BusinessTeamRecord) {
    if (!member.user_id || working || !window.confirm(`Remove ${member.email || member.display_name} from this business?`)) return
    try { setWorking(member.record_id); await removeBusinessMember(businessId, member.user_id); await refresh(); setStatus('Team member removed.') }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Could not remove this team member.') }
    finally { setWorking('') }
  }

  async function revoke(member: BusinessTeamRecord) {
    if (working || !window.confirm(`Revoke the invitation for ${member.email}?`)) return
    try { setWorking(member.record_id); await revokeBusinessInvitation(businessId, member.record_id); await refresh(); setStatus('Invitation revoked.') }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Could not revoke this invitation.') }
    finally { setWorking('') }
  }

  return <section className="workspace-card team-panel" aria-labelledby="team-title">
    <div className="workspace-section-head"><div><span className="eyebrow"><Users size={14} /> Business workspace</span><h2 id="team-title">Team & access</h2><p>Invite people to this business without sharing your password or giving them platform-wide access.</p></div>{businesses.length > 1 && <label>Business<select value={businessId} onChange={event => setBusinessId(event.target.value)}>{businesses.map(business => <option value={business.id} key={business.id}>{business.name}</option>)}</select></label>}</div>
    {canInvite && businessId && <div className="invite-panel"><div><MailPlus size={20} /><div><strong>Invite a teammate</strong><span>They receive access only to this business.</span></div></div><div className="invite-fields"><label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="teammate@example.com" autoComplete="email" /></label><label>Access<select value={role} onChange={event => setRole(event.target.value as typeof role)}>{inviteRoles.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><button type="button" onClick={() => void invite()} disabled={working === 'invite' || !email.trim()}><MailPlus size={17} />{working === 'invite' ? 'Sending…' : 'Send invitation'}</button></div><p className="role-help"><ShieldCheck size={15} />{inviteRoles.find(item => item.value === role)?.help}</p></div>}
    {status && <p className="form-status" role="status">{status}</p>}
    <div className="team-list">{members.map(member => <article key={member.record_id} className="team-row"><div className="team-avatar">{(member.display_name || member.email).slice(0, 1).toUpperCase()}</div><div><strong>{member.display_name || member.email.split('@')[0]}</strong><span>{member.email}</span><small>{member.kind === 'invitation' ? <><Clock3 size={13} /> Invitation pending · {member.member_role}</> : <><UserRoundCog size={13} /> {member.member_role}</>}</small></div><div className="team-actions">{member.kind === 'member' && isOwner && member.user_id ? <><select aria-label={`Access for ${member.email}`} value={member.member_role} disabled={working === member.record_id} onChange={event => void changeRole(member, event.target.value as BusinessMemberRole)}><option value="owner">Owner</option><option value="manager">Manager</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button className="icon-danger" type="button" aria-label={`Remove ${member.email}`} disabled={working === member.record_id} onClick={() => void remove(member)}><Trash2 size={17} /></button></> : member.kind === 'invitation' && canInvite ? <button type="button" className="text-danger" disabled={working === member.record_id} onClick={() => void revoke(member)}>Revoke</button> : <span className="access-pill">{member.member_role}</span>}</div></article>)}</div>
    {!members.length && businessId && !status && <div className="dashboard-notice"><Users size={19} /><span>No team members yet. Invite someone when you are ready to share the workload.</span></div>}
    <div className="permission-guide">{inviteRoles.map(item => <div key={item.value}><strong>{item.label}</strong><span>{item.help}</span></div>)}</div>
  </section>
}
