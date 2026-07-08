'use client'
import{useRef,useState}from'react'
const BLUE='#2547d8',INK='#0b0628'
export default function SearchOverlay({onClose,onSelect,currentLocation}){
  const[q,setQ]=useState('')
  const[results,setResults]=useState([])
  const[loading,setLoading]=useState(false)
  const[tab,setTab]=useState('recent')
  const timer=useRef(null)
  const recent=[
    {label:'Advent Way',sub:'London, N18 3AJ, United Kingdom',lat:51.612,lng:-0.048},
    {label:'Canada Square Car Park',sub:'London, E14 5EQ, United Kingdom',lat:51.5047,lng:-0.0195},
    {label:'Seven Sisters Cliffs',sub:'Seaford, BN25 4AD, United Kingdom',lat:50.758,lng:0.148},
    {label:'Hastings Beach',sub:'TN34 1JL, United Kingdom',lat:50.855,lng:0.586},
    {label:'Primark',sub:'Hastings, TN34 1PH, United Kingdom',lat:50.857,lng:0.582},
    {label:'Seven Sisters',sub:'BN20 0AB, United Kingdom',lat:50.763,lng:0.189},
  ]
  const codes=[
    ['59864','Marlow Road, Newham',51.5371,0.0322],['59859','High Street South, Newham',51.5362,0.0516],['59865','Masterman Road, London',51.5427,0.0489],['59863','Lonsdale Avenue, Newham',51.5322,0.0392],['59866','Brampton Road, Newham',51.539,0.0508],['59856','Vicarage Lane, Newham',51.5337,0.0504],['59853','Vicarage Lane, Newham',51.5341,0.0509],['70065','Green Street, Newham',51.5369,0.0325]
  ].map(([code,sub,lat,lng])=>({label:code,sub,lat,lng,code:true}))
  async function search(v){
    setQ(v);clearTimeout(timer.current)
    if(!v.trim()){setResults([]);return}
    timer.current=setTimeout(async()=>{
      setLoading(true)
      try{
        const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v+', UK')}&format=json&limit=7&countrycodes=gb`
        const data=await fetch(url,{headers:{'Accept-Language':'en'}}).then(r=>r.json())
        setResults(data.map(d=>({label:d.display_name.split(',')[0],sub:d.display_name.split(',').slice(1,4).join(','),lat:+d.lat,lng:+d.lon})))
      }catch{setResults([])}finally{setLoading(false)}
    },300)
  }
  const rows=q?results:(tab==='codes'?codes:recent)
  return(
    <div style={{position:'absolute',inset:0,zIndex:520,background:'#f7f6fc',display:'flex',flexDirection:'column',color:INK}}>
      <div style={{padding:'max(20px,env(safe-area-inset-top)) 28px 22px',background:'#f3f2fa'}}>
        <div style={{display:'grid',gridTemplateColumns:'52px 1fr',gap:16,alignItems:'center'}}>
          <button onClick={onClose} style={{border:0,background:'transparent',fontSize:45,color:'#87859c',lineHeight:1,cursor:'pointer'}}>‹</button>
          <div style={{height:66,background:'#fff',border:'1px solid #e5e1ef',borderRadius:8,display:'flex',alignItems:'center',gap:12,padding:'0 16px'}}>
            <span style={{fontSize:28,color:BLUE}}>⌕</span>
            <input value={q} onChange={e=>search(e.target.value)} autoFocus placeholder="Search location code or destination" style={{flex:1,border:0,outline:0,fontSize:18,fontWeight:700,color:INK,background:'transparent'}}/>
            {q&&<button onClick={()=>{setQ('');setResults([])}} style={{border:0,background:'transparent',fontSize:26,color:'#9996aa',cursor:'pointer'}}>×</button>}
          </div>
        </div>
      </div>
      {!q&&<div style={{padding:'22px 28px 18px'}}>
        <div className="segment-tabs" style={{boxShadow:'none'}}>
          <button className={`segment-tab ${tab==='codes'?'active':''}`} onClick={()=>setTab('codes')}>Nearby codes</button>
          <button className={`segment-tab ${tab==='recent'?'active':''}`} onClick={()=>setTab('recent')}>Recent searches</button>
        </div>
      </div>}
      <div style={{flex:1,overflowY:'auto',background:'#fff'}}>
        {!q&&tab==='recent'&&<button onClick={()=>onSelect(currentLocation)} style={{display:'flex',alignItems:'center',gap:20,width:'100%',border:0,background:'#fff',padding:'25px 36px',fontSize:22,fontWeight:900,color:INK,cursor:'pointer',textAlign:'left'}}><span style={{fontSize:36,color:BLUE}}>◎</span>Search near me</button>}
        {loading&&<div style={{padding:35,textAlign:'center',fontSize:18,color:'#77768a',fontWeight:700}}>Searching…</div>}
        {!loading&&rows.map((r,i)=>(
          <button key={i} onClick={()=>onSelect(r)} style={{display:'grid',gridTemplateColumns:'36px 1fr',gap:20,width:'100%',border:0,borderBottom:'1px solid #eeeaf7',background:'#fff',padding:'17px 36px',textAlign:'left',cursor:'pointer'}}>
            <span style={{fontSize:r.code?35:31,color:'#a5a2b7',fontWeight:900,lineHeight:1}}>{r.code?'#':'⌖'}</span>
            <span><span style={{display:'block',fontSize:21,fontWeight:900,color:INK,lineHeight:1.18}}>{r.label}</span><span style={{display:'block',fontSize:18,color:'#77768a',fontWeight:700,marginTop:6}}>{r.sub}</span></span>
          </button>
        ))}
        {q&&!loading&&!rows.length&&<div style={{padding:50,textAlign:'center',fontSize:18,color:'#77768a'}}>No result for {q}</div>}
      </div>
    </div>
  )
}