import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import App from './App.vue'

// Create shared mocks
const pushMock = vi.fn()

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: pushMock,
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
  })),
  RouterLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to']
  },
}))

const vuetify = createVuetify()

describe('App.vue', () => {
  let originalLocalStorage: Storage
  let localStorageData: Record<string, string>

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock localStorage
    localStorageData = {}
    originalLocalStorage = global.localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageData[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageData[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageData[key]
        }),
        clear: vi.fn(() => {
          localStorageData = {}
        }),
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(global, 'localStorage', { value: originalLocalStorage, writable: true })
  })

  const createWrapper = () => {
    return mount(App, {
      global: {
        plugins: [vuetify],
        stubs: {
          AppSidebar: { template: '<div class="app-sidebar-stub">AppSidebar</div>' },
          'router-view': {
            template: '<div class="router-view"><slot :Component="null" /></div>',
          },
          'v-app': { template: '<div class="v-app"><slot /></div>' },
          'v-main': { template: '<div class="v-main"><slot /></div>' },
        },
      },
    })
  }

  describe('Component Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render AppSidebar component', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.app-sidebar-stub').exists()).toBe(true)
    })

    it('should render the footer', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.app-footer').exists()).toBe(true)
    })

    it('should render legal links in footer', () => {
      const wrapper = createWrapper()
      const footer = wrapper.find('.app-footer')
      expect(footer.text()).toContain('Impressum')
      expect(footer.text()).toContain('Datenschutz')
      expect(footer.text()).toContain('AGB')
    })

    it('should have correct footer link targets', () => {
      const wrapper = createWrapper()
      const footerHtml = wrapper.find('.app-footer').html()
      expect(footerHtml).toContain('/impressum')
      expect(footerHtml).toContain('/datenschutz')
      expect(footerHtml).toContain('/agb')
    })
  })

  describe('Theme Loading', () => {
    it('should load saved theme from localStorage on mount', async () => {
      localStorageData['theme'] = 'dark'
      createWrapper()
      await flushPromises()

      expect(localStorage.getItem).toHaveBeenCalledWith('theme')
    })

    it('should not crash when no theme is saved', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
      expect(localStorage.getItem).toHaveBeenCalledWith('theme')
    })
  })

  describe('Auth Logout Event', () => {
    it('should add event listener for auth:logout on mount', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      createWrapper()
      await flushPromises()

      expect(addEventListenerSpy).toHaveBeenCalledWith('auth:logout', expect.any(Function))
      addEventListenerSpy.mockRestore()
    })

    it('should redirect to login with expired query on auth:logout event', async () => {
      createWrapper()
      await flushPromises()

      // Dispatch the auth:logout event
      window.dispatchEvent(new Event('auth:logout'))
      await flushPromises()

      expect(pushMock).toHaveBeenCalledWith({ name: 'Login', query: { expired: 'true' } })
    })
  })

  describe('Layout Structure', () => {
    it('should have v-app as root element', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.v-app').exists()).toBe(true)
    })

    it('should have v-main for content area', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.v-main').exists()).toBe(true)
    })

    it('should have router-view for page content', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.router-view').exists()).toBe(true)
    })
  })
})
