import { supabase, supabaseConfigured } from './supabase'
import type { Business, Post, PostType } from '../types'

export type AskHiStreetsResponse = {
  mode: 'resident'
  answer: string
  intent: {
    summary: string
    area: string
    categories: string[]
    post_types: PostType[]
    business_terms: string[]
    budget_gbp: number | null
    time_hint: string
    commercial_signal_category: string | null
  }
  businesses: Business[]
  posts: Post[]
  source: 'verified_histreets_data'
  generated_at: string
}

export type BusinessCopilotDraft = {
  type: PostType
  title: string
  body: string
  category: string
  expiry_days: number
  recurrence: string
  missing_fields: string[]
  notes: string
}

export type BusinessCopilotResponse = {
  mode: 'business_draft'
  business: { id: string; name: string }
  draft: BusinessCopilotDraft
  requires_owner_review: true
  published: false
}

export type BusinessOpportunity = {
  eligible: boolean
  reason?: string
  threshold?: number
  area?: string
  category?: string
  category_label?: string
  signal_count?: number
  live_offer_count?: number
  period_days?: number
  level?: 'emerging' | 'growing' | 'strong'
  suggestion?: string
  seed_prompt?: string
  privacy_note?: string
}

function messageFromError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export async function askHiStreets(prompt: string): Promise<AskHiStreetsResponse> {
  if (!supabaseConfigured || !supabase) throw new Error('HiStreets AI is not configured.')
  const text = prompt.trim()
  if (text.length < 2) throw new Error('Tell HiStreets what you need.')
  const { data, error } = await supabase.functions.invoke('histreets-ai', {
    body: { mode: 'resident', prompt: text },
  })
  if (error) throw new Error(messageFromError(error, 'HiStreets AI is temporarily unavailable.'))
  if (data?.error) throw new Error(String(data.error))
  return data as AskHiStreetsResponse
}

export async function draftBusinessPost(prompt: string, businessId: string): Promise<BusinessCopilotResponse> {
  if (!supabaseConfigured || !supabase) throw new Error('Business Copilot is not configured.')
  const text = prompt.trim()
  if (!businessId) throw new Error('Choose an approved business first.')
  if (text.length < 2) throw new Error('Tell the Copilot what you want to post.')
  const { data, error } = await supabase.functions.invoke('histreets-ai', {
    body: { mode: 'business_draft', prompt: text, business_id: businessId },
  })
  if (error) throw new Error(messageFromError(error, 'Business Copilot is temporarily unavailable.'))
  if (data?.error) throw new Error(String(data.error))
  return data as BusinessCopilotResponse
}

export async function loadBusinessOpportunity(businessId: string): Promise<BusinessOpportunity> {
  if (!supabaseConfigured || !supabase || !businessId) return { eligible: false, reason: 'No approved business selected.' }
  const { data, error } = await supabase.functions.invoke('histreets-opportunity', {
    body: { business_id: businessId },
  })
  if (error) throw new Error(messageFromError(error, 'Local opportunity intelligence is temporarily unavailable.'))
  if (data?.error) throw new Error(String(data.error))
  return data as BusinessOpportunity
}
