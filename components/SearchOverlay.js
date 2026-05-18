'use client'
import{useState,useRef,useEffect}from'react'
import{searchUK}from'../lib/mapAdapters.js'
const QUICK=[{label:'📍 Near me',type:'loc'},{label:'🚉 Train stations',q:'train station'},{label:'🅿️ Car parks',q:'car park'},{label:'🛒 Supermarkets',q:'supermarket'},{label:'🏥 Hospitals',q:'hospital'}]
const NEARBY_CODES=[{code:'59864',road:'Marlow Road, Newham'},{code:'59859',road:'High Street South, Newham'},{code:'59865',road:'Masterman Road, London'},{code:'59863',road:'Lonsdale Avenue, Newham'},{code:'59866',road:'Brampton Road, Newham'},{code:'59856',road:'Vicarage Lane, Newham'}]
export default function SearchOverlay({onSelect,onClose,currentLocation}){
  const[q,setQ]=useState('')
  const[results,setResults]=useState([])
  const[loading,setLoading]=useState(false)
  const[tab,setTab]=useState('recent')
  const[recent,setRecent]=useState(()=>{try{return JSON.parse(localStorage.getItem('hs_recent')||'[]')}catch{return[]}})
  const timer=useRef(null),inp=useRef(null)
  useEffect(()=>{inp.current?.focus()},[])
  useEffect(()=>{
    clearTimeout(timer.current)
    if(!q.trim()){setResults([]);return}
    setLoading(true)
    timer.current=setTimeout(async()=>{setResults(await searchUK(q));setLoading(false)},400)
  },[q])
  function select(item){
    const e={name:item.name,lat:item.lat,lng:item.lng}
    const up=[e,...recent.filter(r=>r.name!==item.name)].slice(0,6)
    setRecent(up);try{localStorage.setItem('hs_recent',JSON.stringify(up))}catch{}
    onSelect(item)
  }
  return(
    <div style={{position:'fixed',inset:0,background:'#0a0a0a',zIndex:2000,display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px 16px 0',display:'flex',gap:10,alignItems:'center'}}>
        <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:22,padding:0}}>‹</button>
        <div style={{flex:1,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,display:'flex',alignItems:'center',padding:'0 14px',gap:10}}>
          <span style={{opacity:.4,fontSize:16}}>🔍</span>
          <input ref={inp} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search location code or destination" style={{background:'none',border:'none',outline:'none',color:'#fff',fontSize:15,flex:1,padding:'13px 0'}}/>
          {q&&<button onClick={()=>setQ('')} style={{background:'none',border:'none',color:'rgba(255,255,255,.4)',cursor:'pointer',fontSize:16,padding:0}}>✕</button>}
        </div>
      </div>

      {!q&&<>
        <div style={{display:'flex',margin:'12px 16px 0',gap:0,background:'rgba(255,255,255,.06)',borderRadius:10,padding:3}}>
          {[['nearby','Nearby codes'],['recent','Recent searches']].map(([id,lb])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,background:tab===id?'rgba(255,255,255,.12)':'none',border:'none',borderRadius:8,padding:'8px',fontSize:13,fontWeight:600,color:tab===id?'#fff':'rgba(255,255,255,.4)',cursor:'pointer'}}>{lb}</button>
          ))}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'12px 16px 24px'}}>
          {tab==='nearby'?(
            <>
              <button onClick={()=>select({name:'Current Location',lat:currentLocation?.lat||51.5074,lng:currentLocation?.lng||-0.1278})} style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:'13px 16px',marginBottom:8,cursor:'pointer',display:'flex',alignItems:'center',gap:12,color:'#fff',textAlign:'left'}}>
                <span style={{fontSize:20}}>📍</span><span style={{fontSize:14,fontWeight:600}}>Search near me</span>
              </button>
              {NEARBY_CODES.map(nc=>(
                <button key={nc.code} onClick={()=>select({name:nc.road,lat:51.5374,lng:0.0055})} style={{width:'100%',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,padding:'12px 16px',marginBottom:6,cursor:'pointer',display:'flex',gap:12,alignItems:'center',color:'#fff',textAlign:'left'}}>
                  <span style={{fontSize:18,opacity:.4}}>#</span>
                  <div><div style={{fontSize:14,fontWeight:700}}>{nc.code}</div><div style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>{nc.road}</div></div>
                </button>
              ))}
            </>
          ):(
            <>
              {recent.length===0?<div style={{textAlign:'center',padding:'40px 0',color:'rgba(255,255,255,.3)',fontSize:14}}>No recent searches</div>:recent.map((r,i)=>(
                <button key={i} onClick={()=>select(r)} style={{width:'100%',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,padding:'12px 16px',marginBottom:6,cursor:'pointer',display:'flex',gap:12,alignItems:'center',color:'rgba(255,255,255,.7)',textAlign:'left'}}>
                  <span style={{fontSize:18,opacity:.4}}>📍</span>
                  <div><div style={{fontSize:14,fontWeight:600}}>{r.name}</div></div>
                </button>
              ))}
            </>
          )}
        </div>
      </>}

      {loading&&<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.4)'}}>Searching UK...</div>}
      {!loading&&results.length>0&&<div style={{flex:1,overflowY:'auto',padding:'8px 16px 24px'}}>
        {results.map((r,i)=>(
          <button key={i} onClick={()=>select(r)} style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:'13px 16px',marginBottom:6,cursor:'pointer',textAlign:'left',display:'flex',gap:12,alignItems:'center',color:'#fff'}}>
            <span style={{fontSize:18}}>📍</span>
            <div><div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{r.name}</div><div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{r.fullName.slice(0,60)}</div></div>
          </button>
        ))}
      </div>}
      {!loading&&q.length>2&&results.length===0&&<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.4)',gap:10}}><div style={{fontSize:40}}>🔍</div>No results for "{q}"</div>}
    </div>
  )
}
