import { useEffect, useState } from 'react'
import { LogIn, ShieldCheck, Trash2 } from 'lucide-react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import AdminPanel from './AdminPanel'
import AdminBlueBadgePanel from './AdminBlueBadgePanel'
import BusinessRegistration from './BusinessRegistration'
import OwnerBusinessProfile from './OwnerBusinessProfile'

export default function Profile() {
  const [email, setEmail] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn() {
    if (!supabaseConfigured || !supabase) return setMessage('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables first.')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setMessage(error ? error.message : 'Magic link sent. Check your email.')
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

  if (!signedIn) return <section className="profile-screen"><div className="auth-card"><ShieldCheck size={34} /><h1>Sign in to HiStreets</h1><p>Register your business, post offers/jobs, save places, or manage admin tools.</p><input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /><button onClick={signIn}><LogIn size={18} /> Send magic link</button>{message && <p className="form-status">{message}</p>}<p className="tiny-links"><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></p></div></section>

  return <section className="profile-screen"><header className="screen-header"><h1>Profile</h1><p>Businesses register themselves, complete details, then post offers, jobs and community help after approval.</p></header><BusinessRegistration /><OwnerBusinessProfile /><AdminBlueBadgePanel /><AdminPanel /><div className="privacy-card"><h2>Account</h2><button className="danger" onClick={deleteAccount}><Trash2 size={18} /> Delete my account</button>{message && <p className="form-status">{message}</p>}<p><a href="/privacy.html">Privacy policy</a> · <a href="/terms.html">Terms</a></p></div></section>
}
