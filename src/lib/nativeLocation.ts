import type { GeolocationPlugin } from '@capacitor/geolocation'
export async function nativePosition(plugin: Pick<GeolocationPlugin, 'checkPermissions' | 'requestPermissions' | 'getCurrentPosition'>, options: PositionOptions) {
  let permission = await plugin.checkPermissions()
  if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
    permission = await plugin.requestPermissions({ permissions: ['location'] })
  }
  if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') throw Object.assign(new Error('Location permission denied'), { code: 1 })
  const position = await plugin.getCurrentPosition(options)
  const { latitude, longitude, accuracy } = position.coords
  if (![latitude, longitude, accuracy].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) throw new Error('The device did not return a valid location. Try a postcode instead.')
  return { ...position, coords: { ...position.coords, altitude: position.coords.altitude ?? null, altitudeAccuracy: position.coords.altitudeAccuracy ?? null, heading: position.coords.heading ?? null, speed: position.coords.speed ?? null } }
}
