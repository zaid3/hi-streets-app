import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
export function prepareDocumentWindow(): Window | null {
  if (Capacitor.isNativePlatform()) return null
  const popup = window.open('', '_blank')
  if (popup) popup.opener = null
  return popup
}
export async function openPrivateDocument(url: string, popup: Window | null) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('A secure document link is required.')
  if (Capacitor.isNativePlatform()) await Browser.open({ url: parsed.href })
  else if (popup) popup.location.href = parsed.href
  else window.location.assign(parsed.href)
}
