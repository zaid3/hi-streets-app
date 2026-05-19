'use client'
import{useState,useEffect,useRef}from'react'
import{useRouter}from'next/navigation'
import{supabase}from'../../lib/supabase'
import{publishOffer,getLiveOffers}from'../../lib/offersAdapter'

const OR='#ff681f'

// ── Simple logo ────────────────────────────────────────
function Logo({small}){
  const s=small?18:24
  return(
    <span>
      <span style={{fontSize:s,fontWeight:800,color:OR}}>Hi</span>
      <span style={{fontSize:s,fontWeight:400,color:'white'}}>Streets</span>
      <span style={{fontSize:s*0.55,color:'rgba(255,255,255,.35)',marginLeft:6}}>Business</span>
    </span>
  )
}

// ── Stats strip ─────────────────────────────────────────
function Stats({offers}){
  const live=offers.filter(o=>o.status==='live').length
  const views=offers.reduce((_,__)=>_+Math.floor(Math.random()*120+20),0)
  const taps=Math.floor(views*.27)
  return(
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,padding:'16px 16px 0'}}>
      {[['Live offers',live,OR],['Views today',views,'#4A9EFF'],['Taps',taps,'#2ECC71']].map(([l,v,c])=>(
        <div key={l} style={{background:'rgba(255,255,255,.05)',borderRadius:12,padding:'12px 10px',textAlign:'center'}}>
          <div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{l}</div>
        </div>
      ))}
    </div>
  )
}

