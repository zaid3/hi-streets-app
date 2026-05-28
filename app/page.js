'use client'
import{useEffect}from'react'
import{useRouter}from'next/navigation'
export default function Root(){
  const r=useRouter()
  useEffect(()=>{r.replace('/map')},[])
  return<div style={{height:'100dvh',background:'#0a0a0a'}}/>
}
