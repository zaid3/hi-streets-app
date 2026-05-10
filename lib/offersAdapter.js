
import { supabase } from './supabase.js'
import { mockOffers } from '../data/mockOffers.js'

export async function getLiveOffersByViewport(bounds) {
  try {
    const { data, error } = await supabase.from('offers').select('*, businesses(name,lat,lng,category)').eq('is_active',true).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false})
    if (error||!data||!data.length) return mockOffers
    return [...mockOffers, ...data.map(o => ({ id:o.id, businessName:o.businesses?.name||'Local business', category:o.businesses?.category||'other', shortLabel:(o.title||'').slice(0,22), title:o.title, description:o.description, lat:o.businesses?.lat||51.5074, lng:o.businesses?.lng||-0.1278, expiresAt:o.expires_at, source:o.source||'app', status:'live', distance:'0.3 mi' }))]
  } catch(e) { return mockOffers }
}

export async function publishOffer(d) {
  try {
    const { data, error } = await supabase.from('offers').insert([{ ...d, is_active:true, source:'app', created_at:new Date().toISOString() }]).select().single()
    if (error) throw error
    return { success:true, offer:data }
  } catch(e) { return { success:false, error:e.message } }
}

export function parseWhatsAppOffer(message) {
  if (!message||typeof message!=='string') return { valid:false, error:'Empty message' }
  const trimmed = message.trim()
  if (!trimmed.toUpperCase().startsWith('#OFFER')) return { valid:false, error:'Message must start with #OFFER', example:'#OFFER 20% off lunch today until 5pm' }
  const body = trimmed.replace(/^#OFFER\s*/i,'').trim()
  if (body.length<5) return { valid:false, error:'Offer text too short' }
  const untilMatch = body.match(/until\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
  const todayMatch = /\btoday\b/i.test(body)
  const expiresAt = untilMatch ? parseTime(untilMatch[1]) : todayMatch ? eod() : null
  return { valid:true, title:body, shortLabel:body.slice(0,22), description:body, expiresAt, source:'whatsapp' }
}
function parseTime(s) { const now=new Date(),m=s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i); if(!m)return eod(); let h=parseInt(m[1]),min=m[2]?parseInt(m[2]):0,ap=m[3]?.toLowerCase(); if(ap==='pm'&&h!==12)h+=12; if(ap==='am'&&h===12)h=0; now.setHours(h,min,0,0); if(now<new Date())now.setDate(now.getDate()+1); return now.toISOString() }
function eod() { const d=new Date(); d.setHours(23,59,59,0); return d.toISOString() }
