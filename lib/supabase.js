import{createClient}from'@supabase/supabase-js'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||''
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''
const mock={
  from:()=>({
    select:()=>({eq:()=>({gt:()=>({order:()=>({data:[],error:null})})}),insert:()=>({select:()=>({single:()=>({data:null,error:{message:'No Supabase'}})})})}),
    insert:()=>({select:()=>({single:()=>({data:null,error:null})})}),
    update:()=>({eq:()=>({data:null,error:null})}),
  }),
  auth:{
    signInWithOtp:async()=>({}),
    verifyOtp:async()=>({}),
    getSession:async()=>({data:{session:null}}),
    getUser:async()=>({data:{user:null}}),
    signOut:async()=>{},
    onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}}),
  },
  channel:()=>({on:()=>({subscribe:()=>{}})}),
  removeChannel:()=>{},
}
export const supabase=url&&key?createClient(url,key):mock
