import { supabase, supabaseConfigured } from './supabase'
import { inNewham } from './newham'
import type { Business, BusinessClaimOption, BusinessProfileInput, BusinessRegistrationInput, ClaimMethod, JobApplication, ParkingPoint, Post, Role } from '../types'

type FeatureCollection = { type: 'FeatureCollection'; features: Array<any> }

const businessSelect = 'id,osm_id,name,category,description,address,phone,website,whatsapp,email,opening_hours,opening_hours_json,cuisine,wheelchair,brand,operator,verification_status,verified_at,verified_via,is_claimed,photo_url,source,lat,lng,fsa_fhrsid,fsa_rating,fsa_rating_date,fsa_match_confidence,companies_house_number,incorporation_date,company_status,registration_note'
const ownBusinessSelect = 'id,osm_id,name,category,description,address,phone,website,whatsapp,email,opening_hours,opening_hours_json,cuisine,wheelchair,brand,operator,verification_status,verified_at,verified_via,photo_url,source,lat,lng,fsa_fhrsid,fsa_rating,fsa_rating_date,fsa_match_confidence,companies_house_number,incorporation_date,company_status,registration_note'

export const emptyStateText = {
  offers: 'No live offers yet. Ask a local business to register and post an offer.',
  jobs: 'No Newham jobs posted yet. Local businesses can register and post simple jobs.',
  community: 'No free meals or community support posts this week.',
  parking: 'Parking is not active in this version.',
}

export async function loadBusinesses(): Promise<Business[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('businesses_public')
    .select(businessSelect)
    .limit(500)
  if (error || !data) return []
  return (data as Business[]).filter(b => inNewham(b.lat, b.lng))
}

