import { useEffect, useState } from 'react'
import { MapPin, Send, Store } from 'lucide-react'
import { loadMyBusinesses, registerBusiness } from '../lib/data'
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
  if (status === 'pending') return 'Waiting for admin approval'
  if (status === 'rejected') return 'Rejected — check details and contact admin'
  return status || 'Draft'
}

export default function BusinessRegistration() {
  const [form, setForm] = useState(initialForm)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  async function refresh() {
    const rows = await loadMyBusinesses()
    setBusinesses(rows)
  }

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return setStatus('Location is not supported on this browser.')
    setStatus('Getting your business location…')
    navigator.geolocation.getCurrentPosition(
      position => {
        setForm(prev => ({ ...prev, lat: position.coords.latitude.toFixed(7), lng: position.coords.longitude.toFixed(7) }))
        setStatus('Location added. Check it is the business location before submitting.')
      },
      error => setStatus(error.code === error.PERMISSION_DENIED ? 'Location permission denied.' : 'Could not get location.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  async function submit() {
    try {
      setSaving(true)
      setStatus('Submitting business for approval…')
      await registerBusiness({
        name: form.name,
        category: form.category,
        description: form.description,
        address: form.address,
        phone: form.phone,
        website: form.website,
        whatsapp: form.whatsapp,
        email: form.email,
        opening_hours: form.opening_hours,
        lat: Number(form.lat),
        lng: Number(form.lng),
        evidence_note: form.evidence_note,
      })
      setForm(initialForm)
      await refresh()
      setStatus('Business submitted. It will appear publicly after admin approval.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not submit business.')
    } finally {
      setSaving(false)
    }
  }

  const disabled = saving || !form.name.trim() || !form.category.trim() || !form.address.trim() || !form.evidence_note.trim() || !Number(form.lat) || !Number(form.lng)

  return (
    <div className="privacy-card business-owner-card">
      <h2><Store size={20} /> Register your business</h2>
      <p className="muted">Only approved businesses appear publicly. Owners register their own details, then post offers, jobs, free meals or community support.</p>

      {businesses.length > 0 && <div className="business-facts">
        <h3>Your businesses</h3>
        {businesses.map(b => <p key={b.id}><strong>{b.name}</strong> — {statusText(b.verification_status)}</p>)}
      </div>}

      <label>Business name
        <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Green Street Pharmacy" maxLength={120} />
      </label>
      <label>Category
        <input value={form.category} onChange={e => update('category', e.target.value)} placeholder="pharmacy, restaurant, barber, solicitor, mechanic…" maxLength={80} />
      </label>
      <label>Short description
        <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="What does this business offer locally?" maxLength={500} />
      </label>
      <label>Address
        <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Street address and postcode" maxLength={240} />
      </label>
      <div className="sheet-actions">
        <button type="button" onClick={useCurrentLocation}><MapPin size={17} /> Use current location</button>
      </div>
      <label>Latitude
        <input value={form.lat} onChange={e => update('lat', e.target.value)} placeholder="51.5…" inputMode="decimal" />
      </label>
      <label>Longitude
        <input value={form.lng} onChange={e => update('lng', e.target.value)} placeholder="0.0…" inputMode="decimal" />
      </label>
      <label>Phone
        <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="Business phone" maxLength={50} />
      </label>
      <label>Website
        <input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://example.com" maxLength={240} />
      </label>
      <label>WhatsApp
        <input value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="WhatsApp number or wa.me link" maxLength={120} />
      </label>
      <label>Email
        <input value={form.email} onChange={e => update('email', e.target.value)} placeholder="business@example.com" maxLength={160} />
      </label>
      <label>Opening hours
        <input value={form.opening_hours} onChange={e => update('opening_hours', e.target.value)} placeholder="Mon–Sat 9am–6pm" maxLength={160} />
      </label>
      <label>Evidence note
        <textarea value={form.evidence_note} onChange={e => update('evidence_note', e.target.value)} placeholder="Example: I am the owner / staff member. Shop sign checked. Website confirms details." maxLength={500} />
      </label>

      <button onClick={submit} disabled={disabled}><Send size={17} /> {saving ? 'Submitting…' : 'Submit business for approval'}</button>
      {status && <p className="form-status">{status}</p>}
    </div>
  )
}
