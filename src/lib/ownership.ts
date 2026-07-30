import { supabase, supabaseConfigured } from './supabase'
import type { AdminBusinessOwnershipRequest, Business, BusinessOwnershipRequest } from '../types'

const claimableSelect = 'id,name,category,address,is_claimed,verification_status,source,lat,lng'

export async function searchClaimableBusinesses(query: string): Promise<Business[]> {
  if (!supabaseConfigured || !supabase) return []
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const { data, error } = await supabase
    .from('businesses_public')
    .select(claimableSelect)
    .eq('is_claimed', false)
    .limit(100)

  if (error || !data) return []
  return (data as Business[])
    .filter(row => `${row.name} ${row.category || ''} ${row.address || ''}`.toLowerCase().includes(q))
    .slice(0, 10)
}

export async function requestBusinessOwnership(businessId: string, note: string) {
  if (!supabaseConfigured || !supabase) throw new Error('HiStreets login is not configured')
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Sign in first')
  const { data, error } = await supabase.rpc('request_business_ownership', {
    p_business_id: businessId,
    p_note: note.trim(),
  })
  if (error) throw error
  return String(data)
}

export async function loadMyOwnershipRequests(): Promise<BusinessOwnershipRequest[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data, error } = await supabase.rpc('my_business_ownership_requests')
  if (error || !data) return []
  return data as BusinessOwnershipRequest[]
}

export async function loadAdminOwnershipRequests(): Promise<AdminBusinessOwnershipRequest[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data, error } = await supabase.rpc('admin_business_ownership_requests')
  if (error || !data) return []
  return data as AdminBusinessOwnershipRequest[]
}

export async function moderateOwnershipRequest(requestId: string, status: 'approved' | 'rejected') {
  if (!supabaseConfigured || !supabase) throw new Error('HiStreets login is not configured')
  const { error } = await supabase.rpc('admin_moderate_ownership_request', {
    p_request_id: requestId,
    p_status: status,
  })
  if (error) throw error
}
