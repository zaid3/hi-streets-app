import { useEffect, useState } from 'react'
import { ArrowRight, BarChart3, BriefcaseBusiness, Building2, ClipboardCheck, FilePenLine, KeyRound, LockKeyhole, LogOut, ShieldCheck, Sparkles, Store, UserPlus, Users } from 'lucide-react'
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
import BusinessAnalyticsDashboard from './BusinessAnalyticsDashboard'
import PlatformAnalyticsDashboard from './PlatformAnalyticsDashboard'
import BusinessTeamPanel from './BusinessTeamPanel'
import BusinessInvitationInbox from './BusinessInvitationInbox'

type Props = { onPost: (type: PostType) => void }
type LoginMode = 'signin' | 'signup'
type OwnerSection = 'overview' | 'profile' | 'content' | 'applications' | 'team'
type AdminSection = 'overview' | 'queue' | 'applications' | 'users'

const PASSWORD_MIN_LENGTH = 12
const PROJECT_WEBSITE = 'https://histreets.uk/'
const PROJECT_GITHUB = 'https://github.com/zaid3/hi-streets-app'

function cleanBusinessUrl() {
  if (window.location.pathname === '/business' && window.location.search) {
    window.history.replaceState({}, '', '/business')
  }
}

function ProjectLinks() {
  return (
    <nav className="project-links" aria-label="HiStreets project links">
      <a href={PROJECT_WEBSITE} target="_blank" rel="noreferrer">HiStreets website</a>
      <span aria-hidden="true">·</span>
      <a href={PROJECT_GITHUB} target="_blank" rel="noreferrer">Open source on GitHub</a>
      <span aria-hidden="true">·</span>
      <a href="/privacy.html">Privacy</a>
      <span aria-hidden="true">·</span>
      <a href="/terms.html">Terms</a>
    </nav>
  )
}

