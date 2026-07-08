import{createClient}from'@supabase/supabase-js'

const url=process.env.NEXT_PUBLIC_SUPABASE_URL||''
const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY||''

export const isSupabaseAdminConfigured=Boolean(url&&serviceRoleKey)

export function getSupabaseAdmin(){
  if(!isSupabaseAdminConfigured)throw new Error('Supabase admin client is not configured')
  return createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}})
}
