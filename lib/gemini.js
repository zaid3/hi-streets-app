// Server-side Gemini Flash integration (free tier: 1500 req/day)
const GEMINI_KEY=process.env.GEMINI_API_KEY||''
const GEMINI_URL='https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const SYSTEM=`You are an offer parser for Hi-Streets, a UK local business map app.
Parse the user's message into a structured offer for a local business.
Respond ONLY with valid JSON, no markdown, no backticks, no explanation.
JSON format:
{
  "valid": true,
  "title": "short offer title (max 40 chars)",
  "shortLabel": "very short label for map bubble (max 20 chars)",
  "description": "full offer description",
  "discount": "e.g. 20% off or Free item or BOGO",
  "expiresAt": "ISO date string — if they say 'today' use end of today, if 'until Xpm' calculate from now, if no time mentioned use end of today",
  "category": "one of: food, retail, health, beauty, services, other"
}
If the message is not an offer, respond: {"valid": false, "error": "reason"}
Today is ${new Date().toDateString()}. Current time: ${new Date().toLocaleTimeString('en-GB')}.`

export async function parseOfferWithAI(message){
  // Fallback rule-based parser if no Gemini key
  if(!GEMINI_KEY) return ruleBasedParser(message)

  try{
    const res=await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[{text:`Parse this offer: "${message}"`}]}],
        systemInstruction:{parts:[{text:SYSTEM}]},
        generationConfig:{temperature:0.1,maxOutputTokens:300},
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

// Free fallback — no AI needed, parses common patterns
function ruleBasedParser(message){
  const m=message.trim()
  if(!m||m.length<4)return{valid:false,error:'Message too short'}

  // Extract percentage
  const pct=m.match(/(\d+)\s*%\s*off/i)
  // Extract "until Xpm"
  const until=m.match(/until\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
  // Extract "free X"
  const free=m.match(/free\s+(\w+(?:\s+\w+)?)/i)
  // Extract "buy one get one" / BOGO
  const bogo=/buy\s+one\s+get\s+one|bogo/i.test(m)

  let discount=''
  if(pct) discount=`${pct[1]}% off`
  else if(free) discount=`Free ${free[1]}`
  else if(bogo) discount='Buy one get one free'
  else discount=m.slice(0,30)

  const today=/\btoday\b/i.test(m)
  const expiresAt=until?parseUntilTime(until[1]):eod()

  const title=m.length>40?m.slice(0,40)+'…':m
  const shortLabel=discount.length>20?discount.slice(0,19)+'…':discount

  return{
    valid:true,
    title,
    shortLabel,
    description:m,
    discount,
    expiresAt,
    category:'other',
  }
}

function parseUntilTime(s){
  const now=new Date()
  const match=s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if(!match)return eod()
  let h=parseInt(match[1]),mi=match[2]?parseInt(match[2]):0
  const ap=match[3]?.toLowerCase()
  if(ap==='pm'&&h!==12)h+=12
  if(ap==='am'&&h===12)h=0
  now.setHours(h,mi,0,0)
  if(now<new Date())now.setDate(now.getDate()+1)
  return now.toISOString()
}
function eod(){const d=new Date();d.setHours(23,59,59,0);return d.toISOString()}
