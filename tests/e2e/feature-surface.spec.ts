import { expect, test } from '@playwright/test'

test.describe('advertised resident feature surfaces', () => {
  test('map, offers, jobs, community, parking and business routes all render usable states', async ({ page }) => {
    const routes = [
      ['/map', /Use your location\?|Search/],
      ['/offers', /Offers near you/],
      ['/jobs', /Jobs in Newham/],
      ['/community', /Community/],
      ['/parking', /Coming Soon|Parking/],
      ['/business', /Sign in to HiStreets/],
    ] as const

    for (const [route, text] of routes) {
      await page.goto(route)
      await expect(page.getByText(text).first()).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(1)
    }
  })

  test('Ask HiStreets and HiPulse controls are present on the map without obstructing navigation', async ({ page }) => {
    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()

    const smartSearch = page.getByRole('combobox', { name: 'Search businesses, services, offers, jobs or postcode' })
    await smartSearch.fill('cheap food E7')
    await expect(page.getByRole('button', { name: /Ask HiStreets AI/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Open HiPulse/i })).toBeVisible()
    await expect(page.locator('.bottom-tabs')).toBeVisible()
  })
})
