'use client'
import{useEffect,useRef,useState}from'react'
import{useRouter}from'next/navigation'
import{supabase}from'../../lib/supabase'
import{getLiveOffers,publishOffer}from'../../lib/offersAdapter'

const BLUE='#2547d8',OR='#ff681f',INK='#0b0628',GREEN='#078d16'
function Logo(){return <div style={{fontSize:30,fontWeight:900,letterSpacing:'-.8px',color:INK}}>hi-streets<span style={{color:BLUE}}>+</span><span style={{fontSize:18,marginLeft:8,color:'#77768a'}}>business</span></div>}
function Bot({children}){return <div className="chat-in" style={{alignSelf:'flex-start',maxWidth:'92%',background:'#fff',border:'1px solid #eeeaf7',borderRadius:'20px 20px 20px 6px',padding:'13px 16px',fontSize:16,fontWeight:700,lineHeight:1.45,color:INK,boxShadow:'0 6px 18px rgba(29,24,60,.06)'}}>{children}</div>}
function User({text}){return <div className="chat-in" style={{alignSelf:'flex-end',maxWidth:'88%',background:BLUE,color:'#fff',borderRadius:'20px 20px 6px 20px',padding:'13px 16px',fontSize:16,fontWeight:800,lineHeight:1.45}}>{text}</div>}
function OfferPreview({offer,onPost,posting,posted,onEdit}){return <div className="chat-in" style={{alignSelf:'flex-start',width:'100%',background:'#fff',border:'1px solid #eeeaf7',borderRadius:18,padding:16,boxShadow:'0 8px 24px rgba(29,24,60,.08)'}}>
  <div style={{fontSize:13,fontWeight:900,color:'#77768a',marginBottom:8}}>AI offer preview</div>
  <div style={{border:'1px solid #ffe1d1',background:'#fff7f2',borderRadius:14,padding:14,marginBottom:12}}>
    <div style={{fontSize:18,fontWeight:900,color:OR,marginBottom:4}}>🛍️ {offer.shortLabel}</div>
    <div style={{fontSize:20,fontWeight:900,color:INK,marginBottom:6}}>{offer.title}</div>
    <div style={{fontSize:15,fontWeight:700,color:'#4c485f',lineHeight:1.45}}>{offer.description}</div>
    <div style={{fontSize:13,fontWeight:800,color:'#77768a',marginTop:10}}>Expires {new Date(offer.expiresAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
  </div>
  {posted?<div style={{color:GREEN,fontSize:17,fontWeight:900,textAlign:'center',padding:8}}>✓ Live on the map</div>:<div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:10}}><button onClick={onPost} disabled={posting} className="solid-btn" style={{height:54,fontSize:17,background:OR,borderColor:OR}}>{posting?'Posting…':'Post to map'}</button><button onClick={onEdit} className="outline-btn" style={{height:54,fontSize:17}}>Edit</button></div>}
</div>}
function Step({n,title,body,done}){return <div style={{display:'grid',gridTemplateColumns:'44px 1fr',gap:14,alignItems:'start',padding:'14px 0',borderBottom:'1px solid #eeeaf7'}}><div style={{width:44,height:44,borderRadius:99,background:done?GREEN:BLUE,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>{done?'✓':n}</div><div><div style={{fontSize:18,fontWeight:900,color:INK}}>{title}</div><div style={{fontSize:15,fontWeight:700,color:'#77768a',lineHeight:1.4,marginTop:4}}>{body}</div></div></div>}
export default function BusinessPage(){
  const r=useRouter()
  const[user,setUser]=useState(null)
  const[authLoading,setAuthLoading]=useState(true)
  const[offers,setOffers]=useState([])
  const[messages,setMessages]=useState([])
  const[input,setInput]=useState('')
  const[parsing,setParsing]=useState(false)
  const[posting,setPosting]=useState(false)
  const[tab,setTab]=useState('chat')
  const[business,setBusiness]=useState(null)
  const[form,setForm]=useState({name:'Green Street Grill',address:'142 Green Street, Newham',phone:'+44 7700 900 123',website:'',googlePlaceId:'demo-green-street-grill',category:'food'})
  const chatEndRef=useRef(null),inputRef=useRef(null)
  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user||null);setAuthLoading(false)});try{const saved=localStorage.getItem('hs_business_profile');if(saved)setBusiness(JSON.parse(saved))}catch{}},[])
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[messages])
  useEffect(()=>{getLiveOffers().then(setOffers)},[])
  useEffect(()=>{if(!messages.length)setMessages([{type:'bot',text:'Hi, I can turn a simple WhatsApp-style message into a clean map offer. Try: 20% off all pizzas until 8pm',id:1}])},[messages.length])
  async function sendMessage(){
    const text=input.trim();if(!text||parsing)return
    setInput('');setMessages(m=>[...m,{type:'user',text,id:Date.now()}])
    if(/\?$|what|how|when|why|where|help/i.test(text)){setMessages(m=>[...m,{type:'bot',text:'To post an offer, just type the deal in plain English. I will clean it up, set an expiry and prepare it for the map.',id:Date.now()+1}]);return}
    setParsing(true)
    try{const res=await fetch('/api/parse-offer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});const parsed=await res.json();if(!parsed.valid)setMessages(m=>[...m,{type:'bot',text:'I could not read that as an offer. Try: Free cake with any hot drink until 6pm.',id:Date.now()}]);else setMessages(m=>[...m,{type:'offer',offer:parsed,id:Date.now(),posted:false}])}catch{setMessages(m=>[...m,{type:'bot',text:'Something went wrong. Please try again.',id:Date.now()}])}finally{setParsing(false)}
  }
  async function postOffer(offer,msgId){setPosting(true);const result=await publishOffer(offer,business?.id||'demo',business?.whatsapp?'whatsapp':'portal');setPosting(false);if(result.success){setMessages(m=>m.map(x=>x.id===msgId?{...x,posted:true}:x));getLiveOffers().then(setOffers)}}
  function verifyBusiness(){const profile={id:'demo',...form,is_verified:true,verifiedAt:new Date().toISOString(),whatsapp:true};setBusiness(profile);localStorage.setItem('hs_business_profile',JSON.stringify(profile));setTab('chat')}
  if(authLoading)return <div style={{height:'100dvh',background:'#f7f6fc'}}/>
  return(
    <div style={{height:'100dvh',background:'#f7f6fc',display:'flex',flexDirection:'column',overflow:'hidden',color:INK}}>
      <div style={{background:'#fff',borderBottom:'1px solid #eeeaf7',padding:'max(16px,env(safe-area-inset-top)) 24px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 4px 18px rgba(29,24,60,.05)'}}>
        <Logo/>
        <button onClick={()=>r.push('/map')} className="outline-btn" style={{height:46,fontSize:16,padding:'0 18px'}}>Map</button>
      </div>
      {!user&&<div style={{background:'#fff4df',borderBottom:'1px solid #f5e2b8',padding:'10px 24px',fontSize:14,fontWeight:800,color:INK}}>Demo mode: sign in later to save real businesses and offers permanently.</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,padding:'16px 18px 6px'}}>{[['Live offers',offers.length,OR],['Verified',business?.is_verified?'Yes':'No',business?.is_verified?GREEN:'#77768a'],['Source',business?.whatsapp?'WhatsApp':'Portal',BLUE]].map(([l,v,c])=><div key={l} style={{background:'#fff',border:'1px solid #eeeaf7',borderRadius:14,padding:14,textAlign:'center'}}><div style={{fontSize:24,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:13,fontWeight:800,color:'#77768a',marginTop:3}}>{l}</div></div>)}</div>
      <div style={{display:'flex',gap:8,padding:'12px 18px 6px'}}>{[['chat','AI offer'],['offers','My offers'],['verify','Verify business'],['whatsapp','WhatsApp setup']].map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{border:0,borderRadius:999,padding:'10px 14px',background:tab===id?BLUE:'#fff',color:tab===id?'#fff':INK,fontSize:14,fontWeight:900,cursor:'pointer',boxShadow:'0 3px 10px rgba(29,24,60,.06)'}}>{label}</button>)}</div>
      {tab==='chat'&&<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>
        <div style={{flex:1,overflowY:'auto',padding:18,display:'flex',flexDirection:'column',gap:10}}>{messages.map(msg=>msg.type==='user'?<User key={msg.id} text={msg.text}/>:msg.type==='offer'?<OfferPreview key={msg.id} offer={msg.offer} posted={msg.posted} posting={posting} onPost={()=>postOffer(msg.offer,msg.id)} onEdit={()=>{setInput(msg.offer.description);inputRef.current?.focus()}}/>:<Bot key={msg.id}>{msg.text}</Bot>)}<div ref={chatEndRef}/></div>
        <div style={{background:'#fff',borderTop:'1px solid #eeeaf7',padding:'14px 18px max(14px,env(safe-area-inset-bottom))'}}><div style={{display:'flex',gap:10,alignItems:'flex-end'}}><textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} rows={1} placeholder="Type your offer, e.g. Free garlic bread until 9pm" style={{flex:1,border:'1px solid #e7e3f0',background:'#f7f6fc',borderRadius:14,padding:'14px 15px',fontSize:16,fontWeight:700,outline:0,resize:'none',maxHeight:100}} onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'}}/><button onClick={sendMessage} disabled={parsing||!input.trim()} className="solid-btn" style={{width:56,height:56,borderRadius:99,padding:0}}>➤</button></div><div style={{fontSize:12,fontWeight:800,color:'#77768a',textAlign:'center',marginTop:9}}>Privacy-first MVP: offer text only. No customer tracking needed.</div></div>
      </div>}
      {tab==='offers'&&<div style={{flex:1,overflowY:'auto',padding:18}}>{offers.map(o=><div key={o.id} style={{background:'#fff',border:'1px solid #eeeaf7',borderRadius:16,padding:16,marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><div style={{fontSize:19,fontWeight:900}}>{o.title}</div><span style={{background:'#e8fff1',color:GREEN,borderRadius:999,padding:'4px 10px',fontSize:12,fontWeight:900}}>Live</span></div><div style={{fontSize:15,fontWeight:800,color:'#77768a',marginTop:7}}>{o.businessName} · {o.source||'portal'}</div></div>)}</div>}
      {tab==='verify'&&<div style={{flex:1,overflowY:'auto',padding:18}}><div style={{background:'#fff',border:'1px solid #eeeaf7',borderRadius:18,padding:20}}><h2 style={{fontSize:28,fontWeight:900,margin:'0 0 8px'}}>Verify your business</h2><p style={{fontSize:16,fontWeight:700,color:'#77768a',lineHeight:1.45}}>Simple verification keeps the map trustworthy without collecting unnecessary customer data. Link a Google place, phone or website, then approve WhatsApp posting.</p>{[['name','Business name'],['address','Business address'],['phone','Business phone'],['website','Website optional'],['googlePlaceId','Google Place ID or Maps link'],['category','Category']].map(([k,label])=><label key={k} style={{display:'block',fontSize:14,fontWeight:900,color:'#77768a',marginTop:14}}>{label}<input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{display:'block',width:'100%',marginTop:6,border:'1px solid #e7e3f0',borderRadius:12,padding:'13px 14px',fontSize:16,fontWeight:800,color:INK}}/></label>)}<button onClick={verifyBusiness} className="solid-btn" style={{width:'100%',marginTop:18}}>Verify demo business</button></div></div>}
      {tab==='whatsapp'&&<div style={{flex:1,overflowY:'auto',padding:18}}><div style={{background:'#fff',border:'1px solid #eeeaf7',borderRadius:18,padding:20}}><h2 style={{fontSize:28,fontWeight:900,margin:'0 0 8px'}}>WhatsApp AI agent</h2><p style={{fontSize:16,fontWeight:700,color:'#77768a',lineHeight:1.45}}>The business texts an offer to the Hi-Streets WhatsApp number. The webhook sends the text to the AI parser, checks the verified business profile, then publishes the offer to the map.</p><Step n="1" done={business?.is_verified} title="Verify business" body="Store business name, address, Google Place ID and approved WhatsApp phone."/><Step n="2" title="Receive WhatsApp text" body="Example: 20% off all pizzas until 8pm."/><Step n="3" title="AI improves the copy" body="The parser creates title, short label, expiry, category and customer-friendly description."/><Step n="4" title="Publish to map" body="Only active offers with an expiry are shown. Expired offers disappear automatically."/><div style={{background:'#f7f6fc',borderRadius:14,padding:16,marginTop:16,fontSize:15,fontWeight:800,color:'#4c485f'}}>Webhook route added at <b>/api/whatsapp</b>. Add your Meta webhook verify token and WhatsApp credentials in environment variables before production.</div></div></div>}
    </div>
  )
}
