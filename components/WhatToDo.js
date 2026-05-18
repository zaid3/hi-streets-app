'use client'
const OR='#ff681f'
export default function WhatToDo({onPlan,onSmarter,onClose}){
  return(
    <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(8,8,8,.99)',backdropFilter:'blur(30px)',borderTop:'1px solid rgba(255,255,255,.08)',borderRadius:'22px 22px 0 0',zIndex:300,padding:'12px 20px 36px'}}>
      <div style={{width:36,height:4,background:'rgba(255,255,255,.18)',borderRadius:2,margin:'0 auto 14px'}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{fontSize:16,fontWeight:800,margin:0}}>What do you want to do?</h3>
        <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.45)',cursor:'pointer',fontSize:18}}>∧</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <button onClick={onPlan} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:'16px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:14,color:'#fff',textAlign:'left'}}>
          <div style={{width:36,height:36,background:'rgba(50,80,200,.25)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🔍</div>
          <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>Plan parking in advance</div></div>
          <span style={{color:'rgba(255,255,255,.3)',fontSize:18}}>›</span>
        </button>
        <button onClick={onSmarter} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:'16px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:14,color:'#fff',textAlign:'left'}}>
          <div style={{width:36,height:36,background:'rgba(50,80,200,.25)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🧭</div>
          <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>Park smarter with Hi-Streets</div></div>
          <span style={{color:'rgba(255,255,255,.3)',fontSize:18}}>›</span>
        </button>
      </div>
    </div>
  )
}
