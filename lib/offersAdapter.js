import{supabase}from'./supabase'
import{mockOffers}from'../data/mockOffers'
import{newhamOffers}from'./newhamSeedData'

const SAMPLE_OFFERS_ENABLED=process.env.NEXT_PUBLIC_ENABLE_SAMPLE_DATA==='true'

export async function getLiveOffers(){
  try{
    const{data,error}=await supabase
      .from('offers')
      .select('*,businesses(name,lat,lng,category,address,google_place_id,is_verified,website,phone)')
      .eq('is_active',true)
      .gt('expires_at',new Date().toISOString())
      .order('created_at',{ascending:false})
    if(error)return sampleOffers()
    const live=(data||[])
      .filter(o=>o.businesses?.lat&&o.businesses?.lng&&o.businesses?.is_verified)
      .map(o=>({
        id:o.id,
        businessName:o.businesses?.name||'Local business',
        category:o.businesses?.category||o.category||'other',
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
        verified:true,
        googlePlaceId:o.businesses?.google_place_id||'',
        website:o.businesses?.website||'',
        phone:o.businesses?.phone||'',
      }))
    return mergeOffers(live)
  }catch{return sampleOffers()}
}

export async function publishOffer(offer,businessId,source='portal'){
  if(!businessId)return{success:false,error:'Business profile is required before publishing.'}
  try{
    const{data,error}=await supabase
      .from('offers')
      .insert([{
        business_id:businessId,
        title:offer.title,
        short_label:offer.shortLabel,
        description:offer.description,
        discount:offer.discount,
        category:offer.category||'other',
        expires_at:offer.expiresAt,
        is_active:true,
        source,
        created_at:new Date().toISOString(),
      }])
      .select().single()
    if(error)throw error
    return{success:true,offer:data}
  }catch(e){
    return{success:false,error:e.message||'Offer could not be published.'}
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

function mergeOffers(live=[]){
  return Array.from(new Map([...sampleOffers(),...live].map(o=>[o.id,o])).values())
}

function sampleOffers(){
  return SAMPLE_OFFERS_ENABLED?[...newhamOffers,...mockOffers]:[]
}
