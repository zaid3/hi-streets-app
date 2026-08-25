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

  test('business shell scrolls fully above the fixed navigation', async ({ page }) => {
    await page.goto('/business')
    const shell = page.locator('.business-shell')
    const tabs = page.locator('.bottom-tabs')
    await expect(shell).toBeVisible()
    await expect(tabs).toBeVisible()

    const navHeight = await tabs.evaluate(el => el.getBoundingClientRect().height)
    const style = await shell.evaluate(el => {
      const css = getComputedStyle(el)
      return {
        overflowY: css.overflowY,
        paddingBottom: Number.parseFloat(css.paddingBottom),
        scrollPaddingBottom: Number.parseFloat(css.scrollPaddingBottom),
      }
    })
    expect(style.overflowY).toBe('auto')
    expect(style.paddingBottom).toBeGreaterThan(navHeight + 40)
    expect(style.scrollPaddingBottom).toBeGreaterThan(navHeight + 40)

    await shell.evaluate(el => {
      const probe = document.createElement('div')
      probe.setAttribute('data-scroll-probe', 'true')
      probe.style.height = '900px'
      probe.style.minHeight = '900px'
      ;(el as HTMLElement).appendChild(probe)
      ;(el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight
    })

    const metrics = await shell.evaluate(el => ({
      scrollTop: (el as HTMLElement).scrollTop,
      maxScroll: (el as HTMLElement).scrollHeight - (el as HTMLElement).clientHeight,
    }))
    expect(metrics.scrollTop).toBeGreaterThan(0)
    expect(metrics.maxScroll - metrics.scrollTop).toBeLessThanOrEqual(2)

    const probeBottom = await page.locator('[data-scroll-probe="true"]').evaluate(el => el.getBoundingClientRect().bottom)
    const navTop = await tabs.evaluate(el => el.getBoundingClientRect().top)
    expect(probeBottom).toBeLessThan(navTop - 24)
  })
})
