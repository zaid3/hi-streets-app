import { expect, test } from '@playwright/test'

test.describe('HiPulse mobile intelligence layer', () => {
  test('opens as a native-style explainable mobile sheet', async ({ page }) => {
    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()

    const pulse = page.getByRole('button', { name: /Open HiPulse/i })
    await expect(pulse).toBeVisible()
    await pulse.click()

    const dialog = page.getByRole('dialog', { name: /HiPulse · Newham/i })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Explainable by design')).toBeVisible()
    await expect(dialog.getByText(/not an official council statistic/i)).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Explore strongest signal/i })).toBeVisible()
  })

  test('turns the live pulse into a user action without breaking navigation', async ({ page }) => {
    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()
    await page.getByRole('button', { name: /Open HiPulse/i }).click()

    const dialog = page.getByRole('dialog', { name: /HiPulse · Newham/i })
    await dialog.getByRole('button', { name: /Live offers/i }).click()

    await expect(page).toHaveURL(/\/offers$/)
    await expect(page.getByRole('heading', { name: 'Offers near you' })).toBeVisible()
  })
})
