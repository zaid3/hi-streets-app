'use client'
import{useState}from'react'
import{getCatIcon,getCatColor}from'../data/mockOffers.js'
const OR='#ff681f'
function tl(exp){const d=new Date(exp)-new Date();if(d<0)return'Expired';const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000);return h>0?`${h}h ${m}m left`:`${m}m left`}
export default function OfferSheet({item,onClose}){
  const[saved,setSaved]=useState(false),[claimed,setClaimed]=useState(false),[toast,setToast]=useState(null)
  if(!item)return null
  const icon=getCatIcon(item.category),color=getCatColor(item.category)
  function showToast(m){setToast(m);setTimeout(()=>setToast(null),2500)}
  function share(){const t=`${item.title} at ${item.businessName}`;if(navigator.share)navigator.share({title:'Hi-Streets',text:t,url:'https://app.histreets.uk'}).catch(()=>{});else{navigator.clipboard?.writeText(t);showToast('Copied!')}}
  return(
    <>
      {toast&&<div style={{position:'fixed',top:'15%',left:'50%',transform:'translateX(-50%)',background:'rgba(10,10,10,.97)',border:'1px solid rgba(255,255,255,.1)',color:'#fff',borderRadius:20,padding:'10px 22px',fontSize:14,fontWeight:600,zIndex:600,whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>{toast}</div>}
      <div className="slide-up" style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(8,8,8,.99)',backdropFilter:'blur(30px)',borderTop:'1px solid rgba(255,255,255,.08)',borderRadius:'22px 22px 0 0',zIndex:500,maxHeight:'80vh',overflowY:'auto'}}>
        <div style={{padding:'14px 20px 44px'}}>
          <div style={{width:36,height:4,background:'rgba(255,255,255,.18)',borderRadius:2,margin:'0 auto 14px'}}/>
          <button onClick={onClose} style={{position:'absolute',top:14,right:20,background:'none',border:'none',fontSize:20,color:'rgba(255,255,255,.5)',cursor:'pointer'}}>✕</button>
          <div style={{display:'flex',gap:14,alignItems:'flex-start',marginBottom:14}}>
            <div style={{width:56,height:56,borderRadius:16,background:color+'22',border:'1px solid '+color+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>{icon}</div>
            <div style={{flex:1}}><h3 style={{fontSize:18,fontWeight:800,margin:'0 0 2px'}}>{item.title}</h3><p style={{fontSize:13,color:'rgba(255,255,255,.45)',margin:0}}>{item.businessName} · {item.distance}</p></div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
            <span style={{background:OR+'22',color:OR,border:'1px solid '+OR+'44',borderRadius:20,padding:'5px 12px',fontSize:13,fontWeight:700}}>{item.shortLabel}</span>
            {item.expiresAt&&<span style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',borderRadius:20,padding:'5px 12px',fontSize:13,color:'rgba(255,255,255,.5)'}}>⏱ {tl(item.expiresAt)}</span>}
            {item.source==='whatsapp'&&<span style={{background:'rgba(37,211,102,.12)',color:'#25D366',border:'1px solid rgba(37,211,102,.3)',borderRadius:20,padding:'5px 12px',fontSize:12}}>📱 WhatsApp</span>}
          </div>
          {item.description&&<p style={{fontSize:14,color:'rgba(255,255,255,.65)',lineHeight:1.6,marginBottom:14}}>{item.description}</p>}
          {item.terms&&<div style={{background:'rgba(255,255,255,.04)',borderRadius:12,padding:'10px 14px',marginBottom:14}}><p style={{fontSize:12,color:'rgba(255,255,255,.35)',margin:0}}>Terms: {item.terms}</p></div>}
          {claimed&&<div style={{background:'rgba(46,204,113,.12)',border:'1px solid rgba(46,204,113,.3)',borderRadius:14,padding:'14px',marginBottom:14,textAlign:'center'}}><div style={{fontSize:24,marginBottom:6}}>✅</div><div style={{fontSize:15,fontWeight:700,color:'#2ECC71'}}>Offer Claimed!</div><div style={{fontSize:13,color:'rgba(255,255,255,.5)',marginTop:4}}>Show this at {item.businessName}</div></div>}
          {!claimed&&<button onClick={()=>{setClaimed(true);showToast('Offer claimed!')}} style={{width:'100%',background:'linear-gradient(135deg,'+OR+',#FF8C00)',border:'none',borderRadius:14,padding:16,fontSize:16,fontWeight:800,color:'#fff',cursor:'pointer',boxShadow:'0 4px 20px rgba(255,104,31,.4)',marginBottom:12}}>Claim Offer</button>}
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>window.open('https://www.google.com/maps/dir/?api=1&destination='+item.lat+','+item.lng,'_blank')} style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:13,fontSize:14,fontWeight:600,color:'rgba(255,255,255,.7)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>◆ Directions</button>
            <button onClick={()=>{setSaved(!saved);showToast(saved?'Removed':'Saved!')}} style={{background:saved?OR+'22':'rgba(255,255,255,.06)',border:`1px solid ${saved?OR+'44':'rgba(255,255,255,.1)'}`,borderRadius:12,padding:'13px 16px',cursor:'pointer',color:saved?OR:'rgba(255,255,255,.6)',fontSize:18}}>{saved?'❤️':'🔖'}</button>
            <button onClick={share} style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'13px 16px',cursor:'pointer',color:'rgba(255,255,255,.6)',fontSize:18}}>📤</button>
          </div>
        </div>
      </div>
    </>
  )
}
