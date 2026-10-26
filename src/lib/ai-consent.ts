export function requireAiConsent(consented: boolean) {
  if (consented !== true) throw new Error('Please agree to share this request with Cloudflare Workers AI first.')
}
