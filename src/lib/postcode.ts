const POSTCODES_IO_BASE = 'https://api.postcodes.io'
export const NEWHAM_ADMIN_DISTRICT_CODE = 'E09000025'

type JsonRecord = Record<string, any>

export type PostcodeLookup = {
  ok: boolean
  status: number
  result: JsonRecord | null
}

export function normalisePostcodeInput(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function looksLikeFullPostcode(value: string) {
  const compact = normalisePostcodeInput(value)
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact)
}

export function looksLikeOutcode(value: string) {
  const trimmed = value.trim()
  if (/\s/.test(trimmed)) return false
  const compact = normalisePostcodeInput(trimmed)
  return /^[A-Z]{1,2}\d[A-Z\d]?$/.test(compact)
}

export function postcodePoint(result: JsonRecord | null | undefined) {
  if (result?.latitude == null || result?.longitude == null) return null
  const lat = Number(result.latitude)
  const lng = Number(result.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

export function fullPostcodeIsInNewham(result: JsonRecord | null | undefined) {
  const districtCode = String(result?.codes?.admin_district || '').trim().toUpperCase()
  const districtName = String(result?.admin_district || '').trim().toLowerCase()
  return districtCode === NEWHAM_ADMIN_DISTRICT_CODE || districtName === 'newham'
}

export function outcodeCoversNewham(result: JsonRecord | null | undefined) {
  const districts = Array.isArray(result?.admin_district)
    ? result.admin_district.map((value: unknown) => String(value).trim().toLowerCase())
    : []
  return districts.includes('newham')
}

async function lookup(path: string, fetchImpl: typeof fetch = fetch, timeoutMs = 9000): Promise<PostcodeLookup> {
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(`${POSTCODES_IO_BASE}/${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    let body: JsonRecord = {}
    try {
      body = await response.json()
    } catch {}
    return {
      ok: response.ok,
      status: response.status,
      result: body?.result && typeof body.result === 'object' ? body.result : null,
    }
  } finally {
    globalThis.clearTimeout(timer)
  }
}

export function lookupFullPostcode(value: string, fetchImpl: typeof fetch = fetch, timeoutMs = 9000) {
  const compact = normalisePostcodeInput(value)
  return lookup(`postcodes/${encodeURIComponent(compact)}`, fetchImpl, timeoutMs)
}

export function lookupOutcode(value: string, fetchImpl: typeof fetch = fetch, timeoutMs = 9000) {
  const compact = normalisePostcodeInput(value)
  return lookup(`outcodes/${encodeURIComponent(compact)}`, fetchImpl, timeoutMs)
}
