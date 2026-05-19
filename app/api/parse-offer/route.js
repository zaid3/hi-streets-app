import{parseOfferWithAI}from'../../../lib/gemini'
export async function POST(req){
  try{
    const{message}=await req.json()
    if(!message)return Response.json({valid:false,error:'No message'},{status:400})
    const result=await parseOfferWithAI(message)
    return Response.json(result)
  }catch(e){
    return Response.json({valid:false,error:'Parse failed'},{status:500})
  }
}
