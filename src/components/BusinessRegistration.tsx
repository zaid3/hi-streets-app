import { useEffect, useState } from 'react'
import { Camera, MapPin, Send, Store } from 'lucide-react'
import { loadMyBusinesses, registerBusiness, uploadBusinessVerificationEvidence } from '../lib/data'
import { inNewham, NEWHAM_CENTER } from '../lib/newham'
import type { Business } from '../types'

const initialForm = {
  name: '',
  category: '',
  description: '',
  address: '',
  phone: '',
  website: '',
  whatsapp: '',
  email: '',
  opening_hours: '',
  lat: '',
  lng: '',
  evidence_note: '',
}

function statusText(status?: string | null) {
  if (status === 'verified') return 'Approved and visible publicly'
  if (status === 'pending') return 'Waiting for Super Admin approval'
  if (status === 'rejected') return 'Rejected — check details and contact HiStreets'
  return status || 'Draft'
}

function extractPostcode(value: string) {
  const match = value.toUpperCase().match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i)
  if (!match) return ''
  const compact = match[1].replace(/\s+/g, '')
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}

export default function BusinessRegistration() {
  const [form, setForm] = useState(initialForm)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [serviceAreaOnly, setServiceAreaOnly] = useState(false)
  const [shopfrontPhoto, setShopfrontPhoto] = useState<File | null>(null)
  const [insidePhoto, setInsidePhoto] = useState<File | null>(null)
  const [fileInputVersion, setFileInputVersion] = useState(0)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { void refresh() }, [])

  async function refresh() {
    const rows = await loadMyBusinesses()
    setBusinesses(rows)
  }

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function useCurrentLocation() {
    if (serviceAreaOnly) return setStatus('Service-area businesses use a borough-level service pin instead of an exact home or operating location.')
    if (!navigator.geolocation) return setStatus('Location is not supported on this browser. Add a full Newham postcode instead.')
    setStatus('Getting the business location…')
    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        if (!inNewham(lat, lng)) {
          setStatus('This location is outside the Newham map area. Add the business address and Newham postcode instead.')
          return
        }
        setForm(prev => ({ ...prev, lat: lat.toFixed(7), lng: lng.toFixed(7) }))
        setStatus('Precise business location added.')
      },
      error => setStatus(error.code === error.PERMISSION_DENIED ? 'Location is blocked. That is okay — add the full address and postcode and HiStreets will use the postcode location.' : 'Could not get location. Add the full address and postcode instead.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  function currentMapPoint() {
    if (!form.lat.trim() || !form.lng.trim()) return null
    const lat = Number(form.lat)
    const lng = Number(form.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  }

  async function postcodeMapPoint() {
    const postcode = extractPostcode(form.address)
    if (!postcode) throw new Error(serviceAreaOnly ? 'Add a full Newham postcode for the service area.' : 'Add the full postcode in the business address, or use “Use business location”.')
    setStatus(`Finding ${postcode}…`)
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`)
    const data = await response.json()
    const lat = Number(data?.result?.latitude)
    const lng = Number(data?.result?.longitude)
    const adminDistrict = String(data?.result?.admin_district || '').trim().toLowerCase()
    if (!response.ok || !Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Postcode could not be found. Check the postcode and try again.')
    if (adminDistrict !== 'newham') throw new Error('The postcode must be in the London Borough of Newham.')
    if (!inNewham(lat, lng)) throw new Error('The postcode is outside the HiStreets Newham map area.')
    return { lat, lng, postcode }
  }

  async function serviceAreaMapPoint() {
    const exact = await postcodeMapPoint()
    return {
      lat: NEWHAM_CENTER.lat,
      lng: NEWHAM_CENTER.lng,
      outcode: exact.postcode.split(' ')[0],
    }
  }

  async function submit() {
    try {
      setSaving(true)
      setStatus('Checking business details…')

      let mapPoint: { lat: number; lng: number }
      let publicAddress = form.address
      if (serviceAreaOnly) {
        const servicePoint = await serviceAreaMapPoint()
        mapPoint = servicePoint
        publicAddress = `Serves Newham (${servicePoint.outcode})`
      } else {
        mapPoint = currentMapPoint() || await postcodeMapPoint()
      }

      const businessId = await registerBusiness({
        name: form.name,
        category: form.category,
        description: form.description,
        address: publicAddress,
        phone: form.phone,
        website: form.website,
        whatsapp: form.whatsapp,
        email: form.email,
        opening_hours: form.opening_hours,
        lat: mapPoint.lat,
        lng: mapPoint.lng,
        evidence_note: form.evidence_note,
      })

      const photoErrors: string[] = []
      if (shopfrontPhoto) {
        try { await uploadBusinessVerificationEvidence(businessId, 'shopfront', shopfrontPhoto) }
        catch { photoErrors.push('shop-front photo') }
      }
      if (insidePhoto) {
        try { await uploadBusinessVerificationEvidence(businessId, 'inside', insidePhoto) }
        catch { photoErrors.push('inside photo') }
      }

      setForm(initialForm)
      setServiceAreaOnly(false)
      setShopfrontPhoto(null)
      setInsidePhoto(null)
      setFileInputVersion(v => v + 1)
      await refresh()
      setStatus(photoErrors.length ? `Business submitted for approval. Could not attach: ${photoErrors.join(' and ')}.` : 'Business submitted. It will appear publicly after approval.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not submit business.')
    } finally {
      setSaving(false)
    }
  }

  const mapPoint = currentMapPoint()
  const disabled = saving || !form.name.trim() || !form.category.trim() || !form.address.trim() || !form.evidence_note.trim()

  return (
    <div id="business-register-card" className="privacy-card business-owner-card">
      <h2><Store size={20} /> Register a new business</h2>
      <p className="muted">Use this form only when the business is not already listed on HiStreets. Existing businesses should use the ownership request above.</p>

      {businesses.length > 0 && <div className="business-facts">
        <h3>Your businesses</h3>
        {businesses.map(b => <p key={b.id}><strong>{b.name}</strong> — {statusText(b.verification_status)}</p>)}
      </div>}

      <label>Business name
        <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Green Street Pharmacy" maxLength={120} autoComplete="organization" />
      </label>
      <label>Category
        <input value={form.category} onChange={e => update('category', e.target.value)} placeholder="Restaurant, barber, pharmacy, solicitor…" maxLength={80} />
      </label>
      <label className="service-area-toggle"><span><input type="checkbox" checked={serviceAreaOnly} onChange={e => {
        const next = e.target.checked
        setServiceAreaOnly(next)
        if (next) {
          setForm(prev => ({ ...prev, lat: '', lng: '' }))
          setShopfrontPhoto(null)
          setInsidePhoto(null)
          setFileInputVersion(v => v + 1)
        }
      }} /> Service-area / online business</span><small>Use this for home-based, mobile or virtual services. Your home street address will not be requested or published.</small></label>
      <label>{serviceAreaOnly ? 'Newham service postcode' : 'Full business address and postcode'}
        <input value={form.address} onChange={e => update('address', e.target.value)} placeholder={serviceAreaOnly ? 'e.g. E6 2AA' : '123 Green Street, London E7 8LE'} maxLength={240} autoComplete={serviceAreaOnly ? 'postal-code' : 'street-address'} />
      </label>

      <div className={!serviceAreaOnly && mapPoint ? 'location-confirmed-card' : 'location-help-card'}>
        <strong>{serviceAreaOnly ? 'Private service-area location' : mapPoint ? 'Precise map point added' : 'Map location'}</strong>
        <p>{serviceAreaOnly ? 'HiStreets verifies that the postcode belongs to Newham, publishes only the outward postcode label and uses a borough-level service pin. Your full postcode and home or private operating address are not stored by this form.' : mapPoint ? 'HiStreets will use the location you provided.' : 'A full postcode is enough for quick signup. For a more precise shop pin, stand at the business and use your current location.'}</p>
        {!serviceAreaOnly && <button type="button" onClick={useCurrentLocation}><MapPin size={17} /> Use business location</button>}
      </div>

      <label>How can we verify this business?
        <textarea value={form.evidence_note} onChange={e => update('evidence_note', e.target.value)} placeholder="Example: I am the owner. The shop sign, business phone and website confirm these details." maxLength={500} />
      </label>

      {!serviceAreaOnly && <details className="advanced-location verification-upload">
        <summary><Camera size={16} /> Add verification photos</summary>
        <p>For a physical shop, a clear shop-front photo is recommended. An inside photo is optional. These files are private, used only for verification and removed after the admin decision.</p>
        <label>Shop-front / outside photo
          <input key={`shopfront-${fileInputVersion}`} type="file" accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic" onChange={e => setShopfrontPhoto(e.target.files?.[0] || null)} />
        </label>
        <label>Inside photo (optional)
          <input key={`inside-${fileInputVersion}`} type="file" accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic" onChange={e => setInsidePhoto(e.target.files?.[0] || null)} />
        </label>
        <p className="muted">Do not upload identity documents, bank statements or other sensitive personal documents.</p>
      </details>}

      <details className="advanced-location">
        <summary>Add more business details</summary>
        <p>Optional now. You can also complete these after approval.</p>
        <label>Short description
          <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="What does this business offer locally?" maxLength={500} />
        </label>
        <label>Phone
          <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="Business phone" maxLength={50} autoComplete="tel" />
        </label>
        <label>WhatsApp
          <input value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="WhatsApp number or wa.me link" maxLength={120} />
        </label>
        <label>Email
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="business@example.com" maxLength={160} autoComplete="email" />
        </label>
        <label>Website
          <input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://example.com" maxLength={240} inputMode="url" />
        </label>
        <label>Opening hours
          <input value={form.opening_hours} onChange={e => update('opening_hours', e.target.value)} placeholder="Mon–Sat 9am–6pm" maxLength={160} />
        </label>
      </details>

      {!serviceAreaOnly && <details className="advanced-location">
        <summary>Advanced map location</summary>
        <p>Only use this if HiStreets asks for it.</p>
        <label>Latitude
          <input value={form.lat} onChange={e => update('lat', e.target.value)} placeholder="51.5…" inputMode="decimal" />
        </label>
        <label>Longitude
          <input value={form.lng} onChange={e => update('lng', e.target.value)} placeholder="0.0…" inputMode="decimal" />
        </label>
      </details>}

      <button onClick={submit} disabled={disabled}><Send size={17} /> {saving ? 'Submitting…' : 'Submit for approval'}</button>
      {status && <p className="form-status">{status}</p>}
    </div>
  )
}
