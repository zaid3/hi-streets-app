'use client'
const OR = '#ff681f'
export default function SideMenu({ onClose, onNav, onSignOut, user }) {
  const items = [['🗺️','Home Map','map'],['🔍','Search','search'],['❤️','Saved Places','saved'],['🔔','Notifications','alerts'],['❓','Help & FAQ','help'],['⚠️','Report Wrong Data','report'],['🏪','Business Dashboard','business'],['⚙️','Settings','settings'],['📧','Contact Support','contact']]
  return (
    <div style={{ position:'fixed', inset:0, zIndex:3000 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.75)' }} />
      <div style={{ position:'absolute', top:0, left:0, bottom:0, width:300, background:'rgba(10,10,10,.98)', backdropFilter:'blur(30px)', borderRight:'1px solid rgba(255,255,255,.08)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display:'inline-flex', flexDirection:'column', fontFamily:'Arial,Helvetica,sans-serif', lineHeight:1, marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center' }}>
              <div style={{ position:'relative', width:38, height:34, flexShrink:0 }}>
                <div style={{ position:'absolute', top:0, left:0, width:8, height:8, borderTop:'2px solid '+OR, borderLeft:'2px solid '+OR }} />
                <span style={{ position:'absolute', left:6, bottom:4, fontSize:26, fontWeight:800, color:OR, letterSpacing:'-0.08em' }}>Hi</span>
                <div style={{ position:'absolute', right:0, bottom:2, width:8, height:8, borderBottom:'2px solid '+OR, borderRight:'2px solid '+OR }} />
              </div>
              <span style={{ fontSize:24, fontWeight:400, color:'#fff', letterSpacing:'-0.055em' }}>Streets</span>
            </div>
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.4)' }}>{user?.email||'Guest user'}</div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'12px 0' }}>
          {items.map(([ic,lb,ac]) => <button key={ac} onClick={()=>{ onNav(ac); onClose() }} style={{ width:'100%', background:'none', border:'none', padding:'14px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:14, color:'rgba(255,255,255,.8)', fontSize:15, textAlign:'left' }}><span style={{ fontSize:20, width:26 }}>{ic}</span>{lb}</button>)}
        </div>
        <div style={{ padding:'16px 20px 32px', borderTop:'1px solid rgba(255,255,255,.07)' }}>
          <button onClick={()=>{ onSignOut(); onClose() }} style={{ width:'100%', background:'rgba(231,76,60,.1)', border:'1px solid rgba(231,76,60,.3)', borderRadius:12, padding:13, fontSize:14, fontWeight:700, color:'#E74C3C', cursor:'pointer' }}>🚪 Logout</button>
        </div>
      </div>
    </div>
  )
}
