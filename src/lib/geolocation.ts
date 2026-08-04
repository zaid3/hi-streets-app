function errorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return null
  const code = Number((error as { code?: unknown }).code)
  return Number.isFinite(code) ? code : null
}

export function getPosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

export async function getReliableUserPosition() {
  if (!window.isSecureContext) throw new Error('Location needs a secure HTTPS connection.')
  if (!navigator.geolocation) throw new Error('Location is not supported on this browser.')

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
  if (!window.isSecureContext) throw new Error('Location needs a secure HTTPS connection. Add the full Newham postcode instead.')
  if (!navigator.geolocation) throw new Error('Location is not supported on this browser. Add a full Newham postcode instead.')

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
  if (code === 1) return 'Location is blocked. Allow location for HiStreets in your browser or site settings, then try again.'
  if (code === 3) return 'Location timed out. Check that location services are on, then try again.'
  return fallback
}
