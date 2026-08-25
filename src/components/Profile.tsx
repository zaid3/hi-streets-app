import { useEffect, useState } from 'react'
import { ArrowRight, Building2, KeyRound, Link2, LockKeyhole, LogOut, ShieldCheck, Sparkles, UserPlus } from 'lucide-react'
import { getCurrentRole } from '../lib/data'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { PostType, Role } from '../types'
import AdminOwnershipRequests from './AdminOwnershipRequests'
import AdminPanel from './AdminPanel'
import AdminUserManagement from './AdminUserManagement'
import BusinessOnboarding from './BusinessOnboarding'
import BusinessPostingDashboard from './BusinessPostingDashboard'
import JobApplicationsPanel from './JobApplicationsPanel'
import OwnerBusinessProfile from './OwnerBusinessProfile'

type Props = { onPost: (type: PostType) => void }
type LoginMode = 'link' | 'password' | 'signup'

function cleanBusinessUrl() {
  if (window.location.pathname === '/business' && window.location.search) {
    window.history.replaceState({}, '', '/business')
  }
}

export default function Profile({ onPost }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [mode, setMode] = useState<LoginMode>('link')
  const [signedIn, setSignedIn] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)
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
    const recoveryRequested = new URLSearchParams(window.location.search).get('mode') === 'recovery'
    supabase.auth.getUser().then(({ data }) => {
      if (recoveryRequested && data.user) setRecoveryMode(true)
      void resolveSession(Boolean(data.user))
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      window.setTimeout(() => { void resolveSession(Boolean(session?.user)) }, 0)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  function switchMode(next: LoginMode) {
    setMode(next)
    setPassword('')
    setConfirmPassword('')
    setMessage('')
  }

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
      setMessage(error ? error.message : 'Check your email. Open the HiStreets link on this device to finish signing in. First-time users are created automatically.')
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
      if (error) return setMessage(error.message === 'Invalid login credentials' ? 'Email or password is incorrect. If this is your first visit, create an account or use the secure email link.' : error.message)
      setPassword('')
      setMessage('Signed in.')
    } finally { setWorking(false) }
  }

  async function createAccount() {
    if (!supabaseConfigured || !supabase) return setMessage('HiStreets secure access is not configured.')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return setMessage('Enter your email address.')
    if (password.length < 8) return setMessage('Choose a password with at least 8 characters.')
    if (password !== confirmPassword) return setMessage('The passwords do not match.')
    try {
      setWorking(true)
      setMessage('Creating your secure HiStreets account…')
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/business` },
      })
      if (error) return setMessage(error.message)
      setPassword('')
      setConfirmPassword('')
      setMessage(data.session ? 'Account created. You are signed in.' : 'Account created. Check your email to confirm your address, then return to HiStreets.')
    } finally { setWorking(false) }
  }

  async function sendPasswordReset() {
    if (!supabaseConfigured || !supabase) return setMessage('HiStreets secure access is not configured.')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return setMessage('Enter your email address first, then choose Forgot password.')
    try {
      setWorking(true)
      setMessage('Sending a password reset link…')
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/business?mode=recovery`,
      })
      setMessage(error ? error.message : 'If an account exists for that email, a password reset link has been sent. Open it on this device.')
    } finally { setWorking(false) }
  }

  async function updateRecoveredPassword() {
    if (!supabaseConfigured || !supabase) return setMessage('HiStreets secure access is not configured.')
    if (newPassword.length < 8) return setMessage('Choose a new password with at least 8 characters.')
    if (newPassword !== confirmNewPassword) return setMessage('The new passwords do not match.')
    try {
      setWorking(true)
      setMessage('Updating your password…')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return setMessage(error.message)
      setNewPassword('')
      setConfirmNewPassword('')
      setRecoveryMode(false)
      cleanBusinessUrl()
      setMessage('Password updated successfully. Your business workspace is ready.')
    } finally { setWorking(false) }
  }

  async function cancelRecovery() {
    if (supabase) await supabase.auth.signOut()
    setRecoveryMode(false)
    setSignedIn(false)
    setRole(null)
    setNewPassword('')
    setConfirmNewPassword('')
    cleanBusinessUrl()
    setMessage('')
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setSignedIn(false); setRole(null); setPassword(''); setMessage('Signed out.')
  }

  if (authLoading) return <section className="profile-screen business-shell"><div className="auth-loading-card"><ShieldCheck size={30} /><strong>Securing your HiStreets workspace…</strong></div></section>

  if (recoveryMode) return (
    <section className="profile-screen business-shell auth-screen auth-recovery-screen">
      <div className="auth-brand-panel">
        <span className="portal-mark"><Building2 size={20} /> HiStreets for Business</span>
        <h1>Reset password</h1>
        <h2 className="auth-hero-title">Choose a new secure password.</h2>
        <p>This recovery session is temporary. Set your new password and continue directly to your business workspace.</p>
      </div>
      <div className="auth-card auth-card-final">
        <div className="auth-card-title"><span><KeyRound size={22} /></span><div><small>Secure recovery</small><h2>Set new password</h2></div></div>
        <label className="auth-field"><span>New password</span><input type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" /></label>
        <label className="auth-field"><span>Confirm new password</span><input type="password" autoComplete="new-password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Repeat your new password" onKeyDown={e => { if (e.key === 'Enter') void updateRecoveredPassword() }} /></label>
        <button className="auth-primary" type="button" onClick={() => void updateRecoveredPassword()} disabled={working}><span>{working ? 'Updating…' : 'Update password'}</span><ArrowRight size={18} /></button>
        <button className="auth-secondary-link" type="button" onClick={() => void cancelRecovery()}>Back to sign in</button>
        {message && <p className="form-status auth-status" role="status" aria-live="polite">{message}</p>}
      </div>
    </section>
  )

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
        <div className="auth-card-title"><span>{mode === 'signup' ? <UserPlus size={22} /> : <ShieldCheck size={22} />}</span><div><small>Secure business portal</small><h2>{mode === 'signup' ? 'Create your HiStreets account' : 'Sign in to HiStreets'}</h2></div></div>
        <p className="auth-intro">Business owners and HiStreets admins use this page. Residents never need an account to browse the public app.</p>

        <div className="login-mode-switch login-mode-switch-three" role="tablist" aria-label="Choose account access method">
          <button className={mode === 'link' ? 'active' : ''} onClick={() => switchMode('link')} type="button"><Link2 size={16} /> Email link</button>
          <button className={mode === 'password' ? 'active' : ''} onClick={() => switchMode('password')} type="button"><KeyRound size={16} /> Password</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')} type="button"><UserPlus size={16} /> Create account</button>
        </div>

        <label className="auth-field"><span>Email address</span><input type="email" inputMode="email" autoCapitalize="none" autoComplete="email" placeholder="name@business.co.uk" value={email} onChange={e => setEmail(e.target.value)} /></label>

        {(mode === 'password' || mode === 'signup') && <label className="auth-field"><span>Password</span><input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && mode === 'password') void passwordLogin() }} /></label>}
        {mode === 'signup' && <label className="auth-field"><span>Confirm password</span><input type="password" autoComplete="new-password" placeholder="Repeat your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void createAccount() }} /></label>}

        {mode === 'link' && <button className="auth-primary" type="button" onClick={() => void sendMagicLink()} disabled={working}><span>{working ? 'Sending…' : 'Send secure login link'}</span><ArrowRight size={18} /></button>}
        {mode === 'password' && <button className="auth-primary" type="button" onClick={() => void passwordLogin()} disabled={working}><span>{working ? 'Signing in…' : 'Sign in with password'}</span><ArrowRight size={18} /></button>}
        {mode === 'signup' && <button className="auth-primary" type="button" onClick={() => void createAccount()} disabled={working}><span>{working ? 'Creating…' : 'Create business account'}</span><ArrowRight size={18} /></button>}

        {mode === 'password' && <button className="auth-secondary-link forgot-password-link" type="button" onClick={() => void sendPasswordReset()} disabled={working}>Forgot password?</button>}
        <div className="auth-help"><strong>{mode === 'link' ? 'Fastest first-time access' : mode === 'password' ? 'Prefer passwordless access?' : 'Creating an account?'}</strong><span>{mode === 'link' ? 'The secure email link can create your account automatically. No password is required.' : mode === 'password' ? 'Switch to Email link at any time. You can also reset a forgotten password above.' : 'Use your business email where possible. You may be asked to confirm the email before signing in.'}</span></div>
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
      <BusinessOnboarding />
      <div className="portal-section-label"><span>2</span><div><strong>Manage & grow</strong><small>Update your public profile and use local intelligence.</small></div></div>
      <OwnerBusinessProfile />
      <BusinessPostingDashboard onPost={onPost} />
      <JobApplicationsPanel />
      {message && <p className="form-status">{message}</p>}
      <footer className="portal-footer"><a href="/privacy.html">Privacy policy</a><span>·</span><a href="/terms.html">Terms</a></footer>
    </section>
  )
}
