import { createClient } from '@supabase/supabase-js'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const mockClient = { from:()=>({select:()=>({eq:()=>({gt:()=>({order:()=>({data:[],error:null})})}),insert:()=>({select:()=>({single:()=>({data:null,error:{message:'No Supabase configured'}})})})})}), auth:{signInWithOtp:async()=>({}),verifyOtp:async()=>({}),getSession:async()=>({data:{session:null}}),signOut:async()=>{},onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})}, channel:()=>({on:()=>({subscribe:()=>{}})}), removeChannel:()=>{} }
export const supabase = url && key ? createClient(url, key) : mockClient
