import { expect, test } from '@playwright/test'

test.describe('fixed navigation safety', () => {
  test('business sign-in controls remain reachable above fixed tabs after scrolling', async ({ page }) => {
    await page.goto('/business')
    const shell = page.locator('.profile-screen.business-shell')
    await shell.evaluate(el => { (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight })
    await page.waitForTimeout(50)

    const nav = page.locator('.bottom-tabs')
    const links = page.locator('.project-links')
    const navBox = await nav.boundingBox()
    const linksBox = await links.boundingBox()
    expect(navBox).not.toBeNull()
    expect(linksBox).not.toBeNull()
    expect(linksBox!.y + linksBox!.height).toBeLessThan(navBox!.y)
  })
})
