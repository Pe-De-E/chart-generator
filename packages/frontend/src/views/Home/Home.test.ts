import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import Home from './Home.vue'
import type { SavedChart } from '@chart-generator/shared'
import { useRouter } from 'vue-router'
import { chartService } from '../../services/chart.service'

// Create a shared push mock
const pushMock = vi.fn()

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: pushMock,
  })),
}))

// Mock chart service
vi.mock('../services/chart.service', () => ({
  chartService: {
    getUserCharts: vi.fn(),
    deleteChart: vi.fn(),
  },
}))

const vuetify = createVuetify()

describe('Home.vue', () => {
  let mockGetUserCharts: ReturnType<typeof vi.fn>
  let mockDeleteChart: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockGetUserCharts = chartService.getUserCharts as ReturnType<typeof vi.fn>
    mockDeleteChart = chartService.deleteChart as ReturnType<typeof vi.fn>
    vi.clearAllMocks()

    // Mock window.btoa
    global.window.btoa = vi.fn((str: string) => Buffer.from(str).toString('base64'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createWrapper = () => {
    return mount(Home, {
      global: {
        plugins: [vuetify],
        stubs: {
          'v-container': { template: '<div><slot /></div>' },
          'v-row': { template: '<div><slot /></div>' },
          'v-col': { template: '<div><slot /></div>' },
          'v-card': { template: '<div><slot /></div>' },
          'v-card-title': { template: '<div><slot /></div>' },
          'v-card-subtitle': { template: '<div><slot /></div>' },
          'v-card-text': { template: '<div><slot /></div>' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-btn': {
            template: '<button @click="$emit(\'click\')" :data-icon="icon" :data-color="color"><slot /></button>',
            props: ['color', 'size', 'variant', 'icon', 'prependIcon'],
          },
          'v-icon': { template: '<i><slot /></i>' },
          'v-chip': { template: '<span><slot /></span>', props: ['color', 'size'] },
          'v-spacer': { template: '<div></div>' },
          'v-progress-circular': { template: '<div>Loading...</div>' },
          'v-img': { template: '<img />', props: ['src', 'height', 'cover'] },
          'v-dialog': {
            template: '<div v-if="modelValue"><slot /></div>',
            props: ['modelValue', 'maxWidth'],
            emits: ['update:modelValue'],
          },
        },
      },
    })
  }

  const mockCharts: SavedChart[] = [
    {
      id: '1',
      userId: 'user1',
      title: 'Sales Chart',
      type: 'bar',
      svgContent: '<svg>bar chart</svg>',
      config: {},
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      userId: 'user1',
      title: 'Revenue Chart',
      type: 'line',
      svgContent: '<svg>line chart</svg>',
      config: {},
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
    {
      id: '3',
      userId: 'user1',
      title: 'Distribution',
      type: 'pie',
      svgContent: '',
      config: {},
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
    },
  ]

  describe('Component Mounting and Initialization', () => {
    it('should mount successfully', () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should load charts on mount', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      createWrapper()
      await flushPromises()
      expect(mockGetUserCharts).toHaveBeenCalledTimes(1)
    })

    it('should display header section', () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Meine Charts')
      expect(wrapper.text()).toContain('Transform your CSV data into beautiful, interactive charts')
    })
  })

  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      mockGetUserCharts.mockImplementation(() => new Promise(() => {})) // Never resolves
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Loading your charts...')
    })

    it('should hide loading state after charts are loaded', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()
      expect(wrapper.text()).not.toContain('Loading your charts...')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no charts exist', async () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      await flushPromises()
      expect(wrapper.text()).toContain('No charts yet')
      expect(wrapper.text()).toContain('Create your first chart by uploading a CSV file')
    })

    it('should have create button in empty state', async () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      await flushPromises()
      const buttons = wrapper.findAll('button')
      const createButton = buttons.find(btn => btn.text().includes('Create Your First Chart'))
      expect(createButton).toBeDefined()
    })
  })

  describe('Charts Display', () => {
    it('should display charts when loaded', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()
      expect(wrapper.text()).toContain('Sales Chart')
      expect(wrapper.text()).toContain('Revenue Chart')
      expect(wrapper.text()).toContain('Distribution')
    })

    it('should display chart types as chips', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()
      expect(wrapper.text()).toContain('BAR')
      expect(wrapper.text()).toContain('LINE')
      expect(wrapper.text()).toContain('PIE')
    })

    it('should render SVG images for charts with svgContent', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()
      expect(window.btoa).toHaveBeenCalledWith('<svg>bar chart</svg>')
      expect(window.btoa).toHaveBeenCalledWith('<svg>line chart</svg>')
    })

    it('should show placeholder icon for charts without svgContent', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()
      const html = wrapper.html()
      // Chart with no svgContent should have placeholder
      expect(html).toContain('chart-preview-placeholder')
    })
  })

  describe('Navigation', () => {
    it('should navigate to generator when create button is clicked', async () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      await flushPromises()

      const buttons = wrapper.findAll('button')
      const createButton = buttons.find(btn => btn.text().includes('Create'))
      await createButton?.trigger('click')

      expect(pushMock).toHaveBeenCalledWith({ name: 'Generator' })
    })

    it('should navigate to generator with chart id when edit is clicked', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()

      const editButtons = wrapper.findAll('button').filter(btn => btn.text().includes('Edit'))
      await editButtons[0]?.trigger('click')

      expect(pushMock).toHaveBeenCalledWith({ name: 'Generator', query: { id: '1' } })
    })
  })

  describe('Delete Functionality', () => {
    it('should open delete dialog when delete button is clicked', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()

      const deleteButtons = wrapper.findAll('button[data-icon="mdi-delete"]')
      await deleteButtons[0]?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Delete Chart?')
      expect(wrapper.text()).toContain('Are you sure you want to delete "Sales Chart"?')
    })

    it('should close dialog when cancel is clicked', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()

      // Open dialog
      const deleteButtons = wrapper.findAll('button[data-icon="mdi-delete"]')
      await deleteButtons[0]?.trigger('click')
      await wrapper.vm.$nextTick()

      // Click cancel
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find(btn => btn.text() === 'Cancel')
      await cancelButton?.trigger('click')
      await wrapper.vm.$nextTick()

      // Dialog should be closed (deleteDialog ref should be false)
      expect(wrapper.vm.deleteDialog).toBe(false)
    })

    it('should delete chart and reload when confirmed', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      mockDeleteChart.mockResolvedValue(undefined)
      const wrapper = createWrapper()
      await flushPromises()

      // Clear previous calls
      mockGetUserCharts.mockClear()
      mockDeleteChart.mockClear()

      // Open dialog
      const deleteButtons = wrapper.findAll('button[data-icon="mdi-delete"]')
      await deleteButtons[0]?.trigger('click')
      await wrapper.vm.$nextTick()

      // Confirm delete
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(btn => btn.text() === 'Delete' && btn.attributes('data-color') === 'error')
      await deleteButton?.trigger('click')
      await flushPromises()

      expect(mockDeleteChart).toHaveBeenCalledWith('1')
      expect(mockGetUserCharts).toHaveBeenCalled() // Just verify it was called to reload
      expect(wrapper.vm.deleteDialog).toBe(false)
      expect(wrapper.vm.chartToDelete).toBeNull()
    })

    it('should handle delete error gracefully', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      mockDeleteChart.mockRejectedValue(new Error('Delete failed'))

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const wrapper = createWrapper()
      await flushPromises()

      // Open dialog
      const deleteButtons = wrapper.findAll('button[data-icon="mdi-delete"]')
      await deleteButtons[0]?.trigger('click')
      await wrapper.vm.$nextTick()

      // Confirm delete
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(btn => btn.text() === 'Delete' && btn.attributes('data-color') === 'error')
      await deleteButton?.trigger('click')
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting chart:', expect.any(Error))
      expect(alertSpy).toHaveBeenCalledWith('Failed to delete chart')

      alertSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Helper Functions', () => {
    it('should return correct icon for chart type', async () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.getChartIcon('bar')).toBe('mdi-chart-bar')
      expect(wrapper.vm.getChartIcon('line')).toBe('mdi-chart-line')
      expect(wrapper.vm.getChartIcon('scatter')).toBe('mdi-chart-scatter-plot')
      expect(wrapper.vm.getChartIcon('pie')).toBe('mdi-chart-pie')
      expect(wrapper.vm.getChartIcon('area')).toBe('mdi-chart-areaspline')
      expect(wrapper.vm.getChartIcon('unknown')).toBe('mdi-chart-box')
    })

    it('should return correct color for chart type', async () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.getChartColor('bar')).toBe('blue')
      expect(wrapper.vm.getChartColor('line')).toBe('green')
      expect(wrapper.vm.getChartColor('scatter')).toBe('orange')
      expect(wrapper.vm.getChartColor('pie')).toBe('purple')
      expect(wrapper.vm.getChartColor('area')).toBe('teal')
      expect(wrapper.vm.getChartColor('unknown')).toBe('grey')
    })

    it('should format date correctly', async () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      await flushPromises()

      const formatted = wrapper.vm.formatDate('2024-01-15T12:30:00.000Z')
      expect(formatted).toMatch(/15\.01\.2024/)
    })

    it('should encode SVG content to base64', async () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      await flushPromises()

      const svg = '<svg><circle /></svg>'
      wrapper.vm.encodeSvg(svg)
      expect(window.btoa).toHaveBeenCalledWith(svg)
    })
  })

  describe('Error Handling', () => {
    it('should handle error when loading charts fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGetUserCharts.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading charts:', expect.any(Error))
      expect(wrapper.vm.loading).toBe(false)

      consoleErrorSpy.mockRestore()
    })
  })
})
