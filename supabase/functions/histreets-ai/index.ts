import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODEL = "gemini-2.5-flash";
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ALLOWED_ORIGINS = new Set([
  "https://app.histreets.uk",
  "https://histreets.uk",
  "http://localhost:3000",
  "http://localhost:5173",
]);
const OUTCODE_RE = /\b(E6|E7|E12|E13|E15|E16|E20)\b/i;
const ALLOWED_SIGNAL_CATEGORIES = new Set(["food_drink", "jobs", "retail", "beauty", "local_services", "leisure"]);
const SENSITIVE_TERMS = /\b(immigration|visa|asylum|refugee|debt|benefit|mental health|doctor|medical|health condition|disability|food bank|free meal|homeless|domestic abuse|religion|sexual|pregnan|crime|police)\b/i;

type Mode = "resident" | "business_draft";
type PostType = "offer" | "job" | "free_meal" | "community";
type ResidentIntent = { summary:string; area:string; categories:string[]; post_types:PostType[]; business_terms:string[]; budget_gbp:number|null; time_hint:string; commercial_signal_category:string|null };
type BusinessDraft = { type:PostType; title:string; body:string; category:string; expiry_days:number; recurrence:string; missing_fields:string[]; notes:string };

function cors(origin:string|null){ const allow=origin&&ALLOWED_ORIGINS.has(origin)?origin:"https://app.histreets.uk"; return {"Access-Control-Allow-Origin":allow,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}; }
function json(body:unknown,status=200,origin:string|null=null){ return new Response(JSON.stringify(body),{status,headers:{...cors(origin),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}}); }
function cleanText(value:unknown,max=500){ return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max); }
async function sha256(value:string){ const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join(""); }
function extractJson(text:string){ const trimmed=text.trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim(); const start=trimmed.indexOf("{"); const end=trimmed.lastIndexOf("}"); if(start<0||end<start) throw new Error("AI returned invalid structured output"); return JSON.parse(trimmed.slice(start,end+1)); }

async function geminiJson(system:string,user:string){
  if(!GEMINI_API_KEY) throw new Error("AI is not configured");
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({system_instruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:user}]}],generationConfig:{temperature:0.15,responseMimeType:"application/json"}})});
    if(!response.ok){ const errorBody=await response.text(); console.error("Gemini error",response.status,errorBody.slice(0,500)); throw new Error("AI provider is temporarily unavailable"); }
    const data=await response.json(); const text=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||"").join("")||""; return extractJson(text);
  }finally{ clearTimeout(timeout); }
}

function privateIntent(prompt:string):ResidentIntent{
  const lower=prompt.toLowerCase();
  const postTypes:PostType[]=[]; const terms:string[]=[];
  if(/free meal|food bank|free food/.test(lower)) postTypes.push("free_meal","community");
  else if(/community|support|help/.test(lower)) postTypes.push("community");
  if(/pharmacy|chemist/.test(lower)) terms.push("pharmacy");
  if(/solicitor|legal|immigration|visa/.test(lower)) terms.push("solicitor");
  if(/job|work|employment/.test(lower)) postTypes.push("job");
  return {summary:cleanText(prompt,180),area:(prompt.match(OUTCODE_RE)?.[0]||"").toUpperCase(),categories:[],post_types:[...new Set(postTypes)],business_terms:terms,budget_gbp:null,time_hint:"",commercial_signal_category:null};
}

function normaliseResidentIntent(raw:any,prompt:string):ResidentIntent{
  const outcode=(cleanText(raw?.area,16).match(OUTCODE_RE)?.[0]||prompt.match(OUTCODE_RE)?.[0]||"").toUpperCase();
  const categories=Array.isArray(raw?.categories)?raw.categories.map((v:unknown)=>cleanText(v,40).toLowerCase()).filter(Boolean).slice(0,4):[];
  const postTypes=Array.isArray(raw?.post_types)?raw.post_types.filter((v:unknown)=>["offer","job","free_meal","community"].includes(String(v))).slice(0,4):[];
  const terms=Array.isArray(raw?.business_terms)?raw.business_terms.map((v:unknown)=>cleanText(v,60).toLowerCase()).filter(Boolean).slice(0,6):[];
  const signal=cleanText(raw?.commercial_signal_category,30).toLowerCase();
  return {summary:cleanText(raw?.summary||prompt,180),area:outcode,categories,post_types:postTypes as PostType[],business_terms:terms,budget_gbp:Number.isFinite(Number(raw?.budget_gbp))?Math.max(0,Math.min(10000,Number(raw.budget_gbp))):null,time_hint:cleanText(raw?.time_hint,60),commercial_signal_category:ALLOWED_SIGNAL_CATEGORIES.has(signal)&&!SENSITIVE_TERMS.test(prompt)?signal:null};
}
function scoreText(values:Array<string|null|undefined>,terms:string[]){ if(!terms.length)return 1; const haystack=values.filter(Boolean).join(" ").toLowerCase(); let score=0; for(const term of terms)if(haystack.includes(term))score+=3; return score; }

