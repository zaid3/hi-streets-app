'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase.js'

const OR = '#ff681f'
function Logo() {
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', fontFamily:'Arial,Helvetica,sans-serif', lineHeight:1 }}>
      <div style={{ display:'flex', alignItems:'center' }}>
        <div style={{ position:'relative', width:78, height:68, flexShrink:0 }}>
          <div style={{ position:'absolute', top:0, left:0, width:15, height:15, borderTop:'3px solid '+OR, borderLeft:'3px solid '+OR }} />
          <span style={{ position:'absolute', left:11, bottom:8, fontSize:58, fontWeight:800, color:OR, letterSpacing:'-0.08em' }}>Hi</span>
          <div style={{ position:'absolute', right:0, bottom:5, width:15, height:15, borderBottom:'3px solid '+OR, borderRight:'3px solid '+OR }} />
        </div>
        <span style={{ fontSize:54, fontWeight:400, color:'#fff', letterSpacing:'-0.055em' }}>Streets</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12 }}>
        <div style={{ width:44, height:1.5, background:OR, opacity:.7 }} />
        <span style={{ fontSize:10, color:OR, fontWeight:600, letterSpacing:'0.25em', textTransform:'uppercase', whiteSpace:'nowrap' }}>LIVE OFFERS & FREE PARKING NEARBY</span>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOTP() {
    if (!email.trim()) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: undefined } })
    if (error) { setError(error.message); setLoading(false); return }
    setStep('otp'); setLoading(false)
  }

  async function verifyOTP() {
    if (otp.length < 6) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) { setError('Invalid code. Please try again.'); setLoading(false); return }
    router.replace('/map')
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Arial,Helvetica,sans-serif' }}>
      <div style={{ position:'fixed', top:'-20%', left:'50%', transform:'translateX(-50%)', width:600, height:600, background:'radial-gradient(circle,rgba(255,104,31,.1) 0%,transparent 70%)', pointerEvents:'none' }} />
      <div style={{ marginBottom:44, zIndex:1 }}><Logo /></div>
      <div style={{ background:'rgba(255,255,255,.05)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, padding:28, width:'100%', maxWidth:360, zIndex:1 }}>
        {step === 'email' ? (<>
          <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:800 }}>Sign in</h2>
          <p style={{ margin:'0 0 24px', fontSize:13, color:'rgba(255,255,255,.45)' }}>We'll send a 6-digit code to your email</p>
          <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', marginBottom:8 }}>Email address</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendOTP()} placeholder="you@example.com" autoComplete="email" style={{ width:'100%', padding:14, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#fff', fontSize:16, outline:'none', marginBottom:16 }} />
          {error && <p style={{ color:'#ff6b6b', fontSize:13, marginBottom:12 }}>{error}</p>}
          <button onClick={sendOTP} disabled={loading||!email} style={{ width:'100%', padding:16, background:loading||!email?'rgba(255,104,31,.35)':'linear-gradient(135deg,#ff681f,#FF8C00)', border:'none', borderRadius:12, color:'#fff', fontSize:16, fontWeight:700, cursor:loading||!email?'not-allowed':'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.3)' }}>
            {loading ? 'Sending...' : 'Send Code →'}
          </button>
          <button onClick={() => { localStorage.setItem('hs_guest','1'); router.replace('/map') }} style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,.3)', cursor:'pointer', marginTop:12, fontSize:13, padding:10 }}>Continue as guest</button>
        </>) : (<>
          <button onClick={() => setStep('email')} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', marginBottom:16, fontSize:14, padding:0 }}>← Back</button>
          <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:800 }}>Check your email</h2>
          <p style={{ margin:'0 0 24px', fontSize:13, color:'rgba(255,255,255,.45)' }}>6-digit code sent to <strong style={{ color:'#fff' }}>{email}</strong></p>
          <input type="number" inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={e=>e.key==='Enter'&&verifyOTP()} placeholder="000000" autoFocus style={{ width:'100%', padding:16, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#fff', fontSize:36, letterSpacing:16, textAlign:'center', outline:'none', marginBottom:16 }} />
          {error && <p style={{ color:'#ff6b6b', fontSize:13, marginBottom:12 }}>{error}</p>}
          <button onClick={verifyOTP} disabled={loading||otp.length<6} style={{ width:'100%', padding:16, background:loading||otp.length<6?'rgba(255,104,31,.35)':'linear-gradient(135deg,#ff681f,#FF8C00)', border:'none', borderRadius:12, color:'#fff', fontSize:16, fontWeight:700, cursor:loading||otp.length<6?'not-allowed':'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.3)', marginBottom:12 }}>
            {loading ? 'Verifying...' : 'Enter Hi-Streets →'}
          </button>
          <button onClick={sendOTP} style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,.3)', cursor:'pointer', fontSize:13, padding:10 }}>Resend code</button>
        </>)}
      </div>
      <p style={{ color:'rgba(255,255,255,.2)', fontSize:11, marginTop:20, zIndex:1 }}>By continuing you agree to our Terms of Service</p>
    </div>
  )
}
