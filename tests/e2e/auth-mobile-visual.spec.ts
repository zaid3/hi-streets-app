import { expect, test } from '@playwright/test'

test.describe('business auth mobile visual contract', () => {
  test('mobile auth uses a compact unclipped brand bar and a separate card', async ({ page }) => {
    await page.goto('/business')
    const shell = page.locator('.auth-screen')
    const panel = page.locator('.auth-brand-panel')
    const card = page.locator('.auth-card-final')
    const nav = page.locator('.bottom-tabs')

    await expect(shell).toBeVisible()
    await expect(panel).toBeVisible()
    await expect(card).toBeVisible()
    await expect(nav).toBeVisible()

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector('.auth-screen') as HTMLElement
      const panel = document.querySelector('.auth-brand-panel') as HTMLElement
      const card = document.querySelector('.auth-card-final') as HTMLElement
      const panelCopy = panel.querySelector(':scope > p') as HTMLElement | null
      const panelRect = panel.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      const shellStyle = getComputedStyle(shell)
      return {
        width: window.innerWidth,
        gap: Number.parseFloat(shellStyle.rowGap || shellStyle.gap || '0'),
        panelBottom: panelRect.bottom,
        cardTop: cardRect.top,
        panelHeight: panelRect.height,
        panelOverflow: getComputedStyle(panel).overflow,
        panelCopyDisplay: panelCopy ? getComputedStyle(panelCopy).display : 'missing',
        paddingBottom: Number.parseFloat(shellStyle.paddingBottom),
      }
    })

    if (metrics.width <= 759) {
      expect(metrics.gap).toBeGreaterThanOrEqual(12)
      expect(metrics.panelHeight).toBeGreaterThanOrEqual(70)
      expect(metrics.panelHeight).toBeLessThanOrEqual(90)
      expect(metrics.cardTop - metrics.panelBottom).toBeGreaterThanOrEqual(12)
      expect(metrics.panelOverflow).toBe('hidden')
      expect(metrics.panelCopyDisplay).toBe('none')
      expect(metrics.paddingBottom).toBeGreaterThanOrEqual(200)
    }
  })
})