// ── Chat message types ──────────────────────────────────
function BotMsg({children,delay=0}){
  const[show,setShow]=useState(false)
  useEffect(()=>{const t=setTimeout(()=>setShow(true),delay);return()=>clearTimeout(t)},[delay])
  if(!show)return null
  return(
    <div className="chat-in" style={{alignSelf:'flex-start',maxWidth:'88%',marginBottom:6}}>
      <div style={{background:'rgba(255,255,255,.09)',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',fontSize:14,color:'white',lineHeight:1.5}}>
        {children}
      </div>
    </div>
  )
}
function UserMsg({text}){
  return(
    <div className="chat-in" style={{alignSelf:'flex-end',maxWidth:'88%',marginBottom:6}}>
      <div style={{background:OR,borderRadius:'18px 18px 4px 18px',padding:'10px 14px',fontSize:14,color:'white',lineHeight:1.5}}>
        {text}
      </div>
    </div>
  )
}

// ── Offer preview card ──────────────────────────────────
function OfferPreview({offer,onPost,onEdit,posting,posted}){
  return(
    <div className="chat-in" style={{alignSelf:'flex-start',width:'100%',maxWidth:'88%',marginBottom:6}}>
      <div style={{background:'rgba(255,255,255,.09)',borderRadius:'18px 18px 18px 4px',padding:'12px 14px'}}>
        <div style={{fontSize:12,color:'rgba(255,255,255,.5)',marginBottom:6}}>Here's your offer preview:</div>
        <div style={{background:'rgba(255,104,31,.12)',border:'1px solid rgba(255,104,31,.3)',borderRadius:10,padding:'10px 12px',marginBottom:10}}>
          <div style={{color:OR,fontSize:13,fontWeight:700,marginBottom:2}}>🛍️ {offer.shortLabel}</div>
          <div style={{color:'white',fontSize:14,fontWeight:600,marginBottom:4}}>{offer.title}</div>
          <div style={{color:'rgba(255,255,255,.6)',fontSize:12,lineHeight:1.4}}>{offer.description}</div>
          {offer.expiresAt&&(
            <div style={{color:'rgba(255,255,255,.4)',fontSize:11,marginTop:6}}>
              ⏱ Expires: {new Date(offer.expiresAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
            </div>
          )}
        </div>
        {!posted?(
          <div style={{display:'flex',gap:8}}>
            <button onClick={onPost} disabled={posting}
              style={{flex:2,padding:'10px',borderRadius:10,border:'none',background:OR,color:'white',fontSize:13,fontWeight:700,cursor:'pointer',opacity:posting?.6:1}}>
              {posting?'Posting…':'📍 Post to map'}
            </button>
            <button onClick={onEdit}
              style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid rgba(255,255,255,.15)',background:'transparent',color:'rgba(255,255,255,.6)',fontSize:13,cursor:'pointer'}}>
              Edit
            </button>
          </div>
        ):(
          <div style={{color:'#2ECC71',fontSize:13,fontWeight:600,textAlign:'center',padding:'6px 0'}}>
            ✓ Live on the map!
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────
export default function BusinessPage(){
  const r=useRouter()
  const[user,setUser]=useState(null)
  const[authLoading,setAuthLoading]=useState(true)
  const[offers,setOffers]=useState([])
  const[messages,setMessages]=useState([])
  const[input,setInput]=useState('')
  const[parsing,setParsing]=useState(false)
  const[pendingOffer,setPendingOffer]=useState(null)
  const[posting,setPosting]=useState(false)
  const[tab,setTab]=useState('chat') // chat | offers | whatsapp | setup
  const[business,setBusiness]=useState(null)
  const chatEndRef=useRef(null)
  const inputRef=useRef(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user||null)
      setAuthLoading(false)
    })
  },[])

  useEffect(()=>{
    if(chatEndRef.current)chatEndRef.current.scrollIntoView({behavior:'smooth'})
  },[messages])

  useEffect(()=>{
    getLiveOffers().then(setOffers)
  },[])

  // Welcome message
  useEffect(()=>{
    if(!user)return
    setTimeout(()=>setMessages([{type:'bot',text:`Hi! 👋 I'm your Hi-Streets assistant.\n\nJust tell me your offer in plain English — like:\n\n"20% off all pizzas until 8pm"\n"Free garlic bread with any large today"\n"Buy one coffee get one free"\n\nI'll handle the rest and post it to the map instantly.`,id:Date.now()}]),400)
  },[user])

  async function sendMessage(){
    const text=input.trim()
    if(!text||parsing)return
    setInput('')
    setPendingOffer(null)

    const userMsgId=Date.now()
    setMessages(m=>[...m,{type:'user',text,id:userMsgId}])

    // Quick check if it's a question vs offer
    const isQuestion=/\?$|what|how|when|why|where|tell me|can i/i.test(text)
    if(isQuestion){
      setTimeout(()=>setMessages(m=>[...m,{type:'bot',text:'Great question! To post an offer, just describe it — for example "20% off all day today" — and I\'ll post it to the map for you. 😊',id:Date.now()}]),800)
      return
    }

    setParsing(true)
    setTimeout(()=>setMessages(m=>[...m,{type:'bot',text:'Got it, reading your offer…',id:Date.now(),temp:true}]),300)

    try{
      const res=await fetch('/api/parse-offer',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:text}),
      })
      const parsed=await res.json()

      setMessages(m=>m.filter(x=>!x.temp))

      if(!parsed.valid){
        setMessages(m=>[...m,{type:'bot',text:`Hmm, I couldn't understand that as an offer. Try something like:\n\n"20% off lunch today until 3pm"\n"Free coffee with any cake"\n\nJust describe the deal in plain English! 😊`,id:Date.now()}])
      }else{
        setPendingOffer(parsed)
        setMessages(m=>[...m,{type:'offer',offer:parsed,id:Date.now(),posted:false}])
      }
    }catch{
      setMessages(m=>[...m.filter(x=>!x.temp),{type:'bot',text:'Something went wrong — please try again.',id:Date.now()}])
    }finally{
      setParsing(false)
    }
  }

  async function postOffer(offer,msgId){
    setPosting(true)
    const businessId=business?.id||'demo'
    const result=await publishOffer(offer,businessId)
    setPosting(false)
    if(result.success){
      setMessages(m=>m.map(msg=>msg.id===msgId?{...msg,posted:true}:msg))
      getLiveOffers().then(setOffers)
      setTimeout(()=>{
        setMessages(m=>[...m,{type:'bot',text:'🎉 Your offer is live on the map! Anyone nearby can see it right now.\n\nWant to post another offer?',id:Date.now()}])
      },600)
    }
  }

  // ── Not logged in ──
  if(!authLoading&&!user){
    return(
      <div style={{height:'100dvh',background:'#0a0a0a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,gap:24}}>
        <Logo/>
        <div style={{textAlign:'center'}}>
          <h1 style={{color:'white',fontSize:26,fontWeight:700,margin:'0 0 8px'}}>Grow your business</h1>
          <p style={{color:'rgba(255,255,255,.5)',fontSize:15,margin:0,lineHeight:1.6}}>Post live offers on the map. Free forever.<br/>Just type your deal in plain English.</p>
        </div>
        <div style={{width:'100%',maxWidth:320,display:'flex',flexDirection:'column',gap:12}}>
          <button onClick={()=>r.push('/login?redirect=/business')}
            style={{padding:'16px',borderRadius:14,border:'none',background:OR,color:'white',fontSize:17,fontWeight:700,cursor:'pointer'}}>
            Sign in free →
          </button>
          <button onClick={()=>r.push('/map')}
            style={{padding:'14px',borderRadius:14,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'rgba(255,255,255,.5)',fontSize:15,cursor:'pointer'}}>
            Back to map
          </button>
        </div>
      </div>
    )
  }

  if(authLoading)return<div style={{height:'100dvh',background:'#0a0a0a'}}/>

  // ── Business setup (first time) ──
  if(!business&&tab!=='chat'&&tab!=='offers'){
    // Treat as set up needed — for MVP, skip setup and go straight to chat
  }

  return(
    <div style={{height:'100dvh',background:'#0a0a0a',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* Header */}
      <div style={{background:'#111',borderBottom:'1px solid rgba(255,255,255,.08)',padding:'max(14px,env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Logo small/>
        <button onClick={()=>r.push('/map')}
          style={{background:'rgba(255,255,255,.08)',border:'none',color:'rgba(255,255,255,.6)',borderRadius:10,padding:'6px 12px',fontSize:12,cursor:'pointer'}}>
          ← Map
        </button>
      </div>

      {/* Stats */}
      <Stats offers={offers}/>

      {/* Tabs */}
      <div style={{display:'flex',padding:'12px 16px 0',gap:6}}>
        {[['chat','💬 Post offer'],['offers','📋 My offers'],['whatsapp','📱 WhatsApp']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:'7px 12px',borderRadius:20,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:tab===id?OR:'rgba(255,255,255,.07)',color:tab===id?'white':'rgba(255,255,255,.5)',transition:'all .2s'}}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab==='chat'&&(
        <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>

          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:2}}>
            {messages.map(msg=>{
              if(msg.type==='user')return<UserMsg key={msg.id} text={msg.text}/>
              if(msg.type==='offer')return(
                <OfferPreview key={msg.id} offer={msg.offer} posted={msg.posted}
                  posting={posting}
                  onPost={()=>postOffer(msg.offer,msg.id)}
                  onEdit={()=>{setInput(msg.offer.description);setPendingOffer(null);inputRef.current?.focus()}}
                />
              )
              return(
                <BotMsg key={msg.id}>
                  {msg.text.split('\n').map((line,i)=>(
                    <span key={i}>{line}{i<msg.text.split('\n').length-1&&<br/>}</span>
                  ))}
                </BotMsg>
              )
            })}
            <div ref={chatEndRef}/>
          </div>

          {/* Input */}
          <div style={{padding:'12px 16px max(16px,env(safe-area-inset-bottom))',background:'#111',borderTop:'1px solid rgba(255,255,255,.08)'}}>
            <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}}
                placeholder="Type your offer here… e.g. 20% off today until 5pm"
                rows={1}
                style={{flex:1,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,padding:'12px 14px',color:'white',fontSize:14,outline:'none',resize:'none',fontFamily:'inherit',lineHeight:1.4,maxHeight:100,overflowY:'auto'}}
                onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'}}
              />
              <button onClick={sendMessage} disabled={parsing||!input.trim()}
                style={{width:44,height:44,borderRadius:50,border:'none',background:input.trim()&&!parsing?OR:'rgba(255,255,255,.1)',color:'white',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s'}}>
                {parsing?'⏳':'➤'}
              </button>
            </div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.25)',marginTop:8,textAlign:'center'}}>
              AI powered by Gemini · Your offer goes live instantly
            </div>
          </div>
        </div>
      )}

      {tab==='offers'&&(
        <div style={{flex:1,overflowY:'auto',padding:16}}>
          {offers.length===0?(
            <div style={{textAlign:'center',color:'rgba(255,255,255,.3)',padding:40}}>
              <div style={{fontSize:40,marginBottom:12}}>🛍️</div>
              <div>No live offers yet.<br/>Go to "Post offer" to get started.</div>
            </div>
          ):(
            offers.map(o=>(
              <div key={o.id} style={{background:'rgba(255,255,255,.05)',borderRadius:14,padding:'14px',marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{color:'white',fontWeight:600,fontSize:14}}>{o.title}</span>
                  <span style={{background:'#2ECC7120',color:'#2ECC71',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:600}}>Live</span>
                </div>
                <div style={{color:'rgba(255,255,255,.4)',fontSize:12}}>{o.businessName} · via {o.source}</div>
                <div style={{color:'rgba(255,255,255,.3)',fontSize:11,marginTop:4}}>
                  Expires: {o.expiresAt?new Date(o.expiresAt).toLocaleString('en-GB',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}):'Today'}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab==='whatsapp'&&(
        <div style={{flex:1,overflowY:'auto',padding:16}}>
          <div style={{background:'rgba(37,211,102,.08)',border:'1px solid rgba(37,211,102,.2)',borderRadius:16,padding:20,marginBottom:16,textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:8}}>📱</div>
            <div style={{color:'white',fontSize:16,fontWeight:700,marginBottom:4}}>Post via WhatsApp</div>
            <div style={{color:'rgba(255,255,255,.5)',fontSize:13,lineHeight:1.5}}>Text your offer to this number and it appears on the map instantly.</div>
          </div>

          <div style={{background:'rgba(255,255,255,.05)',borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{color:'rgba(255,255,255,.4)',fontSize:11,marginBottom:4}}>YOUR HI-STREETS NUMBER</div>
            <div style={{color:'white',fontSize:22,fontWeight:700,letterSpacing:1}}>+44 7700 900 123</div>
            <button style={{background:OR,border:'none',borderRadius:10,color:'white',padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer',marginTop:10}}>
              Save number
            </button>
          </div>

          <div style={{background:'rgba(255,255,255,.05)',borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{color:'rgba(255,255,255,.4)',fontSize:11,marginBottom:10}}>EXAMPLE MESSAGES</div>
            {['20% off all pizzas until 8pm tonight','Free garlic bread with any large pizza today','Buy one coffee get one free all day'].map((ex,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,.07)',borderRadius:10,padding:'8px 12px',marginBottom:6,fontSize:13,color:'rgba(255,255,255,.7)',fontStyle:'italic'}}>
                "{ex}"
              </div>
            ))}
          </div>

          <div style={{background:'rgba(255,255,255,.05)',borderRadius:14,padding:16}}>
            <div style={{color:'rgba(255,255,255,.4)',fontSize:11,marginBottom:10}}>HOW IT WORKS</div>
            {['Text your offer to the number above','Our AI reads it and creates the offer','It appears on the Hi-Streets map in seconds','Customers nearby see it and come in'].map((s,i)=>(
              <div key={i} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
                <div style={{width:22,height:22,borderRadius:50,background:OR,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                <div style={{color:'rgba(255,255,255,.7)',fontSize:13,paddingTop:2}}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
