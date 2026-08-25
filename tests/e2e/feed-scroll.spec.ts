import { expect, test } from '@playwright/test'

const feedRoutes = [
  { path: '/offers', heading: 'Offers near you' },
  { path: '/jobs', heading: 'Jobs in Newham' },
  { path: '/community', heading: 'Community' },
]

test.describe('resident tabs launch behaviour', () => {
  for (const route of feedRoutes) {
    test(`${route.path} scrolls without a visible scrollbar rail`, async ({ page }) => {
      await page.goto(route.path)
      await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible()
      const feed = page.locator('.feed-screen')
      await expect(feed).toBeVisible()
      const style = await feed.evaluate(el => {
        const css = getComputedStyle(el)
        return { overflowY: css.overflowY, overflowX: css.overflowX, scrollbarWidth: css.getPropertyValue('scrollbar-width') }
      })
      expect(style.overflowY).toBe('auto')
      expect(style.overflowX).toBe('hidden')
      expect(style.scrollbarWidth).toBe('none')

      await feed.evaluate(el => {
        const probe = document.createElement('div')
        probe.dataset.feedScrollProbe = 'true'
        probe.style.height = '1100px'
        probe.style.minHeight = '1100px'
        ;(el as HTMLElement).appendChild(probe)
        ;(el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight
      })
      const scrollTop = await feed.evaluate(el => (el as HTMLElement).scrollTop)
      expect(scrollTop).toBeGreaterThan(0)
      await expect(page.locator('.bottom-tabs')).toBeVisible()
    })
  }

  test('all six primary tabs navigate without a page reload contract break', async ({ page }) => {
    await page.goto('/map')
    const tabs = page.locator('.bottom-tabs')
    await expect(tabs.locator('button')).toHaveCount(6)

    const routes = [
      ['Offers', '/offers'],
      ['Jobs', '/jobs'],
      ['Community', '/community'],
      ['Parking', '/parking'],
      ['Business', '/business'],
      ['Map', '/map'],
    ] as const

    for (const [label, path] of routes) {
      await tabs.getByRole('button', { name: label, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}$`))
    }
  })
})
