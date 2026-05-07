import type { Page } from '@playwright/test'

export const MOCK_USER = {
  id: 'test-user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  isAdmin: false,
}

/**
 * Injects a mock auth token into sessionStorage and mocks the /users/me API endpoint.
 * Call this before page.goto() so the token is available when the app boots.
 */
export async function setupAuth(page: Page) {
  // Inject token before page load so useAuthStore.init() finds it
  await page.addInitScript(() => {
    sessionStorage.setItem('accessToken', 'mock-access-token-for-testing')
  })

  // Mock the /users/me endpoint so fetchCurrentUser() succeeds
  await page.route('**/api/v1/users/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: MOCK_USER }),
    })
  })

  // Mock chart/theme endpoints that may be triggered on load
  await page.route('**/api/v1/charts**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ charts: [] }) })
    } else {
      route.continue()
    }
  })

  await page.route('**/api/v1/elevation-themes**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ themes: [] }) })
    } else {
      route.continue()
    }
  })
}
