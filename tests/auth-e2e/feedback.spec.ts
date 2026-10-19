import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ json: [] }))
})
async function fill(page: Page) {
  await page.goto('/feedback')
  await page.getByLabel('Your name *', { exact: true }).fill('Test respondent')
  await page.getByLabel('Email *', { exact: true }).fill('test@example.invalid')
  await page.getByLabel('Tell us about your experience *', { exact: true }).fill('This is a test of the feedback form, not customer evidence.')
}
test('feedback saves once, keeps consent optional and shows confirmation', async ({ page }) => {
  let requests = 0
  await page.route('**/rest/v1/user_feedback', async route => {
    requests++
    expect(route.request().postDataJSON()).toMatchObject({ quote_consent: false, features_used: [], started_on: null })
    await route.fulfill({ status: 201, body: '' })
  })
  await fill(page)
  expect(await page.getByRole('checkbox').last().isChecked()).toBe(false)
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thank you. Your feedback is saved.' })).toBeVisible()
  await expect(page.getByRole('status')).toBeFocused()
  expect(requests).toBe(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test('failed feedback keeps answers and separates future plans', async ({ page }) => {
  let first = true
  await page.route('**/rest/v1/user_feedback', async route => {
    if (first) { first = false; await route.fulfill({ status: 503, json: { message: 'Unavailable' } }) }
    else {
      expect(route.request().postDataJSON()).toMatchObject({ planned_use: 'I plan to publish an offer.', features_used: ['Business listings and map'] })
      await route.fulfill({ status: 201, body: '' })
    }
  })
  await fill(page)
  await page.getByRole('checkbox', { name: 'Business listings and map', exact: true }).check()
  await page.getByLabel('How would you like to use HiStreets next?').fill('I plan to publish an offer.')
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Your answers are still here')
  await expect(page.getByRole('alert')).toBeFocused()
  await expect(page.getByLabel('Tell us about your experience *', { exact: true })).toHaveValue('This is a test of the feedback form, not customer evidence.')
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thank you. Your feedback is saved.' })).toBeVisible()
})
