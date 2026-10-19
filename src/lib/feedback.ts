export const feedbackFeatures = ['Business listings and map', 'Offers', 'Jobs', 'Community support', 'Ask HiStreets AI', 'Business Copilot', 'Business workspace', 'Other'] as const

export type UserFeedback = {
  id: string
  name: string
  email: string
  organisation: string
  role: string
  started_on: string | null
  features_used: string[]
  experience: string
  improvements: string
  planned_use: string
  quote_consent: boolean
  created_at?: string
}

export function feedbackFromForm(form: HTMLFormElement, id: string): UserFeedback {
  const data = new FormData(form)
  const value = (key: string) => String(data.get(key) || '').trim()
  return {
    id, name: value('name'), email: value('email').toLowerCase(),
    organisation: value('organisation'), role: value('role'), started_on: value('started_on') || null,
    features_used: data.getAll('features_used').map(String), experience: value('experience'),
    improvements: value('improvements'), planned_use: value('planned_use'),
    quote_consent: data.get('quote_consent') === 'on',
  }
}

export function feedbackText(item: UserFeedback): string {
  return [
    'HiStreets user feedback', `Name: ${item.name}`, `Email supplied: ${item.email}`,
    `Organisation: ${item.organisation || 'Not provided'}`, `Role: ${item.role || 'Not provided'}`,
    `Started using: ${item.started_on || 'Not provided'}`,
    `Features used: ${item.features_used.join(', ') || 'None selected'}`,
    '', 'Experience:', item.experience, '', 'Suggested improvements:', item.improvements || 'Not provided',
    '', 'Future plans:', item.planned_use || 'Not provided', '',
    `Permission to quote with name and organisation: ${item.quote_consent ? 'Yes' : 'No'}`,
    ...(item.created_at ? [`Submitted: ${new Date(item.created_at).toISOString()}`] : []),
    `Reference: ${item.id}`,
  ].join('\n')
}
