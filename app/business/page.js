'use client'
import{useEffect,useRef,useState}from'react'
import{useRouter}from'next/navigation'
import{supabase,isSupabaseConfigured}from'../../lib/supabase'
import{getLiveOffers,publishOffer}from'../../lib/offersAdapter'
import{businessReadyForOffers,getMyBusiness,saveBusinessProfile}from'../../lib/businessAdapter'

const BLUE='#2547d8',OR='#ff681f',INK='#0b0628',GREEN='#078d16'
const emptyForm={name:'',address:'',phone:'',whatsappPhone:'',website:'',googlePlaceId:'',category:'food',lat:'',lng:''}
function Logo(){return <div style={{fontSize:30,fontWeight:900,letterSpacing:'-.8px',color:INK}}>hi-streets<span style={{color:BLUE}}>+</span><span style={{fontSize:18,marginLeft:8,color:'#77768a'}}>business</span></div>}
function Bot({children}){return <div className="chat-in" style={{alignSelf:'flex-start',maxWidth:'92%',background:'#fff',border:'1px solid #eeeaf7',borderRadius:'20px 20px 20px 6px',padding:'13px 16px',fontSize:16,fontWeight:700,lineHeight:1.45,color:INK,boxShadow:'0 6px 18px rgba(29,24,60,.06)'}}>{children}</div>}
function User({text}){return <div className="chat-in" style={{alignSelf:'flex-end',maxWidth:'88%',background:BLUE,color:'#fff',borderRadius:'20px 20px 6px 20px',padding:'13px 16px',fontSize:16,fontWeight:800,lineHeight:1.45}}>{text}</div>}
function OfferPreview({offer,onPost,posting,posted,onEdit}){return <div className="chat-in" style={{alignSelf:'flex-start',width:'100%',background:'#fff',border:'1px solid #eeeaf7',borderRadius:18,padding:16,boxShadow:'0 8px 24px rgba(29,24,60,.08)'}}>
  <div style={{fontSize:13,fontWeight:900,color:'#77768a',marginBottom:8}}>Offer preview</div>
  <div style={{border:'1px solid #ffe1d1',background:'#fff7f2',borderRadius:14,padding:14,marginBottom:12}}>
    <div style={{fontSize:18,fontWeight:900,color:OR,marginBottom:4}}>{offer.shortLabel}</div>
    <div style={{fontSize:20,fontWeight:900,color:INK,marginBottom:6}}>{offer.title}</div>
    <div style={{fontSize:15,fontWeight:700,color:'#4c485f',lineHeight:1.45}}>{offer.description}</div>
    <div style={{fontSize:13,fontWeight:800,color:'#77768a',marginTop:10}}>Expires {new Date(offer.expiresAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
  </div>
  {posted?<div style={{color:GREEN,fontSize:17,fontWeight:900,textAlign:'center',padding:8}}>Live on the map</div>:<div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:10}}><button onClick={onPost} disabled={posting} className="solid-btn" style={{height:54,fontSize:17,background:OR,borderColor:OR}}>{posting?'Publishing':'Publish offer'}</button><button onClick={onEdit} className="outline-btn" style={{height:54,fontSize:17}}>Edit</button></div>}
</div>}
function Step({n,title,body,done}){return <div style={{display:'grid',gridTemplateColumns:'44px 1fr',gap:14,alignItems:'start',padding:'14px 0',borderBottom:'1px solid #eeeaf7'}}><div style={{width:44,height:44,borderRadius:99,background:done?GREEN:BLUE,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>{done?'✓':n}</div><div><div style={{fontSize:18,fontWeight:900,color:INK}}>{title}</div><div style={{fontSize:15,fontWeight:700,color:'#77768a',lineHeight:1.4,marginTop:4}}>{body}</div></div></div>}
function formFromBusiness(b){return b?{name:b.name||'',address:b.address||'',phone:b.phone||'',whatsappPhone:b.whatsapp_phone||'',website:b.website||'',googlePlaceId:b.google_place_id||'',category:b.category||'food',lat:b.lat||'',lng:b.lng||''}:emptyForm}
export default function BusinessPage(){
  const r=useRouter()
  const[user,setUser]=useState(null)
  const[authLoading,setAuthLoading]=useState(true)
  const[offers,setOffers]=useState([])
  const[messages,setMessages]=useState([])
  const[input,setInput]=useState('')
  const[parsing,setParsing]=useState(false)
  const[posting,setPosting]=useState(false)
  const[saving,setSaving]=useState(false)
  const[tab,setTab]=useState('chat')
  const[business,setBusiness]=useState(null)
  const[form,setForm]=useState(emptyForm)
  const[notice,setNotice]=useState('')
  const chatEndRef=useRef(null),inputRef=useRef(null)
  useEffect(()=>{supabase.auth.getSession().then(async({data:{session}})=>{const current=session?.user||null;setUser(current);setAuthLoading(false);if(current){const b=await getMyBusiness(current.id);setBusiness(b);setForm(formFromBusiness(b))}});const{data:{subscription}}=supabase.auth.onAuthStateChange(async(_,s)=>{const current=s?.user||null;setUser(current);if(current){const b=await getMyBusiness(current.id);setBusiness(b);setForm(formFromBusiness(b))}else{setBusiness(null);setForm(emptyForm)}});return()=>subscription.unsubscribe()},[])
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[messages])
  useEffect(()=>{getLiveOffers().then(setOffers)},[])
  useEffect(()=>{if(!messages.length)setMessages([{type:'bot',text:'Write your offer in plain English. I will turn it into a clean map offer, then publish it after your business is verified.',id:1}])},[messages.length])
  async function sendMessage(){
    const text=input.trim();if(!text||parsing)return
    setInput('');setMessages(m=>[...m,{type:'user',text,id:Date.now()}])
    if(/\?$|what|how|when|why|where|help/i.test(text)){setMessages(m=>[...m,{type:'bot',text:'Example: 20% off all pizzas until 8pm. The app will create the title, map label and expiry time.',id:Date.now()+1}]);return}
    setParsing(true)
    try{const res=await fetch('/api/parse-offer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});const parsed=await res.json();if(!parsed.valid)setMessages(m=>[...m,{type:'bot',text:'I could not read that as an offer. Try: Free cake with any hot drink until 6pm.',id:Date.now()}]);else setMessages(m=>[...m,{type:'offer',offer:parsed,id:Date.now(),posted:false}])}catch{setMessages(m=>[...m,{type:'bot',text:'Something went wrong while preparing the offer. Please try again.',id:Date.now()}])}finally{setParsing(false)}
  }
  async function postOffer(offer,msgId){
    const ready=businessReadyForOffers(business)
    if(!ready.ready){setMessages(m=>[...m,{type:'bot',text:ready.reason,id:Date.now()}]);setTab(user?'verify':'chat');return}
    setPosting(true)
    const result=await publishOffer(offer,business.id,'portal')
    setPosting(false)
    if(result.success){setMessages(m=>m.map(x=>x.id===msgId?{...x,posted:true}:x));getLiveOffers().then(setOffers)}
    else setMessages(m=>[...m,{type:'bot',text:result.error||'Offer could not be published.',id:Date.now()}])
  }
  async function saveProfile(){
    setSaving(true);setNotice('')
    const result=await saveBusinessProfile(user?.id,form,business?.id)
    setSaving(false)
    if(result.success){setBusiness(result.business);setForm(formFromBusiness(result.business));setNotice(result.business.is_verified?'Business profile saved.':'Business profile submitted. It will need approval before offers appear on the public map.');setTab('chat')}
    else setNotice(result.error)
  }
  if(authLoading)return <div style={{height:'100dvh',background:'#f7f6fc'}}/>
  const ready=businessReadyForOffers(business)
  return(
    <div style={{height:'100dvh',background:'#f7f6fc',display:'flex',flexDirection:'column',overflow:'hidden',color:INK}}>
      <div style={{background:'#fff',borderBottom:'1px solid #eeeaf7',padding:'max(16px,env(safe-area-inset-top)) 24px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 4px 18px rgba(29,24,60,.05)'}}><Logo/><button onClick={()=>r.push('/map')} className="outline-btn" style={{height:46,fontSize:16,padding:'0 18px'}}>Map</button></div>
      {!isSupabaseConfigured&&<div style={{background:'#ffe8e8',borderBottom:'1px solid #ffd0d0',padding:'10px 18px',fontSize:14,fontWeight:900,color:INK}}>Backend is not configured. Add Supabase keys before real businesses can publish.</div>}
      {!user&&<div style={{background:'#fff4df',borderBottom:'1px solid #f5e2b8',padding:'12px 18px',fontSize:14,fontWeight:800,color:INK,display:'flex',gap:10,alignItems:'center',justifyContent:'space-between'}}><span>Sign in to create a business profile and publish offers.</span><button onClick={()=>r.push('/login?redirect=/business')} className="solid-btn" style={{height:40,fontSize:14,padding:'0 14px'}}>Sign in</button></div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,padding:'16px 18px 6px'}}>{[['Live offers',offers.length,OR],['Business',business?.name?'Saved':'Missing',business?.name?GREEN:'#77768a'],['Status',business?.is_verified?'Verified':business?'Pending':'Start',business?.is_verified?GREEN:BLUE]].map(([l,v,c])=><div key={l} style={{background:'#fff',border:'1px solid #eeeaf7',borderRadius:14,padding:14,textAlign:'center'}}><div style={{fontSize:22,fontWeight:900,color:c,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v}</div><div style={{fontSize:13,fontWeight:800,color:'#77768a',marginTop:3}}>{l}</div></div>)}</div>
      <div style={{display:'flex',gap:8,padding:'12px 18px 6px',overflowX:'auto'}}>{[['chat','Offer writer'],['offers','Live offers'],['verify','Business profile'],['whatsapp','WhatsApp setup']].map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{border:0,borderRadius:999,padding:'10px 14px',background:tab===id?BLUE:'#fff',color:tab===id?'#fff':INK,fontSize:14,fontWeight:900,cursor:'pointer',boxShadow:'0 3px 10px rgba(29,24,60,.06)',whiteSpace:'nowrap'}}>{label}</button>)}</div>
      {notice&&<div style={{margin:'8px 18px 0',background:'#fff',border:'1px solid #eeeaf7',borderRadius:12,padding:12,fontSize:14,fontWeight:800,color:notice.includes('could')||notice.includes('required')?OR:GREEN}}>{notice}</div>}
      {tab==='chat'&&<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column'}}><div style={{flex:1,overflowY:'auto',padding:18,display:'flex',flexDirection:'column',gap:10}}>{messages.map(msg=>msg.type==='user'?<User key={msg.id} text={msg.text}/>:msg.type==='offer'?<OfferPreview key={msg.id} offer={msg.offer} posted={msg.posted} posting={posting} onPost={()=>postOffer(msg.offer,msg.id)} onEdit={()=>{setInput(msg.offer.description);inputRef.current?.focus()}}/>:<Bot key={msg.id}>{msg.text}</Bot>)}<div ref={chatEndRef}/></div><div style={{background:'#fff',borderTop:'1px solid #eeeaf7',padding:'14px 18px max(14px,env(safe-area-inset-bottom))'}}><div style={{display:'flex',gap:10,alignItems:'flex-end'}}><textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} rows={1} placeholder="Type your offer, e.g. Free garlic bread until 9pm" style={{flex:1,border:'1px solid #e7e3f0',background:'#f7f6fc',borderRadius:14,padding:'14px 15px',fontSize:16,fontWeight:700,outline:0,resize:'none',maxHeight:100}} onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'}}/><button onClick={sendMessage} disabled={parsing||!input.trim()} className="solid-btn" style={{width:56,height:56,borderRadius:99,padding:0}}>Go</button></div><div style={{fontSize:12,fontWeight:800,color:ready.ready?GREEN:'#77768a',textAlign:'center',marginTop:9}}>{ready.ready?'Ready to publish live offers.':ready.reason}</div></div></div>}
      {tab==='offers'&&<div style={{flex:1,overflowY:'auto',padding:18}}>{offers.map(o=><div key={o.id} style={{background:'#fff',border:'1px solid #eeeaf7',borderRadius:16,padding:16,marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><div style={{fontSize:19,fontWeight:900}}>{o.title}</div><span style={{background:'#e8fff1',color:GREEN,borderRadius:999,padding:'4px 10px',fontSize:12,fontWeight:900}}>Live</span></div><div style={{fontSize:15,fontWeight:800,color:'#77768a',marginTop:7}}>{o.businessName} · {o.source||'portal'}</div></div>)}{!offers.length&&<div style={{background:'#fff',border:'1px solid #eeeaf7',borderRadius:16,padding:24,textAlign:'center',fontWeight:800,color:'#77768a'}}>No live offers yet.</div>}</div>}
      {tab==='verify'&&<div style={{flex:1,overflowY:'auto',padding:18}}><div style={{background:'#fff',border:'1px solid #eeeaf7',borderRadius:18,padding:20}}><h2 style={{fontSize:28,fontWeight:900,margin:'0 0 8px'}}>Business profile</h2><p style={{fontSize:16,fontWeight:700,color:'#77768a',lineHeight:1.45}}>Add the real business details and map location. New profiles stay pending until approved, then offers can go live.</p>{[['name','Business name'],['address','Business address'],['lat','Latitude'],['lng','Longitude'],['phone','Business phone'],['whatsappPhone','WhatsApp phone'],['website','Website optional'],['googlePlaceId','Google Place ID or Maps link'],['category','Category']].map(([k,label])=><label key={k} style={{display:'block',fontSize:14,fontWeight:900,color:'#77768a',marginTop:14}}>{label}<input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{display:'block',width:'100%',marginTop:6,border:'1px solid #e7e3f0',borderRadius:12,padding:'13px 14px',fontSize:16,fontWeight:800,color:INK}}/></label>)}<button onClick={saveProfile} disabled={!user||saving} className="solid-btn" style={{width:'100%',marginTop:18}}>{saving?'Saving':'Save business profile'}</button></div></div>}
      {tab==='whatsapp'&&<div style={{flex:1,overflowY:'auto',padding:18}}><div style={{background:'#fff',border:'1px solid #eeeaf7',borderRadius:18,padding:20}}><h2 style={{fontSize:28,fontWeight:900,margin:'0 0 8px'}}>WhatsApp offer publishing</h2><p style={{fontSize:16,fontWeight:700,color:'#77768a',lineHeight:1.45}}>A verified business can text an offer to the Hi-Streets WhatsApp number. The webhook checks the sender, prepares the offer and publishes it to the map.</p><Step n="1" done={business?.id} title="Create business profile" body="Store real name, address, map location and approved WhatsApp phone."/><Step n="2" done={business?.is_verified} title="Approve the business" body="Only approved businesses can publish offers to protect the community map."/><Step n="3" title="Receive WhatsApp text" body="Example: 20% off all pizzas until 8pm."/><Step n="4" title="Publish to map" body="Only active offers with an expiry are shown. Expired offers disappear automatically."/><div style={{background:'#f7f6fc',borderRadius:14,padding:16,marginTop:16,fontSize:15,fontWeight:800,color:'#4c485f'}}>Production route: <b>/api/whatsapp</b>. Keep Meta tokens and WhatsApp credentials in server environment variables.</div></div></div>}
    </div>
  )
}
