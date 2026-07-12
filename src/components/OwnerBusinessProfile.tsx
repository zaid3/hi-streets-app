import { useEffect, useMemo, useState } from 'react'
import { Save, Store } from 'lucide-react'
import { loadMyVerifiedBusinesses, saveMyBusinessProfile } from '../lib/data'
import type { Business } from '../types'

function text(value?: string | null) {
  return value || ''
}

function nextMissing(business?: Business | null) {
  if (!business) return []
  const missing: string[] = []
  if (!business.phone) missing.push('phone')
  if (!business.website) missing.push('website')
  if (!business.whatsapp) missing.push('WhatsApp')
  if (!business.opening_hours) missing.push('opening hours')
  if (!business.description) missing.push('description')
  if (!business.photo_url) missing.push('photo/logo')
  return missing
}

export default function OwnerBusinessProfile() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [status, setStatus] = useState('Loading verified businesses…')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    phone: '',
    website: '',
    whatsapp: '',
    email: '',
    opening_hours: '',
    photo_url: '',
  })

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    try {
      const rows = await loadMyVerifiedBusinesses()
      setBusinesses(rows)
      const selected = rows.find(b => b.id === businessId) || rows[0]
      if (selected) {
        setBusinessId(selected.id)
        fillForm(selected)
        setStatus('')
      } else {
        setStatus('No verified business yet. Claim and verify a listing first, then complete the profile here.')
      }
    } catch {
      setStatus('Could not load verified businesses.')
    }
  }

  function fillForm(business: Business) {
    setForm({
      name: text(business.name),
      category: text(business.category),
      description: text(business.description),
      address: text(business.address),
      phone: text(business.phone),
      website: text(business.website),
      whatsapp: text(business.whatsapp),
      email: text(business.email),
      opening_hours: text(business.opening_hours),
      photo_url: text(business.photo_url),
    })
  }

  const selectedBusiness = useMemo(() => businesses.find(b => b.id === businessId) || null, [businesses, businessId])
  const missing = nextMissing(selectedBusiness)

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function save() {
    if (!businessId) return
    try {
      setSaving(true)
      setStatus('Saving business profile…')
      const updated = await saveMyBusinessProfile({ business_id: businessId, ...form })
      setBusinesses(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b))
      fillForm(updated)
      setStatus('Business profile saved. Owner-updated fields are now protected from future imports.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save business profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="privacy-card business-owner-card">
      <h2><Store size={20} /> Verified business profile</h2>
      <p className="muted">Complete missing phone, website, WhatsApp, opening hours, description and photo after verification. These details will appear on the map listing.</p>

      {businesses.length > 0 && <>
        <label>Business
          <select value={businessId} onChange={e => {
            const nextId = e.target.value
            setBusinessId(nextId)
            const selected = businesses.find(b => b.id === nextId)
            if (selected) fillForm(selected)
          }}>
            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>

        {missing.length > 0 && <p className="trust">Still missing: {missing.join(', ')}.</p>}

        <label>Business name
          <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Business name" maxLength={120} />
        </label>

        <label>Category
          <input value={form.category} onChange={e => update('category', e.target.value)} placeholder="restaurant, grocery, salon, repair, charity…" maxLength={80} />
        </label>

        <label>Description
          <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Short description of what this business offers locally…" maxLength={500} />
        </label>

        <label>Address
          <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Street address and postcode" maxLength={240} />
        </label>

        <label>Phone
          <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="Business phone number" maxLength={50} />
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

        <label>Photo or logo URL
          <input value={form.photo_url} onChange={e => update('photo_url', e.target.value)} placeholder="https://…" maxLength={500} />
        </label>

        <button onClick={save} disabled={saving}><Save size={17} /> {saving ? 'Saving…' : 'Save business profile'}</button>
      </>}

      {status && <p className="form-status">{status}</p>}
    </div>
  )
}
