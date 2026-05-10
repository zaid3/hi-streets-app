'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase.js'
export default function Root() {
  const router = useRouter()
  useEffect(() => {
    const guest = typeof window !== 'undefined' && localStorage.getItem('hs_guest')
    if (guest) { router.replace('/map'); return }
    supabase.auth.getSession().then(({ data: { session } }) => router.replace(session ? '/map' : '/splash'))
  }, [])
  return <div style={{ background:'#0a0a0a', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40,height:40,border:'3px solid rgba(255,104,31,.3)',borderTop:'3px solid #ff681f',borderRadius:'50%',animation:'spin 1s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
