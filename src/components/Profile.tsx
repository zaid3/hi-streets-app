import { useEffect, useState } from 'react'
import { KeyRound, LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { getCurrentRole } from '../lib/data'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { PostType, Role } from '../types'
import AdminPanel from './AdminPanel'
import BusinessPostingDashboard from './BusinessPostingDashboard'
import BusinessRegistration from './BusinessRegistration'
import JobApplicationsPanel from './JobApplicationsPanel'
import OwnerBusinessProfile from './OwnerBusinessProfile'

type Props = {
  onPost: (type: PostType) => void
}

export default function Profile({ onPost }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function resolveSession(hasUser: boolean) {
    setSignedIn(hasUser)
    if (!hasUser) {
      setRole(null)
      setAuthLoading(false)
      return
    }
    setAuthLoading(true)
    try {
      setRole(await getCurrentRole())
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    supabase.auth.getUser().then(({ data }) => void resolveSession(Boolean(data.user)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void resolveSession(Boolean(session?.user)) }, 0)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function sendMagicLink() {
    if (!supabaseConfigured || !supabase) return setMessage('HiStreets login is not configured yet.')
    if (!email.trim()) return setMessage('Enter your email first.')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/map` },
    })
    setMessage(error ? error.message : 'Secure login link sent. Check your email, then return to HiStreets.')
  }

  async function passwordLogin() {
    if (!supabaseConfigured || !supabase) return setMessage('HiStreets login is not configured yet.')
    if (!email.trim() || !password) return setMessage('Enter email and password.')
    setMessage('Signing in…')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return setMessage(error.message)
    setPassword('')
    setMessage('Signed in.')
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setSignedIn(false)
    setRole(null)
    setPassword('')
    setMessage('Signed out.')
  }

  if (authLoading) return <section className="profile-screen"><div className="auth-card"><ShieldCheck size={34} /><h1>Business access</h1><p>Checking your secure session…</p></div></section>

  if (!signedIn) return (
    <section className="profile-screen">
      <div className="auth-card">
        <ShieldCheck size={34} />
        <h1>Business access</h1>
        <p>Residents do not need an account to browse the map, find offers or apply for jobs. Business owners and HiStreets admins use this same secure access page.</p>
        <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" autoComplete="current-password" placeholder="Password, if your account has one" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && password) void passwordLogin() }} />
        <div className="auth-actions">
          <button onClick={sendMagicLink}><LogIn size={18} /> Email me a secure login link</button>
          <button className="dark-action" onClick={passwordLogin}><KeyRound size={18} /> Sign in with password</button>
        </div>
        <p className="trust">Business owners can use the email link for the quickest access. Password-enabled accounts use the same form. Your account role decides which dashboard opens.</p>
        {message && <p className="form-status">{message}</p>}
        <p className="tiny-links"><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></p>
      </div>
    </section>
  )

  if (role === 'admin' || role === 'super_admin') return (
    <section className="profile-screen">
      <header className="screen-header">
        <h1>{role === 'super_admin' ? 'Super Admin' : 'Admin'}</h1>
        <p>Review business registrations, moderate posts, inspect job applications and monitor HiStreets activity.</p>
      </header>
      <AdminPanel />
      <JobApplicationsPanel />
      <div className="privacy-card">
        <h2>Account</h2>
        <button onClick={signOut}><LogOut size={18} /> Sign out</button>
        {message && <p className="form-status">{message}</p>}
        <p><a href="/privacy.html">Privacy policy</a> · <a href="/terms.html">Terms</a></p>
      </div>
    </section>
  )

  return (
    <section className="profile-screen">
      <header className="screen-header">
        <h1>Business portal</h1>
        <p>Register or request ownership of your business first. After approval, complete your profile, post offers/jobs/free meals and review applications.</p>
      </header>
      <BusinessRegistration />
      <OwnerBusinessProfile />
      <BusinessPostingDashboard onPost={onPost} />
      <JobApplicationsPanel />
      <div className="privacy-card">
        <h2>Account</h2>
        <button onClick={signOut}><LogOut size={18} /> Sign out</button>
        <p className="muted">For account or personal-data deletion requests, use the privacy contact process.</p>
        {message && <p className="form-status">{message}</p>}
        <p><a href="/privacy.html">Privacy policy</a> · <a href="/terms.html">Terms</a></p>
      </div>
    </section>
  )
}
