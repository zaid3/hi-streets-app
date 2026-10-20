import { expect, test, type Page } from '@playwright/test'

// Run with a non-production Supabase URL and publishable test key. All API
// responses below are synthetic test fixtures, never evidence of real use.
test.skip(!process.env.VITE_SUPABASE_URL?.includes('hipulse-test.'), 'Requires the isolated HiPulse fixture configuration')

async function fixtures(page: Page, failingEndpoint = '', community = false) {
  await page.route('https://hipulse-test.supabase.co/**', route => {
    const url = route.request().url()
    if (failingEndpoint && url.includes(failingEndpoint)) {
      return route.fulfill({ status: 503, json: { message: 'Test data unavailable' } })
    }
    if (url.includes('/rpc/businesses_geojson')) {
      return route.fulfill({ json: {
        type: 'FeatureCollection',
        features: Array.from({ length: 3454 }, (_, index) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0.055, 51.534] },
          properties: { id: `fixture-${index}`, name: `Test listing ${index}`, category: `category-${index % 8}`, verification_status: 'unclaimed' },
        })),
      } })
    }
    if (url.includes('/posts_public')) return route.fulfill({ json: community ? [{
      id: 'fixture-community', type: 'community', title: 'Test support', body: 'Synthetic test fixture',
      status: 'live', source: 'web', expires_at: '2099-01-01T00:00:00Z',
    }] : [] })
    return route.fulfill({ json: [] })
  })
  await page.goto('/map')
  await page.getByRole('button', { name: 'Use Newham map for now' }).click()
  await page.getByRole('button', { name: /Open HiPulse/i }).click()
  return page.getByRole('dialog', { name: /HiPulse · Newham/i })
}

test('listing-only data is 36 with explicit units and no confidence claim', async ({ page }) => {
  const dialog = await fixtures(page)
  await expect(dialog.locator('.hipulse-score-ring strong')).toHaveText('36')
  await expect(dialog.getByRole('button', { name: '3454 Map listings' })).toBeVisible()
  await expect(dialog.getByText('8 categories', { exact: true })).toBeVisible()
  await expect(dialog.getByText(/confidence/i)).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Explore map listings' })).toBeVisible()
})

for (const endpoint of ['businesses_geojson', 'posts_public']) {
  test(`failed ${endpoint} data is not represented as zero activity`, async ({ page }) => {
    const dialog = await fixtures(page, endpoint)
    await expect(dialog.getByRole('alert')).toContainText('could not be loaded')
    await expect(dialog.locator('.hipulse-score-ring')).toHaveCount(0)
  })
}

test('community-led activity opens the community feed', async ({ page }) => {
  const dialog = await fixtures(page, '', true)
  await dialog.getByRole('button', { name: 'Explore strongest signal' }).click()
  await expect(page).toHaveURL(/\/community$/)
})
