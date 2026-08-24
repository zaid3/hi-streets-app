import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSmartSearchSuggestions } from '../src/lib/smartSearch'

const businesses = [
  { id: '1', name: 'Green Street Pharmacy', category: 'pharmacy', address: 'Green Street, E7' },
  { id: '2', name: 'Royal Halal Grill', category: 'restaurant', address: 'Romford Road, E7' },
  { id: '3', name: 'Newham Phone Shop', category: 'mobile phone shop', address: 'Barking Road, E6' },
]

test('empty smart search returns useful category shortcuts', () => {
  const suggestions = buildSmartSearchSuggestions('', businesses)
  assert.equal(suggestions.length, 6)
  assert.equal(suggestions[0].title, 'Restaurants & takeaway')
})

test('natural language health query returns health intent and nearby option', () => {
  const suggestions = buildSmartSearchSuggestions('I need a pharmacy near me', businesses)
  assert.ok(suggestions.some(item => item.kind === 'category' && item.query === 'health'))
  assert.ok(suggestions.some(item => item.kind === 'location'))
  assert.ok(suggestions.some(item => item.kind === 'business' && item.title === 'Green Street Pharmacy'))
})

test('job and offer language routes to the correct feeds', () => {
  assert.equal(buildSmartSearchSuggestions('any jobs hiring?', businesses)[0]?.tab, 'jobs')
  assert.equal(buildSmartSearchSuggestions('show me local deals', businesses)[0]?.tab, 'offers')
})

test('postcode suggestions normalise full and outward postcodes', () => {
  const full = buildSmartSearchSuggestions('e7 8le', businesses)
  assert.equal(full[0]?.kind, 'postcode')
  assert.equal(full[0]?.query, 'E7 8LE')

  const outcode = buildSmartSearchSuggestions('e7', businesses)
  assert.equal(outcode[0]?.kind, 'postcode')
  assert.equal(outcode[0]?.query, 'E7')
})

test('business ranking prefers exact local matches', () => {
  const suggestions = buildSmartSearchSuggestions('green street pharmacy', businesses)
  const business = suggestions.find(item => item.kind === 'business')
  assert.equal(business?.title, 'Green Street Pharmacy')
})

test('halal query does not label every restaurant as halal', () => {
  const suggestions = buildSmartSearchSuggestions('halal', businesses)
  const businessTitles = suggestions.filter(item => item.kind === 'business').map(item => item.title)
  assert.deepEqual(businessTitles, ['Royal Halal Grill'])
  assert.equal(suggestions.some(item => item.kind === 'category'), false)
})
