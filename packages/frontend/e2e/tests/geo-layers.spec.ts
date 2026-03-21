/**
 * E2E tests for geo layer toggle behaviour.
 *
 * These tests specifically guard against the recurring bug where a geo layer
 * remains visible (or never appears) when its toggle is switched on/off.
 *
 * Strategy:
 *  - Mock Overpass API to return deterministic test data (no real network calls).
 *  - Toggle each layer checkbox and assert SVG content appears / disappears.
 *  - Verify that DISABLED layers produce no SVG content (default state).
 */

import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupAuth } from '../support/auth'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GPX_FIXTURE = path.resolve(__dirname, '../fixtures/test-route.gpx')

// ── Mock Overpass responses ──────────────────────────────────────────────────

/** A single named mountain peak inside the test route's bounding box */
const PEAK_RESPONSE = JSON.stringify({
  elements: [
    {
      type: 'node',
      id: 1,
      lat: 47.05,
      lon: 8.05,
      tags: { natural: 'peak', name: 'Testgipfel', ele: '750' },
    },
  ],
})

/** A simple forest polygon overlapping the test route area */
const FOREST_RESPONSE = JSON.stringify({
  elements: [
    { type: 'way', id: 100, nodes: [10, 11, 12, 13, 10], tags: { natural: 'wood' } },
    { type: 'node', id: 10, lat: 47.01, lon: 8.01 },
    { type: 'node', id: 11, lat: 47.04, lon: 8.01 },
    { type: 'node', id: 12, lat: 47.04, lon: 8.04 },
    { type: 'node', id: 13, lat: 47.01, lon: 8.04 },
  ],
})

const EMPTY_RESPONSE = JSON.stringify({ elements: [] })

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sets up a smart Overpass mock that returns relevant fixture data for known
 * query types and empty elements for everything else.
 */
async function mockOverpass(page: Page) {
  await page.route('**/overpass**', async route => {
    const body = route.request().postData() ?? ''
    if (body.includes('natural=peak')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: PEAK_RESPONSE })
    } else if (body.includes('natural=wood') || body.includes('landuse=forest')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: FOREST_RESPONSE })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: EMPTY_RESPONSE })
    }
  })
}

/** Uploads the test GPX and navigates to the route-map visualization step. */
async function navigateToRouteMapStep(page: Page) {
  await page.goto('/gpx?mode=route-map')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(GPX_FIXTURE)
  await expect(page.getByRole('button', { name: /Weiter/i })).toBeEnabled({ timeout: 10_000 })
  await page.getByRole('button', { name: /Weiter/i }).click()
  // Wait until the SVG canvas is mounted
  await expect(page.locator('.silhouette-chart svg').first()).toBeAttached({ timeout: 15_000 })
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Geo Layer Toggles', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.route('**/terrain-tiles/**', route => route.abort())
    await mockOverpass(page)
  })

  // ── Peak layer ─────────────────────────────────────────────────────────────

  test('peaks are hidden by default', async ({ page }) => {
    await navigateToRouteMapStep(page)
    const svg = page.locator('.silhouette-chart svg').first()
    // "Gipfel" checkbox is unchecked by default → no peak content in SVG
    await expect(svg).not.toContainText('Testgipfel')
  })

  test('enabling peaks shows peak labels in the SVG', async ({ page }) => {
    await navigateToRouteMapStep(page)
    const svg = page.locator('.silhouette-chart svg').first()

    await page.getByLabel('Gipfel').check()

    // Peak name from mock should appear in the rendered SVG
    await expect(svg).toContainText('Testgipfel', { timeout: 10_000 })
  })

  test('disabling peaks removes peak labels from SVG', async ({ page }) => {
    await navigateToRouteMapStep(page)
    const svg = page.locator('.silhouette-chart svg').first()

    // Enable first
    await page.getByLabel('Gipfel').check()
    await expect(svg).toContainText('Testgipfel', { timeout: 10_000 })

    // Then disable
    await page.getByLabel('Gipfel').uncheck()

    // Peak must disappear — this is the regression test for the peak-shows-when-disabled bug
    await expect(svg).not.toContainText('Testgipfel', { timeout: 5_000 })
  })

  test('re-enabling peaks after disabling shows peaks again', async ({ page }) => {
    await navigateToRouteMapStep(page)
    const svg = page.locator('.silhouette-chart svg').first()

    await page.getByLabel('Gipfel').check()
    await expect(svg).toContainText('Testgipfel', { timeout: 10_000 })

    await page.getByLabel('Gipfel').uncheck()
    await expect(svg).not.toContainText('Testgipfel', { timeout: 5_000 })

    // Re-enable — cached SVG should restore immediately
    await page.getByLabel('Gipfel').check()
    await expect(svg).toContainText('Testgipfel', { timeout: 10_000 })
  })

  // ── Forest layer ───────────────────────────────────────────────────────────

  test('forests are hidden by default', async ({ page }) => {
    await navigateToRouteMapStep(page)
    const svg = page.locator('.silhouette-chart svg').first()
    const initialHtml = await svg.innerHTML()

    // Forests are disabled by default — SVG should not contain green forest paths.
    // We verify by enabling and confirming SVG changes (i.e. default had no forest).
    await page.getByLabel('Waelder').check()
    await page.waitForTimeout(3_000) // give the Overpass fetch time to complete

    const afterHtml = await svg.innerHTML()
    // SVG must have changed after enabling forests (new paths added)
    expect(afterHtml).not.toBe(initialHtml)
  })

  test('disabling forests removes forest content from SVG', async ({ page }) => {
    await navigateToRouteMapStep(page)
    const svg = page.locator('.silhouette-chart svg').first()

    // Enable forests and wait for content
    await page.getByLabel('Waelder').check()
    await page.waitForTimeout(3_000)
    const withForests = await svg.innerHTML()

    // Disable forests
    await page.getByLabel('Waelder').uncheck()
    await page.waitForTimeout(500) // sync update, no network needed

    const withoutForests = await svg.innerHTML()
    // SVG must have shrunk (forest paths removed)
    expect(withoutForests.length).toBeLessThan(withForests.length)
  })
})
