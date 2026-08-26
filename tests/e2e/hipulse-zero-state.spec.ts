import { expect, test } from '@playwright/test'

test.describe('HiPulse honest zero-data state', () => {
  test('HiPulse opens and remains explainable when there is no public activity', async ({ page }) => {
    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()

    const pulse = page.getByRole('button', { name: /Open HiPulse/i })
    await expect(pulse).toBeVisible()
    await pulse.click()
    await expect(page.locator('.hipulse-sheet')).toBeVisible()
    await expect(page.locator('.hipulse-score-ring')).toBeVisible()
    await expect(page.getByText(/not an official council statistic/i)).toBeVisible()
  })
})
