import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import Home from './Home.vue'
import type { SavedChart } from '@chart-generator/shared'
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
vi.mock('../../services/chart.service', () => ({
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

    // Default: return empty array
    mockGetUserCharts.mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createWrapper = () => {
    return mount(Home, {
      global: {
        plugins: [vuetify],
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
          'v-card-subtitle': { template: '<div class="v-card-subtitle"><slot /></div>' },
          'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
          'v-card-actions': { template: '<div class="v-card-actions"><slot /></div>' },
          'v-btn': {
            template: '<button @click="$emit(\'click\')" :data-icon="icon" :data-color="color"><slot /></button>',
            props: ['color', 'size', 'variant', 'icon', 'prependIcon'],
          },
          'v-icon': { template: '<i class="v-icon"><slot /></i>' },
          'v-spacer': { template: '<div class="v-spacer"></div>' },
          'v-progress-circular': { template: '<div class="v-progress-circular">Loading...</div>' },
          'v-dialog': {
            template: '<div class="v-dialog" v-if="modelValue"><slot /></div>',
            props: ['modelValue', 'maxWidth'],
            emits: ['update:modelValue'],
          },
          ChartCard: {
            template: '<div class="chart-card" :data-chart-id="chart.id" @click="$emit(\'edit\', chart.id)"><span class="chart-title">{{ chart.title }}</span><button class="delete-btn" @click.stop="$emit(\'delete\', chart)">Delete</button></div>',
            props: ['chart'],
            emits: ['edit', 'delete'],
          },
          ChartTypeDialog: {
            template: '<div class="chart-type-dialog" v-if="modelValue"></div>',
            props: ['modelValue'],
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
      data: {},
      isPublic: false,
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
      data: {},
      isPublic: false,
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
      data: {},
      isPublic: false,
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
    },
  ]

  describe('Component Mounting and Initialization', () => {
    it('should mount successfully', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      expect(wrapper.exists()).toBe(true)
    })

    it('should load charts on mount', async () => {
      createWrapper()
      await flushPromises()
      expect(mockGetUserCharts).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      mockGetUserCharts.mockImplementation(() => new Promise(() => {})) // Never resolves
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Loading')
    })

    it('should hide loading state after charts are loaded', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()
      expect(wrapper.find('.v-progress-circular').exists()).toBe(false)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no charts exist', async () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      await flushPromises()
      expect(wrapper.text()).toContain('No charts yet')
    })

    it('should have create button in empty state', async () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      await flushPromises()
      const buttons = wrapper.findAll('button')
      const createButton = buttons.find(btn => btn.text().includes('Create Your First Chart'))
      expect(createButton).toBeDefined()
    })

    it('should open chart type dialog when create button is clicked in empty state', async () => {
      mockGetUserCharts.mockResolvedValue([])
      const wrapper = createWrapper()
      await flushPromises()

      const createButton = wrapper.findAll('button').find(btn => btn.text().includes('Create'))
      await createButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showChartTypeDialog).toBe(true)
    })
  })

  describe('Charts Display', () => {
    it('should display charts when loaded', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()

      const chartCards = wrapper.findAll('.chart-card')
      expect(chartCards).toHaveLength(3)
    })

    it('should display chart titles', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.text()).toContain('Sales Chart')
      expect(wrapper.text()).toContain('Revenue Chart')
      expect(wrapper.text()).toContain('Distribution')
    })

  })

  describe('Navigation', () => {
    it('should navigate to generator with chart id when ChartCard emits edit', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()

      const chartCard = wrapper.find('.chart-card')
      await chartCard.trigger('click')

      expect(pushMock).toHaveBeenCalledWith({ name: 'Generator', query: { id: '1' } })
    })
  })

  describe('Delete Functionality', () => {
    it('should open delete dialog when ChartCard emits delete', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()

      const deleteButton = wrapper.find('.delete-btn')
      await deleteButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.deleteDialog).toBe(true)
      expect(wrapper.vm.chartToDelete).toEqual(mockCharts[0])
    })

    it('should show delete confirmation dialog with chart title', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()

      const deleteButton = wrapper.find('.delete-btn')
      await deleteButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Delete Chart?')
      expect(wrapper.text()).toContain('Sales Chart')
    })

    it('should close dialog when cancel is clicked', async () => {
      mockGetUserCharts.mockResolvedValue(mockCharts)
      const wrapper = createWrapper()
      await flushPromises()

      // Open dialog
      const deleteButton = wrapper.find('.delete-btn')
      await deleteButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Click cancel
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find(btn => btn.text() === 'Cancel')
      await cancelButton?.trigger('click')
      await wrapper.vm.$nextTick()

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
      const deleteButton = wrapper.find('.delete-btn')
      await deleteButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Confirm delete
      const buttons = wrapper.findAll('button')
      const confirmDeleteButton = buttons.find(btn => btn.text() === 'Delete' && btn.attributes('data-color') === 'error')
      await confirmDeleteButton?.trigger('click')
      await flushPromises()

      expect(mockDeleteChart).toHaveBeenCalledWith('1')
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
      const deleteButton = wrapper.find('.delete-btn')
      await deleteButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Confirm delete
      const buttons = wrapper.findAll('button')
      const confirmDeleteButton = buttons.find(btn => btn.text() === 'Delete' && btn.attributes('data-color') === 'error')
      await confirmDeleteButton?.trigger('click')
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting chart:', expect.any(Error))
      expect(alertSpy).toHaveBeenCalledWith('Failed to delete chart')

      alertSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })
})
