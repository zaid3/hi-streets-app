export type TabKey = 'map' | 'offers' | 'jobs' | 'community' | 'profile'
export type PostType = 'offer' | 'job' | 'free_meal' | 'community'
export type Role = 'user' | 'business' | 'charity' | 'admin'

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
  lat: number
  lng: number
  verification_status?: 'unclaimed' | 'pending' | 'verified' | 'rejected'
  photo_url?: string | null
  source?: string
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
