import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
type LocationPosition = { timestamp: number; coords: Pick<GeolocationCoordinates, 'latitude' | 'longitude' | 'accuracy' | 'altitude' | 'altitudeAccuracy' | 'heading' | 'speed'> }
function errorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return null
  const raw = String((error as { code?: unknown }).code || '')
  if (raw === 'OS-PLUG-GLOC-0003') return 1
  if (raw === 'OS-PLUG-GLOC-0010') return 3
  if (['OS-PLUG-GLOC-0007','OS-PLUG-GLOC-0009'].includes(raw)) return 2
  const code = Number(raw)
  return Number.isFinite(code) ? code : null
}

export async function getPosition(options: PositionOptions): Promise<LocationPosition> {
  if (Capacitor.isNativePlatform()) {
    let permission = await Geolocation.checkPermissions()
    if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
      permission = await Geolocation.requestPermissions({ permissions: ['location'] })
    }
    if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') throw Object.assign(new Error('Location permission denied'), { code: 1 })
    const position = await Geolocation.getCurrentPosition(options)
    return { ...position, coords: { ...position.coords, altitude: position.coords.altitude ?? null, altitudeAccuracy: position.coords.altitudeAccuracy ?? null, heading: position.coords.heading ?? null, speed: position.coords.speed ?? null } }
  }
  return new Promise<LocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

export async function getReliableUserPosition() {
  if (!Capacitor.isNativePlatform() && !window.isSecureContext) throw new Error('Location needs a secure HTTPS connection.')
  if (!Capacitor.isNativePlatform() && !navigator.geolocation) throw new Error('Location is not supported on this browser.')

  try {
    const quick = await getPosition({ enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 })
    if (Number.isFinite(quick.coords.accuracy) && quick.coords.accuracy <= 250) return quick
    try {
      return await getPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
    } catch {
      return quick
    }
  } catch (error) {
    if (errorCode(error) === 1) throw error
    return getPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
  }
}

export async function getPreciseBusinessPosition() {
  if (!Capacitor.isNativePlatform() && !window.isSecureContext) throw new Error('Location needs a secure HTTPS connection. Add the full Newham postcode instead.')
  if (!Capacitor.isNativePlatform() && !navigator.geolocation) throw new Error('Location is not supported on this browser. Add a full Newham postcode instead.')

  try {
    return await getPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 })
  } catch (error) {
    if (errorCode(error) === 1) throw error
    return getPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 })
  }
}

export function locationErrorMessage(error: unknown, fallback: string) {
  const code = errorCode(error)
  if (error instanceof Error && code === null) return error.message
  if (code === 1) return Capacitor.isNativePlatform() ? 'Location is blocked. Allow location for HiStreets in your device settings, then try again.' : 'Location is blocked. Allow location for HiStreets in your browser or site settings, then try again.'
  if (code === 2 && Capacitor.isNativePlatform()) return 'Location is unavailable. Check that device location services are on, or search by postcode.'
  if (code === 3) return 'Location timed out. Check that location services are on, then try again.'
  return fallback
}
