'use client'
import{useState,useRef}from'react'

const OR='#ff681f'

export default function SearchOverlay({onClose,onSelect,currentLocation}){
  const[q,setQ]=useState('')
  const[results,setResults]=useState([])
  const[loading,setLoading]=useState(false)
  const timer=useRef(null)

  const recent=[
    {label:'Green Street, Newham',lat:51.5370,lng:0.0325},
    {label:'East Ham High Street',lat:51.5401,lng:0.0533},
    {label:'Forest Gate',lat:51.5502,lng:0.0364},
  ]

  async function search(v){
    setQ(v)
    clearTimeout(timer.current)
    if(!v.trim()){setResults([]);return}
    timer.current=setTimeout(async()=>{
      setLoading(true)
      try{
        const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v+', UK')}&format=json&limit=6&countrycodes=gb`
        const data=await fetch(url,{headers:{'Accept-Language':'en'}}).then(r=>r.json())
        setResults(data.map(d=>({label:d.display_name.split(',').slice(0,2).join(','),lat:+d.lat,lng:+d.lon})))
      }catch{}finally{setLoading(false)}
    },350)
  }

  return(
    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.7)',zIndex:500,display:'flex',flexDirection:'column'}}>
      <div style={{background:'#111',borderBottom:'1px solid rgba(255,255,255,.08)',padding:'12px 16px',paddingTop:'max(12px,env(safe-area-inset-top))'}}>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.6)',fontSize:20,cursor:'pointer',padding:4}}>←</button>
          <div style={{flex:1,background:'rgba(255,255,255,.1)',borderRadius:10,display:'flex',alignItems:'center',padding:'0 12px',gap:8}}>
            <span style={{color:'rgba(255,255,255,.4)',fontSize:16}}>🔍</span>
            <input
              value={q}
              onChange={e=>search(e.target.value)}
              placeholder="Search postcode, road or place…"
              autoFocus
              style={{flex:1,background:'none',border:'none',color:'white',fontSize:15,padding:'12px 0',outline:'none',fontFamily:'inherit'}}
            />
            {q&&<button onClick={()=>{setQ('');setResults([])}} style={{background:'none',border:'none',color:'rgba(255,255,255,.4)',cursor:'pointer',fontSize:16}}>✕</button>}
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
        {loading&&(
          <div style={{color:'rgba(255,255,255,.4)',fontSize:14,textAlign:'center',padding:24}}>Searching…</div>
        )}

        {!q&&!loading&&(
          <>
            <div style={{color:'rgba(255,255,255,.35)',fontSize:11,fontWeight:600,letterSpacing:1,padding:'12px 20px 4px'}}>RECENT</div>
            {recent.map((r,i)=>(
              <button key={i} onClick={()=>onSelect(r)}
                style={{width:'100%',background:'none',border:'none',color:'white',padding:'14px 20px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',textAlign:'left',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                <span style={{fontSize:16,opacity:.5}}>🕐</span>
                <span style={{fontSize:15}}>{r.label}</span>
              </button>
            ))}
            <button onClick={()=>onSelect(currentLocation)}
              style={{width:'100%',background:'none',border:'none',color:OR,padding:'14px 20px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',textAlign:'left'}}>
              <span style={{fontSize:16}}>📍</span>
              <span style={{fontSize:15,fontWeight:600}}>Search near me</span>
            </button>
          </>
        )}

        {results.map((r,i)=>(
          <button key={i} onClick={()=>onSelect(r)}
            style={{width:'100%',background:'none',border:'none',color:'white',padding:'14px 20px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',textAlign:'left',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
            <span style={{fontSize:16,opacity:.5}}>📍</span>
            <span style={{fontSize:15}}>{r.label}</span>
          </button>
        ))}

        {q&&!loading&&results.length===0&&(
          <div style={{color:'rgba(255,255,255,.3)',fontSize:14,textAlign:'center',padding:24}}>No results for "{q}"</div>
        )}
      </div>
    </div>
  )
}
