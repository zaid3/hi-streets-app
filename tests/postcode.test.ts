import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fullPostcodeIsInNewham,
  looksLikeFullPostcode,
  looksLikeOutcode,
  lookupFullPostcode,
  lookupOutcode,
  normalisePostcodeInput,
  outcodeCoversNewham,
  postcodePoint,
} from '../src/lib/postcode'

test('Newham postcode input accepts spaced and compact forms', () => {
  assert.equal(normalisePostcodeInput(' e7 8le '), 'E78LE')
  assert.equal(normalisePostcodeInput('E16 1XL'), 'E161XL')
  assert.equal(looksLikeFullPostcode('E7 8LE'), true)
  assert.equal(looksLikeFullPostcode('e78le'), true)
  assert.equal(looksLikeFullPostcode('E16 1XL'), true)
  assert.equal(looksLikeOutcode('E7'), true)
  assert.equal(looksLikeOutcode('e16'), true)
  assert.equal(looksLikeOutcode('E7 8'), false)
})

test('full postcode validation accepts Newham by official GSS code or district name', () => {
  assert.equal(fullPostcodeIsInNewham({ admin_district: 'Newham', codes: { admin_district: 'E09000025' } }), true)
  assert.equal(fullPostcodeIsInNewham({ admin_district: 'Newham' }), true)
  assert.equal(fullPostcodeIsInNewham({ admin_district: 'Westminster', codes: { admin_district: 'E09000033' } }), false)
})

test('outward code validation accepts only areas that include Newham', () => {
  assert.equal(outcodeCoversNewham({ admin_district: ['Newham'] }), true)
  assert.equal(outcodeCoversNewham({ admin_district: ['Tower Hamlets', 'Newham'] }), true)
  assert.equal(outcodeCoversNewham({ admin_district: ['Westminster'] }), false)
  assert.equal(outcodeCoversNewham({ admin_district: null }), false)
})

test('postcode coordinates reject incomplete or invalid API data', () => {
  assert.deepEqual(postcodePoint({ latitude: 51.537, longitude: 0.0325 }), { lat: 51.537, lng: 0.0325 })
  assert.equal(postcodePoint({ latitude: null, longitude: null }), null)
  assert.equal(postcodePoint({ latitude: 'not-a-number', longitude: 0.03 }), null)
})

test('full postcode lookup normalises the URL and returns parsed result', async () => {
  let seen = ''
  const fakeFetch = (async (input: RequestInfo | URL) => {
    seen = String(input)
    return new Response(JSON.stringify({
      status: 200,
      result: {
        postcode: 'E7 8LE',
        latitude: 51.54,
        longitude: 0.03,
        admin_district: 'Newham',
        codes: { admin_district: 'E09000025' },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch

  const lookup = await lookupFullPostcode('e7 8le', fakeFetch, 200)
  assert.equal(seen, 'https://api.postcodes.io/postcodes/E78LE')
  assert.equal(lookup.ok, true)
  assert.equal(lookup.status, 200)
  assert.equal(lookup.result?.postcode, 'E7 8LE')
})

test('outcode lookup normalises the URL and returns aggregated district data', async () => {
  let seen = ''
  const fakeFetch = (async (input: RequestInfo | URL) => {
    seen = String(input)
    return new Response(JSON.stringify({
      status: 200,
      result: {
        outcode: 'E7',
        latitude: 51.55,
        longitude: 0.03,
        admin_district: ['Newham'],
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch

  const lookup = await lookupOutcode(' e7 ', fakeFetch, 200)
  assert.equal(seen, 'https://api.postcodes.io/outcodes/E7')
  assert.equal(lookup.ok, true)
  assert.equal(lookup.result?.outcode, 'E7')
})

test('postcode lookup aborts instead of hanging indefinitely', async () => {
  const hangingFetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })) as typeof fetch

  await assert.rejects(
    () => lookupFullPostcode('E7 8LE', hangingFetch, 10),
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  )
})
