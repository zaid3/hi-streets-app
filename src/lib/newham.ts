export const NEWHAM_BOUNDS = {
  south: 51.490,
  west: -0.030,
  north: 51.565,
  east: 0.100,
}

export const NEWHAM_CENTER = { lat: 51.537, lng: 0.0325 }
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

export function paddedBounds(paddingRatio = 0.1) {
  const latPad = (NEWHAM_BOUNDS.north - NEWHAM_BOUNDS.south) * paddingRatio
  const lngPad = (NEWHAM_BOUNDS.east - NEWHAM_BOUNDS.west) * paddingRatio
  return {
    south: NEWHAM_BOUNDS.south - latPad,
    west: NEWHAM_BOUNDS.west - lngPad,
    north: NEWHAM_BOUNDS.north + latPad,
    east: NEWHAM_BOUNDS.east + lngPad,
  }
}

export function inNewham(lat?: number | null, lng?: number | null) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  return lat >= NEWHAM_BOUNDS.south && lat <= NEWHAM_BOUNDS.north && lng >= NEWHAM_BOUNDS.west && lng <= NEWHAM_BOUNDS.east
}

export function clampToNewham(point: { lat: number; lng: number }) {
  return inNewham(point.lat, point.lng) ? point : NEWHAM_CENTER
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function distanceLabel(lat?: number | null, lng?: number | null) {
  if (!inNewham(lat, lng)) return 'Newham'
  return 'Newham'
}
