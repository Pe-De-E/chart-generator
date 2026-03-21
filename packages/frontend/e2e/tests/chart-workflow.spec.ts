import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupAuth } from '../support/auth'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_FIXTURE = path.resolve(__dirname, '../fixtures/test-data.csv')

test.describe('Chart Generator Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('authenticated user can access /generator without redirect', async ({ page }) => {
    await page.goto('/generator')
    await expect(page).toHaveURL('/generator')
  })

  test('step 1 shows CSV upload UI', async ({ page }) => {
    await page.goto('/generator')
    // Heading in main content (not in the sidebar nav)
    await expect(page.locator('main').getByText('Datei hochladen', { exact: true })).toBeVisible()
    // File input is always present
    await expect(page.locator('input[type="file"]')).toBeAttached()
    // Weiter button is present (app initializes with demo data so it is enabled)
    await expect(page.getByRole('button', { name: /Weiter/i })).toBeVisible()
  })

  test('uploading a CSV shows data preview and enables Weiter', async ({ page }) => {
    await page.goto('/generator')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(CSV_FIXTURE)

    // Preview table appears
    await expect(page.getByText(/Zeilen geladen/)).toBeVisible({ timeout: 10_000 })

    // Table preview shows column headers from the CSV
    await expect(page.getByText('Month')).toBeVisible()
    await expect(page.getByText('Revenue')).toBeVisible()

    // "Weiter" button becomes enabled
    await expect(page.getByRole('button', { name: /Weiter/i })).toBeEnabled({ timeout: 5_000 })
  })

  test('clicking Weiter after CSV upload proceeds to next step', async ({ page }) => {
    await page.goto('/generator')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(CSV_FIXTURE)

    await expect(page.getByRole('button', { name: /Weiter/i })).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: /Weiter/i }).click()

    // Should advance to step 2 (Data Cleaning)
    // The caption "Schritt 2 von 3: Spalten auswählen..." is unique on the page
    await expect(
      page.getByText(/Schritt 2 von 3: Spalten/i)
    ).toBeVisible({ timeout: 10_000 })
  })
})
