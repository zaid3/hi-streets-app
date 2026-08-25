import { expect, test } from '@playwright/test'

test.describe('business auth mobile visual contract', () => {
  test('compact brand banner stays separate from the card on iPhone-sized layouts', async ({ page }) => {
    await page.goto('/business')
    const shell = page.locator('.auth-screen')
    const panel = page.locator('.auth-brand-panel')
    const card = page.locator('.auth-card-final')

    await expect(shell).toBeVisible()
    await expect(panel).toBeVisible()
    await expect(card).toBeVisible()

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector('.auth-screen') as HTMLElement
      const panel = document.querySelector('.auth-brand-panel') as HTMLElement
      const card = document.querySelector('.auth-card-final') as HTMLElement
      const panelRect = panel.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      const shellStyle = getComputedStyle(shell)
      return {
        gap: Number.parseFloat(shellStyle.rowGap || shellStyle.gap || '0'),
        panelBottom: panelRect.bottom,
        cardTop: cardRect.top,
        panelHeight: panelRect.height,
        cardPosition: getComputedStyle(card).position,
        cardTransform: getComputedStyle(card).transform,
      }
    })

    expect(metrics.gap).toBeGreaterThanOrEqual(12)
    expect(metrics.panelHeight).toBeGreaterThanOrEqual(70)
    expect(metrics.cardTop - metrics.panelBottom).toBeGreaterThanOrEqual(12)
    expect(metrics.cardPosition).toBe('relative')
    expect(metrics.cardTransform).toBe('none')
  })
})
