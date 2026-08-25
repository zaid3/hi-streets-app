import { expect, test } from '@playwright/test'

test.describe('HiStreets website theme parity', () => {
  test('resident feed uses the website palette, typography and premium navigation', async ({ page }) => {
    await page.goto('/offers')
    await expect(page.getByRole('heading', { name: 'Offers near you' })).toBeVisible()

    const tokens = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      return {
        ink: root.getPropertyValue('--ink').trim(),
        teal: root.getPropertyValue('--teal').trim(),
        tealDeep: root.getPropertyValue('--teal-deep').trim(),
        tealBright: root.getPropertyValue('--teal-bright').trim(),
        amber: root.getPropertyValue('--amber').trim(),
        orange: root.getPropertyValue('--orange').trim(),
        cream: root.getPropertyValue('--cream').trim(),
        paper: root.getPropertyValue('--paper').trim(),
      }
    })
    expect(tokens).toEqual({
      ink: '#062B2A', teal: '#0F6E6B', tealDeep: '#0A3B39', tealBright: '#28B9AF',
      amber: '#F4A24C', orange: '#EF6C34', cream: '#FBF7EF', paper: '#FFFDF8',
    })

    const headingFont = await page.getByRole('heading', { name: 'Offers near you' }).evaluate(el => getComputedStyle(el).fontFamily)
    expect(headingFont).toContain('Fraunces')

    const nav = page.locator('.bottom-tabs')
    await expect(nav).toBeVisible()
    const navStyle = await nav.evaluate(el => ({
      bg: getComputedStyle(el).backgroundColor,
      radius: getComputedStyle(el).borderRadius,
    }))
    expect(navStyle.bg).toContain('rgba(6, 43, 42')
    expect(Number.parseFloat(navStyle.radius)).toBeGreaterThanOrEqual(20)
  })

  test('business access uses the same website identity instead of the retired black theme', async ({ page }) => {
    await page.goto('/business')
    await expect(page.getByRole('heading', { name: 'Sign in to HiStreets' })).toBeVisible()

    const panel = page.locator('.auth-brand-panel')
    const style = await panel.evaluate(el => ({
      image: getComputedStyle(el).backgroundImage,
      color: getComputedStyle(el).color,
    }))
    expect(style.image).toContain('rgb(10, 59, 57)')
    expect(style.image).toContain('rgb(6, 43, 42)')

    const mark = await page.locator('.brand-wordmark').evaluate(el => ({
      before: getComputedStyle(el, '::before').content,
      after: getComputedStyle(el, '::after').content,
      beforeBg: getComputedStyle(el, '::before').backgroundImage,
    }))
    expect(mark.before).toContain('H')
    expect(mark.after).toContain('HiStreets')
    expect(mark.beforeBg).toContain('rgb(239, 108, 52)')
    expect(mark.beforeBg).toContain('rgb(244, 162, 76)')
  })

  test('document metadata carries the exact website theme colour and favicon', async ({ page }) => {
    await page.goto('/map')
    const metadata = await page.evaluate(() => ({
      theme: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
      title: document.title,
      icon: document.querySelector('link[rel="icon"]')?.getAttribute('href'),
    }))
    expect(metadata.theme).toBe('#0A3B39')
    expect(metadata.title).toContain('Your whole high street, on one map')
    expect(metadata.icon).toContain('%23EF6C34')
    expect(metadata.icon).toContain('%23F4A24C')
  })
})
