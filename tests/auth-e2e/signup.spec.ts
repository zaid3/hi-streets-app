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

async function expectNoticeInViewport(page: Page) {
  const notice = page.getByRole('complementary', { name: 'Account notification' })
  await expect(notice).toBeInViewport({ ratio: 1 })
  const noticeBox = await notice.boundingBox()
  const navBox = await page.getByRole('navigation', { name: 'HiStreets navigation', exact: true }).boundingBox()
  expect(noticeBox).not.toBeNull()
  expect(navBox).not.toBeNull()
  expect(noticeBox!.y + noticeBox!.height).toBeLessThanOrEqual(navBox!.y)
}

async function expectStepAtTop(page: Page, name: string) {
  const heading = page.getByRole('heading', { name, exact: true })
  await expect(heading).toBeFocused()
  await expect(heading).toBeInViewport({ ratio: 1 })
  await expect.poll(() => page.locator('.profile-screen').evaluate(el => el.scrollTop)).toBe(0)
  await expect(page.locator('.auth-brand-panel')).toBeHidden()
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0)
}

test('signup moves to confirmation, prevents duplicates and resends after the countdown', async ({ page }, testInfo) => {
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
  await expectStepAtTop(page, 'Check your email')
  await expectNoticeInViewport(page)
  await expect(page.getByRole('button', { name: /Resend available in/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toHaveCount(0)
  await page.clock.fastForward(61_000)
  await page.getByRole('button', { name: 'Resend confirmation email', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('If this account is awaiting confirmation')
  expect(signups).toBe(1)
  expect(resends).toBe(1)
  await page.screenshot({ path: testInfo.outputPath('signup-confirmation.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Resend confirmation email', exact: true })).toBeDisabled()
  await page.clock.fastForward(61_000)
  await expect(page.getByRole('button', { name: 'Resend confirmation email', exact: true })).toBeEnabled()
})

test('rate limits stay onscreen while scrolling and Enter cannot bypass the cooldown', async ({ page }, testInfo) => {
  let signups = 0
  await page.route('**/auth/v1/signup**', async route => {
    signups++
    await route.fulfill({ status: 429, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' }, json: { code: 'over_email_send_rate_limit', msg: 'For security purposes, you can only request this after 43 seconds.' } })
  })
  await fillSignup(page)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Too many email requests')
  await expectNoticeInViewport(page)
  await page.screenshot({ path: testInfo.outputPath('signup-rate-limit.png'), fullPage: true })
  await page.locator('.profile-screen').evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }))
  await expectNoticeInViewport(page)
  await page.locator('.profile-screen').evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }))
  await expectNoticeInViewport(page)
  await expect(page.getByText(/You can request another email in 4\ds/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeDisabled()
  await page.getByLabel('Confirm password', { exact: true }).press('Enter')
  await expect(page.getByRole('status')).toContainText('Please wait')
  expect(signups).toBe(1)
  await page.getByRole('button', { name: 'Dismiss notification' }).click()
  await expect(page.getByRole('complementary', { name: 'Account notification' })).toHaveCount(0)
})

test('unconfirmed sign-in opens email verification instead of saying the password is wrong', async ({ page }) => {
  await page.route('**/auth/v1/token**', route => route.fulfill({ status: 400, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' }, json: { code: 'email_not_confirmed', msg: 'Email not confirmed' } }))
  await page.goto('/business')
  await page.getByLabel('Email address', { exact: true }).fill(testEmail)
  await page.getByLabel('Password', { exact: true }).fill('Test phrase with 12 characters')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expectStepAtTop(page, 'Check your email')
  await expect(page.getByRole('status')).toContainText('Please confirm your email')
  await expect(page.getByRole('button', { name: 'Resend confirmation email', exact: true })).toBeEnabled()
})

test('a rejected password keeps signup editable and shows the actual password requirement', async ({ page }) => {
  await page.route('**/auth/v1/signup**', route => route.fulfill({ status: 422, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' }, json: { code: 'weak_password', msg: 'Password is too common. Choose a different password.' } }))
  await fillSignup(page)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Password is too common')
  await expectNoticeInViewport(page)
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeEnabled()
})

test('email code opens a focused next step with visible errors and a way back', async ({ page }, testInfo) => {
  await page.route('**/auth/v1/otp**', route => route.fulfill({ json: {} }))
  await page.route('**/auth/v1/verify**', route => route.fulfill({ status: 403, json: { msg: 'Token has expired or is invalid' } }))
  await page.goto('/business')
  await page.getByLabel('Email address', { exact: true }).fill(testEmail)
  await page.getByRole('button', { name: 'Email me a sign-in code' }).click()
  await expectStepAtTop(page, 'Enter your sign-in code')
  await page.getByRole('button', { name: 'Dismiss notification' }).click()
  await expect(page.getByLabel('Email sign-in code', { exact: true })).toBeInViewport({ ratio: 1 })
  await page.screenshot({ path: testInfo.outputPath('email-code.png'), fullPage: true })
  await page.getByLabel('Email sign-in code', { exact: true }).fill('123456')
  await page.getByRole('button', { name: 'Verify code and sign in' }).click()
  await expect(page.getByRole('status')).toContainText('That code is incorrect or has expired')
  await expectNoticeInViewport(page)
  await page.getByRole('button', { name: 'Dismiss notification' }).click()
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to HiStreets', exact: true })).toBeFocused()
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(testEmail)
})

test('password reset opens a focused confirmation step', async ({ page }) => {
  await page.route('**/auth/v1/recover**', route => route.fulfill({ json: {} }))
  await page.goto('/business')
  await page.getByLabel('Email address', { exact: true }).fill(testEmail)
  await page.getByRole('button', { name: 'Forgot password?', exact: true }).click()
  await expectStepAtTop(page, 'Check your email')
  await expect(page.getByRole('status')).toContainText('a password reset link has been sent')
  await expectNoticeInViewport(page)
  await expect(page.getByRole('button', { name: /Resend available in/ })).toBeDisabled()
})

test('successful sign-in opens the workspace at the top with visible feedback', async ({ page }) => {
  const user = { ...pendingUser, email_confirmed_at: new Date().toISOString() }
  await page.route('**/auth/v1/token**', route => route.fulfill({ json: { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, user } }))
  await page.route('**/auth/v1/user', route => route.fulfill({ json: user }))
  await page.route('**/rest/v1/profiles?**', route => route.fulfill({ json: { role: 'owner' } }))
  await page.goto('/business')
  await page.getByLabel('Email address', { exact: true }).fill(testEmail)
  await page.getByLabel('Password', { exact: true }).fill('Test phrase with 12 characters')
  await page.getByRole('button', { name: 'Sign in', exact: true }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const heading = page.getByRole('heading', { name: 'Your HiStreets business', exact: true })
  await expect(heading).toBeFocused()
  await expect(heading).toBeInViewport({ ratio: 1 })
  await expect.poll(() => page.locator('.profile-screen').evaluate(el => el.scrollTop)).toBe(0)
  await expect(page.getByRole('complementary', { name: 'Account notification' }).getByRole('status')).toHaveText('Signed in.')
  await expectNoticeInViewport(page)
})
