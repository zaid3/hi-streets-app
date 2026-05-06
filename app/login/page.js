'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function LogoF({ size = 'large' }) {
  const s = size === 'large'
    ? { hi: 52, streets: 48, tag: 11, corner: 13, stroke: 2.5, boxW: 68, boxH: 60, hiL: 10, hiB: 7, tagGap: 12, tagLine: 34, brR: 4, brB: 3 }
    : { hi: 30, streets: 27, tag: 7, corner: 8, stroke: 1.8, boxW: 40, boxH: 36, hiL: 6, hiB: 4, tagGap: 8, tagLine: 20, brR: 2, brB: 2 }
  return (
    <div className="hs-logo">
      <div className="hs-logo-row">
        <div className="hs-hi-mark" style={{ width: s.boxW, height: s.boxH }}>
          <div className="hs-corner tl" style={{ width: s.corner, height: s.corner, borderWidth: `${s.stroke}px 0 0 ${s.stroke}px` }} />
          <span className="hs-hi" style={{ position: 'absolute', left: s.hiL, bottom: s.hiB, fontSize: s.hi }}}>Hi</span>
          <div className="hs-corner br" style={{ width: s.corner, height: s.corner, right: s.brR, bottom: s.brB, borderWidth: `0 ${s.stroke}px ${s.stroke}px 0` }} />
        </div>
        <span className="hs-streets" style={{ fontSize: s.streets }}>Streets</span>
      </div>
      <div className="hs-tag" style={{ marginTop: size === 'large' ? 18 : 10, gap: s.tagGap, fontSize: s.tag }}>
        <div className="hs-tag-line" style={{ width: s.tagLine }} />
        <span>Live Offers &amp; Free Parking Nearby</span>
      </div>
    </div>
  )
}

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOTP() {
    if (!email) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: undefined }
    })
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
    <div style={{ minHeight:'100vh', minHeight:'100dvh', background:'#0a0a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'Arial,Helvetica,sans-serif' }}>
      <div style={{ position:'fixed', top:'-20%', left:'50%', transform:'translateX(-50%)', width:'600px', height:'600px', background:'radial-gradient(circle,rgba(255,104,31,.1) 0%,transparent 70%)', pointerEvents:'none' }} />

      <div style={{ marginBottom: 40, zIndex: 1 }}>
        <LogoF size="large" />
      </div>

      <div style={{ background:'rgba(255,255,255,.05)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'20px', padding:'28px', width:'100%', maxWidth:'360px', zIndex:1 }}>
        {step === 'email' ? (<>
          <h2 style={{ margin:'0 0 6px', fontSize:'18px', fontWeight:700, color:'white' }}>Sign in</h2>
          <p style={{ margin:'0 0 20px', fontSize:'13px', color:'rgba(255,255,255,.45)' }}>We'll send a 6-digit code to your email</p>
          <label style={{ display:'block', fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.45)', textTransform:'uppercase', marginBottom:'8px' }}>Email address</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendOTP()} placeholder="you@example.com" autoComplete="email"
            style={{ width:'100%', padding:'14px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'12px', color:'white', fontSize:'16px', outline:'none', marginBottom:'16px' }} />
          {error && <p style={{ color:'#ff6b6b', fontSize:'13px', marginBottom:'12px' }}>{error}</p>}
          <button onClick={sendOTP} disabled={loading||!email}
            style={{ width:'100%', padding:'15px', background:loading||!email?'rgba(255,104,31,.4)':'linear-gradient(135deg,#ff681f,#FF8C00)', border:'none', borderRadius:'12px', color:'white', fontSize:'16px', fontWeight:700, cursor:loading||!email?'not-allowed':'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.3)' }}>
            {loading ? 'Sending...' : 'Send Code →'}
          </button>
        </>) : (<>
          <button onClick={()=>setStep('email')} style={{ background:'none', border:'none', color:'rgba(255,255,255,.45)', cursor:'pointer', marginBottom:'16px', fontSize:'14px', padding:0 }}>← Back</button>
          <h2 style={{ margin:'0 0 6px', fontSize:'18px', fontWeight:700, color:'white' }}>Check your email</h2>
          <p style={{ margin:'0 0 20px', fontSize:'13px', color:'rgba(255,255,255,.45)' }}>6-digit code sent to <strong style={{ color:'white' }}>{email}</strong></p>
          <label style={{ display:'block', fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,.45)', textTransform:'uppercase', marginBottom:'8px' }}>Verification code</label>
          <input type="number" inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={e=>e.key==='Enter'&&verifyOTP()} placeholder="000000" maxLength={6} autoFocus
            style={{ width:'100%', padding:'14px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'12px', color:'white', fontSize:'32px', letterSpacing:'12px', textAlign:'center', outline:'none', marginBottom:'16px' }} />
          {error && <p style={{ color:'#ff6b6b', fontSize:'13px', marginBottom:'12px' }}>{error}</p>}
          <button onClick={verifyOTP} disabled={loading||otp.length<6}
            style={{ width:'100%', padding:'15px', background:loading||otp.length<6?'rgba(255,104,31,.4)':'linear-gradient(135deg,#ff681f,#FF8C00)', border:'none', borderRadius:'12px', color:'white', fontSize:'16px', fontWeight:700, cursor:loading||otp.length<6?'not-allowed':'pointer', boxShadow:'0 4px 20px rgba(255,104,31,.3)', marginBottom:'12px' }}>
            {loading ? 'Verifying...' : 'Enter Hi-Streets →'}
          </button>
          <button onClick={sendOTP} style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,.35)', cursor:'pointer', fontSize:'13px', padding:'8px' }}>Resend code</button>
        </>)}
      </div>
      <p style={{ color:'rgba(255,255,255,.2)', fontSize:'11px', marginTop:'20px', zIndex:1 }}>By continuing you agree to our Terms of Service</p>
    </div>
  )
}
