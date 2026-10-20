import type { Post } from '../types'

export type HiPulseBusiness = {
  id: string
  category?: string
}

export type HiPulseSnapshot = {
  score: number
  label: 'Quiet' | 'Emerging' | 'Active' | 'Vibrant'
  strongestSignal: 'map' | 'offers' | 'jobs' | 'community'
  counts: {
    offers: number
    jobs: number
    community: number
    businesses: number
    categories: number
  }
  factors: Array<{
    id: 'activity' | 'diversity' | 'coverage' | 'balance'
    label: string
    value: number
    points: number
    maxPoints: number
  }>
  headline: string
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function scoreLabel(score: number): HiPulseSnapshot['label'] {
  if (score >= 75) return 'Vibrant'
  if (score >= 50) return 'Active'
  if (score >= 25) return 'Emerging'
  return 'Quiet'
}

export function buildHiPulseSnapshot(posts: Post[], businesses: HiPulseBusiness[], now = Date.now()): HiPulseSnapshot {
  const live = posts.filter(post => post.status === 'live'
    && Date.parse(post.expires_at) > now
    && (!post.starts_at || Date.parse(post.starts_at) <= now))
  const offers = live.filter(post => post.type === 'offer').length
  const jobs = live.filter(post => post.type === 'job').length
  const community = live.filter(post => post.type === 'community' || post.type === 'free_meal').length
  const categories = new Set(
    businesses
      .map(business => (business.category || '').trim().toLowerCase())
      .filter(Boolean),
  ).size

  // HiPulse is deliberately transparent. It is a product signal, not a statistical
  // claim about the borough. Each factor is capped so one data type cannot dominate.
  const activityPoints = clamp((offers * 3) + (jobs * 4) + (community * 4), 0, 40)
  const diversityPoints = clamp(categories * 2, 0, 20)
  const coveragePoints = businesses.length === 0
    ? 0
    : clamp(Math.round(Math.log2(businesses.length + 1) * 4), 0, 20)
  const activeSignalTypes = [offers > 0, jobs > 0, community > 0].filter(Boolean).length
  const balancePoints = activeSignalTypes === 3 ? 20 : activeSignalTypes === 2 ? 13 : activeSignalTypes === 1 ? 6 : 0

  const score = clamp(Math.round(activityPoints + diversityPoints + coveragePoints + balancePoints), 0, 100)
  const label = scoreLabel(score)
  let strongestSignal: HiPulseSnapshot['strongestSignal'] = 'map'
  let headline = 'Local activity is still building.'
  if (jobs > offers && jobs >= community) {
    headline = 'Hiring has the most live posts in this snapshot.'
    strongestSignal = 'jobs'
  } else if (community > offers && community >= jobs) {
    headline = 'Community support has the most live posts in this snapshot.'
    strongestSignal = 'community'
  } else if (offers > 0) {
    headline = 'Local offers have the most live posts in this snapshot.'
    strongestSignal = 'offers'
  } else if (businesses.length > 0) headline = 'Map listings are available; no live posts in this snapshot.'

  return {
    score,
    label,
    strongestSignal,
    counts: {
      offers,
      jobs,
      community,
      businesses: businesses.length,
      categories,
    },
    factors: [
      { id: 'activity', label: 'Live activity', value: offers + jobs + community, points: activityPoints, maxPoints: 40 },
      { id: 'diversity', label: 'Business diversity', value: categories, points: diversityPoints, maxPoints: 20 },
      { id: 'coverage', label: 'Map coverage', value: businesses.length, points: coveragePoints, maxPoints: 20 },
      { id: 'balance', label: 'Signal balance', value: activeSignalTypes, points: balancePoints, maxPoints: 20 },
    ],
    headline,
  }
}
