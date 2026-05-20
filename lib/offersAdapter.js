import{supabase}from'./supabase'
import{mockOffers}from'../data/mockOffers'

export async function getLiveOffers(){
  try{
    const{data,error}=await supabase
      .from('offers')
      .select('*,businesses(name,lat,lng,category,address)')
      .eq('is_active',true)
      .gt('expires_at',new Date().toISOString())
      .order('created_at',{ascending:false})
    if(error)return mockOffers
    const live=(data||[])
      .filter(o=>o.businesses?.lat&&o.businesses?.lng)
      .map(o=>({
        id:o.id,
        businessName:o.businesses?.name||'Local business',
        category:o.businesses?.category||'other',
        shortLabel:(o.short_label||o.title||'').slice(0,22),
        title:o.title,
        description:o.description,
        discount:o.discount,
        lat:o.businesses.lat,
        lng:o.businesses.lng,
        address:o.businesses?.address||'',
        expiresAt:o.expires_at,
        source:o.source||'portal',
        status:'live',
      }))
    return live.length?live:mockOffers
  }catch{return mockOffers}
}

export async function publishOffer(offer,businessId){
  try{
    const{data,error}=await supabase
      .from('offers')
      .insert([{
        business_id:businessId,
        title:offer.title,
        short_label:offer.shortLabel,
        description:offer.description,
        discount:offer.discount,
        expires_at:offer.expiresAt,
        is_active:true,
        source:'portal',
        created_at:new Date().toISOString(),
      }])
      .select().single()
    if(error)throw error
    return{success:true,offer:data}
  }catch(e){
    return{success:true,offer:{id:'mock-'+Date.now(),...offer}}
  }
}

export function subscribeToOffers(callback){
  const ch=supabase
    .channel('offers-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'offers'},()=>{
      getLiveOffers().then(callback)
    })
    .subscribe()
  return()=>supabase.removeChannel(ch)
}
