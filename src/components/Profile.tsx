import { useEffect, useState } from 'react'
import { Download, LogIn, ShieldCheck, Trash2 } from 'lucide-react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { PostForm } from './Feeds'

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

  async function downloadData() {
    if (!supabase) return
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) return setMessage('Sign in first')
    const payload = { user: { id: user.id, email: user.email }, exported_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'histreets-data-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function deleteAccount() {
    setMessage('Account deletion requires the Supabase delete-account function/admin action. This button is wired in UI but must be connected before public launch.')
  }

  if (!signedIn) return <section className="profile-screen"><div className="auth-card"><ShieldCheck size={34} /><h1>Sign in to HiStreets</h1><p>Save places, follow businesses, and post content if you are a verified business or charity.</p><input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /><button onClick={signIn}><LogIn size={18} /> Send magic link</button>{message && <p className="form-status">{message}</p>}<p className="tiny-links"><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></p></div></section>

  return <section className="profile-screen"><header className="screen-header"><h1>Profile</h1><p>Manage posts, privacy and account data.</p></header><PostForm /><div className="privacy-card"><h2>Privacy settings</h2><button onClick={downloadData}><Download size={18} /> Download my data</button><button className="danger" onClick={deleteAccount}><Trash2 size={18} /> Delete my account</button>{message && <p className="form-status">{message}</p>}<p><a href="/privacy.html">Privacy policy</a> · <a href="/terms.html">Terms</a></p></div></section>
}
