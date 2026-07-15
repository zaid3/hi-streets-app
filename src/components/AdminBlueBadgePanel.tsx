import { useEffect, useState } from 'react'
import { Accessibility, LocateFixed, Save } from 'lucide-react'
import { createBlueBadgeBay, getCurrentRole } from '../lib/data'

function coordText(value: number | '') {
  return value === '' ? '' : String(value)
}

export default function AdminBlueBadgePanel() {
  const [role, setRole] = useState<string | null>(null)
  const [lat, setLat] = useState<number | ''>('')
  const [lng, setLng] = useState<number | ''>('')
  const [road, setRoad] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCurrentRole().then(r => setRole(r || 'user'))
  }, [])

  if (role !== 'admin') return null

  function useMyLocation() {
    if (!navigator.geolocation) return setStatus('Location is not available in this browser.')
    setStatus('Finding current location…')
    navigator.geolocation.getCurrentPosition(
      position => {
        setLat(Number(position.coords.latitude.toFixed(7)))
        setLng(Number(position.coords.longitude.toFixed(7)))
        setStatus('Location added. Check it is the exact Blue Badge bay position before saving.')
      },
      () => setStatus('Could not get location. You can type latitude and longitude manually.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }

  async function save() {
    try {
      setSaving(true)
      setStatus('Saving Blue Badge bay…')
      if (lat === '' || lng === '') throw new Error('Latitude and longitude are required')
      if (!road.trim()) throw new Error('Road name is required')
      if (!file) throw new Error('Photo evidence is required')
      await createBlueBadgeBay({ lat, lng, road_name: road.trim(), notes: notes.trim(), file })
      setStatus('Blue Badge bay saved. Open the map and choose the Blue Badge filter to see it.')
      setLat('')
      setLng('')
      setRoad('')
      setNotes('')
      setFile(null)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save Blue Badge bay')
    } finally {
      setSaving(false)
    }
  }

  const disabled = saving || lat === '' || lng === '' || !road.trim() || !file

  return (
    <div className="privacy-card">
      <h2><Accessibility size={20} /> Blue Badge bay setup</h2>
      <p className="muted">Admin only. Add only real Blue Badge bays in Newham. A photo is required as evidence. Do not add normal paid bays or CPZ parking.</p>
      <button type="button" onClick={useMyLocation}><LocateFixed size={17} /> Use my current location</button>
      <label>Latitude
        <input value={coordText(lat)} onChange={e => setLat(e.target.value === '' ? '' : Number(e.target.value))} placeholder="51.5320000" inputMode="decimal" />
      </label>
      <label>Longitude
        <input value={coordText(lng)} onChange={e => setLng(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.0500000" inputMode="decimal" />
      </label>
      <label>Road name
        <input value={road} onChange={e => setRoad(e.target.value)} placeholder="e.g. High Street North" maxLength={160} />
      </label>
      <label>Evidence notes
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Side of road, nearby shop, sign wording, bay details…" maxLength={500} />
      </label>
      <label>Photo evidence
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
      </label>
      <button type="button" onClick={save} disabled={disabled}><Save size={17} /> {saving ? 'Saving…' : 'Save Blue Badge bay'}</button>
      {status && <p className="form-status">{status}</p>}
    </div>
  )
}
