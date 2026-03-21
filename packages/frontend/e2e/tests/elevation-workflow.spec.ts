import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupAuth } from '../support/auth'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GPX_FIXTURE = path.resolve(__dirname, '../fixtures/test-route.gpx')

test.describe('Elevation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('authenticated user can access /elevation without redirect', async ({ page }) => {
    await page.goto('/elevation')
    await expect(page).toHaveURL('/elevation')
  })

  test('step 1 shows GPX upload UI', async ({ page }) => {
    await page.goto('/elevation')
    // Heading in main content (also appears in sidebar nav, so scope to content area)
    await expect(page.locator('.elevation-generator-content').getByText('GPX-Datei hochladen', { exact: true })).toBeVisible()
    // File input is always present
    await expect(page.locator('input[type="file"]')).toBeAttached()
    // Weiter button is present (app initializes with demo data so it is enabled)
    await expect(page.getByRole('button', { name: /Weiter/i })).toBeVisible()
  })

  test('uploading a GPX file shows data preview and enables Weiter', async ({ page }) => {
    await page.goto('/elevation')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(GPX_FIXTURE)

    // Preview card appears with loaded points
    await expect(page.getByText(/Punkte geladen/)).toBeVisible({ timeout: 10_000 })

    // Stats: distance and elevation gain/loss
    await expect(page.getByText(/\d+\.\d+ km/)).toBeVisible()

    // "Weiter" button becomes enabled
    await expect(page.getByRole('button', { name: /Weiter/i })).toBeEnabled({ timeout: 5_000 })
  })

  test('clicking Weiter after GPX upload shows chart step with SVG', async ({ page }) => {
    await page.goto('/elevation')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(GPX_FIXTURE)

    await expect(page.getByRole('button', { name: /Weiter/i })).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: /Weiter/i }).click()

    // Chart step should render an SVG inside the chart preview area.
    // Use toBeAttached() because the SVG has CSS height:100% which can compute
    // to zero in the headless test viewport, making it invisible but still present.
    await expect(page.locator('.silhouette-chart svg').first()).toBeAttached({ timeout: 15_000 })
  })

  test('chart step has animation playback button', async ({ page }) => {
    await page.goto('/elevation')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(GPX_FIXTURE)

    await expect(page.getByRole('button', { name: /Weiter/i })).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: /Weiter/i }).click()

    // Play/pause button should be present (mdi-play or mdi-pause icon button)
    await expect(page.locator('[aria-label="Abspielen"], [aria-label="Pause"]').or(
      page.locator('button:has(.mdi-play), button:has(.mdi-pause)')
    )).toBeVisible({ timeout: 10_000 })
  })
})
