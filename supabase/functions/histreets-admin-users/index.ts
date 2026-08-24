import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}
const roles = new Set(['user', 'business', 'charity', 'admin', 'super_admin'])
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authorization = req.headers.get('Authorization') || ''
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Authentication required.' }, 401)

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Invalid session.' }, 401)

    const admin = createClient(url, service)
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'super_admin') return json({ error: 'Super Admin access required.' }, 403)

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const action = body?.action || 'list'

    if (action === 'list') {
      const page = Math.max(1, Number(body?.page || 1))
      const perPage = Math.min(100, Math.max(1, Number(body?.per_page || 50)))
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) return json({ error: error.message }, 400)
      const ids = data.users.map(u => u.id)
      const { data: profiles } = ids.length
        ? await admin.from('profiles').select('id,display_name,role').in('id', ids)
        : { data: [] as Array<{ id: string; display_name: string; role: string }> }
      const byId = new Map((profiles || []).map(p => [p.id, p]))
      return json({
        users: data.users.map(u => ({
          id: u.id,
          email: u.email || '',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          email_confirmed_at: u.email_confirmed_at || null,
          display_name: byId.get(u.id)?.display_name || '',
          role: byId.get(u.id)?.role || 'user',
        })),
        audience: data.aud,
      })
    }

    if (action === 'set_role') {
      const targetId = String(body?.user_id || '')
      const nextRole = String(body?.role || '')
      if (!targetId || !roles.has(nextRole)) return json({ error: 'Valid user and role are required.' }, 400)
      if (targetId === user.id && nextRole !== 'super_admin') return json({ error: 'You cannot remove your own Super Admin access.' }, 400)
      const { error } = await admin.from('profiles').upsert({ id: targetId, role: nextRole }, { onConflict: 'id' })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, role: nextRole })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Admin service failed.' }, 500)
  }
})
