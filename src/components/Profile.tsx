import { useEffect, useState } from 'react'
import { ArrowRight, Building2, KeyRound, Link2, LockKeyhole, LogOut, ShieldCheck, Sparkles } from 'lucide-react'
import { getCurrentRole } from '../lib/data'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { PostType, Role } from '../types'
import AdminOwnershipRequests from './AdminOwnershipRequests'
import AdminPanel from './AdminPanel'
import AdminUserManagement from './AdminUserManagement'
import BusinessOwnershipRequest from './BusinessOwnershipRequest'
import BusinessPostingDashboard from './BusinessPostingDashboard'
import BusinessRegistration from './BusinessRegistration'
import JobApplicationsPanel from './JobApplicationsPanel'
import OwnerBusinessProfile from './OwnerBusinessProfile'

type Props = { onPost: (type: PostType) => void }
type LoginMode = 'link' | 'password'

export default function Profile({ onPost }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<LoginMode>('link')
  const [signedIn, setSignedIn] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')

  async function resolveSession(hasUser: boolean) {
    setSignedIn(hasUser)
    if (!hasUser) { setRole(null); setAuthLoading(false); return }
    setAuthLoading(true)
    try { setRole(await getCurrentRole()) }
    finally { setAuthLoading(false) }
  }

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    supabase.auth.getUser().then(({ data }) => void resolveSession(Boolean(data.user)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void resolveSession(Boolean(session?.user)) }, 0)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function sendMagicLink() {
    if (!supabaseConfigured || !supabase) return setMessage('HiStreets secure access is not configured.')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return setMessage('Enter your email address first.')
    try {
      setWorking(true)
      setMessage('Sending your secure access link…')
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: `${window.location.origin}/business`, shouldCreateUser: true },
      })
      setMessage(error ? error.message : 'Check your email. Open the HiStreets link on this device to finish signing in. First-time business users are created automatically.')
    } finally { setWorking(false) }
  }

  async function passwordLogin() {
    if (!supabaseConfigured || !supabase) return setMessage('HiStreets secure access is not configured.')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) return setMessage('Enter both email and password.')
    try {
      setWorking(true)
      setMessage('Signing in securely…')
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (error) return setMessage(error.message === 'Invalid login credentials' ? 'Email or password is incorrect. If this is your first visit, use the secure email link instead.' : error.message)
      setPassword('')
      setMessage('Signed in.')
    } finally { setWorking(false) }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setSignedIn(false); setRole(null); setPassword(''); setMessage('Signed out.')
  }

  if (authLoading) return <section className="profile-screen business-shell"><div className="auth-loading-card"><ShieldCheck size={30} /><strong>Securing your HiStreets workspace…</strong></div></section>

  if (!signedIn) return (
    <section className="profile-screen business-shell auth-screen">
      <div className="auth-brand-panel">
        <span className="portal-mark"><Building2 size={20} /> HiStreets for Business</span>
        <h1>Business access</h1>
        <h2 className="auth-hero-title">One secure place to run your local presence.</h2>
        <p>Claim or register your business, publish local offers and jobs, use Business Copilot, and respond to real local demand signals.</p>
        <div className="auth-feature-row"><span><Sparkles size={16} /> AI-assisted posting</span><span><ShieldCheck size={16} /> Verified businesses</span><span><LockKeyhole size={16} /> Private admin controls</span></div>
      </div>

      <div className="auth-card auth-card-final">
        <div className="auth-card-title"><span><ShieldCheck size={22} /></span><div><small>Secure business portal</small><h2>Sign in to HiStreets</h2></div></div>
        <p className="auth-intro">Business owners and HiStreets admins use this page. Residents never need an account to browse the public app.</p>

        <div className="login-mode-switch" role="tablist" aria-label="Choose sign in method">
          <button className={mode === 'link' ? 'active' : ''} onClick={() => { setMode('link'); setMessage('') }} type="button"><Link2 size={16} /> Email link</button>
          <button className={mode === 'password' ? 'active' : ''} onClick={() => { setMode('password'); setMessage('') }} type="button"><KeyRound size={16} /> Password</button>
        </div>

        <label className="auth-field"><span>Email address</span><input type="email" inputMode="email" autoCapitalize="none" autoComplete="email" placeholder="name@business.co.uk" value={email} onChange={e => setEmail(e.target.value)} /></label>

        {mode === 'password' && <label className="auth-field"><span>Password</span><input type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void passwordLogin() }} /></label>}

        {mode === 'link' ? <button className="auth-primary" type="button" onClick={() => void sendMagicLink()} disabled={working}><span>{working ? 'Sending…' : 'Send secure login link'}</span><ArrowRight size={18} /></button> : <button className="auth-primary" type="button" onClick={() => void passwordLogin()} disabled={working}><span>{working ? 'Signing in…' : 'Sign in with password'}</span><ArrowRight size={18} /></button>}

        <div className="auth-help"><strong>{mode === 'link' ? 'First time here?' : 'No password yet?'}</strong><span>{mode === 'link' ? 'The secure email link creates your business access account safely. No separate sign-up form is needed.' : 'Switch to Email link. It is the recommended first-time access method.'}</span></div>
        {message && <p className="form-status auth-status" role="status" aria-live="polite">{message}</p>}
        <p className="tiny-links"><a href="/privacy.html">Privacy</a><span>·</span><a href="/terms.html">Terms</a></p>
      </div>
    </section>
  )

  if (role === 'admin' || role === 'super_admin') return (
    <section className="profile-screen business-shell admin-workspace">
      <header className="portal-header">
        <div><span className="eyebrow"><ShieldCheck size={14} /> {role === 'super_admin' ? 'Developer control centre' : 'Admin workspace'}</span><h1>{role === 'super_admin' ? 'Super Admin' : 'Admin'}</h1><p>Manage users, businesses, ownership, posts and applications from one responsive workspace.</p></div>
        <button className="portal-signout" onClick={() => void signOut()}><LogOut size={17} /> Sign out</button>
      </header>
      {role === 'super_admin' && <AdminUserManagement />}
      <AdminOwnershipRequests />
      <AdminPanel />
      <JobApplicationsPanel />
      {message && <p className="form-status">{message}</p>}
    </section>
  )

  return (
    <section className="profile-screen business-shell owner-workspace">
      <header className="portal-header">
        <div><span className="eyebrow"><Building2 size={14} /> Business workspace</span><h1>Your HiStreets business</h1><p>Claim or register once, then manage your profile, AI-assisted posts and job applications here.</p></div>
        <button className="portal-signout" onClick={() => void signOut()}><LogOut size={17} /> Sign out</button>
      </header>
      <div className="portal-section-label"><span>1</span><div><strong>Connect your business</strong><small>Claim an existing listing or register a new one.</small></div></div>
      <BusinessOwnershipRequest />
      <BusinessRegistration />
      <div className="portal-section-label"><span>2</span><div><strong>Manage & grow</strong><small>Update your public profile and use local intelligence.</small></div></div>
      <OwnerBusinessProfile />
      <BusinessPostingDashboard onPost={onPost} />
      <JobApplicationsPanel />
      {message && <p className="form-status">{message}</p>}
      <footer className="portal-footer"><a href="/privacy.html">Privacy policy</a><span>·</span><a href="/terms.html">Terms</a></footer>
    </section>
  )
}
