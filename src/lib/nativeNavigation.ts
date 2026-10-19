export type NativeDestination = { kind: 'internal' | 'external' | 'system' | 'blocked'; url: string }
const routes = new Set(['/', '/map', '/offers', '/jobs', '/community', '/parking', '/business', '/profile'])
const resources = new Set(['/privacy.html', '/terms.html', '/delete-account.html'])
export function nativeDestination(raw: string, origin: string): NativeDestination {
  try {
    const url = new URL(raw, origin)
    if (url.username || url.password) return { kind: 'blocked', url: '' }
    if (['tel:', 'mailto:'].includes(url.protocol)) return { kind: 'system', url: url.href }
    if (!['https:', 'http:', 'capacitor:'].includes(url.protocol)) return { kind: 'blocked', url: '' }
    if (url.origin === origin && routes.has(url.pathname)) return { kind: 'internal', url: url.pathname + url.search + url.hash }
    if (url.origin === origin && resources.has(url.pathname)) return { kind: 'external', url: 'https://app.histreets.uk' + url.pathname }
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return { kind: 'blocked', url: '' }
      return { kind: 'external', url: url.href }
    }
  } catch { /* Invalid URLs never enter the native WebView. */ }
  return { kind: 'blocked', url: '' }
}
