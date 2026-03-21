import { defineConfig, devices } from '@playwright/experimental-ct-vue'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  testMatch: 'src/**/*.ct.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-ct-report' }], ['list']],
  use: {
    ctPort: 3100,
    ctViteConfig: {
      plugins: [
        vue(),
        vuetify({ autoImport: true }),
      ],
      resolve: {
        alias: { '@': resolve('./src') },
      },
      optimizeDeps: {
        exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
      },
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
