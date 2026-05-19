'use client'
import{useState}from'react'
import{useRouter,useSearchParams}from'next/navigation'
import{supabase}from'../../lib/supabase'

const OR='#ff681f'

export default function Login(){
  const[email,setEmail]=useState('')
  const[otp,setOtp]=useState('')
  const[step,setStep]=useState('email')
  const[loading,setLoading]=useState(false)
  const[err,setErr]=useState('')
  const r=useRouter()
  const sp=useSearchParams()
  const redirect=sp.get('redirect')||'/map'

  async function sendOtp(){
    if(!email.includes('@'))return setErr('Enter a valid email')
    setLoading(true);setErr('')
    const{error}=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:undefined}})
    setLoading(false)
    if(error)return setErr(error.message)
    setStep('otp')
  }

  async function verifyOtp(){
    if(otp.length!==6)return setErr('Enter the 6-digit code')
    setLoading(true);setErr('')
    const{error}=await supabase.auth.verifyOtp({email,token:otp,type:'email'})
    setLoading(false)
    if(error)return setErr('Wrong code — try again')
    r.replace(redirect)
  }

  const inp={
    width:'100%',padding:'16px',borderRadius:12,border:'1px solid rgba(255,255,255,.15)',
    background:'rgba(255,255,255,.07)',color:'white',fontSize:17,outline:'none',
    fontFamily:'inherit',
  }

  return(
    <div style={{height:'100dvh',background:'#0a0a0a',display:'flex',flexDirection:'column',padding:'48px 28px max(32px,env(safe-area-inset-bottom))'}}>
      <button onClick={()=>r.back()} style={{background:'none',border:'none',color:'rgba(255,255,255,.5)',fontSize:24,cursor:'pointer',alignSelf:'flex-start',padding:0,marginBottom:32}}>←</button>

      <div style={{marginBottom:8}}>
        <span style={{fontSize:24,fontWeight:800,color:OR}}>Hi</span>
        <span style={{fontSize:24,fontWeight:400,color:'white'}}>Streets</span>
      </div>

      <h1 style={{color:'white',fontSize:28,fontWeight:700,margin:'0 0 8px'}}>
        {step==='email'?'Sign in':'Check your email'}
      </h1>
      <p style={{color:'rgba(255,255,255,.5)',fontSize:15,margin:'0 0 36px',lineHeight:1.5}}>
        {step==='email'
          ?'We\'ll send a 6-digit code — no password needed.'
          :`We sent a code to ${email}`}
      </p>

      {step==='email'?(
        <>
          <input style={inp} type="email" placeholder="your@email.com" value={email}
            onChange={e=>setEmail(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&sendOtp()}
            autoFocus autoComplete="email"/>
          <button
            onClick={sendOtp}
            disabled={loading}
            style={{marginTop:16,padding:'16px',borderRadius:12,border:'none',background:OR,color:'white',fontSize:17,fontWeight:700,cursor:'pointer',opacity:loading?.6:1}}
          >{loading?'Sending…':'Send code'}</button>
          <button onClick={()=>{localStorage.setItem('hs_guest','1');r.replace(redirect)}}
            style={{background:'none',border:'none',color:'rgba(255,255,255,.4)',fontSize:14,cursor:'pointer',padding:'16px 0',marginTop:8}}>
            Continue as guest
          </button>
        </>
      ):(
        <>
          <input style={{...inp,letterSpacing:8,textAlign:'center',fontSize:24,fontWeight:700}} type="text"
            inputMode="numeric" maxLength={6} placeholder="000000"
            value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}
            onKeyDown={e=>e.key==='Enter'&&verifyOtp()} autoFocus/>
          <button onClick={verifyOtp} disabled={loading}
            style={{marginTop:16,padding:'16px',borderRadius:12,border:'none',background:OR,color:'white',fontSize:17,fontWeight:700,cursor:'pointer',opacity:loading?.6:1}}>
            {loading?'Verifying…':'Verify →'}
          </button>
          <button onClick={()=>{setStep('email');setOtp('');setErr('')}}
            style={{background:'none',border:'none',color:'rgba(255,255,255,.4)',fontSize:14,cursor:'pointer',padding:'16px 0',marginTop:4}}>
            ← Change email
          </button>
        </>
      )}

      {err&&<p style={{color:'#ff4444',fontSize:13,marginTop:12,textAlign:'center'}}>{err}</p>}
    </div>
  )
}
