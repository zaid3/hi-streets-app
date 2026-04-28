'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOTP() {
    if (!email) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) { setError(error.message); setLoading(false); return }
    setStep('otp')
    setLoading(false)
  }

  async function verifyOTP() {
    if (!otp) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) { setError('Invalid code. Please try again.'); setLoading(false); return }
    router.replace('/map')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-20%',
        width: '60%', height: '60%',
        background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-20%',
        width: '60%', height: '60%',
        background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '48px', animation: 'fadeIn 0.6s ease' }}>
        <div style={{
          width: 80, height: 80,
          background: 'linear-gradient(135deg, #FF6B35, #FF8C00)',
          borderRadius: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '36px',
          margin: '0 auto 20px',
          boxShadow: '0 8px 32px rgba(255,107,53,0.4)',
        }}>🏪</div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'white', letterSpacing: '-1px' }}>
          Hi-Streets
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '8px', fontSize: '15px' }}>
          Live offers from shops near you
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '32px',
        width: '100%',
        maxWidth: '380px',
        animation: 'fadeIn 0.6s ease 0.1s both',
      }}>
        {step === 'email' ? (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Sign in</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '24px' }}>
              We'll send a code to your email
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendOTP()}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', color: 'white', fontSize: '16px',
                  outline: 'none', transition: 'border 0.2s',
                }}
                onFocus={e => e.target.style.border = '1px solid rgba(255,107,53,0.6)'}
                onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
              />
            </div>
            {error && <p style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
            <button
              onClick={sendOTP}
              disabled={loading || !email}
              style={{
                width: '100%', padding: '15px',
                background: loading ? 'rgba(255,107,53,0.5)' : 'linear-gradient(135deg, #FF6B35, #FF8C00)',
                border: 'none', borderRadius: '12px',
                color: 'white', fontSize: '16px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(255,107,53,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Sending...' : 'Send Code →'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep('email')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginBottom: '16px', fontSize: '14px' }}
            >
              ← Back
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Check your email</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '24px' }}>
              We sent a 6-digit code to <strong style={{ color: 'white' }}>{email}</strong>
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Verification code
              </label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                placeholder="000000"
                maxLength={6}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', color: 'white', fontSize: '24px',
                  letterSpacing: '8px', textAlign: 'center',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.border = '1px solid rgba(255,107,53,0.6)'}
                onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                autoFocus
              />
            </div>
            {error && <p style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
            <button
              onClick={verifyOTP}
              disabled={loading || otp.length < 6}
              style={{
                width: '100%', padding: '15px',
                background: loading || otp.length < 6 ? 'rgba(255,107,53,0.4)' : 'linear-gradient(135deg, #FF6B35, #FF8C00)',
                border: 'none', borderRadius: '12px',
                color: 'white', fontSize: '16px', fontWeight: 700,
                cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(255,107,53,0.3)',
              }}
            >
              {loading ? 'Verifying...' : 'Enter Hi-Streets →'}
            </button>
            <button
              onClick={sendOTP}
              style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '13px' }}
            >
              Resend code
            </button>
          </>
        )}
      </div>

      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '24px', textAlign: 'center' }}>
        By continuing you agree to our Terms of Service
      </p>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}
