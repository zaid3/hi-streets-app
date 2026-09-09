export const BUSINESS_CATEGORIES = [
  'Food & drink',
  'Grocery & convenience',
  'Retail',
  'Beauty & barber',
  'Health & pharmacy',
  'Professional services',
  'Vehicle & repair',
  'Home & local services',
  'Education & training',
  'Charity & community',
  'Other local business',
] as const

export function businessCategoryOptions(current?: string | null) {
  const value = String(current || '').trim()
  return value && !BUSINESS_CATEGORIES.includes(value as (typeof BUSINESS_CATEGORIES)[number])
    ? [value, ...BUSINESS_CATEGORIES]
    : [...BUSINESS_CATEGORIES]
}
