import { expect, test } from '@playwright/test'

const newhamFullPostcode = {
  status: 200,
  result: {
    postcode: 'E7 8LE',
    latitude: 51.5388,
    longitude: 0.0318,
    admin_district: 'Newham',
    codes: { admin_district: 'E09000025' },
  },
}

const newhamOutcode = {
  status: 200,
  result: {
    outcode: 'E7',
    latitude: 51.549,
    longitude: 0.025,
    admin_district: ['Newham'],
  },
}

function smartSearch(page: any) {
  return page.getByRole('combobox', { name: 'Search businesses, services, offers, jobs or postcode' })
}

test.describe('HiStreets final mobile release', () => {
  test.use({
    geolocation: { latitude: 51.537, longitude: 0.0325 },
    permissions: ['geolocation'],
  })

  test('map opens on mobile and location succeeds from a user tap', async ({ page }) => {
    await page.goto('/map')
    await expect(page.locator('.map-screen')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Use your location?' })).toBeVisible()

    await page.getByRole('button', { name: /Show what is near me/i }).click()

    await expect(page.getByRole('status')).toContainText('Showing places near your location.')
    await expect(page.getByRole('button', { name: 'Use my location' })).toBeEnabled()
  })

  test('smart search opens app-style suggestions and understands natural language', async ({ page }) => {
    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()
    const search = smartSearch(page)
    await search.focus()
    const popular = page.getByRole('listbox', { name: 'Popular searches' })
    await expect(popular).toBeVisible()
    await expect(popular.getByRole('option', { name: /Restaurants & takeaway/i })).toBeVisible()

    await search.fill('pharmacy near me')
    const smart = page.getByRole('listbox', { name: 'Smart search suggestions' })
    await expect(smart).toBeVisible()
    await expect(smart.getByRole('option', { name: /Health & pharmacy/i })).toBeVisible()
    await expect(smart.getByRole('option', { name: /Use my location/i })).toBeVisible()
  })

  test('iPhone search field stays at 16px and Ask HiStreets opens a mobile-safe sheet', async ({ page }) => {
    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()
    const search = smartSearch(page)
    await search.focus()
    expect(await search.evaluate(node => getComputedStyle(node).fontSize)).toBe('16px')

    await search.fill('cheap food near E7 tonight')
    await expect(page.getByRole('button', { name: /Ask HiStreets AI/i })).toBeVisible()
    await page.getByRole('button', { name: /Ask HiStreets AI/i }).click()

    const dialog = page.getByRole('dialog', { name: 'Ask HiStreets' })
    await expect(dialog).toBeVisible()
    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.width).toBeLessThanOrEqual((await page.viewportSize())!.width + 1)
    await expect(dialog).toContainText(/AI unavailable|Understanding your need|verified HiStreets/i)
  })

  test('natural language jobs search opens the jobs feed', async ({ page }) => {
    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()
    const search = smartSearch(page)
    await search.fill('any jobs hiring near me')
    await search.press('Enter')
    await expect(page).toHaveURL(/\/jobs$/)
    await expect(page.getByRole('heading', { name: 'Jobs in Newham' })).toBeVisible()
  })

  test('full Newham postcode search works with spaces and validates the borough', async ({ page }) => {
    await page.route('https://api.postcodes.io/postcodes/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(newhamFullPostcode),
    }))

    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()
    const search = smartSearch(page)
    await search.fill(' e7 8le ')
    await search.press('Enter')

    await expect(page.getByRole('status')).toHaveText('Showing E7 8LE.')
  })

  test('Newham outward postcode search works', async ({ page }) => {
    await page.route('https://api.postcodes.io/outcodes/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(newhamOutcode),
    }))

    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()
    const search = smartSearch(page)
    await search.fill('e7')
    await search.press('Enter')

    await expect(page.getByRole('status')).toHaveText('Showing E7 in Newham.')
  })

  test('postcode outside Newham is rejected without moving into another borough', async ({ page }) => {
    await page.route('https://api.postcodes.io/postcodes/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 200,
        result: {
          postcode: 'SW1A 1AA',
          latitude: 51.50101,
          longitude: -0.141563,
          admin_district: 'Westminster',
          codes: { admin_district: 'E09000033' },
        },
      }),
    }))

    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()
    const search = smartSearch(page)
    await search.fill('SW1A 1AA')
    await search.press('Enter')

    await expect(page.getByRole('status')).toHaveText('That postcode is outside the London Borough of Newham.')
  })

  test('business and street search remains usable when no matching data exists', async ({ page }) => {
    await page.goto('/map')
    await page.getByRole('button', { name: 'Use Newham map for now' }).click()
    const search = smartSearch(page)
    await search.fill('Green Street')
    await search.press('Enter')
    await expect(page.getByRole('status')).toContainText('No matching business found yet')
  })

  test('all six bottom navigation destinations stay on one row', async ({ page }) => {
    await page.goto('/map')
    const buttons = page.locator('.bottom-tabs button')
    await expect(buttons).toHaveCount(6)
    const tops = await buttons.evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)))
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2)
  })

  test('direct public and business routes render instead of 404ing', async ({ page }) => {
    const routes: Array<[string, string]> = [
      ['/offers', 'Offers near you'],
      ['/jobs', 'Jobs in Newham'],
      ['/community', 'Community'],
      ['/parking', 'Local parking'],
      ['/business', 'Business access'],
    ]

    for (const [path, heading] of routes) {
      const response = await page.goto(path)
      expect(response?.ok()).toBeTruthy()
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    }
  })

  test('PWA manifest and service worker assets are reachable', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.json')
    expect(manifestResponse.ok()).toBeTruthy()
    const manifest = await manifestResponse.json()
    expect(manifest.start_url).toBe('/map')
    expect(manifest.display).toBe('standalone')

    const serviceWorkerResponse = await request.get('/sw.js')
    expect(serviceWorkerResponse.ok()).toBeTruthy()
    expect(await serviceWorkerResponse.text()).toContain('HiStreets is offline')
  })
})
