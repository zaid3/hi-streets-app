import { useEffect, useState } from 'react'
import { LogIn, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { PostType } from '../types'
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
  const [signedIn, setSignedIn] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function sendMagicLink(mode: 'signup' | 'login') {
    if (!supabaseConfigured || !supabase) return setMessage('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables first.')
    if (!email.trim()) return setMessage('Enter your business email first.')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } })
    setMessage(error ? error.message : mode === 'signup' ? 'Sign-up link sent. Check your email, then register your business.' : 'Login link sent. Check your email.')
  }

  async function deleteAccount() {
    if (!supabase) return
    const ok = window.confirm('Delete your HiStreets account? This cannot be undone.')
    if (!ok) return
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return setMessage(error.message)
    await supabase.auth.signOut()
    setSignedIn(false)
    setMessage('Account deleted.')
  }

  if (!signedIn) return <section className="profile-screen"><div className="auth-card"><ShieldCheck size={34} /><h1>Business access</h1><p>Normal users do not need login to browse, find offers, or apply for jobs. Businesses sign up or log in here to register, post offers/jobs/free meals, and view applications.</p><input type="email" placeholder="business@example.com" value={email} onChange={e => setEmail(e.target.value)} /><div className="auth-actions"><button onClick={() => sendMagicLink('signup')}><UserPlus size={18} /> Sign up / register business</button><button onClick={() => sendMagicLink('login')}><LogIn size={18} /> Login existing business</button></div>{message && <p className="form-status">{message}</p>}<p className="tiny-links"><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></p></div></section>

  return <section className="profile-screen"><header className="screen-header"><h1>Business portal</h1><p>Simple tools for approved Newham businesses: register, complete details, post offers/jobs/free meals, and review applications.</p></header><BusinessPostingDashboard onPost={onPost} /><BusinessRegistration /><OwnerBusinessProfile /><JobApplicationsPanel /><AdminPanel /><div className="privacy-card"><h2>Account</h2><button className="danger" onClick={deleteAccount}><Trash2 size={18} /> Delete my account</button>{message && <p className="form-status">{message}</p>}<p><a href="/privacy.html">Privacy policy</a> · <a href="/terms.html">Terms</a></p></div></section>
}
