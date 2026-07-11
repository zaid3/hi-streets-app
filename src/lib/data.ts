import { supabase, supabaseConfigured } from './supabase'
import { inNewham } from './newham'
import type { Business, ParkingPoint, Post } from '../types'

type FeatureCollection = { type: 'FeatureCollection'; features: Array<Record<string, unknown>> }

export const emptyStateText = {
  offers: 'No live offers yet — local businesses can post one from the Profile tab.',
  jobs: 'No Newham jobs posted yet — know a local employer? Ask them to post here.',
  community: 'No free meals or community support posts this week — tell us about one.',
  parking: 'Parking details for this street are not verified yet.',
}

export async function loadBusinesses(): Promise<Business[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('businesses_public')
    .select('id,osm_id,name,category,description,address,phone,website,whatsapp,verification_status,photo_url,source,lat,lng')
    .limit(500)
  if (error || !data) return []
  return (data as Business[]).filter(b => inNewham(b.lat, b.lng))
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
    apply_url: row.apply_url,
    apply_phone: row.apply_phone,
    status: row.status,
    source: row.source,
    lat: row.lat ?? row.business_lat,
    lng: row.lng ?? row.business_lng,
    business: row.business_id ? { id: row.business_id, name: row.business_name, category: row.business_category, address: row.business_address, lat: row.business_lat, lng: row.business_lng, verification_status: 'verified', source: 'osm' } : null,
  }))
}

export async function loadCpzGeoJson(): Promise<FeatureCollection> {
  if (!supabaseConfigured || !supabase) return { type: 'FeatureCollection', features: [] }
  const { data, error } = await supabase.from('cpz_zones_public').select('*')
  if (error || !data) return { type: 'FeatureCollection', features: [] }
  return {
    type: 'FeatureCollection',
    features: data
      .filter((row: any) => row.geom_json)
      .map((row: any) => ({
        type: 'Feature',
        id: row.id,
        properties: { id: row.id, name: row.name, hours: row.hours, event_day_hours: row.event_day_hours, source: row.source, last_verified_at: row.last_verified_at },
        geometry: row.geom_json,
      })),
  }
}

export async function loadParkingPoints(kind: 'paid_bay' | 'blue_badge' | 'all' = 'all'): Promise<ParkingPoint[]> {
  if (!supabaseConfigured || !supabase) return []
  const items: ParkingPoint[] = []
  if (kind === 'paid_bay' || kind === 'all') {
    const { data } = await supabase.from('paid_bays_public').select('*').limit(300)
    ;(data || []).forEach((row: any) => {
      if (inNewham(row.lat, row.lng)) items.push({ id: row.id, kind: 'paid_bay', name: row.paybyphone_code ? `PayByPhone ${row.paybyphone_code}` : 'Paid bay', lat: row.lat, lng: row.lng, source: row.source, last_verified_at: row.last_verified_at, tariff: row.tariff, max_stay_mins: row.max_stay_mins, paybyphone_code: row.paybyphone_code })
    })
  }
  if (kind === 'blue_badge' || kind === 'all') {
    const { data } = await supabase.from('blue_badge_bays_public').select('*').limit(300)
    ;(data || []).forEach((row: any) => {
      if (inNewham(row.lat, row.lng)) items.push({ id: row.id, kind: 'blue_badge', name: `${row.road_name} blue badge bay`, lat: row.lat, lng: row.lng, source: row.source, last_verified_at: row.last_verified_at, confidence: row.confidence })
    })
  }
  return items
}

export async function createPost(input: Pick<Post, 'type' | 'title' | 'body' | 'category' | 'expires_at' | 'apply_url' | 'apply_phone'>) {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase is not configured')
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Sign in first')
  const { error } = await supabase.from('posts').insert({ ...input, author_id: user.id, status: 'pending', source: 'web' })
  if (error) throw error
}
