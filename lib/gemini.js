// Server-side Gemini Flash integration. Falls back to local parsing when GEMINI_API_KEY is not set.
const GEMINI_KEY=process.env.GEMINI_API_KEY||''
const GEMINI_URL='https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const SYSTEM=`You are the Hi-Streets offer assistant for UK local businesses.
Your job is to turn a short merchant message into clear, trustworthy, customer-ready offer copy.
Keep it simple, accurate and not exaggerated. Do not invent exclusions, prices or times.
Respond ONLY with valid JSON, no markdown, no backticks, no explanation.
JSON format:
{
  "valid": true,
  "title": "clear offer title, max 44 chars",
  "shortLabel": "map bubble label, max 20 chars",
  "description": "polished one sentence offer text for customers",
  "discount": "e.g. 20% off, Free item, BOGO, £5 deal",
  "expiresAt": "ISO date string. If 'today', use end of today. If 'until Xpm', calculate from now. If no time, use end of today.",
  "category": "one of: food, retail, health, beauty, services, grocery, coffee, other",
  "redemption": "how customer can use it, e.g. Show this offer in store"
}
If the message is not an offer, respond: {"valid": false, "error": "reason"}
Today is ${new Date().toDateString()}. Current time: ${new Date().toLocaleTimeString('en-GB')}.`

export async function parseOfferWithAI(message){
  if(!GEMINI_KEY)return ruleBasedParser(message)
  try{
    const res=await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[{text:`Parse and improve this business offer: "${message}"`}]}],
        systemInstruction:{parts:[{text:SYSTEM}]},
        generationConfig:{temperature:0.15,maxOutputTokens:360},
      }),
    })
    const data=await res.json()
    const text=data.candidates?.[0]?.content?.parts?.[0]?.text||''
    const clean=text.replace(/```json|```/g,'').trim()
    return JSON.parse(clean)
  }catch(e){
    console.error('Gemini error:',e)
    return ruleBasedParser(message)
  }
}

function ruleBasedParser(message){
  const m=message.trim()
  if(!m||m.length<4)return{valid:false,error:'Message too short'}
  const pct=m.match(/(\d+)\s*%\s*off/i)
  const pounds=m.match(/£\s?(\d+)\s*off/i)
  const deal=m.match(/£\s?(\d+)\s*(deal|only|each)/i)
  const until=m.match(/until\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
  const free=m.match(/free\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i)
  const bogo=/buy\s+one\s+get\s+one|bogo/i.test(m)
  let discount=''
  if(pct)discount=`${pct[1]}% off`
  else if(pounds)discount=`£${pounds[1]} off`
  else if(deal)discount=`£${deal[1]} deal`
  else if(free)discount=`Free ${free[1]}`
  else if(bogo)discount='Buy one get one free'
  else discount=m.slice(0,30)
  const expiresAt=until?parseUntilTime(until[1]):eod()
  const category=/pizza|grill|burger|food|lunch|dinner|coffee|cake|drink/i.test(m)?'food':/hair|barber|beauty|nail/i.test(m)?'beauty':/market|shop|fruit|grocery/i.test(m)?'retail':'other'
  const title=m.length>44?m.slice(0,43)+'…':m
  const shortLabel=discount.length>20?discount.slice(0,19)+'…':discount
  return{valid:true,title,shortLabel,description:`${title}. Show this offer in store to redeem.`,discount,expiresAt,category,redemption:'Show this offer in store'}
}
function parseUntilTime(s){const now=new Date();const match=s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);if(!match)return eod();let h=parseInt(match[1]),mi=match[2]?parseInt(match[2]):0;const ap=match[3]?.toLowerCase();if(ap==='pm'&&h!==12)h+=12;if(ap==='am'&&h===12)h=0;now.setHours(h,mi,0,0);if(now<new Date())now.setDate(now.getDate()+1);return now.toISOString()}
function eod(){const d=new Date();d.setHours(23,59,59,0);return d.toISOString()}
