'use client'
import{useState}from'react'
import{useRouter}from'next/navigation'

const OR='#ff681f'

const steps=[
  {
    icon:'🅿️',
    title:'Free parking,\nfound instantly',
    body:'See every bay on the street — free, paid, restricted — updated in real time.',
  },
  {
    icon:'🛍️',
    title:'Live offers from\nshops near you',
    body:'Local businesses post deals as they happen. Tap any orange bubble on the map.',
  },
  {
    icon:'📍',
    title:'Your high street,\nalive on the map',
    body:'No account needed to browse. Sign in only when you want to save or claim an offer.',
  },
]

export default function Splash(){
  const[step,setStep]=useState(0)
  const r=useRouter()

  function finish(){
    localStorage.setItem('hs_seen','1')
    r.replace('/map')
  }

  const s=steps[step]
  const last=step===steps.length-1

  return(
    <div style={{height:'100dvh',background:'#0a0a0a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between',padding:'48px 32px max(32px,env(safe-area-inset-bottom))'}}>

      {/* Logo */}
      <div style={{alignSelf:'flex-start'}}>
        <span style={{fontSize:28,fontWeight:800,color:OR,letterSpacing:-1}}>Hi</span>
        <span style={{fontSize:28,fontWeight:400,color:'white',letterSpacing:-1}}>Streets</span>
        <div style={{fontSize:10,color:'rgba(255,255,255,.4)',letterSpacing:2,marginTop:2}}>LIVE OFFERS &amp; FREE PARKING</div>
      </div>

      {/* Content */}
      <div style={{textAlign:'center',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24}}>
        <div style={{fontSize:72,lineHeight:1}}>{s.icon}</div>
        <h1 style={{margin:0,fontSize:30,fontWeight:700,color:'white',lineHeight:1.2,whiteSpace:'pre-line'}}>{s.title}</h1>
        <p style={{margin:0,fontSize:16,color:'rgba(255,255,255,.55)',lineHeight:1.6,maxWidth:280}}>{s.body}</p>
      </div>

      {/* Dots */}
      <div style={{display:'flex',gap:8,marginBottom:32}}>
        {steps.map((_,i)=>(
          <div key={i} style={{width:i===step?24:8,height:8,borderRadius:4,background:i===step?OR:'rgba(255,255,255,.2)',transition:'all .3s'}}/>
        ))}
      </div>

      {/* Buttons */}
      <div style={{width:'100%',display:'flex',flexDirection:'column',gap:12}}>
        <button
          onClick={last?finish:()=>setStep(s=>s+1)}
          style={{width:'100%',padding:'16px',borderRadius:14,border:'none',background:OR,color:'white',fontSize:17,fontWeight:700,cursor:'pointer'}}
        >
          {last?'See my streets →':'Next'}
        </button>
        {!last&&(
          <button onClick={finish} style={{background:'none',border:'none',color:'rgba(255,255,255,.4)',fontSize:14,cursor:'pointer',padding:8}}>
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
