import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('loads with app title and headline', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Altavio/)
    await expect(page.getByRole('heading', { name: 'Altavio' })).toBeVisible()
    await expect(page.getByText('Erstelle schöne Diagramme aus deinen Daten')).toBeVisible()
  })

  test('shows Anmelden and Registrieren buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Anmelden' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Registrieren' })).toBeVisible()
  })

  test('Anmelden button navigates to /login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Anmelden' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('unauthenticated user is redirected to /login when accessing /elevation', async ({ page }) => {
    await page.goto('/elevation')
    await expect(page).toHaveURL('/login')
  })

  test('unauthenticated user is redirected to /login when accessing /generator', async ({ page }) => {
    await page.goto('/generator')
    await expect(page).toHaveURL('/login')
  })
})
