import { supabase, supabaseConfigured } from './supabase'
import { inNewham } from './newham'
import type { Business, ParkingPoint, Post } from '../types'

export const emptyStateText = {
  offers: 'No live offers yet — local businesses can post one from the Profile tab.',
  jobs: 'No Newham jobs posted yet — know a local employer? Ask them to post here.',
  community: 'No free meals or community support posts this week — tell us about one.',
  parking: 'Parking details for this street are not verified yet.',
}

function pointFromGeom(row: any) {
  if (typeof row.lat === 'number' && typeof row.lng === 'number') return { lat: row.lat, lng: row.lng }
  if (row.geom_json?.coordinates?.length === 2) return { lng: row.geom_json.coordinates[0], lat: row.geom_json.coordinates[1] }
  return { lat: null, lng: null }
}

export async function loadBusinesses(): Promise<Business[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('businesses')
    .select('id, osm_id, name, category, description, address, phone, website, whatsapp, verification_status, photo_url, source, geom_json:geom')
    .eq('verification_status', 'verified')
    .limit(500)
  if (error || !data) return []
  return data.map((row: any) => ({ ...row, ...pointFromGeom(row) })).filter((b: Business) => inNewham(b.lat, b.lng))
}

export async function loadPosts(type?: Post['type']): Promise<Post[]> {
  if (!supabaseConfigured || !supabase) return []
  let query = supabase
    .from('posts')
    .select('id,business_id,type,title,body,category,starts_at,expires_at,apply_url,apply_phone,status,source,geom_json:geom,business:businesses(id,name,category,address,phone,website,whatsapp,verification_status,photo_url,source,geom_json:geom)')
    .eq('status', 'live')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(100)
  if (type) query = query.eq('type', type)
  const { data, error } = await query
  if (error || !data) return []
  return data.map((row: any) => {
    const p = pointFromGeom(row)
    const businessPoint = row.business ? pointFromGeom(row.business) : { lat: null, lng: null }
    return {
      ...row,
      lat: p.lat ?? businessPoint.lat,
      lng: p.lng ?? businessPoint.lng,
      business: row.business ? { ...row.business, ...businessPoint } : null,
    }
  })
}

export async function loadCpzGeoJson(): Promise<GeoJSON.FeatureCollection> {
  if (!supabaseConfigured || !supabase) return { type: 'FeatureCollection', features: [] }
  const { data, error } = await supabase.from('cpz_zones').select('id,name,hours,event_day_hours,source,last_verified_at,geom_json:geom')
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
    const { data } = await supabase.from('paid_bays').select('id,paybyphone_code,tariff,max_stay_mins,source,last_verified_at,geom_json:geom').limit(300)
    ;(data || []).forEach((row: any) => {
      const p = pointFromGeom(row)
      if (inNewham(p.lat, p.lng)) items.push({ id: row.id, kind: 'paid_bay', name: row.paybyphone_code ? `PayByPhone ${row.paybyphone_code}` : 'Paid bay', lat: p.lat, lng: p.lng, source: row.source, last_verified_at: row.last_verified_at, tariff: row.tariff, max_stay_mins: row.max_stay_mins, paybyphone_code: row.paybyphone_code })
    })
  }
  if (kind === 'blue_badge' || kind === 'all') {
    const { data } = await supabase.from('blue_badge_bays').select('id,road_name,confidence,source,last_verified_at,geom_json:geom').in('confidence', ['official', 'verified']).limit(300)
    ;(data || []).forEach((row: any) => {
      const p = pointFromGeom(row)
      if (inNewham(p.lat, p.lng)) items.push({ id: row.id, kind: 'blue_badge', name: `${row.road_name} blue badge bay`, lat: p.lat, lng: p.lng, source: row.source, last_verified_at: row.last_verified_at, confidence: row.confidence })
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
