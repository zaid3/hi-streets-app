import { useEffect, useState } from 'react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'
import { nativeDestination } from '../lib/nativeNavigation'

export default function NativeIntegration() {
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let disposed = false
    const handles: PluginListenerHandle[] = []
    const listen = async (pending: Promise<PluginListenerHandle>) => {
      try { const handle = await pending; if (disposed) await handle.remove(); else handles.push(handle) } catch { /* Plugin unsupported on this platform. */ }
    }
    document.documentElement.classList.add('histreets-native')
    void SplashScreen.hide().catch(() => {})
    void listen(Keyboard.addListener('keyboardWillShow', () => document.documentElement.classList.add('histreets-keyboard-open')))
    void listen(Keyboard.addListener('keyboardDidHide', () => document.documentElement.classList.remove('histreets-keyboard-open')))
    void listen(App.addListener('backButton', ({ canGoBack }) => {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).filter(el => el.getClientRects().length)
      const dialog = dialogs[dialogs.length - 1]
      if (dialog) {
        const close = dialog.querySelector<HTMLButtonElement>('button[aria-label^="Close"],button.sheet-close,button[data-native-dismiss]')
        if (close) close.click()
        else if (dialog.classList.contains('location-gate')) dialog.querySelector<HTMLButtonElement>('button.secondary')?.click()
        else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        return
      }
      if (document.activeElement instanceof HTMLElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
        document.activeElement.blur(); void Keyboard.hide().catch(() => {}); return
      }
      if (canGoBack) { window.history.back(); return }
      if (window.location.pathname !== '/map') {
        window.history.replaceState({}, '', '/map'); window.dispatchEvent(new PopStateEvent('popstate')); return
      }
      void App.exitApp()
    }))
    const link = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      const anchor = (event.target as Element)?.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.hasAttribute('download')) return
      event.preventDefault()
      const destination = nativeDestination(anchor.getAttribute('href') || '', window.location.origin)
      if (destination.kind === 'internal') {
        window.history.pushState({}, '', destination.url); window.dispatchEvent(new PopStateEvent('popstate'))
      } else if (destination.kind === 'external') {
        void Browser.open({ url: destination.url }).catch(() => setMessage('Could not open that link. Please try again.'))
      } else if (destination.kind === 'system') window.location.href = destination.url
      else setMessage('This link cannot be opened safely.')
    }
    document.addEventListener('click', link)
    return () => {
      disposed = true
      handles.forEach(handle => { void handle.remove() })
      document.removeEventListener('click', link)
      document.documentElement.classList.remove('histreets-native', 'histreets-keyboard-open')
    }
  }, [])
  return message ? <div className="native-link-notice" role="alert">{message}<button onClick={() => setMessage('')}>Dismiss</button></div> : null
}