export default function Profile({ onPost }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpRequested, setOtpRequested] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [mode, setMode] = useState<LoginMode>('signin')
  const [signedIn, setSignedIn] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [message, setMessage] = useState('')
  const [ownerSection, setOwnerSection] = useState<OwnerSection>('overview')
  const [adminSection, setAdminSection] = useState<AdminSection>('overview')

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
    setOtp('')
    setOtpRequested(false)
    setConfirmPassword('')
    setMessage('')
  }

  async function sendEmailCode() {
    if (!supabaseConfigured || !supabase) return setMessage('Secure sign-in is not available right now.')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return setMessage('Enter your email address first.')
    try {
      setWorking(true)
      setMessage('Sending your email sign-in code…')
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false },
      })
      if (error) return setMessage('We could not send the sign-in code right now. Check the email or try your password.')
      setOtp('')
      setOtpRequested(true)
      setMessage('If this email has a HiStreets account, a sign-in code is on its way.')
    } finally { setWorking(false) }
  }

  async function verifyEmailCode() {
    if (!supabaseConfigured || !supabase) return setMessage('Secure sign-in is not available right now.')
    const cleanEmail = email.trim().toLowerCase()
    const cleanOtp = otp.trim()
    if (!cleanEmail) return setMessage('Enter your email address first.')
    if (!/^\d{6,10}$/.test(cleanOtp)) return setMessage('Enter the numeric code from your email (6 to 10 digits).')
    try {
      setWorking(true)
      setMessage('Checking your sign-in code…')
      const { error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanOtp, type: 'email' })
      if (error) return setMessage('That code is incorrect or has expired. Request a new code and try again.')
      setOtp('')
      setOtpRequested(false)
      setMessage('Signed in.')
    } finally { setWorking(false) }
  }

  async function passwordLogin() {
    if (!supabaseConfigured || !supabase) return setMessage('Secure sign-in is not available right now.')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) return setMessage('Enter your email and password.')
    try {
      setWorking(true)
      setMessage('Signing in…')
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (error) return setMessage('Email or password is incorrect. Try again, use Forgot password, or use an email sign-in code.')
      setPassword('')
      setMessage('Signed in.')
    } finally { setWorking(false) }
  }

  async function createAccount() {
    if (!supabaseConfigured || !supabase) return setMessage('Secure sign-up is not available right now.')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return setMessage('Enter your email address.')
    if (password.length < PASSWORD_MIN_LENGTH) return setMessage(`Use at least ${PASSWORD_MIN_LENGTH} characters for your password.`)
    if (password !== confirmPassword) return setMessage('The passwords do not match.')
    try {
      setWorking(true)
      setMessage('Creating your HiStreets account…')
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/business` },
      })
      if (error) return setMessage('We could not create the account. If you already have one, go back to Sign in or use Forgot password.')
      setPassword('')
      setConfirmPassword('')
      setMessage(data.session
        ? 'Account created. You are signed in.'
        : 'Account created. Check your email and confirm your address, then sign in.')
    } finally { setWorking(false) }
  }

  async function sendPasswordReset() {
    if (!supabaseConfigured || !supabase) return setMessage('Password reset is not available right now.')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return setMessage('Enter your email address first, then choose Forgot password.')
    try {
      setWorking(true)
      setMessage('Sending a password reset link…')
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/business?mode=recovery`,
      })
      setMessage(error
        ? 'We could not send the reset email right now. Please wait a moment and try again.'
        : 'If an account exists for that email, a password reset link has been sent.')
    } finally { setWorking(false) }
  }

  async function updateRecoveredPassword() {
    if (!supabaseConfigured || !supabase) return setMessage('Password recovery is not available right now.')
    if (newPassword.length < PASSWORD_MIN_LENGTH) return setMessage(`Use at least ${PASSWORD_MIN_LENGTH} characters for your new password.`)
    if (newPassword !== confirmNewPassword) return setMessage('The new passwords do not match.')
    try {
      setWorking(true)
      setMessage('Updating your password…')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return setMessage('We could not update the password. Please request a new reset link and try again.')
      setNewPassword('')
      setConfirmNewPassword('')
      setRecoveryMode(false)
      cleanBusinessUrl()
      setMessage('Password updated. Your workspace is ready.')
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

  if (authLoading) return <section className="profile-screen business-shell"><div className="auth-loading-card"><ShieldCheck size={30} /><strong>Opening your secure HiStreets workspace…</strong></div></section>

  if (recoveryMode) return (
    <section className="profile-screen business-shell auth-screen auth-recovery-screen">
      <div className="auth-brand-panel">
        <span className="brand-wordmark"><strong>hi</strong>streets</span>
        <span className="portal-mark"><ShieldCheck size={18} /> Secure account recovery</span>
        <h1>Reset your password</h1>
        <h2 className="auth-hero-title">Choose a new password and continue.</h2>
        <p>Use 12 or more characters. A short phrase is usually easier to remember than a complicated password.</p>
      </div>
      <div className="auth-card auth-card-final">
        <div className="auth-card-title"><span><KeyRound size={22} /></span><div><small>Secure recovery</small><h2>Set new password</h2></div></div>
        <label className="auth-field"><span>New password</span><input type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="12 or more characters" /></label>
        <label className="auth-field"><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Type it again" onKeyDown={e => { if (e.key === 'Enter') void updateRecoveredPassword() }} /></label>
        <button className="auth-primary" type="button" onClick={() => void updateRecoveredPassword()} disabled={working}><span>{working ? 'Updating…' : 'Update password'}</span><ArrowRight size={18} /></button>
        <button className="auth-secondary-link" type="button" onClick={() => void cancelRecovery()}>Back to sign in</button>
        {message && <p className="form-status auth-status" role="status" aria-live="polite">{message}</p>}
        <ProjectLinks />
      </div>
    </section>
  )

  if (!signedIn) return (
    <section className="profile-screen business-shell auth-screen">
      <div className="auth-brand-panel">
        <span className="brand-wordmark"><strong>hi</strong>streets</span>
        <span className="portal-mark"><Building2 size={18} /> Business & Admin</span>
        <h1>Helping local businesses grow with technology.</h1>
        <h2 className="auth-hero-title">One simple, secure account for HiStreets.</h2>
        <p>Business owners and HiStreets admins use this same sign-in page. Residents do not need an account to browse.</p>
        <div className="auth-feature-row"><span><Sparkles size={16} /> AI-assisted posting</span><span><ShieldCheck size={16} /> Verified access</span><span><LockKeyhole size={16} /> Role-protected admin</span></div>
      </div>

      <div className="auth-card auth-card-final">
        <div className="auth-card-title"><span>{mode === 'signup' ? <UserPlus size={22} /> : <ShieldCheck size={22} />}</span><div><small>HiStreets secure access</small><h2>{mode === 'signup' ? 'Create your account' : 'Sign in to HiStreets'}</h2></div></div>
        <p className="auth-intro">{mode === 'signup' ? 'New to HiStreets? Enter your email and choose a password. That is all you need to start.' : 'Use your email and password. Admins and business owners sign in here.'}</p>

        <label className="auth-field"><span>Email address</span><input type="email" inputMode="email" autoCapitalize="none" autoComplete="email" spellCheck={false} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="auth-field"><span>Password</span><input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? PASSWORD_MIN_LENGTH : undefined} placeholder={mode === 'signup' ? '12 or more characters' : 'Your password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && mode === 'signin') void passwordLogin() }} /></label>

        {mode === 'signup' && <>
          <label className="auth-field"><span>Confirm password</span><input type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} placeholder="Type it again" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void createAccount() }} /></label>
          <p className="password-tip"><ShieldCheck size={15} /> Use 12 or more characters. A short memorable phrase works well.</p>
        </>}

        {mode === 'signin' ? <>
          <button className="auth-primary" type="button" onClick={() => void passwordLogin()} disabled={working}><span>{working ? 'Signing in…' : 'Sign in'}</span><ArrowRight size={18} /></button>
          <button className="auth-text-action forgot-password-link" type="button" onClick={() => void sendPasswordReset()} disabled={working}>Forgot password?</button>

          <div className="auth-divider" aria-hidden="true"><span>or</span></div>
          <button className="auth-secondary-link auth-email-link" type="button" onClick={() => void sendEmailCode()} disabled={working}><KeyRound size={16} /> {working ? 'Sending…' : otpRequested ? 'Send a new sign-in code' : 'Email me a sign-in code'}</button>
          <p className="auth-simple-note">No password needed. We email a secure numeric code to an existing HiStreets account.</p>

          {otpRequested && <>
            <label className="auth-field"><span>Email sign-in code</span><input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} placeholder="Enter code" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 10))} onKeyDown={e => { if (e.key === 'Enter') void verifyEmailCode() }} /></label>
            <button className="auth-primary" type="button" onClick={() => void verifyEmailCode()} disabled={working}><span>{working ? 'Checking…' : 'Verify code and sign in'}</span><ArrowRight size={18} /></button>
          </>}

          <div className="auth-account-switch"><span>New to HiStreets?</span><button type="button" onClick={() => switchMode('signup')}>Create account</button></div>
        </> : <>
          <button className="auth-primary" type="button" onClick={() => void createAccount()} disabled={working}><span>{working ? 'Creating…' : 'Create account'}</span><ArrowRight size={18} /></button>
          <div className="auth-account-switch"><span>Already have an account?</span><button type="button" onClick={() => switchMode('signin')}>Back to sign in</button></div>
        </>}

        {message && <p className="form-status auth-status" role="status" aria-live="polite">{message}</p>}
        <ProjectLinks />
      </div>
    </section>
  )

  if (role === 'suspended') return <section className="profile-screen business-shell"><div className="account-suspended-screen"><LockKeyhole size={34} /><span className="eyebrow">Account unavailable</span><h1>Your account is suspended</h1><p>Contact HiStreets support if you believe this is a mistake. Public directory pages remain available without an account.</p><button type="button" onClick={() => void signOut()}><LogOut size={17} /> Sign out</button></div></section>

  if (role === 'admin' || role === 'super_admin') return (
    <section className="profile-screen business-shell admin-workspace">
      <header className="portal-header">
        <div><span className="eyebrow"><ShieldCheck size={14} /> {role === 'super_admin' ? 'Founder console' : 'Platform operations'}</span><h1>{role === 'super_admin' ? 'HiStreets Founder' : 'Operations Admin'}</h1><p>{role === 'super_admin' ? 'Understand growth, protect access and guide the whole platform.' : 'Review businesses and content without founder-level account access.'}</p></div>
        <button className="portal-signout" onClick={() => void signOut()}><LogOut size={17} /> Sign out</button>
      </header>
      <nav className="workspace-tabs" aria-label="Platform workspace sections">
        <button type="button" className={adminSection === 'overview' ? 'active' : ''} onClick={() => setAdminSection('overview')}><BarChart3 size={17} /> Overview</button>
        <button type="button" className={adminSection === 'queue' ? 'active' : ''} onClick={() => setAdminSection('queue')}><ClipboardCheck size={17} /> Review queue</button>
        <button type="button" className={adminSection === 'applications' ? 'active' : ''} onClick={() => setAdminSection('applications')}><BriefcaseBusiness size={17} /> Applications</button>
        {role === 'super_admin' && <button type="button" className={adminSection === 'users' ? 'active' : ''} onClick={() => setAdminSection('users')}><Users size={17} /> People & access</button>}
      </nav>
      {adminSection === 'overview' && <PlatformAnalyticsDashboard founder={role === 'super_admin'} />}
      {adminSection === 'queue' && <><AdminOwnershipRequests /><AdminPanel /></>}
      {adminSection === 'applications' && <JobApplicationsPanel />}
      {adminSection === 'users' && role === 'super_admin' && <AdminUserManagement />}
      {message && <p className="form-status">{message}</p>}
      <footer className="portal-footer"><ProjectLinks /></footer>
    </section>
  )

  return (
    <section className="profile-screen business-shell owner-workspace">
      <header className="portal-header">
        <div><span className="eyebrow"><Building2 size={14} /> Business workspace</span><h1>Your HiStreets business</h1><p>Claim or register once, then manage your profile, AI-assisted posts and job applications here.</p></div>
        <button className="portal-signout" onClick={() => void signOut()}><LogOut size={17} /> Sign out</button>
      </header>
      <nav className="workspace-tabs owner-tabs" aria-label="Business workspace sections">
        <button type="button" className={ownerSection === 'overview' ? 'active' : ''} onClick={() => setOwnerSection('overview')}><BarChart3 size={17} /> Overview</button>
        <button type="button" className={ownerSection === 'profile' ? 'active' : ''} onClick={() => setOwnerSection('profile')}><Store size={17} /> Profile</button>
        <button type="button" className={ownerSection === 'content' ? 'active' : ''} onClick={() => setOwnerSection('content')}><FilePenLine size={17} /> Content</button>
        <button type="button" className={ownerSection === 'applications' ? 'active' : ''} onClick={() => setOwnerSection('applications')}><BriefcaseBusiness size={17} /> Applicants</button>
        <button type="button" className={ownerSection === 'team' ? 'active' : ''} onClick={() => setOwnerSection('team')}><Users size={17} /> Team</button>
      </nav>
      {ownerSection === 'overview' && <><BusinessInvitationInbox /><BusinessAnalyticsDashboard onNavigate={setOwnerSection} /><BusinessOnboarding /></>}
      {ownerSection === 'profile' && <OwnerBusinessProfile />}
      {ownerSection === 'content' && <BusinessPostingDashboard onPost={onPost} />}
      {ownerSection === 'applications' && <JobApplicationsPanel />}
      {ownerSection === 'team' && <BusinessTeamPanel />}
      {message && <p className="form-status">{message}</p>}
      <footer className="portal-footer"><ProjectLinks /></footer>
    </section>
  )
}