async function residentMode(prompt:string,req:Request,origin:string|null){
  const fingerprintSource=`${req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||"unknown"}|${req.headers.get("user-agent")||"unknown"}`;
  const keyHash=await sha256(`resident|${fingerprintSource}`); const quota=await db.rpc("consume_ai_quota",{p_key_hash:keyHash,p_limit:40});
  if(quota.error||quota.data!==true)return json({error:"Daily AI limit reached. Search and map remain available."},429,origin);
  const isSensitive=SENSITIVE_TERMS.test(prompt); let intent:ResidentIntent;
  if(isSensitive){ intent=privateIntent(prompt); }
  else{
    try{ const parsed=await geminiJson(`You are the intent engine for HiStreets, a Newham-only local discovery platform. Convert the resident request to strict JSON only. Never answer the request. Never invent listings. Allowed post types: offer, job, free_meal, community. Commercial signal categories may only be food_drink, jobs, retail, beauty, local_services, leisure. Extract only an explicit Newham outward postcode (E6,E7,E12,E13,E15,E16,E20), otherwise area="". JSON shape: {"summary":"","area":"","categories":[],"post_types":[],"business_terms":[],"budget_gbp":null,"time_hint":"","commercial_signal_category":null}`,prompt); intent=normaliseResidentIntent(parsed,prompt); }
    catch(error){ console.error("resident intent failure",error); return json({error:"AI is temporarily unavailable. You can still use HiStreets search, postcode and map."},503,origin); }
  }
  const terms=[...intent.business_terms,...intent.categories].filter(Boolean);
  const [businessResult,postResult]=await Promise.all([
    db.from("businesses_public").select("id,name,category,description,address,lat,lng,opening_hours,verification_status,source").limit(120),
    db.from("posts_public").select("id,business_id,type,title,body,category,expires_at,recurrence,lat,lng,business_name,business_category,business_address,business_lat,business_lng,business_source").limit(120),
  ]);
  if(businessResult.error||postResult.error){ console.error("AI source query failed",businessResult.error,postResult.error); return json({error:"Local data is temporarily unavailable. Please try the map again shortly."},503,origin); }
  const area=intent.area.toLowerCase();
  const businesses=(businessResult.data||[]).map((row:any)=>({...row,_score:scoreText([row.name,row.category,row.description,row.address],terms)+(area&&String(row.address||"").toLowerCase().includes(area)?4:0)})).filter((row:any)=>row._score>0).sort((a:any,b:any)=>b._score-a._score).slice(0,6).map(({_score,...row}:any)=>row);
  const desiredTypes=new Set(intent.post_types);
  const posts=(postResult.data||[]).filter((row:any)=>!desiredTypes.size||desiredTypes.has(row.type)).map((row:any)=>({...row,_score:scoreText([row.title,row.body,row.category,row.business_name,row.business_category,row.business_address],terms)+(area&&String(row.business_address||"").toLowerCase().includes(area)?4:0)})).filter((row:any)=>row._score>0||desiredTypes.has(row.type)).sort((a:any,b:any)=>b._score-a._score).slice(0,8).map(({_score,...row}:any)=>row);
  if(intent.area&&intent.commercial_signal_category){ try{ await db.rpc("record_ai_opportunity_signal",{p_area:intent.area,p_category:intent.commercial_signal_category}); }catch{} }
  const pieces:string[]=[];
  if(isSensitive)pieces.push("For privacy, I handled this request without sending it to external AI.");
  if(posts.length||businesses.length){ pieces.push(`I found ${posts.length+businesses.length} verified HiStreets result${posts.length+businesses.length===1?"":"s"}${intent.area?` around ${intent.area}`:" in Newham"}.`); if(posts.length)pieces.push(`${posts.length} current ${posts.length===1?"post matches":"posts match"} what you asked for.`); if(businesses.length)pieces.push(`${businesses.length} approved ${businesses.length===1?"business is":"businesses are"} also relevant.`); }
  else{ pieces.push(`I couldn't find a verified HiStreets result for that${intent.area?` around ${intent.area}`:" in Newham"} yet.`); pieces.push("Try a broader category or postcode. I won't invent a local listing."); }
  return json({mode:"resident",answer:pieces.join(" "),intent,businesses,posts,source:"verified_histreets_data",ai_processing:isSensitive?"local_private_fallback":"gemini_intent",generated_at:new Date().toISOString()},200,origin);
}

