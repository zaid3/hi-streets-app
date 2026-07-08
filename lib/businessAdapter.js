import{supabase}from'./supabase'

export async function getMyBusiness(userId){
  if(!userId)return null
  try{
    const{data,error}=await supabase
      .from('businesses')
      .select('*')
      .eq('owner_user_id',userId)
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle()
    if(error)return null
    return data||null
  }catch{return null}
}

export async function saveBusinessProfile(userId,profile,currentId){
  if(!userId)return{success:false,error:'Please sign in before creating a business profile.'}
  const lat=profile.lat===''||profile.lat===null||profile.lat===undefined?null:Number(profile.lat)
  const lng=profile.lng===''||profile.lng===null||profile.lng===undefined?null:Number(profile.lng)
  const payload={
    owner_user_id:userId,
    name:profile.name?.trim(),
    category:profile.category||'other',
    address:profile.address?.trim()||'',
    lat,
    lng,
    phone:profile.phone?.trim()||'',
    whatsapp_phone:profile.whatsappPhone?.trim()||null,
    website:profile.website?.trim()||'',
    google_place_id:profile.googlePlaceId?.trim()||'',
    updated_at:new Date().toISOString(),
  }
  if(!payload.name)return{success:false,error:'Business name is required.'}
  if(!Number.isFinite(payload.lat)||!Number.isFinite(payload.lng))return{success:false,error:'Latitude and longitude are required so the offer can appear on the map.'}
  try{
    if(currentId){
      const{data,error}=await supabase.from('businesses').update(payload).eq('id',currentId).select().single()
      if(error)throw error
      return{success:true,business:data}
    }
    const{data,error}=await supabase.from('businesses').insert([{...payload,is_verified:false,created_at:new Date().toISOString()}]).select().single()
    if(error)throw error
    return{success:true,business:data}
  }catch(e){
    return{success:false,error:e.message||'Could not save business profile.'}
  }
}

export function businessReadyForOffers(business){
  if(!business?.id)return{ready:false,reason:'Create your business profile first.'}
  if(!Number.isFinite(Number(business.lat))||!Number.isFinite(Number(business.lng)))return{ready:false,reason:'Add the business location before posting offers.'}
  if(!business?.is_verified)return{ready:false,reason:'Your business is pending verification. Offers can be prepared now, then published after approval.'}
  return{ready:true,reason:''}
}
