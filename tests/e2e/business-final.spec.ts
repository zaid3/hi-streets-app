import { expect, test } from '@playwright/test'

test.describe('HiStreets final business access', () => {
  test('one simple sign-in page serves business owners and admins without forcing page zoom', async ({ page }) => {
    await page.goto('/business')
    await expect(page.getByRole('heading', { name: 'Sign in to HiStreets', exact: true })).toBeVisible()
    await expect(page.getByText('Use your email and password. Admins and business owners sign in here.')).toBeVisible()

    const email = page.getByLabel('Email address')
    const password = page.getByLabel('Password', { exact: true })
    await expect(email).toBeVisible()
    await expect(password).toBeVisible()
    expect(await email.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')
    expect(await password.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')

    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Email me a sign-in code/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open source on GitHub' })).toHaveAttribute('href', 'https://github.com/zaid3/hi-streets-app')
    await expect(page.getByRole('link', { name: 'HiStreets website' })).toHaveAttribute('href', 'https://histreets.uk/')

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewport).toContain('width=device-width')
    expect(viewport).not.toContain('user-scalable=no')
    expect(viewport).not.toContain('maximum-scale=1')

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('new users choose a password during account creation and can return to sign in', async ({ page }) => {
    await page.goto('/business')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
    await expect(page.getByText('New to HiStreets? Enter your email and choose a password.')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('placeholder', '12 or more characters')
    await expect(page.getByLabel('Confirm password', { exact: true })).toBeVisible()
    await expect(page.getByText(/Use 12 or more characters/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeVisible()

    await page.getByRole('button', { name: 'Back to sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in to HiStreets', exact: true })).toBeVisible()
    await expect(page.getByText(/secure numeric code/)).toBeVisible()
  })

  test('business auth can scroll fully clear of the fixed navigation', async ({ page }) => {
    await page.goto('/business')
    const shell = page.locator('.business-shell')
    const tabs = page.locator('.bottom-tabs')
    const links = page.locator('.project-links')
    await expect(shell).toBeVisible()
    await expect(tabs).toBeVisible()

    const navHeight = await tabs.evaluate(el => el.getBoundingClientRect().height)
    const style = await shell.evaluate(el => {
      const css = getComputedStyle(el)
      return {
        overflowY: css.overflowY,
        paddingBottom: Number.parseFloat(css.paddingBottom),
        scrollPaddingBottom: Number.parseFloat(css.scrollPaddingBottom),
        scrollbarWidth: css.getPropertyValue('scrollbar-width'),
      }
    })
    expect(style.overflowY).toBe('auto')
    expect(style.paddingBottom).toBeGreaterThan(navHeight + 70)
    expect(style.scrollPaddingBottom).toBeGreaterThan(navHeight + 70)
    expect(style.scrollbarWidth).toBe('none')

    await shell.evaluate(el => { (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight })
    await page.waitForTimeout(80)
    const linksBox = await links.boundingBox()
    const navBox = await tabs.boundingBox()
    expect(linksBox).not.toBeNull()
    expect(navBox).not.toBeNull()
    expect(linksBox!.y + linksBox!.height).toBeLessThanOrEqual(navBox!.y - 16)
  })
})
