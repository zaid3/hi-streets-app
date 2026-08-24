import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ALLOWED_ORIGINS = new Set(["https://app.histreets.uk","https://histreets.uk","http://localhost:3000","http://localhost:5173"]);
const OUTCODE_RE = /\b(E6|E7|E12|E13|E15|E16|E20)\b/i;

function cors(origin:string|null){ const allow=origin&&ALLOWED_ORIGINS.has(origin)?origin:"https://app.histreets.uk"; return {"Access-Control-Allow-Origin":allow,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}; }
function json(body:unknown,status=200,origin:string|null=null){ return new Response(JSON.stringify(body),{status,headers:{...cors(origin),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}}); }
function clean(value:unknown,max=120){ return String(value??"").replace(/\s+/g," ").trim().slice(0,max); }
function classify(category:string){ const c=category.toLowerCase(); if(/restaurant|food|takeaway|cafe|coffee|bakery|grocery|supermarket/.test(c))return "food_drink"; if(/barber|beauty|hair|nail|salon|spa/.test(c))return "beauty"; if(/shop|retail|clothes|fashion|phone|electronic|furniture/.test(c))return "retail"; if(/gym|fitness|sport|leisure|activity|entertainment/.test(c))return "leisure"; if(/solicitor|account|repair|garage|mechanic|plumb|electric|clean|service|consult/.test(c))return "local_services"; return null; }
function label(category:string){ return ({food_drink:"food & drink",beauty:"beauty & grooming",retail:"retail",leisure:"leisure",local_services:"local services"} as Record<string,string>)[category]||category; }

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
  if(origin&&!ALLOWED_ORIGINS.has(origin))return json({error:"Origin not allowed"},403,origin);
  let body:any; try{ body=await req.json(); }catch{ return json({error:"Invalid request"},400,origin); }
  const businessId=clean(body?.business_id,64); if(!businessId)return json({error:"Choose an approved business first."},400,origin);
  const auth=req.headers.get("authorization")||""; if(!auth.toLowerCase().startsWith("bearer "))return json({error:"Sign in to view local opportunities."},401,origin);
  const user=(await db.auth.getUser(auth.slice(7).trim())).data.user; if(!user)return json({error:"Your session has expired."},401,origin);
  const role=String((await db.from("profiles").select("role").eq("id",user.id).maybeSingle()).data?.role||"");
  let query=db.from("businesses").select("id,name,category,address,verification_status,claimed_by").eq("id",businessId).eq("verification_status","verified");
  if(!["admin","super_admin"].includes(role))query=query.eq("claimed_by",user.id);
  const result=await query.maybeSingle(); if(result.error||!result.data)return json({error:"This approved business is not available to your account."},403,origin);
  const business=result.data as any; const area=(String(business.address||"").match(OUTCODE_RE)?.[0]||"").toUpperCase(); const category=classify(String(business.category||""));
  if(!area||!category)return json({eligible:false,reason:"Opportunity intelligence needs a recognised Newham area and business category."},200,origin);
  const since=new Date(); since.setUTCDate(since.getUTCDate()-6); const sinceDate=since.toISOString().slice(0,10);
  const signals=await db.from("ai_opportunity_daily").select("signal_count").eq("area",area).eq("category",category).gte("signal_date",sinceDate);
  if(signals.error)return json({error:"Local opportunity data is temporarily unavailable."},503,origin);
  const signalCount=(signals.data||[]).reduce((sum:number,row:any)=>sum+Number(row.signal_count||0),0);
  if(signalCount<5)return json({eligible:false,reason:"Not enough anonymous local signals yet.",threshold:5,area,category},200,origin);
  const offers=await db.from("posts_public").select("id",{count:"exact",head:true}).eq("type","offer").ilike("business_address",`%${area}%`);
  const liveOffers=offers.count||0; const categoryLabel=label(category); const level=signalCount>=15?"strong":signalCount>=9?"growing":"emerging";
  const suggestion=liveOffers<=2?`Local ${categoryLabel} interest around ${area} is ${level}, with only ${liveOffers} live offer${liveOffers===1?"":"s"} currently visible. Consider creating a timely offer.`:`Local ${categoryLabel} interest around ${area} is ${level}. Consider a clear offer that gives residents a reason to choose your business.`;
  const seedPrompt=`Help me create a factual local offer for ${business.name} responding to ${categoryLabel} interest around ${area}. Do not invent a discount, price or condition. If I have not supplied the actual offer details, list them as missing information.`;
  return json({eligible:true,area,category,category_label:categoryLabel,signal_count:signalCount,live_offer_count:liveOffers,period_days:7,level,suggestion,seed_prompt:seedPrompt,privacy_note:"Shown only after at least 5 anonymous aggregate signals. No individual resident query is exposed."},200,origin);
});
