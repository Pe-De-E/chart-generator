import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupAuth } from '../support/auth'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GPX_FIXTURE = path.resolve(__dirname, '../fixtures/test-route.gpx')

test.describe('GPX Route Map Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    // Block geo/tile requests that aren't needed for these tests
    await page.route('**/overpass**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ elements: [] }) }))
    await page.route('**/terrain-tiles/**', route => route.abort())
  })

  test('step 1 shows GPX upload UI — not the visualization', async ({ page }) => {
    await page.goto('/gpx?mode=route-map')
    await expect(page).toHaveURL(/\/gpx/)

    // Upload heading must be visible on step 1
    await expect(
      page.locator('.gpx-generator-content').getByText('GPX-Datei hochladen', { exact: true })
    ).toBeVisible()

    // File input present
    await expect(page.locator('input[type="file"]')).toBeAttached()

    // Visualization (mode toggle) must NOT be visible on step 1
    await expect(page.getByText('2D Routenkarte')).not.toBeVisible()
  })

  test('uploading a GPX file shows preview and enables Weiter', async ({ page }) => {
    await page.goto('/gpx?mode=route-map')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(GPX_FIXTURE)

    // Points loaded alert
    await expect(page.getByText(/Punkte geladen/)).toBeVisible({ timeout: 10_000 })

    // Route points loaded alert
    await expect(page.getByText(/Routenpunkte mit GPS-Koordinaten geladen/)).toBeVisible()

    // Weiter button enabled
    await expect(page.getByRole('button', { name: /Weiter/i })).toBeEnabled({ timeout: 5_000 })
  })

  test('clicking Weiter shows the route map visualization', async ({ page }) => {
    await page.goto('/gpx?mode=route-map')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(GPX_FIXTURE)

    await expect(page.getByRole('button', { name: /Weiter/i })).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: /Weiter/i }).click()

    // Mode toggle must be visible on step 2
    await expect(page.getByText('2D Routenkarte')).toBeVisible({ timeout: 10_000 })

    // SVG map canvas present
    await expect(page.locator('svg').first()).toBeAttached({ timeout: 15_000 })

    // Upload heading must be gone
    await expect(
      page.locator('.gpx-generator-content').getByText('GPX-Datei hochladen', { exact: true })
    ).not.toBeVisible()
  })

  test('back button on step 2 returns to upload step', async ({ page }) => {
    await page.goto('/gpx?mode=route-map')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(GPX_FIXTURE)

    await expect(page.getByRole('button', { name: /Weiter/i })).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: /Weiter/i }).click()

    // On step 2 — click back (chevron-left button in sidebar bottom)
    await expect(page.getByText('2D Routenkarte')).toBeVisible({ timeout: 10_000 })
    await page.locator('.sidebar-bottom button:has(.mdi-chevron-left)').click()

    // Upload step visible again
    await expect(
      page.locator('.gpx-generator-content').getByText('GPX-Datei hochladen', { exact: true })
    ).toBeVisible({ timeout: 5_000 })
  })
})
