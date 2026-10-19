export function validateMobileConfig(env) {
  const url = String(env.VITE_SUPABASE_URL || '').trim()
  const key = String(env.VITE_SUPABASE_ANON_KEY || '').trim()
  let parsed
  try { parsed = new URL(url) } catch { throw new Error('Provide the live HTTPS Supabase URL.') }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('Use the public HTTPS backend origin.')
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
  if (!publicKey && key.split('.').length === 3) {
    try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon' } catch { publicKey = false }
  }
  if (!publicKey) throw new Error('Only a public publishable or legacy anon key belongs in the app. Never use a secret or service-role key.')
  return { VITE_SUPABASE_URL: parsed.origin, VITE_SUPABASE_ANON_KEY: key }
}
