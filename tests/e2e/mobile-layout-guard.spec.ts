import { expect, test } from '@playwright/test'

test.describe('mobile launch layout guard', () => {
  test('business brand banner and sign-in card never overlap on a phone', async ({ page }) => {
    await page.goto('/business')
    await page.evaluate(() => document.fonts.ready)

    const panel = page.locator('.auth-brand-panel')
    const card = page.locator('.auth-card-final')
    const title = page.locator('.auth-card-title')
    await expect(panel).toBeVisible()
    await expect(card).toBeVisible()
    await expect(title).toBeVisible()

    const panelBox = await panel.boundingBox()
    const cardBox = await card.boundingBox()
    const titleBox = await title.boundingBox()
    expect(panelBox).not.toBeNull()
    expect(cardBox).not.toBeNull()
    expect(titleBox).not.toBeNull()

    expect(cardBox!.y).toBeGreaterThanOrEqual(panelBox!.y + panelBox!.height + 12)
    expect(titleBox!.y).toBeGreaterThanOrEqual(cardBox!.y + 12)

    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(horizontalOverflow).toBeLessThanOrEqual(1)
  })

  test('create-account mode keeps the same non-overlapping mobile layout', async ({ page }) => {
    await page.goto('/business')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()

    const panelBox = await page.locator('.auth-brand-panel').boundingBox()
    const cardBox = await page.locator('.auth-card-final').boundingBox()
    expect(panelBox).not.toBeNull()
    expect(cardBox).not.toBeNull()
    expect(cardBox!.y).toBeGreaterThanOrEqual(panelBox!.y + panelBox!.height + 12)
  })

  test('mobile auth can scroll to every final action without fixed navigation covering it', async ({ page }) => {
    await page.goto('/business')
    const viewport = page.viewportSize()
    const shell = page.locator('.profile-screen.business-shell')
    const links = page.locator('.project-links')
    const nav = page.locator('.bottom-tabs')

    if ((viewport?.width || 0) <= 759) {
      await expect(nav).toBeHidden()
      await shell.evaluate(el => { (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight })
      await page.waitForTimeout(80)
      const linksBox = await links.boundingBox()
      expect(linksBox).not.toBeNull()
      expect(linksBox!.y + linksBox!.height).toBeLessThanOrEqual((viewport?.height || 0) + 1)
      return
    }

    await expect(nav).toBeVisible()
    await shell.evaluate(el => { (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight })
    await page.waitForTimeout(80)
    const linksBox = await links.boundingBox()
    const navBox = await nav.boundingBox()
    expect(linksBox).not.toBeNull()
    expect(navBox).not.toBeNull()
    expect(linksBox!.y + linksBox!.height).toBeLessThanOrEqual(navBox!.y - 12)
  })
})
