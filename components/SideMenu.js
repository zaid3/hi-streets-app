'use client'
import{useRouter}from'next/navigation'
const OR='#ff681f'
const baseItems=[
  {icon:'🗺️',label:'Map',href:'/map'},
  {icon:'🏪',label:'For businesses',href:'/business'},
  {icon:'♥',label:'Saved places',action:'saved'},
  {icon:'🔔',label:'Notifications',action:'notif'},
  {icon:'❓',label:'Help & FAQ',href:'/map?help=1'},
  {icon:'⚙️',label:'Settings',action:'settings'},
]
export default function SideMenu({open,onClose,onAction,user}){
  const r=useRouter()
  const items=user?[...baseItems,{icon:'🚪',label:'Sign out',action:'signout'}]:[...baseItems,{icon:'🔐',label:'Sign in',href:'/login?redirect=/map'}]
  function handle(item){
    if(item.href){r.push(item.href);onClose()}
    else{onAction&&onAction(item.action);onClose()}
  }
  return(
    <>
      {open&&<div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',zIndex:490}}/>}
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:280,background:'#111',zIndex:500,transform:open?'translateX(0)':'translateX(-100%)',transition:'transform .3s cubic-bezier(.4,0,.2,1)',display:'flex',flexDirection:'column',borderRight:'1px solid rgba(255,255,255,.08)'}}>
        <div style={{padding:'max(48px,env(safe-area-inset-top)) 20px 20px',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
          <div style={{marginBottom:4}}>
            <span style={{fontSize:22,fontWeight:800,color:OR}}>Hi</span>
            <span style={{fontSize:22,fontWeight:400,color:'white'}}>Streets</span>
          </div>
          {user
            ?<div style={{color:'rgba(255,255,255,.5)',fontSize:13}}>{user.email}</div>
            :<div style={{color:'rgba(255,255,255,.35)',fontSize:13}}>Guest — tap to sign in</div>}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
          {items.map(item=>(
            <button key={item.label} onClick={()=>handle(item)}
              style={{width:'100%',background:'none',border:'none',color:'white',padding:'14px 20px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',fontSize:15,textAlign:'left',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
              <span style={{fontSize:20}}>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
        <div style={{padding:'16px 20px',borderTop:'1px solid rgba(255,255,255,.08)',color:'rgba(255,255,255,.2)',fontSize:11}}>
          Hi-Streets v0.6 · Live Offers &amp; Free Parking
        </div>
      </div>
    </>
  )
}
