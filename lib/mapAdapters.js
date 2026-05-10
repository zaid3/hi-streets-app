
const NOMINATIM = 'https://nominatim.openstreetmap.org'
export async function searchUK(query) {
  try {
    const url = `${NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&countrycodes=gb&limit=8&addressdetails=1`
    const r = await fetch(url, { headers: { 'User-Agent': 'HiStreets/1.0 (histreets.uk)' } })
    const data = await r.json()
    return data.map(p => ({ id:p.place_id, name:p.display_name.split(',').slice(0,2).join(', ').trim(), fullName:p.display_name, lat:parseFloat(p.lat), lng:parseFloat(p.lon), type:p.type, class:p.class }))
  } catch(e) { return [] }
}
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Not supported')); return }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat:p.coords.latitude, lng:p.coords.longitude }),
      err => reject(err),
      { timeout:12000, maximumAge:60000, enableHighAccuracy:true }
    )
  })
}
export const UK_DEFAULT = { lat:51.5074, lng:-0.1278, zoom:15 }
