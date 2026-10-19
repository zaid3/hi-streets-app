import { Capacitor } from '@capacitor/core'
export function authRedirect(recovery = false) {
  const origin = Capacitor.isNativePlatform() ? 'https://app.histreets.uk' : window.location.origin
  return `${origin}/business${recovery ? '?mode=recovery' : ''}`
}
