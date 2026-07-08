'use client'
import{useRouter}from'next/navigation'
const BLUE='#2547d8'
const items=[
  ['👤','My account','/login?redirect=/map'],['🚗','Parking preferences',null,'settings'],['🏠','Launch Screen','/map'],['♛','30 days free',null,'premium'],['🔔','News',null,'news'],['↗','Share app',null,'share'],['★','Rate app',null,'rate'],['ⓘ','Help centre',null,'help'],['i','About',null,'about'],['🏪','Business portal','/business']
]
export default function SideMenu({open,onClose,onAction,user}){
  const r=useRouter()
  function go(href,action){
    if(action==='share')navigator.share?.({title:'Hi-Streets UK',text:'Find parking and local offers nearby',url:location.origin})
    else if(action)onAction?.(action)
    if(href)r.push(href)
    onClose()
  }
  return(
    <>
      {open&&<div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.35)',zIndex:490}}/>}
      <div style={{position:'absolute',top:0,bottom:0,left:0,width:'min(86vw,626px)',background:'#fff',zIndex:500,transform:open?'translateX(0)':'translateX(-102%)',transition:'transform .28s cubic-bezier(.4,0,.2,1)',boxShadow:'20px 0 50px rgba(12,8,35,.22)',display:'flex',flexDirection:'column'}}>
        <div style={{height:220,background:'linear-gradient(135deg,#ffe23a 0%,#ffd500 58%,#fff275 58%)',padding:'max(62px,env(safe-area-inset-top)) 34px 22px',color:'#231b58'}}>
          <div style={{fontSize:34,fontWeight:900,letterSpacing:'-.8px'}}>hi-streets<span style={{color:BLUE}}>+</span><span style={{fontSize:24,marginLeft:4}}>premium</span></div>
        </div>
        <div style={{padding:'32px 34px',display:'flex',gap:22,alignItems:'center',background:'#eeedfb'}}>
          <div style={{width:92,height:92,borderRadius:99,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:44,color:'#9693ad'}}>👤</div>
          <div><div style={{fontSize:24,fontWeight:900,color:'#0b0628'}}>Hello</div><div style={{fontSize:18,color:'#77768a',fontWeight:700,marginTop:6}}>{user?.email||'Guest user'}</div></div>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {items.map(([icon,label,href,action])=>(
            <button key={label} onClick={()=>go(href,action)} style={{width:'100%',height:86,border:0,borderBottom:'1px solid #f0eef7',background:'#fff',display:'flex',alignItems:'center',gap:24,padding:'0 34px',fontSize:22,fontWeight:800,color:'#0b0628',cursor:'pointer',textAlign:'left'}}>
              <span style={{fontSize:28,color:'#aaa7c0',width:32,textAlign:'center'}}>{icon}</span><span style={{flex:1}}>{label}</span><span style={{color:'#c4c0d0',fontSize:34}}>›</span>
            </button>
          ))}
        </div>
        <div style={{padding:'28px 34px',fontSize:19,fontWeight:800,color:'#77768a'}}>Version: 1.0.0 MVP</div>
      </div>
    </>
  )
}