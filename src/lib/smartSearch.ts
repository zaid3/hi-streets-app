import { looksLikeFullPostcode, looksLikeOutcode, normalisePostcodeInput } from './postcode'

export type SmartSearchTab = 'offers' | 'jobs' | 'community'
export type SmartSearchKind = 'business' | 'postcode' | 'category' | 'navigate' | 'location'

export type SmartSearchBusiness = {
  id: string
  name: string
  category?: string
  address?: string
}

export type SmartSearchSuggestion = {
  id: string
  kind: SmartSearchKind
  title: string
  subtitle: string
  query?: string
  tab?: SmartSearchTab
  businessId?: string
}

export const quickSmartSearches: SmartSearchSuggestion[] = [
  { id: 'quick-food', kind: 'category', title: 'Restaurants & takeaway', subtitle: 'Food and drink across Newham', query: 'food' },
  { id: 'quick-grocery', kind: 'category', title: 'Grocery & convenience', subtitle: 'Supermarkets and local shops', query: 'grocery' },
  { id: 'quick-beauty', kind: 'category', title: 'Beauty & barbers', subtitle: 'Hair, nails, salons and barbers', query: 'beauty' },
  { id: 'quick-health', kind: 'category', title: 'Health & pharmacy', subtitle: 'Pharmacy, dental and local health', query: 'health' },
  { id: 'quick-shops', kind: 'category', title: 'Retail shops', subtitle: 'Local shopping in Newham', query: 'shop' },
  { id: 'quick-services', kind: 'category', title: 'Local services', subtitle: 'Repairs, mechanics and more', query: 'service' },
]

const categoryRules: Array<{ words: RegExp; title: string; subtitle: string; query: string }> = [
  { words: /\b(food|eat|eating|restaurant|takeaway|coffee|cafe|pizza|kebab|burger|bakery|breakfast|lunch|dinner)\b/i, title: 'Restaurants & takeaway', subtitle: 'Smart match for food and drink', query: 'food' },
  { words: /\b(grocery|groceries|supermarket|convenience|butcher|market)\b/i, title: 'Grocery & convenience', subtitle: 'Smart match for groceries', query: 'grocery' },
  { words: /\b(barber|haircut|hair|beauty|nails?|salon|spa)\b/i, title: 'Beauty & barbers', subtitle: 'Smart match for beauty services', query: 'beauty' },
  { words: /\b(pharmacy|chemist|dentist|dental|doctor|clinic|health|medical|physio|optician)\b/i, title: 'Health & pharmacy', subtitle: 'Smart match for health services', query: 'health' },
  { words: /\b(accountant|accounting|tax|solicitor|lawyer|legal|immigration|estate agent|payroll)\b/i, title: 'Professional services', subtitle: 'Smart match for professional help', query: 'professional' },
  { words: /\b(mechanic|garage|mot|repair|laundry|printing|plumber|electrician|courier|car wash)\b/i, title: 'Local services', subtitle: 'Smart match for repairs and services', query: 'service' },
  { words: /\b(shop|shopping|retail|clothes|fashion|mobile|phone|electronics|furniture|jewellery|hardware)\b/i, title: 'Retail shops', subtitle: 'Smart match for local shopping', query: 'shop' },
]

const navigationRules: Array<{ words: RegExp; title: string; subtitle: string; tab: SmartSearchTab }> = [
  { words: /\b(job|jobs|work|vacancy|vacancies|hiring|employment|career)\b/i, title: 'Jobs in Newham', subtitle: 'Open the local jobs feed', tab: 'jobs' },
  { words: /\b(offer|offers|deal|deals|discount|discounts|sale|promotion|promotions)\b/i, title: 'Offers near you', subtitle: 'Open live local offers', tab: 'offers' },
  { words: /\b(free meal|free meals|food bank|community help|community support|support near me)\b/i, title: 'Community support', subtitle: 'Free meals and community help', tab: 'community' },
]

function clean(value: string | undefined) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function formattedPostcode(value: string) {
  const compact = normalisePostcodeInput(value)
  if (looksLikeFullPostcode(value) && compact.length > 3) return `${compact.slice(0, -3)} ${compact.slice(-3)}`
  return compact
}

function businessScore(query: string, business: SmartSearchBusiness) {
  const q = clean(query)
  if (!q) return 0
  const name = clean(business.name)
  const category = clean(business.category)
  const address = clean(business.address)
  const tokens = q.split(' ').filter(token => token.length > 1)

  let score = 0
  if (name === q) score += 160
  if (name.startsWith(q)) score += 120
  if (name.includes(q)) score += 90
  if (category.includes(q)) score += 55
  if (address.includes(q)) score += 45

  for (const token of tokens) {
    if (name.startsWith(token)) score += 24
    else if (name.includes(token)) score += 18
    if (category.includes(token)) score += 10
    if (address.includes(token)) score += 8
  }

  return score
}

export function buildSmartSearchSuggestions(query: string, businesses: SmartSearchBusiness[]): SmartSearchSuggestion[] {
  const trimmed = query.trim()
  if (!trimmed) return quickSmartSearches.slice(0, 6)

  const suggestions: SmartSearchSuggestion[] = []
  const postcode = formattedPostcode(trimmed)

  if (looksLikeFullPostcode(trimmed) || looksLikeOutcode(trimmed)) {
    suggestions.push({
      id: `postcode-${postcode.replace(/\s/g, '')}`,
      kind: 'postcode',
      title: `Search ${postcode}`,
      subtitle: looksLikeFullPostcode(trimmed) ? 'Go to this Newham postcode' : 'Search this Newham postcode area',
      query: postcode,
    })
  }

  for (const rule of navigationRules) {
    if (rule.words.test(trimmed)) {
      suggestions.push({ id: `nav-${rule.tab}`, kind: 'navigate', title: rule.title, subtitle: rule.subtitle, tab: rule.tab })
    }
  }

  if (/\b(near me|my location|nearby|closest)\b/i.test(trimmed)) {
    suggestions.push({ id: 'use-location', kind: 'location', title: 'Use my location', subtitle: 'Show the closest places in Newham' })
  }

  for (const rule of categoryRules) {
    if (rule.words.test(trimmed)) {
      suggestions.push({ id: `category-${rule.query}`, kind: 'category', title: rule.title, subtitle: rule.subtitle, query: rule.query })
      break
    }
  }

  const businessMatches = businesses
    .map(business => ({ business, score: businessScore(trimmed, business) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.business.name.localeCompare(b.business.name))
    .slice(0, 5)

  for (const { business } of businessMatches) {
    suggestions.push({
      id: `business-${business.id}`,
      kind: 'business',
      title: business.name,
      subtitle: [business.category, business.address].filter(Boolean).join(' · ') || 'Local business in Newham',
      query: business.name,
      businessId: business.id,
    })
  }

  const seen = new Set<string>()
  return suggestions.filter(item => {
    const key = `${item.kind}:${item.title.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 7)
}
