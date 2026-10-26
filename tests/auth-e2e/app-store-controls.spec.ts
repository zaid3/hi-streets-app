import { expect, test, type Page } from '@playwright/test'

const userId = '11111111-1111-4111-8111-111111111111'
const businessId = '22222222-2222-4222-8222-222222222222'
const user = { id: userId, email: 'ios-test@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' }
const received = { requested_at: '2026-10-26T12:00:00Z' }

test.beforeEach(async ({ page }) => {
  // Every HTTPS request is intercepted: no account changes, messages or live AI.
  await page.route('https://**/*', route => route.fulfill({ json: [] }))
  await page.route('**/rest/v1/rpc/*_geojson', route => route.fulfill({ json: { type: 'FeatureCollection', features: [] } }))
  await page.route('https://tiles.openfreemap.org/styles/positron', route => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#f5f3eb' } }] } }))
})

async function signInFixture(page: Page) {
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userId, exp: 4102444800, aud: 'authenticated', role: 'authenticated' })).toString('base64url')}.fixture`
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('sb-histreets-auth-test-auth-token', JSON.stringify({ access_token: token, refresh_token: 'fixture', token_type: 'bearer', expires_at: 4102444800, user }))
  }, { token, user })
  await page.route('**/auth/v1/user', route => route.fulfill({ json: user }))
  await page.route('**/rest/v1/profiles?**', route => route.fulfill({ json: { role: 'user' } }))
  await page.route('**/rest/v1/rpc/my_business_workspace_ids', route => route.fulfill({ json: [{ business_id: businessId, role: 'owner' }] }))
  await page.route('**/rest/v1/businesses?**', route => route.fulfill({ json: [{ id: businessId, name: 'Test business', category: 'cafe', lat: 51.537, lng: 0.0325, verification_status: 'verified', source: 'owner' }] }))
  await page.route('**/rest/v1/rpc/business_dashboard_overview', route => route.fulfill({ json: { business_name: 'Test business', listing_views: 0, action_clicks: 0, applications: 0, profile_completeness: 100, live_posts: 0, team_members: 1, pending_posts: 0, content_views: 0 } }))
  await page.goto('/business')
  await expect(page.getByRole('heading', { name: 'Your HiStreets business', exact: true })).toBeVisible()
}

test('deletion needs confirmation, retries safely and shows its saved state after reload', async ({ page }, testInfo) => {
  let writes = 0
  let saved = false
  await page.route('**/rest/v1/account_deletion_requests?**', async route => {
    if (route.request().method() === 'POST') {
      writes++
      expect(route.request().postDataJSON()).toEqual({ user_id: userId })
      if (writes === 1) return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
      saved = true
      return route.fulfill({ status: 201, json: received })
    }
    return route.fulfill({ json: saved ? received : null })
  })
  await signInFixture(page)
  await page.getByRole('button', { name: 'Delete account and associated data', exact: true }).click()
  await page.getByRole('button', { name: 'Keep my account', exact: true }).click()
  expect(writes).toBe(0)
  await page.getByRole('button', { name: 'Delete account and associated data', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm deletion request', exact: true }).click()
  await expect(page.locator('.account-deletion').getByRole('alert')).toContainText('could not be confirmed')
  await page.getByRole('button', { name: 'Confirm deletion request', exact: true }).click()
  await expect(page.locator('.account-deletion').getByRole('status')).toContainText('Account deletion requested')
  await expect(page.locator('.account-deletion').getByRole('status')).toContainText('30 days')
  expect(writes).toBe(2)
  await page.reload()
  await expect(page.locator('.account-deletion').getByRole('status')).toContainText('Account deletion requested')
  await page.locator('.account-deletion').getByRole('status').scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('deletion-request.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('resident AI stays private until consent and declining leaves the map usable', async ({ page }, testInfo) => {
  let requests = 0
  // Location onboarding is tested separately; keep consent checks independent of WebGL.
  await page.addInitScript(() => sessionStorage.setItem('histreets_location_prompted_v1', '1'))
  await page.route('**/functions/v1/histreets-ai', async route => {
    requests++
    expect(route.request().postDataJSON()).toEqual({ mode: 'resident', prompt: 'find a cafe' })
    await route.fulfill({ json: { answer: 'Fixture answer.', posts: [], businesses: [] } })
  })
  await page.goto('/map')
  const search = page.getByRole('combobox', { name: 'Search businesses, services, offers, jobs or postcode' })
  await search.fill('find a cafe')
  await page.getByRole('button', { name: /Ask HiStreets AI/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Ask HiStreets', exact: true })
  await expect(dialog.getByRole('button', { name: 'Ask with AI', exact: true })).toBeDisabled()
  expect(requests).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('ai-permission.png') })
  await dialog.getByRole('button', { name: 'Keep using the map' }).click()
  await expect(dialog).toHaveCount(0)
  expect(requests).toBe(0)
  await search.focus()
  await page.getByRole('button', { name: /Ask HiStreets AI/ }).click()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Ask with AI', exact: true }).click()
  await expect(dialog).toContainText('Fixture answer.')
  expect(requests).toBe(1)
  await dialog.getByRole('button', { name: 'Close Ask HiStreets' }).click()
  await search.focus()
  await page.getByRole('button', { name: /Ask HiStreets AI/ }).click()
  await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  expect(requests).toBe(1)
})

test('Escape closes an AI report without losing the answer or making another request', async ({ page }) => {
  let requests = 0
  await page.addInitScript(() => sessionStorage.setItem('histreets_location_prompted_v1', '1'))
  await page.route('**/functions/v1/histreets-ai', async route => {
    requests++
    await route.fulfill({ json: { answer: 'Keep this answer visible.', posts: [], businesses: [] } })
  })
  await page.goto('/map')
  await page.getByRole('combobox', { name: 'Search businesses, services, offers, jobs or postcode' }).fill('find a cafe')
  await page.getByRole('button', { name: /Ask HiStreets AI/ }).click()
  const aiDialog = page.getByRole('dialog', { name: 'Ask HiStreets', exact: true })
  await aiDialog.getByRole('checkbox').check()
  await aiDialog.getByRole('button', { name: 'Ask with AI', exact: true }).click()
  await expect(aiDialog).toContainText('Keep this answer visible.')
  await aiDialog.getByRole('button', { name: 'Report AI response', exact: true }).click()
  const reportDialog = page.getByRole('dialog', { name: 'Report AI response', exact: true })
  await expect(reportDialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(reportDialog).toHaveCount(0)
  await expect(aiDialog).toBeVisible()
  await expect(aiDialog).toContainText('Keep this answer visible.')
  await expect(aiDialog.getByRole('button', { name: 'Report AI response', exact: true })).toBeFocused()
  expect(requests).toBe(1)
  await page.keyboard.press('Escape')
  await expect(aiDialog).toHaveCount(0)
  expect(requests).toBe(1)
})

test('business drafting requires separate consent while manual posting remains available', async ({ page }) => {
  let requests = 0
  await page.route('**/rest/v1/account_deletion_requests?**', route => route.fulfill({ json: null }))
  await page.route('**/functions/v1/histreets-ai', async route => {
    requests++
    expect(route.request().postDataJSON()).toMatchObject({ mode: 'business_draft', business_id: businessId })
    await route.fulfill({ json: { draft: { type: 'offer', title: 'Fixture draft', body: 'Test content', category: 'Local offer', expiry_days: 7, recurrence: '', missing_fields: [] } } })
  })
  await signInFixture(page)
  await page.getByRole('button', { name: 'Content', exact: true }).click()
  await page.getByRole('button', { name: 'Post offer', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Post an offer', exact: true })
  await expect(dialog.getByRole('button', { name: 'Create draft with AI', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('combobox', { name: 'Post type', exact: true })).toBeEnabled()
  await dialog.getByPlaceholder('Tell HiStreets what you want to post…').fill('Tea costs £2 today')
  expect(requests).toBe(0)
  await dialog.getByRole('checkbox', { name: /share my instructions/ }).check()
  await dialog.getByRole('button', { name: 'Create draft with AI', exact: true }).click()
  await expect(dialog).toContainText('Fixture draft')
  expect(requests).toBe(1)
})