export async function loadMyBusinesses(): Promise<Business[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return []
  const { data, error } = await supabase
    .from('businesses')
    .select(ownBusinessSelect)
    .eq('claimed_by', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return (data as Business[]).filter(b => inNewham(b.lat, b.lng))
}

function canPostFromBusiness(business: Business) {
  return business.verification_status === 'verified' && business.source !== 'osm' && inNewham(business.lat, business.lng)
}

export async function loadMyVerifiedBusinesses(): Promise<Business[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return []
  const role = await getCurrentRole()
  let query = supabase
    .from('businesses')
    .select(ownBusinessSelect)
    .eq('verification_status', 'verified')
    .order('name', { ascending: true })
    .limit(200)
  if (role !== 'admin') query = query.eq('claimed_by', user.id)
  const { data, error } = await query
  if (error || !data) return []
  return (data as Business[]).filter(canPostFromBusiness)
}

export async function registerBusiness(input: BusinessRegistrationInput): Promise<string> {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase is not configured')
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Sign in first')
  if (!inNewham(input.lat, input.lng)) throw new Error('Business location must be inside Newham')
  const { data, error } = await supabase.rpc('register_my_business', {
    p_name: input.name.trim(),
    p_category: input.category.trim(),
    p_description: input.description?.trim() || '',
    p_address: input.address.trim(),
    p_phone: input.phone?.trim() || '',
    p_website: input.website?.trim() || '',
    p_whatsapp: input.whatsapp?.trim() || '',
    p_email: input.email?.trim() || '',
    p_opening_hours: input.opening_hours?.trim() || '',
    p_lat: input.lat,
    p_lng: input.lng,
    p_evidence_note: input.evidence_note.trim(),
  })
  if (error) throw error
  return String(data)
}

export async function loadBusinessesGeoJson(): Promise<FeatureCollection> {
  if (!supabaseConfigured || !supabase) return { type: 'FeatureCollection', features: [] }
  const { data, error } = await supabase.rpc('businesses_geojson')
  if (error || !data) return { type: 'FeatureCollection', features: [] }
  return data as FeatureCollection
}

export async function loadNewhamBoundaryGeoJson(): Promise<FeatureCollection> {
  if (!supabaseConfigured || !supabase) return { type: 'FeatureCollection', features: [] }
  const { data, error } = await supabase.rpc('newham_boundary_geojson')
  if (error || !data) return { type: 'FeatureCollection', features: [] }
  return data as FeatureCollection
}

export async function fetchBusinessById(id: string): Promise<Business | null> {
  if (!supabaseConfigured || !supabase) return null
  const rpc = await supabase.rpc('business_detail', { p_business_id: id })
  if (!rpc.error && rpc.data) return rpc.data as Business
  const { data, error } = await supabase
    .from('businesses_public')
    .select(businessSelect)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as Business
}

export async function fetchBusinessClaimOption(id: string): Promise<BusinessClaimOption | null> {
  if (!supabaseConfigured || !supabase) return null
  const { data, error } = await supabase
    .from('business_claim_options_public')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as BusinessClaimOption
}

export async function startBusinessClaim(businessId: string, method: ClaimMethod): Promise<string> {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase is not configured')
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Sign in first')
  const { data, error } = await supabase.rpc('start_business_claim', {
    p_business_id: businessId,
    p_method: method,
  })
  if (error) throw error
  return String(data)
}

export async function saveMyBusinessProfile(input: BusinessProfileInput): Promise<Business> {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase is not configured')
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Sign in first')
  const { data, error } = await supabase.rpc('update_my_business_profile', {
    p_business_id: input.business_id,
    p_name: input.name || '',
    p_category: input.category || '',
    p_description: input.description || '',
    p_address: input.address || '',
    p_phone: input.phone || '',
    p_website: input.website || '',
    p_whatsapp: input.whatsapp || '',
    p_email: input.email || '',
    p_opening_hours: input.opening_hours || '',
    p_photo_url: input.photo_url || '',
  })
  if (error) throw error
  return data as Business
}

export async function getCurrentRole(): Promise<Role | null> {
  if (!supabaseConfigured || !supabase) return null
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return (data?.role as Role | undefined) || null
}

export async function loadPosts(type?: Post['type']): Promise<Post[]> {
  if (!supabaseConfigured || !supabase) return []
  let query = supabase
    .from('posts_public')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (type) query = query.eq('type', type)
  const { data, error } = await query
  if (error || !data) return []
  return data.map((row: any) => ({
    id: row.id,
    business_id: row.business_id,
    type: row.type,
    title: row.title,
    body: row.body,
    category: row.category,
    starts_at: row.starts_at,
    expires_at: row.expires_at,
    recurrence: row.recurrence,
    apply_url: row.apply_url,
    apply_phone: row.apply_phone,
    status: row.status,
    source: row.source,
    lat: row.lat ?? row.business_lat,
    lng: row.lng ?? row.business_lng,
    business: row.business_id ? { id: row.business_id, name: row.business_name, category: row.business_category, address: row.business_address, lat: row.business_lat, lng: row.business_lng, verification_status: 'verified', source: row.business_source || 'owner_registration' } : null,
  }))
}

export async function submitJobApplication(input: { post_id: string; applicant_name: string; applicant_email: string; applicant_phone: string; cover_note?: string; cv_file: File }) {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase is not configured')
  if (!input.cv_file) throw new Error('CV is required')
  if (input.cv_file.size > 10 * 1024 * 1024) throw new Error('CV must be under 10MB')
  const ext = input.cv_file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const safeExt = ['pdf', 'doc', 'docx'].includes(ext) ? ext : 'pdf'
  const path = `applications/${input.post_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`
  const upload = await supabase.storage.from('job-cvs').upload(path, input.cv_file, { upsert: false, contentType: input.cv_file.type || 'application/octet-stream' })
  if (upload.error) throw upload.error
  const { data: publicUrl } = supabase.storage.from('job-cvs').getPublicUrl(path)
  const { error } = await supabase.rpc('submit_job_application', {
    p_post_id: input.post_id,
    p_applicant_name: input.applicant_name.trim(),
    p_applicant_email: input.applicant_email.trim(),
    p_applicant_phone: input.applicant_phone.trim(),
    p_cover_note: input.cover_note?.trim() || '',
    p_cv_url: publicUrl.publicUrl,
  })
  if (error) throw error
}

export async function loadMyJobApplications(): Promise<JobApplication[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []
  const { data, error } = await supabase.rpc('my_job_applications')
  if (error || !data) return []
  return data as JobApplication[]
}

export async function loadCpzGeoJson(): Promise<FeatureCollection> {
  return { type: 'FeatureCollection', features: [] }
}

export async function loadParkingPoints(_kind: 'blue_badge' | 'all' = 'all'): Promise<ParkingPoint[]> {
  return []
}

export async function createBlueBadgeBay() {
  throw new Error('Parking is not active in this version')
}

export async function createPost(input: Pick<Post, 'type' | 'title' | 'body' | 'category' | 'expires_at' | 'apply_url' | 'apply_phone' | 'recurrence'> & { business_id: string }) {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase is not configured')
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Sign in first')
  if (!input.business_id) throw new Error('Approved business required')
  const { error } = await supabase.rpc('create_verified_business_post', {
    p_business_id: input.business_id,
    p_type: input.type,
    p_title: input.title,
    p_body: input.body,
    p_category: input.category || '',
    p_expires_at: input.expires_at,
    p_apply_url: input.apply_url || '',
    p_apply_phone: input.apply_phone || '',
    p_recurrence: input.recurrence || '',
  })
  if (error) throw error
}
