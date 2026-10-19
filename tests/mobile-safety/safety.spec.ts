import { test, expect } from '@playwright/test'
const business = '00000000-0000-4000-8000-000000000003'
const post = '00000000-0000-4000-8000-000000000004'
test.beforeEach(async ({ page }) => {
  await page.route('https://fixture.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/posts_public')) return route.fulfill({ json: [{ id: post, business_id: business, type: 'offer', title: 'Fixture offer', body: 'Fixture description', status: 'live', expires_at: '2099-01-01', business_name: 'Fixture business' }] })
    if (path.endsWith('/businesses_geojson')) return route.fulfill({ json: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [0.0325,51.537] }, properties: { id: business, name: 'Fixture business', category: 'cafe' } }] } })
    if (path.endsWith('/submit_content_report')) return route.fulfill({ status: 204 })
    return route.fulfill({ json: [] })
  })
})
test('reports submit in the app, preserve details on error and recover', async ({ page }) => {
  let attempts=0
  await page.route('**/rpc/submit_content_report', async route => {
    attempts++
    expect(route.request().postDataJSON().p_target_id).toBe(post)
    await route.fulfill(attempts === 1 ? { status: 503, json: { message: 'Unavailable' } } : { status: 204 })
  })
  await page.goto('/offers')
  await page.getByRole('button',{name:'Report',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Report post'})
  await dialog.getByLabel('Details (optional)').fill('Fixture report')
  await dialog.getByRole('button',{name:'Send report'}).click()
  await expect(dialog.getByRole('alert')).toContainText('not sent')
  await expect(dialog.getByLabel('Details (optional)')).toHaveValue('Fixture report')
  await dialog.getByRole('button',{name:'Send report'}).click()
  await expect(dialog.getByRole('status')).toContainText('Report received')
  await dialog.getByRole('button',{name:'Done'}).click()
  await expect(dialog).toHaveCount(0)
})
test('business block persists after reload and can be reversed', async ({ page }) => {
  page.on('dialog',dialog=>dialog.accept())
  await page.goto('/offers')
  await expect(page.getByText('Fixture offer',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Block business'}).click()
  await expect(page.getByText('Fixture offer',{exact:true})).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Fixture offer',{exact:true})).toHaveCount(0)
  await page.getByRole('button',{name:'Business',exact:true}).click()
  await page.getByText('Blocked businesses (1)',{exact:true}).click()
  await page.getByRole('button',{name:'Unblock',exact:true}).click()
  await page.getByRole('button',{name:'Offers',exact:true}).click()
  await expect(page.getByText('Fixture offer',{exact:true})).toBeVisible()
})
test('signup requires rule acceptance and deletion is reachable when signed out', async ({ page }) => {
  await page.goto('/business')
  await page.getByRole('button',{name:'Create account',exact:true}).click()
  await expect(page.getByRole('button',{name:'Create account',exact:true})).toBeDisabled()
  await page.getByRole('checkbox').check()
  await expect(page.getByRole('button',{name:'Create account',exact:true})).toBeEnabled()
  await page.getByRole('link',{name:'Delete account and associated data',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Delete your HiStreets account or data'})).toBeVisible()
  await expect(page.getByRole('link',{name:'Request account deletion by email'})).toHaveAttribute('href',/^mailto:ahaque@atomicmail.io/)
})
test('report dialog supports Escape, large text and narrow screens', async ({ page }) => {
  await page.setViewportSize({width:375,height:667})
  await page.emulateMedia({ reducedMotion:'reduce',colorScheme:'dark' })
  await page.goto('/offers')
  await page.getByRole('button',{name:'Report',exact:true}).click()
  await page.addStyleTag({content:'.safety-dialog{font-size:24px}'})
  const dialog=page.getByRole('dialog')
  const box=await dialog.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x+box!.width).toBeLessThanOrEqual(375)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Report',exact:true})).toBeFocused()
})
