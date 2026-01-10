import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { ref, computed } from 'vue'
import App from './App.vue'

// Create shared mocks
const pushMock = vi.fn()
const mockIsAdmin = ref(false)
const mockCurrentUser = ref<{ email: string; firstName?: string; lastName?: string; isAdmin?: boolean } | null>(null)
const mockIsAuthenticated = ref(false)
const mockIsLoading = ref(false)
const mockLogout = vi.fn()

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: pushMock,
  })),
  RouterView: {
    template: '<div class="router-view"><slot :Component="null" /></div>',
  },
}))

// Mock useAuth composable
vi.mock('./composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAdmin: computed(() => mockIsAdmin.value),
    currentUser: mockCurrentUser,
    isAuthenticated: computed(() => mockIsAuthenticated.value),
    isLoading: mockIsLoading,
    logout: mockLogout,
  })),
}))

const vuetify = createVuetify()

describe('App.vue', () => {
  let originalSessionStorage: Storage
  let originalLocalStorage: Storage
  let sessionStorageData: Record<string, string>
  let localStorageData: Record<string, string>

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.value = false
    mockCurrentUser.value = null
    mockIsAuthenticated.value = false
    mockIsLoading.value = false

    // Mock sessionStorage
    sessionStorageData = {}
    originalSessionStorage = global.sessionStorage
    Object.defineProperty(global, 'sessionStorage', {
      value: {
        getItem: vi.fn((key: string) => sessionStorageData[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          sessionStorageData[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete sessionStorageData[key]
        }),
        clear: vi.fn(() => {
          sessionStorageData = {}
        }),
      },
      writable: true,
    })

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
    Object.defineProperty(global, 'sessionStorage', { value: originalSessionStorage, writable: true })
    Object.defineProperty(global, 'localStorage', { value: originalLocalStorage, writable: true })
  })

  const createWrapper = () => {
    return mount(App, {
      global: {
        plugins: [vuetify],
        stubs: {
          'router-view': {
            template: '<div class="router-view"><slot :Component="null" /></div>',
          },
          UserMenu: { template: '<div class="user-menu-stub">UserMenu</div>' },
          'v-app': { template: '<div class="v-app"><slot /></div>' },
          'v-app-bar': { template: '<div class="v-app-bar"><slot /></div>' },
          'v-app-bar-title': {
            template: '<div class="v-app-bar-title" @click="$emit(\'click\')"><slot /></div>',
          },
          'v-spacer': { template: '<div class="v-spacer"></div>' },
          'v-btn': {
            template: `
              <button
                class="v-btn"
                @click="$emit('click')"
                :data-icon="prependIcon || icon"
                :data-variant="variant"
              >
                <slot />
              </button>
            `,
            props: ['variant', 'prependIcon', 'icon'],
          },
          'v-main': { template: '<div class="v-main"><slot /></div>' },
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    })
  }

  describe('Component Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should display the app title', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Altavio')
    })

    it('should render UserMenu component', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.user-menu-stub').exists()).toBe(true)
    })

    it('should render theme toggle button', () => {
      const wrapper = createWrapper()
      const themeButton = wrapper.findAll('.v-btn').find(
        btn => btn.attributes('data-icon')?.includes('mdi-weather')
      )
      expect(themeButton).toBeDefined()
    })
  })

  describe('Authentication-based UI', () => {
    it('should not show "New Chart" button when not authenticated', () => {
      sessionStorageData['accessToken'] = ''
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('.v-btn')
      const newChartButton = buttons.find(btn => btn.text().includes('New Chart'))
      expect(newChartButton).toBeUndefined()
    })

    it('should show "New Chart" button when authenticated', async () => {
      sessionStorageData['accessToken'] = 'valid-token'
      const wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAll('.v-btn')
      const newChartButton = buttons.find(btn => btn.text().includes('New Chart'))
      expect(newChartButton).toBeDefined()
    })
  })

  describe('Admin-based UI', () => {
    it('should not show "Admin" button when user is not admin', () => {
      mockIsAdmin.value = false
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('.v-btn')
      const adminButton = buttons.find(btn => btn.text().includes('Admin'))
      expect(adminButton).toBeUndefined()
    })

    it('should show "Admin" button when user is admin', async () => {
      mockIsAdmin.value = true
      const wrapper = createWrapper()
      await flushPromises()

      const buttons = wrapper.findAll('.v-btn')
      const adminButton = buttons.find(btn => btn.text().includes('Admin'))
      expect(adminButton).toBeDefined()
    })

    it('should show admin button with correct icon', async () => {
      mockIsAdmin.value = true
      const wrapper = createWrapper()
      await flushPromises()

      const adminButton = wrapper.findAll('.v-btn').find(
        btn => btn.attributes('data-icon') === 'mdi-shield-crown'
      )
      expect(adminButton).toBeDefined()
    })
  })

  describe('Navigation', () => {
    it('should navigate to home when title is clicked', async () => {
      const wrapper = createWrapper()
      const title = wrapper.find('.v-app-bar-title')
      await title.trigger('click')
      expect(pushMock).toHaveBeenCalledWith('/')
    })

    it('should navigate to generator when "New Chart" button is clicked', async () => {
      sessionStorageData['accessToken'] = 'valid-token'
      const wrapper = createWrapper()
      await flushPromises()

      const buttons = wrapper.findAll('.v-btn')
      const newChartButton = buttons.find(btn => btn.text().includes('New Chart'))
      await newChartButton?.trigger('click')

      expect(pushMock).toHaveBeenCalledWith('/generator')
    })

    it('should navigate to admin when "Admin" button is clicked', async () => {
      mockIsAdmin.value = true
      const wrapper = createWrapper()
      await flushPromises()

      const buttons = wrapper.findAll('.v-btn')
      const adminButton = buttons.find(btn => btn.text().includes('Admin'))
      await adminButton?.trigger('click')

      expect(pushMock).toHaveBeenCalledWith('/admin')
    })
  })

  describe('Theme Toggle', () => {
    it('should toggle theme when theme button is clicked', async () => {
      const wrapper = createWrapper()
      const themeButton = wrapper.findAll('.v-btn').find(
        btn => btn.attributes('data-icon')?.includes('mdi-weather')
      )

      await themeButton?.trigger('click')

      // Should save to localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', expect.any(String))
    })

    it('should load saved theme from localStorage on mount', async () => {
      localStorageData['theme'] = 'dark'
      createWrapper()
      await flushPromises()

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

  describe('Button Icons', () => {
    it('should have correct icon for New Chart button', async () => {
      sessionStorageData['accessToken'] = 'valid-token'
      const wrapper = createWrapper()
      await flushPromises()

      const newChartButton = wrapper.findAll('.v-btn').find(
        btn => btn.attributes('data-icon') === 'mdi-plus-circle'
      )
      expect(newChartButton).toBeDefined()
      expect(newChartButton?.text()).toContain('New Chart')
    })
  })
})
