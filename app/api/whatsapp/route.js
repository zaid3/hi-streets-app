import{parseOfferWithAI}from'../../../lib/gemini'
import{publishOffer}from'../../../lib/offersAdapter'
import{supabase}from'../../../lib/supabase'

const VERIFY_TOKEN=process.env.WHATSAPP_VERIFY_TOKEN||'hi-streets-dev-token'

export async function GET(req){
  const url=new URL(req.url)
  const mode=url.searchParams.get('hub.mode')
  const token=url.searchParams.get('hub.verify_token')
  const challenge=url.searchParams.get('hub.challenge')
  if(mode==='subscribe'&&token===VERIFY_TOKEN)return new Response(challenge||'',{status:200})
  return new Response('Forbidden',{status:403})
}

export async function POST(req){
  try{
    const body=await req.json()
    const msg=body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    const from=msg?.from||''
    const text=msg?.text?.body?.trim()||''
    if(!from||!text)return Response.json({ok:true,ignored:true})

    const{data:business}=await supabase
      .from('businesses')
      .select('id,name,is_verified,lat,lng,phone,whatsapp_phone')
      .or(`whatsapp_phone.eq.${from},phone.eq.${from}`)
      .maybeSingle()

    if(!business?.id||!business?.is_verified){
      return Response.json({ok:false,reason:'business_not_verified'},{status:202})
    }

    const offer=await parseOfferWithAI(text)
    if(!offer.valid)return Response.json({ok:false,reason:'not_an_offer',error:offer.error},{status:202})

    const result=await publishOffer(offer,business.id,'whatsapp')
    return Response.json({ok:true,offer:result.offer})
  }catch(e){
    console.error('WhatsApp webhook error',e)
    return Response.json({ok:false,error:'webhook_failed'},{status:500})
  }
}
