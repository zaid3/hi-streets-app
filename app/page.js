'use client'
import{useEffect}from'react'
import{useRouter}from'next/navigation'
export default function Root(){
  const r=useRouter()
  useEffect(()=>{
    const seen=localStorage.getItem('hs_seen')
    if(seen)r.replace('/map')
    else r.replace('/splash')
  },[])
  return<div style={{height:'100dvh',background:'#0a0a0a'}}/>
}
