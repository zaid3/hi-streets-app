'use client'
import{useRouter}from'next/navigation'
const BLUE='#2547d8'
const items=[
  ['👤','My account','/login?redirect=/map'],['🚗','Parking preferences',null,'settings'],['🏠','Map home','/map'],['✓','Free community app',null,'about'],['🔔','News',null,'news'],['↗','Share app',null,'share'],['★','Rate app',null,'rate'],['ⓘ','Help centre',null,'help'],['i','About',null,'about'],['🏪','Business portal','/business']
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
      <div style={{position:'absolute',top:0,bottom:0,left:0,width:'min(86vw,430px)',background:'#fff',zIndex:500,transform:open?'translateX(0)':'translateX(-102%)',transition:'transform .28s cubic-bezier(.4,0,.2,1)',boxShadow:'20px 0 50px rgba(12,8,35,.22)',display:'flex',flexDirection:'column'}}>
        <div style={{height:188,background:'linear-gradient(135deg,#fff7ec 0%,#fff 62%,#eef4ff 62%)',padding:'max(48px,env(safe-area-inset-top)) 28px 20px',color:'#231b58',borderBottom:'1px solid #eeeaf7'}}>
          <div style={{fontSize:31,fontWeight:900,letterSpacing:0}}>Hi-Streets<span style={{color:BLUE}}>+</span></div>
          <div style={{fontSize:16,fontWeight:900,color:'#ff681f',marginTop:8}}>Free parking and local offers for the community</div>
        </div>
        <div style={{padding:'22px 28px',display:'flex',gap:16,alignItems:'center',background:'#f7f6fc'}}>
          <div style={{width:64,height:64,borderRadius:99,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,color:'#9693ad'}}>👤</div>
          <div><div style={{fontSize:21,fontWeight:900,color:'#0b0628'}}>Hello</div><div style={{fontSize:15,color:'#77768a',fontWeight:700,marginTop:4}}>{user?.email||'Guest user'}</div></div>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {items.map(([icon,label,href,action])=>(
            <button key={label} onClick={()=>go(href,action)} style={{width:'100%',height:68,border:0,borderBottom:'1px solid #f0eef7',background:'#fff',display:'flex',alignItems:'center',gap:18,padding:'0 28px',fontSize:18,fontWeight:850,color:'#0b0628',cursor:'pointer',textAlign:'left'}}>
              <span style={{fontSize:22,color:'#aaa7c0',width:28,textAlign:'center'}}>{icon}</span><span style={{flex:1}}>{label}</span><span style={{color:'#c4c0d0',fontSize:28}}>›</span>
            </button>
          ))}
        </div>
        <div style={{padding:'20px 28px',fontSize:15,fontWeight:800,color:'#77768a'}}>Free to use · Community supported</div>
      </div>
    </>
  )
}