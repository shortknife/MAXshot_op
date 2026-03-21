import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3003'

async function setAuthToken(page: Page) {
  await page.addInitScript(() => {
    const token = {
      email: 'admin',
      token: `e2e_${Date.now()}`,
      timestamp: Date.now(),
    }
    window.localStorage.setItem('admin_token', JSON.stringify(token))
  })
}

test.describe('MVP UI Smoke', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.evaluate(() => {
      window.localStorage.removeItem('admin_token')
    })
    await page.goto(`${BASE_URL}/chat`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('chat page renders main controls', async ({ page }) => {
    await setAuthToken(page)
    await page.goto(`${BASE_URL}/chat`)
    await expect(page.getByRole('heading', { name: 'User Chat MVP' })).toBeVisible()
    await expect(page.getByPlaceholder(/最近 7 天执行状态汇总/)).toBeVisible()
    await expect(page.getByRole('button', { name: '发送' })).toBeVisible()
  })

  test('ops page renders create flow', async ({ page }) => {
    await setAuthToken(page)
    await page.goto(`${BASE_URL}/ops`)
    await expect(page.getByRole('heading', { name: 'Ops Request' })).toBeVisible()
    await expect(page.getByText('Create Ops Execution')).toBeVisible()
    await expect(page.getByText(/Current write state:/)).toBeVisible()
  })

  test('operations page renders governance actions', async ({ page }) => {
    await setAuthToken(page)
    await page.goto(`${BASE_URL}/operations`)
    await expect(page.getByRole('heading', { name: 'Operations Console' })).toBeVisible()
    await expect(page.getByText('Execution Queue')).toBeVisible()
    await expect(page.getByText(/Current write state:/)).toBeVisible()
  })

  test('outcome page renders snapshot controls', async ({ page }) => {
    await setAuthToken(page)
    await page.goto(`${BASE_URL}/outcome`)
    await expect(page.getByRole('heading', { name: 'Execution Outcome Snapshot' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Compare With' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Load' })).toBeVisible()
  })

  test('audit page renders query controls', async ({ page }) => {
    await setAuthToken(page)
    await page.goto(`${BASE_URL}/audit`)
    await expect(page.getByRole('heading', { name: 'Execution Audit (Minimal)' })).toBeVisible()
    await expect(page.getByLabel('execution_id')).toBeVisible()
  })

  test('marketing page renders create and feedback panels', async ({ page }) => {
    await setAuthToken(page)
    await page.goto(`${BASE_URL}/marketing`)
    await expect(page.getByRole('heading', { name: 'Marketing Request' })).toBeVisible()
    await expect(page.getByText('Create Marketing Execution')).toBeVisible()
    await expect(page.getByText('Feedback Recorder')).toBeVisible()
    await expect(page.getByText('Cycle Report')).toBeVisible()
  })
})
