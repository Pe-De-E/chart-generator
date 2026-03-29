import { test, expect } from '@playwright/experimental-ct-vue'
import TestElevationSidebar from './TestElevationSidebar.vue'

// Minimal valid config matching ElevationAnimationConfig
const mockAnimationConfig = {
  duration: 5,
  easing: 'ease-in-out' as const,
  showMarker: true,
  markerSize: 6,
  curveEndpoint: 30,
  showAreaFill: true,
  showElevationLabels: false,
  elevationLabelColor: '#ffffffb3',
  showDistanceLabels: false,
  distanceLabelColor: '#ffffffb3',
  curveColor: '#ffffff',
  titleColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundType: 'solid' as const,
  gradientColor: '#302b63',
  meshColor1: '#667eea',
  meshColor2: '#764ba2',
  meshColor3: '#f093fb',
  patternColor: '#ffffff',
  patternOpacity: 0.1,
  animationMode: 'uniform' as const,
  gradientSensitivity: 3,
  effortConfig: {
    variableStroke: true,
    variableStrokeIntensity: 5,
    colorGradient: true,
    colorGradientIntensity: 5,
    glowAura: true,
    glowAuraIntensity: 5,
  },
  panZoomEnabled: false,
  panZoomZoomLevel: 3,
  panZoomZoomOutStart: 0.75,
  annotations: [],
}

const defaultProps = {
  animationConfig: mockAnimationConfig,
  chartTitle: 'Mein Höhenprofil',
  isPlaying: false,
  playbackSpeed: 1,
  formattedTime: '0:00',
  animationProgress: 0,
  sliderProgress: 0,
  videoExportSupported: false,
  videoExporting: false,
  collapsed: false,
}

test.describe('ElevationControlsSidebar', () => {
  test.beforeEach(async ({ page }) => {
    // Mock any API calls triggered by child components (e.g. useElevationThemes)
    await page.route('**/api/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
  })

  // TestElevationSidebar wraps ElevationControlsSidebar in <v-app> so
  // Vuetify's layout system (required by v-navigation-drawer) works correctly.

  test('renders with Einstellungen label when not collapsed', async ({ mount, page }) => {
    await mount(TestElevationSidebar, { props: defaultProps })
    await expect(page.getByText('Einstellungen')).toBeVisible()
  })

  test('shows text input field', async ({ mount, page }) => {
    await mount(TestElevationSidebar, { props: defaultProps })
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
  })

  test('collapse toggle button is present', async ({ mount, page }) => {
    await mount(TestElevationSidebar, { props: defaultProps })
    const toggleBtn = page.locator('.sidebar-header button').first()
    await expect(toggleBtn).toBeVisible()
  })

  test('shows play icon when isPlaying is false', async ({ mount, page }) => {
    await mount(TestElevationSidebar, { props: defaultProps })
    await expect(page.locator('.mdi-play').first()).toBeVisible({ timeout: 5_000 })
  })

  test('shows pause icon when isPlaying is true', async ({ mount, page }) => {
    await mount(TestElevationSidebar, { props: { ...defaultProps, isPlaying: true } })
    await expect(page.locator('.mdi-pause').first()).toBeVisible({ timeout: 5_000 })
  })

  test('emits toggle-playback when play button is clicked', async ({ mount, page }) => {
    const events: string[] = []
    await mount(TestElevationSidebar, {
      props: defaultProps,
      on: { 'toggle-playback': () => events.push('toggle-playback') },
    })
    const playBtn = page.locator('button:has(.mdi-play)').first()
    await expect(playBtn).toBeVisible({ timeout: 5_000 })
    await playBtn.click()
    expect(events).toContain('toggle-playback')
  })
})
