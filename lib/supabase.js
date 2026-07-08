import{createClient}from'@supabase/supabase-js'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||''
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''
const notConfigured={message:'Supabase is not configured'}
function readBuilder(){
  const b={
    select:()=>b,
    eq:()=>b,
    gt:()=>b,
    or:()=>b,
    order:()=>b,
    limit:()=>b,
    maybeSingle:async()=>({data:null,error:null}),
    single:async()=>({data:null,error:notConfigured}),
    insert:()=>writeBuilder(),
    update:()=>writeBuilder(),
    then:(resolve)=>resolve({data:[],error:null}),
  }
  return b
}
function writeBuilder(){
  const b={
    eq:()=>b,
    select:()=>b,
    single:async()=>({data:null,error:notConfigured}),
    then:(resolve)=>resolve({data:null,error:notConfigured}),
  }
  return b
}
const mock={
  from:()=>readBuilder(),
  auth:{
    signInWithOtp:async()=>({error:notConfigured}),
    verifyOtp:async()=>({error:notConfigured}),
    getSession:async()=>({data:{session:null}}),
    getUser:async()=>({data:{user:null}}),
    signOut:async()=>{},
    onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}}),
  },
  channel:()=>({on:()=>({subscribe:()=>{}})}),
  removeChannel:()=>{},
}
export const supabase=url&&key?createClient(url,key):mock
export const isSupabaseConfigured=Boolean(url&&key)
