import { expect, test } from '@playwright/test'

test.describe('HiStreets desktop business shell', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop layout contract')
    await page.goto('/business')
  })

  test('desktop keeps phone-like app proportions without overlap', async ({ page }) => {
    const shell = page.locator('.app-shell')
    const tabs = page.locator('.bottom-tabs')
    const card = page.locator('.auth-card-final')

    await expect(card).toBeVisible()
    await expect(tabs).toBeVisible()

    const shellBox = await shell.boundingBox()
    const tabsBox = await tabs.boundingBox()
    const cardBox = await card.boundingBox()
    expect(shellBox).not.toBeNull()
    expect(tabsBox).not.toBeNull()
    expect(cardBox).not.toBeNull()

    const shellLeft = shellBox!.x
    const shellRight = shellBox!.x + shellBox!.width
    const cardLeft = cardBox!.x
    const cardRight = cardBox!.x + cardBox!.width

    expect(shellBox!.width).toBeLessThanOrEqual(782)
    expect(shellBox!.width).toBeGreaterThanOrEqual(700)
    expect(tabsBox!.width).toBeLessThanOrEqual(730)
    expect(cardRight).toBeLessThanOrEqual(shellRight + 1)
    expect(cardLeft).toBeGreaterThanOrEqual(shellLeft - 1)

    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(horizontalOverflow).toBeLessThanOrEqual(1)
  })

  test('desktop bottom navigation remains one row and centered', async ({ page }) => {
    const buttons = page.locator('.bottom-tabs button')
    await expect(buttons).toHaveCount(6)
    const rects = await buttons.evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect()
      return { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right) }
    }))
    expect(Math.max(...rects.map(r => r.top)) - Math.min(...rects.map(r => r.top))).toBeLessThanOrEqual(2)
    for (let i = 1; i < rects.length; i++) expect(rects[i].left).toBeGreaterThanOrEqual(rects[i - 1].right - 2)
  })

  test('desktop business content has a real scroll container and safe space above tabs', async ({ page }) => {
    const business = page.locator('.business-shell')
    const tabs = page.locator('.bottom-tabs')
    const navHeight = await tabs.evaluate(el => el.getBoundingClientRect().height)
    const style = await business.evaluate(el => {
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
  })
})
