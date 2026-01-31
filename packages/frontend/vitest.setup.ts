import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { vi } from 'vitest'

// Suppress CSS parsing errors from jsdom (doesn't support :has() selector used by Vuetify)
const originalConsoleError = console.error
console.error = (...args: unknown[]) => {
  const message = args[0]
  if (typeof message === 'string' && message.includes('Could not parse CSS stylesheet')) {
    return // Suppress this specific error
  }
  originalConsoleError.apply(console, args)
}

// Create Vuetify instance for tests
const vuetify = createVuetify({
  components,
  directives
})

// Global plugins for all tests
config.global.plugins = [vuetify]

// Mock ResizeObserver as a class
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock router for components that use useRouter/useRoute
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      go: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      currentRoute: {
        value: {
          path: '/',
          name: 'home',
          params: {},
          query: {}
        }
      }
    })),
    useRoute: vi.fn(() => ({
      path: '/',
      name: 'home',
      params: {},
      query: {},
      matched: [],
      fullPath: '/',
      hash: '',
      redirectedFrom: undefined,
      meta: {}
    }))
  }
})
