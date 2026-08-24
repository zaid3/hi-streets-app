import assert from 'node:assert/strict'
import test from 'node:test'
import { buildHiPulseSnapshot } from '../src/lib/hiPulse'
import type { Post } from '../src/types'

function post(id: string, type: Post['type'], status: Post['status'] = 'live'): Post {
  return {
    id,
    type,
    title: `${type} ${id}`,
    body: 'Test signal',
    expires_at: '2099-01-01T00:00:00Z',
    status,
    source: 'web',
  }
}

test('HiPulse is zero and transparent when no live data exists', () => {
  const snapshot = buildHiPulseSnapshot([], [])
  assert.equal(snapshot.score, 0)
  assert.equal(snapshot.label, 'Quiet')
  assert.equal(snapshot.confidence, 'Early')
  assert.deepEqual(snapshot.counts, { offers: 0, jobs: 0, community: 0, businesses: 0, categories: 0 })
  assert.equal(snapshot.factors.reduce((sum, factor) => sum + factor.points, 0), snapshot.score)
})

test('HiPulse counts only live public signals', () => {
  const snapshot = buildHiPulseSnapshot([
    post('1', 'offer'),
    post('2', 'job'),
    post('3', 'community'),
    post('4', 'free_meal'),
    post('5', 'offer', 'pending'),
  ], [
    { id: 'b1', category: 'Restaurant' },
    { id: 'b2', category: 'Pharmacy' },
  ])

  assert.equal(snapshot.counts.offers, 1)
  assert.equal(snapshot.counts.jobs, 1)
  assert.equal(snapshot.counts.community, 2)
  assert.equal(snapshot.counts.categories, 2)
  assert.ok(snapshot.score > 0)
})

test('HiPulse rewards balanced opportunity, support and commerce without exceeding 100', () => {
  const posts: Post[] = []
  for (let index = 0; index < 12; index += 1) posts.push(post(`offer-${index}`, 'offer'))
  for (let index = 0; index < 12; index += 1) posts.push(post(`job-${index}`, 'job'))
  for (let index = 0; index < 12; index += 1) posts.push(post(`community-${index}`, 'community'))
  const businesses = Array.from({ length: 40 }, (_, index) => ({ id: `b-${index}`, category: `category-${index % 12}` }))

  const snapshot = buildHiPulseSnapshot(posts, businesses)
  assert.equal(snapshot.score, 100)
  assert.equal(snapshot.label, 'Vibrant')
  assert.equal(snapshot.confidence, 'Strong')
  assert.equal(snapshot.factors.find(factor => factor.id === 'balance')?.points, 20)
})
