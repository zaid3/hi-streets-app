import { expect, test, type Page } from '@playwright/test'

const testEmail = 'signup-test@example.com'
const pendingUser = { id: '11111111-1111-4111-8111-111111111111', email: testEmail, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, identities: [] }

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ json: [] }))
})

async function fillSignup(page: Page) {
  await page.goto('/business')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await page.getByLabel('Email address', { exact: true }).fill(testEmail)
  await page.getByLabel('Password', { exact: true }).fill('Test phrase with 12 characters')
  await page.getByLabel('Confirm password', { exact: true }).fill('Test phrase with 12 characters')
  await page.getByRole('checkbox').check()
}

test('signup moves to confirmation, prevents duplicates and resends after the countdown', async ({ page }) => {
  let signups = 0
  let resends = 0
  await page.route('**/auth/v1/signup**', async route => {
    signups++
    await route.fulfill({ json: pendingUser })
  })
  await page.route('**/auth/v1/resend**', async route => {
    resends++
    expect(route.request().postDataJSON()).toMatchObject({ type: 'signup', email: testEmail })
    expect(route.request().url()).toContain('redirect_to=')
    await route.fulfill({ json: {} })
  })
  await fillSignup(page)
  await page.clock.install()
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Resend available in/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toHaveCount(0)
  await page.clock.fastForward(61_000)
  await page.getByRole('button', { name: 'Resend confirmation email', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('If this account is awaiting confirmation')
  expect(signups).toBe(1)
  expect(resends).toBe(1)
  await page.screenshot({ path: 'test-results/signup-confirmation-mobile.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Resend confirmation email', exact: true })).toBeDisabled()
  await page.clock.fastForward(61_000)
  await expect(page.getByRole('button', { name: 'Resend confirmation email', exact: true })).toBeEnabled()
})

test('rate limits explain the delay and Enter cannot bypass the cooldown', async ({ page }) => {
  let signups = 0
  await page.route('**/auth/v1/signup**', async route => {
    signups++
    await route.fulfill({ status: 429, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' }, json: { code: 'over_email_send_rate_limit', msg: 'For security purposes, you can only request this after 43 seconds.' } })
  })
  await fillSignup(page)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Too many email requests')
  await expect(page.getByText(/You can request another email in 4\ds/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeDisabled()
  await page.getByLabel('Confirm password', { exact: true }).press('Enter')
  await expect(page.getByRole('status')).toContainText('Please wait')
  expect(signups).toBe(1)
})

test('unconfirmed sign-in opens email verification instead of saying the password is wrong', async ({ page }) => {
  await page.route('**/auth/v1/token**', route => route.fulfill({ status: 400, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' }, json: { code: 'email_not_confirmed', msg: 'Email not confirmed' } }))
  await page.goto('/business')
  await page.getByLabel('Email address', { exact: true }).fill(testEmail)
  await page.getByLabel('Password', { exact: true }).fill('Test phrase with 12 characters')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Please confirm your email')
  await expect(page.getByRole('button', { name: 'Resend confirmation email', exact: true })).toBeEnabled()
})

test('a rejected password keeps signup editable and shows the actual password requirement', async ({ page }) => {
  await page.route('**/auth/v1/signup**', route => route.fulfill({ status: 422, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' }, json: { code: 'weak_password', msg: 'Password is too common. Choose a different password.' } }))
  await fillSignup(page)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Password is too common')
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeEnabled()
})
