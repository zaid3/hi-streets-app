import { supabase, supabaseConfigured } from './supabase'
import type { BusinessAnalyticsPoint, BusinessDashboardOverview, BusinessMemberRole, BusinessTeamRecord, BusinessWorkspaceRef, PlatformAnalyticsPoint, PlatformDashboardOverview } from '../types'

function requireClient() {
  if (!supabaseConfigured || !supabase) throw new Error('HiStreets data is not available right now.')
  return supabase
}

export async function acceptBusinessInvitations() {
  const client = requireClient()
  const { data, error } = await client.rpc('accept_my_business_invitations')
  if (error) throw error
  return Number(data || 0)
}

export async function loadWorkspaceRefs(): Promise<BusinessWorkspaceRef[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('my_business_workspace_ids')
  if (error || !data) return []
  return data as BusinessWorkspaceRef[]
}

export async function loadBusinessDashboard(businessId: string, days = 30) {
  const client = requireClient()
  const [overview, series] = await Promise.all([
    client.rpc('business_dashboard_overview', { p_business_id: businessId, p_days: days }),
    client.rpc('business_analytics_series', { p_business_id: businessId, p_days: days }),
  ])
  if (overview.error) throw overview.error
  if (series.error) throw series.error
  return { overview: overview.data as BusinessDashboardOverview, series: (series.data || []) as BusinessAnalyticsPoint[] }
}

export async function loadPlatformDashboard(days = 30) {
  const client = requireClient()
  const [overview, series] = await Promise.all([
    client.rpc('platform_dashboard_overview', { p_days: days }),
    client.rpc('platform_analytics_series', { p_days: days }),
  ])
  if (overview.error) throw overview.error
  if (series.error) throw series.error
  return { overview: overview.data as PlatformDashboardOverview, series: (series.data || []) as PlatformAnalyticsPoint[] }
}

export async function loadBusinessTeam(businessId: string): Promise<BusinessTeamRecord[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('business_team_overview', { p_business_id: businessId })
  if (error) throw error
  return (data || []) as BusinessTeamRecord[]
}

export async function inviteBusinessMember(businessId: string, email: string, role: Exclude<BusinessMemberRole, 'owner'>) {
  const client = requireClient()
  const { data, error } = await client.functions.invoke('histreets-team', { body: { action: 'invite', business_id: businessId, email, role } })
  if (error || data?.error) throw new Error(data?.error || error?.message || 'Could not send the invitation.')
  return data as { ok: true; delivery: 'email' | 'in_app'; expires_at: string }
}

export async function revokeBusinessInvitation(businessId: string, invitationId: string) {
  const client = requireClient()
  const { data, error } = await client.functions.invoke('histreets-team', { body: { action: 'revoke_invitation', business_id: businessId, invitation_id: invitationId } })
  if (error || data?.error) throw new Error(data?.error || error?.message || 'Could not revoke the invitation.')
}

export async function updateBusinessMemberRole(businessId: string, userId: string, role: BusinessMemberRole) {
  const client = requireClient()
  const { error } = await client.rpc('update_business_member_role', { p_business_id: businessId, p_user_id: userId, p_role: role })
  if (error) throw error
}

export async function removeBusinessMember(businessId: string, userId: string) {
  const client = requireClient()
  const { error } = await client.rpc('remove_business_member', { p_business_id: businessId, p_user_id: userId })
  if (error) throw error
}

export function trackBusinessEvent(businessId: string, eventType: 'listing_view' | 'content_view' | 'phone_click' | 'website_click' | 'directions_click' | 'whatsapp_click' | 'save' | 'apply_start', postId?: string | null) {
  if (!supabaseConfigured || !supabase || !businessId) return
  void supabase.rpc('track_business_event', { p_business_id: businessId, p_event_type: eventType, p_post_id: postId || null }).then(() => undefined)
}
