import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true })
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    proxy: {
      '/terrain-tiles': {
        target: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/terrain-tiles/, ''),
      },
      '/overpass': {
        target: 'https://overpass-api.de/api',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/overpass/, ''),
        proxyTimeout: 30000,
        timeout: 30000,
      },
      '/overpass-kumi': {
        target: 'https://overpass.kumi.systems/api',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/overpass-kumi/, ''),
        proxyTimeout: 30000,
        timeout: 30000,
      },
      '/satellite-tiles': {
        target: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/satellite-tiles/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
