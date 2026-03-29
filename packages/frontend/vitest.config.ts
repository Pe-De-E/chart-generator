import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: true,
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', '**/*.ct.spec.ts'],
    server: {
      deps: {
        inline: ['vuetify']
      }
    },
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportOnFailure: true,
      exclude: [
        'node_modules/**',
        'dist/**',
        'e2e/**',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/types.ts',
        'src/main.ts',
        'src/plugins/**',
        // Geo-layer SVG generators: require Overpass API, browser fetch, or WebGL
        // — covered by E2E tests (geo-layers.spec.ts) instead of unit tests
        'src/utils/chartGenerators/routeMap/forestLayer.ts',
        'src/utils/chartGenerators/routeMap/waterLayer.ts',
        'src/utils/chartGenerators/routeMap/riverTiles.ts',
        'src/utils/chartGenerators/routeMap/roadLayer.ts',
        'src/utils/chartGenerators/routeMap/peakLayer.ts',
        'src/utils/chartGenerators/routeMap/meadowLayer.ts',
        'src/utils/chartGenerators/routeMap/vineyardLayer.ts',
        'src/utils/chartGenerators/routeMap/overpassPolygonLayer.ts',
        'src/utils/chartGenerators/routeMap/hillshadeLayer.ts',
        'src/utils/chartGenerators/routeMap/satelliteLayer.ts',
        'src/utils/chartGenerators/routeMap/terrainTiles.ts',
        'src/utils/chartGenerators/routeMap/contourLines.ts',
        'src/utils/chartGenerators/routeMap/landCoverLayer.ts',
        'src/utils/chartGenerators/routeMap/placeBoundaries.ts',
        'src/utils/chartGenerators/routeMap/index.ts',
        // WebGL / Three.js — not testable in jsdom
        'src/utils/chartGenerators/terrain3d/**',
        // Browser-only composable: canvas, URL.createObjectURL — not testable in jsdom
        'src/composables/useImageExport.ts',
        // Views: auth pages + legal — tested via E2E
        'src/views/Login/**',
        'src/views/Signup.vue',
        'src/views/LegalPage.vue',
        'src/views/adminDashboard/**',
      ],
      include: ['src/**/*.{ts,tsx,vue}'],
      thresholds: {
        // Baselines set to current actuals — prevents regression but
        // does not demand 80 %, since large workflow components
        // (ElevationChartStep, RouteMapChartStep) are covered by E2E.
        lines: 39,
        functions: 22,
        branches: 32,
        statements: 37,
      },
    },
  }
})
