import { expect, test } from '@playwright/test'

test.describe('HiPulse honest zero-data state', () => {
  test('HiPulse opens and remains explainable when there is no public activity', async ({ page }) => {
    await page.goto('/map')
    const pulse = page.locator('.hipulse-fab')
    await expect(pulse).toBeVisible()
    await pulse.click()
    await expect(page.locator('.hipulse-sheet')).toBeVisible()
    await expect(page.locator('.hipulse-score-ring')).toBeVisible()
  })
})
