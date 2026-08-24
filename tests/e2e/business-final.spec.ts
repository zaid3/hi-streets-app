import { expect, test } from '@playwright/test'

test.describe('HiStreets final business access', () => {
  test('business sign in is structured, mobile safe and does not force page zoom', async ({ page }) => {
    await page.goto('/business')
    await expect(page.getByRole('heading', { name: 'Sign in to HiStreets', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Email link/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Password/ })).toBeVisible()

    const email = page.getByLabel('Email address')
    await expect(email).toBeVisible()
    expect(await email.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewport).toContain('width=device-width')
    expect(viewport).not.toContain('user-scalable=no')
    expect(viewport).not.toContain('maximum-scale=1')

    await page.getByRole('button', { name: /Password/ }).click()
    const password = page.getByLabel('Password')
    await expect(password).toBeVisible()
    expect(await password.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('first-time users are guided to secure email-link access', async ({ page }) => {
    await page.goto('/business')
    await expect(page.getByText('First time here?')).toBeVisible()
    await expect(page.getByText(/No separate sign-up form is needed/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Send secure login link/ })).toBeVisible()
  })
})
