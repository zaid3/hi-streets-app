export type TabKey = 'map' | 'offers' | 'jobs' | 'community' | 'profile'
export type PostType = 'offer' | 'job' | 'free_meal' | 'community'
export type Role = 'user' | 'business' | 'charity' | 'admin'
export type ClaimMethod = 'phone_otp' | 'domain_email' | 'website_code' | 'document'

export interface Business {
  id: string
  osm_id?: number | null
  name: string
  category: string
  description?: string | null
  address?: string | null
  phone?: string | null
  website?: string | null
  whatsapp?: string | null
  email?: string | null
  opening_hours?: string | null
  opening_hours_json?: Record<string, unknown> | null
  cuisine?: string | null
  wheelchair?: string | null
  brand?: string | null
  operator?: string | null
  lat: number
  lng: number
  verification_status?: 'unclaimed' | 'pending' | 'verified' | 'contested' | 'revoked' | 'rejected'
  verified_at?: string | null
  verified_via?: string | null
  is_claimed?: boolean | null
  photo_url?: string | null
  source?: string
  fsa_fhrsid?: string | null
  fsa_rating?: number | null
  fsa_rating_date?: string | null
  fsa_match_confidence?: number | null
  companies_house_number?: string | null
  incorporation_date?: string | null
  company_status?: string | null
}

export interface BusinessClaimOption {
  id: string
  name: string
  category: string
  address?: string | null
  can_phone_otp: boolean
  can_website_code: boolean
  website_domain?: string | null
  verification_status: Business['verification_status']
  is_claimed: boolean
}

export interface Post {
  id: string
  business_id?: string | null
  type: PostType
  title: string
  body: string
  category?: string | null
  starts_at?: string | null
  expires_at: string
  recurrence?: string | null
  apply_url?: string | null
  apply_phone?: string | null
  status: 'pending' | 'live' | 'expired' | 'rejected' | 'removed'
  source: 'web' | 'whatsapp' | 'admin'
  lat?: number | null
  lng?: number | null
  business?: Business | null
}

export interface ParkingPoint {
  id: string
  kind: 'blue_badge'
  name: string
  lat: number
  lng: number
  road_name?: string | null
  notes?: string | null
  photo_url?: string | null
  source: string
  last_verified_at?: string | null
}