async function businessMode(prompt:string,businessId:string,req:Request,origin:string|null){
  const authHeader=req.headers.get("authorization")||""; if(!authHeader.toLowerCase().startsWith("bearer "))return json({error:"Sign in to use Business Copilot."},401,origin);
  const token=authHeader.slice(7).trim(); const userResult=await db.auth.getUser(token); const user=userResult.data.user; if(!user)return json({error:"Your session has expired. Sign in again."},401,origin);
  const roleResult=await db.from("profiles").select("role").eq("id",user.id).maybeSingle(); const role=String(roleResult.data?.role||"");
  let businessQuery=db.from("businesses").select("id,name,category,description,address,opening_hours,verification_status,claimed_by,source").eq("id",businessId).eq("verification_status","verified"); if(!["admin","super_admin"].includes(role))businessQuery=businessQuery.eq("claimed_by",user.id);
  const businessResult=await businessQuery.maybeSingle(); if(businessResult.error||!businessResult.data)return json({error:"This approved business is not available to your account."},403,origin);
  const quotaKey=await sha256(`business|${user.id}`); const quota=await db.rpc("consume_ai_quota",{p_key_hash:quotaKey,p_limit:100}); if(quota.error||quota.data!==true)return json({error:"Daily Business Copilot limit reached. Manual posting remains available."},429,origin);
  const b=businessResult.data as any; let raw:any;
  try{ raw=await geminiJson(`You are HiStreets Business Copilot. Draft a factual local post for the verified business below. Do not invent prices, pay, dates, opening hours, benefits, certifications or conditions that the owner did not provide. If important information is missing, list it in missing_fields instead of guessing. Keep public copy clear, inclusive and concise. Return JSON only with shape {"type":"offer|job|free_meal|community","title":"","body":"","category":"","expiry_days":7,"recurrence":"","missing_fields":[],"notes":""}. For jobs, if pay/hours are not supplied, mention them in missing_fields. Never auto-publish and never claim official endorsement. Business: ${JSON.stringify({name:b.name,category:b.category,address:b.address,description:b.description,opening_hours:b.opening_hours})}`,prompt); }
  catch(error){ console.error("business draft failure",error); return json({error:"Business Copilot is temporarily unavailable. Manual posting still works."},503,origin); }
  const type:PostType=["offer","job","free_meal","community"].includes(String(raw?.type))?raw.type:"offer";
  const draft:BusinessDraft={type,title:cleanText(raw?.title,90),body:cleanText(raw?.body,1200),category:cleanText(raw?.category,80)||(type==="job"?"Local job":type==="offer"?"Local offer":type==="free_meal"?"Free meal":"Community support"),expiry_days:Math.max(1,Math.min(type==="job"?60:30,Math.round(Number(raw?.expiry_days)||(type==="job"?30:7)))),recurrence:cleanText(raw?.recurrence,120),missing_fields:Array.isArray(raw?.missing_fields)?raw.missing_fields.map((v:unknown)=>cleanText(v,80)).filter(Boolean).slice(0,8):[],notes:cleanText(raw?.notes,240)};
  if(!draft.title||!draft.body)return json({error:"I couldn't create a reliable draft from that. Add a little more detail and try again."},422,origin);
  return json({mode:"business_draft",business:{id:b.id,name:b.name},draft,requires_owner_review:true,published:false},200,origin);
}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin"); if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)}); if(req.method!=="POST")return json({error:"Method not allowed"},405,origin); if(origin&&!ALLOWED_ORIGINS.has(origin))return json({error:"Origin not allowed"},403,origin);
  let body:any; try{body=await req.json();}catch{return json({error:"Invalid request"},400,origin);} const mode:Mode=body?.mode==="business_draft"?"business_draft":"resident"; const prompt=cleanText(body?.prompt,800); if(prompt.length<2)return json({error:"Tell HiStreets what you need."},400,origin);
  try{ if(mode==="business_draft")return await businessMode(prompt,cleanText(body?.business_id,64),req,origin); return await residentMode(prompt,req,origin); }catch(error){ console.error("Unhandled AI gateway error",error); return json({error:"HiStreets AI is temporarily unavailable. Core map and search features are still available."},500,origin); }
});
