export const NEWHAM_BOUNDS = {
  south: 51.490,
  west: -0.030,
  north: 51.565,
  east: 0.100,
}

export const NEWHAM_CENTER = { lat: 51.537, lng: 0.0325 }
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
export const CPZ_ARCGIS_URL = 'https://mapping.newham.gov.uk/ArcGIS/rest/services/CPZ/MapServer/0/query?where=1=1&outFields=*&f=geojson'

export function inNewham(lat?: number | null, lng?: number | null) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  return lat >= NEWHAM_BOUNDS.south && lat <= NEWHAM_BOUNDS.north && lng >= NEWHAM_BOUNDS.west && lng <= NEWHAM_BOUNDS.east
}

export function clampToNewham(point: { lat: number; lng: number }) {
  return inNewham(point.lat, point.lng) ? point : NEWHAM_CENTER
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`
}

export function distanceLabel(lat?: number | null, lng?: number | null) {
  if (!inNewham(lat, lng)) return 'Newham'
  return 'Newham'
}
