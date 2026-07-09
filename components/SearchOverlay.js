'use client'
import{useRef,useState}from'react'
const BLUE='#2547d8',INK='#0b0628'
const POSTCODE=/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i
export default function SearchOverlay({onClose,onSelect,currentLocation}){
  const[q,setQ]=useState('')
  const[results,setResults]=useState([])
  const[loading,setLoading]=useState(false)
  const timer=useRef(null)
  const recent=[
    {label:'Green Street',sub:'Newham, London',lat:51.5369,lng:0.0325},
    {label:'High Street North',sub:'East Ham, London',lat:51.5379,lng:0.0518},
    {label:'Stratford Station',sub:'London E15',lat:51.5416,lng:-0.0038},
    {label:'Ilford Station',sub:'Ilford IG1',lat:51.5591,lng:0.0688},
    {label:'Canada Square',sub:'Canary Wharf, London E14',lat:51.5047,lng:-0.0195},
  ]
  async function postcodeResult(value){
    const compact=value.trim().toUpperCase()
    if(!POSTCODE.test(compact))return null
    const res=await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}`)
    if(!res.ok)return null
    const json=await res.json()
    const pc=json?.result
    if(!pc?.latitude||!pc?.longitude)return null
    return{label:pc.postcode,sub:[pc.admin_district,pc.region,'United Kingdom'].filter(Boolean).join(', '),lat:pc.latitude,lng:pc.longitude,postcode:true}
  }
  async function placeResults(value){
    const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value+', UK')}&format=json&limit=7&countrycodes=gb&addressdetails=1`
    const data=await fetch(url,{headers:{'Accept-Language':'en'}}).then(r=>r.json())
    return data.map(d=>({label:d.display_name.split(',')[0],sub:d.display_name.split(',').slice(1,4).join(','),lat:+d.lat,lng:+d.lon}))
  }
  async function runSearch(value){
    setLoading(true)
    let postcode=null,places=[]
    try{postcode=await postcodeResult(value)}catch{}
    try{places=await placeResults(value)}catch{}
    const rows=postcode?[postcode,...places.filter(p=>Math.abs(p.lat-postcode.lat)>.0001||Math.abs(p.lng-postcode.lng)>.0001)]:places
    setResults(rows)
    setLoading(false)
  }
  function search(v){
    setQ(v);clearTimeout(timer.current)
    if(!v.trim()){setResults([]);return}
    timer.current=setTimeout(()=>runSearch(v),260)
  }
  const rows=q?results:recent
  return(
    <div style={{position:'absolute',inset:0,zIndex:520,background:'#f7f6fc',display:'flex',flexDirection:'column',color:INK}}>
      <div style={{padding:'max(18px,env(safe-area-inset-top)) 18px 18px',background:'#f3f2fa'}}>
        <div style={{display:'grid',gridTemplateColumns:'44px 1fr',gap:10,alignItems:'center'}}>
          <button onClick={onClose} style={{border:0,background:'transparent',fontSize:42,color:'#87859c',lineHeight:1,cursor:'pointer'}}>‹</button>
          <div style={{height:58,background:'#fff',border:'1px solid #e5e1ef',borderRadius:8,display:'flex',alignItems:'center',gap:10,padding:'0 14px'}}>
            <span style={{fontSize:24,color:BLUE}}>⌕</span>
            <input value={q} onChange={e=>search(e.target.value)} autoFocus placeholder="Postcode, road or place" style={{flex:1,border:0,outline:0,fontSize:17,fontWeight:800,color:INK,background:'transparent'}}/>
            {q&&<button onClick={()=>{setQ('');setResults([])}} style={{border:0,background:'transparent',fontSize:24,color:'#9996aa',cursor:'pointer'}}>×</button>}
          </div>
        </div>
      </div>
      {!q&&<div style={{padding:'16px 20px 10px',fontSize:13,fontWeight:900,color:'#77768a'}}>COMMON PLACES</div>}
      <div style={{flex:1,overflowY:'auto',background:'#fff'}}>
        {!q&&<button onClick={()=>onSelect(currentLocation)} style={{display:'flex',alignItems:'center',gap:16,width:'100%',border:0,background:'#fff',padding:'22px 24px',fontSize:20,fontWeight:900,color:INK,cursor:'pointer',textAlign:'left'}}><span style={{fontSize:32,color:BLUE}}>◎</span>Search near me</button>}
        {loading&&<div style={{padding:35,textAlign:'center',fontSize:18,color:'#77768a',fontWeight:700}}>Searching...</div>}
        {!loading&&rows.map((r,i)=>(
          <button key={`${r.label}-${i}`} onClick={()=>onSelect(r)} style={{display:'grid',gridTemplateColumns:'34px 1fr',gap:16,width:'100%',border:0,borderBottom:'1px solid #eeeaf7',background:'#fff',padding:'16px 24px',textAlign:'left',cursor:'pointer'}}>
            <span style={{fontSize:r.postcode?31:29,color:r.postcode?BLUE:'#a5a2b7',fontWeight:900,lineHeight:1}}>{r.postcode?'PC':'⌖'}</span>
            <span><span style={{display:'block',fontSize:20,fontWeight:900,color:INK,lineHeight:1.18}}>{r.label}</span><span style={{display:'block',fontSize:16,color:'#77768a',fontWeight:700,marginTop:5}}>{r.sub}</span></span>
          </button>
        ))}
        {q&&!loading&&!rows.length&&<div style={{padding:50,textAlign:'center',fontSize:18,color:'#77768a'}}>No result for {q}</div>}
      </div>
    </div>
  )
}
