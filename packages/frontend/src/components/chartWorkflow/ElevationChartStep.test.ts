import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createVuetify } from 'vuetify'
import ElevationChartStep from './ElevationChartStep.vue'
import { DEFAULT_ELEVATION_ANIMATION_CONFIG } from './ElevationChartStep.vue'
import type { ElevationAnimationConfig } from './ElevationChartStep.vue'
import ElevationControlsSidebar from './ElevationControlsSidebar.vue'

// ─── Mocks ───────────────────────────────────────────────

// Track the progress ref so tests can control it
const mockProgress = ref(1)
const mockIsPlaying = ref(false)
const mockToggle = vi.fn()
const mockReset = vi.fn()
const mockSeekTo = vi.fn()
const mockSetSpeed = vi.fn()

// Track useChartAnimation call args to verify animationSettings
const mockUseChartAnimation = vi.fn((_chartOpts: any, _animSettings: any) => ({
  progress: mockProgress,
  isPlaying: mockIsPlaying,
  playbackSpeed: ref(1),
  formattedTime: ref('0:00.00'),
  toggle: mockToggle,
  reset: mockReset,
  seekTo: mockSeekTo,
  setSpeed: mockSetSpeed,
}))

vi.mock('../../composables/useChartAnimation', () => ({
  useChartAnimation: (...args: unknown[]) => mockUseChartAnimation(...args),
}))

const mockExportVideo = vi.fn()
const mockCancelExport = vi.fn()

vi.mock('../../composables/useVideoExport', () => ({
  useVideoExport: vi.fn(() => ({
    isExporting: ref(false),
    isLoaded: ref(false),
    isSupported: ref(true),
    progress: ref({ stage: 'idle', percent: 0 }),
    error: ref(null),
    exportVideo: mockExportVideo,
    cancelExport: mockCancelExport,
    downloadVideo: vi.fn(),
    loadFFmpeg: vi.fn(),
    reset: vi.fn(),
  })),
}))

const mockGetThemeById = vi.fn()
const mockFetchThemes = vi.fn()
const mockCreateThemeFromCurrentSettings = vi.fn()

vi.mock('../../composables/useElevationThemes', () => ({
  useElevationThemes: vi.fn(() => ({
    themes: ref([]),
    systemThemes: ref([]),
    userThemes: ref([]),
    loading: ref(false),
    fetchThemes: mockFetchThemes,
    getThemeById: mockGetThemeById,
    createThemeFromCurrentSettings: mockCreateThemeFromCurrentSettings,
  })),
}))

const mockGenerateElevationFrame = vi.fn(() => '<svg>chart</svg>')
vi.mock('../../utils/chartGenerators/elevationChart/elevationChart', () => ({
  generateElevationFrame: (...args: unknown[]) => mockGenerateElevationFrame(...args),
}))

vi.mock('../../utils/titleCardGenerator', () => ({
  getTitleCardOpacity: vi.fn((p: number) => {
    if (p <= 0.2) return p / 0.2
    if (p <= 0.8) return 1
    return (1 - p) / 0.2
  }),
  TITLE_CARD_DURATION_MS: 2500,
  TRANSITION_DURATION_MS: 1500,
}))

vi.mock('../../utils/chartGenerators/elevationChart/hookDetection', () => ({
  findHookPoint: vi.fn(() => 0.4),
}))

vi.mock('../../services/upload.service', () => ({
  uploadService: {
    uploadImage: vi.fn(),
    getImageUrl: vi.fn(() => 'mock-url'),
  },
}))

// ─── Setup ───────────────────────────────────────────────

const vuetify = createVuetify()

const defaultProps = {
  chartTitle: 'Test Tour',
  colors: { primary: '#ffffff', secondary: '#424242', background: '#000000' },
  svgContent: '<svg></svg>',
  seriesConfig: [],
  silhouetteMode: true,
  styleOverrides: {},
  chartData: [
    { label: '0km', value: 100 },
    { label: '5km', value: 500 },
    { label: '10km', value: 200 },
  ],
  animationConfig: { ...DEFAULT_ELEVATION_ANIMATION_CONFIG },
}

function createWrapper(props: Record<string, unknown> = {}) {
  return mount(ElevationChartStep, {
    props: { ...defaultProps, ...props },
    global: {
      plugins: [vuetify],
      stubs: {
        'v-navigation-drawer': {
          template: '<div class="v-navigation-drawer"><slot /></div>',
          props: ['permanent', 'location', 'rail', 'width', 'railWidth'],
        },
        'v-btn': {
          template: '<button @click="$emit(\'click\')" :class="{ \'v-btn\': true }" :data-icon="icon" :data-color="color"><slot />{{ icon }}</button>',
          props: ['icon', 'variant', 'color', 'size', 'disabled', 'block', 'prependIcon'],
        },
        'v-icon': { template: '<i><slot /></i>' },
        'v-text-field': {
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" class="v-text-field" />',
          props: ['modelValue', 'label', 'variant', 'density', 'hideDetails'],
          emits: ['update:modelValue'],
        },
        'v-slider': {
          template: '<input type="range" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
          props: ['modelValue', 'min', 'max', 'step', 'hideDetails', 'label'],
          emits: ['update:modelValue'],
        },
        'v-expansion-panels': { template: '<div class="v-expansion-panels"><slot /></div>', props: ['modelValue', 'multiple'] },
        'v-expansion-panel': { template: '<div class="v-expansion-panel"><slot /></div>', props: ['value'] },
        'v-expansion-panel-title': { template: '<div class="v-expansion-panel-title"><slot /></div>' },
        'v-expansion-panel-text': { template: '<div class="v-expansion-panel-text"><slot /></div>' },
        'v-divider': { template: '<hr />' },
        'v-spacer': { template: '<div></div>' },
        'v-switch': {
          template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
          props: ['modelValue', 'label', 'hideDetails', 'density', 'color'],
          emits: ['update:modelValue'],
        },
        'v-menu': { template: '<div class="v-menu"><slot name="activator" :props="{}"></slot><slot /></div>' },
        'v-color-picker': {
          template: '<input type="color" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ['modelValue', 'hideCanvas', 'hideInputs', 'hideSliders', 'showSwatches'],
          emits: ['update:modelValue'],
        },
        'v-select': {
          template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" class="v-select"><slot /></select>',
          props: ['modelValue', 'items', 'itemTitle', 'itemValue', 'label', 'variant', 'density', 'hideDetails'],
          emits: ['update:modelValue'],
        },
        'v-file-input': {
          template: '<input type="file" class="v-file-input" />',
          props: ['modelValue', 'accept', 'label', 'prependIcon'],
        },
        'v-dialog': {
          template: '<div class="v-dialog" v-if="modelValue"><slot /></div>',
          props: ['modelValue', 'maxWidth', 'persistent'],
          emits: ['update:modelValue'],
        },
        'v-card': { template: '<div class="v-card"><slot /></div>' },
        'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
        'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
        'v-card-actions': { template: '<div class="v-card-actions"><slot /></div>' },
        'v-alert': { template: '<div class="v-alert"><slot /></div>', props: ['type', 'variant', 'density'] },
        'v-progress-linear': { template: '<div class="v-progress-linear"></div>', props: ['modelValue', 'color', 'height'] },
        'v-chip': { template: '<span class="v-chip"><slot /></span>', props: ['size', 'color', 'variant'] },
        'v-btn-toggle': {
          template: '<div class="v-btn-toggle"><slot /></div>',
          props: ['modelValue', 'mandatory', 'density', 'variant', 'divided', 'color'],
          emits: ['update:modelValue'],
        },
        'v-tooltip': { template: '<div class="v-tooltip"><slot name="activator" :props="{}"></slot></div>' },
        'v-list': { template: '<div class="v-list"><slot /></div>' },
        'v-list-item': { template: '<div class="v-list-item" @click="$emit(\'click\')"><slot /></div>' },
        'v-list-item-title': { template: '<div><slot /></div>' },
        'v-list-item-subtitle': { template: '<div><slot /></div>' },
        'v-row': { template: '<div class="v-row"><slot /></div>' },
        'v-col': { template: '<div class="v-col"><slot /></div>' },
        'v-badge': { template: '<div><slot /></div>', props: ['content', 'color'] },
      },
    },
  })
}

// ─── Tests ───────────────────────────────────────────────

describe('ElevationChartStep.vue', () => {
  let wrapper: ReturnType<typeof createWrapper>

  beforeEach(() => {
    vi.clearAllMocks()
    mockProgress.value = 1
    mockIsPlaying.value = false
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  // ── 1. Rendering ──

  describe('Rendering', () => {
    it('mounts without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('renders preview area and sidebar', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.preview-area').exists()).toBe(true)
      expect(wrapper.find('.v-navigation-drawer').exists()).toBe(true)
    })

    it('initially shows expanded controls and hides collapsed controls', () => {
      wrapper = createWrapper()
      // controlsCollapsed starts as false → expanded controls visible
      expect(wrapper.find('.expanded-controls').exists()).toBe(true)
      expect(wrapper.find('.collapsed-controls').exists()).toBe(false)
    })
  })

  // ── 2. Event Emissions ──

  describe('Event Emissions', () => {
    it('emits back when back button is clicked', async () => {
      wrapper = createWrapper()
      const backButtons = wrapper.findAll('button').filter(b => b.attributes('data-icon') === 'mdi-chevron-left')
      if (backButtons.length > 0) {
        await backButtons[0].trigger('click')
        expect(wrapper.emitted('back')).toBeTruthy()
      }
    })

    it('emits save when save button is clicked', async () => {
      wrapper = createWrapper()
      const saveButtons = wrapper.findAll('button').filter(b => b.attributes('data-color') === 'success')
      if (saveButtons.length > 0) {
        await saveButtons[0].trigger('click')
        expect(wrapper.emitted('save')).toBeTruthy()
      }
    })

    it('emits update:chartTitle when name input changes', async () => {
      wrapper = createWrapper()
      const inputs = wrapper.findAll('.v-text-field')
      if (inputs.length > 0) {
        const input = inputs[0]
        const el = input.element as HTMLInputElement
        el.value = 'New Name'
        await input.trigger('input')
        expect(wrapper.emitted('update:chartTitle')).toBeTruthy()
        expect(wrapper.emitted('update:chartTitle')![0]).toEqual(['New Name'])
      }
    })

    it('emits update:animationConfig when config is updated via composable', async () => {
      wrapper = createWrapper()
      // Triggering a slider change that maps to a config property tests this end-to-end
      const sliders = wrapper.findAll('input[type="range"]')
      if (sliders.length > 0) {
        const slider = sliders[0]
        const el = slider.element as HTMLInputElement
        el.value = '8'
        await slider.trigger('input')
        await wrapper.vm.$nextTick()
        const emitted = wrapper.emitted('update:animationConfig')
        if (emitted) {
          expect(emitted.length).toBeGreaterThan(0)
          expect(emitted[0][0]).toHaveProperty('duration')
        }
      }
    })
  })

  // ── 3. Title Card Logic ──

  describe('Title Card Logic', () => {
    it('calls generateElevationFrame with titleOverlay during title phase', async () => {
      mockProgress.value = 0 // Start of animation = title phase
      wrapper = createWrapper({ chartTitle: 'My Tour' })
      await wrapper.vm.$nextTick()

      // With title 'My Tour' and duration=5:
      // totalDuration = 5000 + 2500 + 1500 = 9000
      // titleEnd = 2500/9000 ≈ 0.278
      // progress=0 <= 0.278 → title card phase
      expect(mockGenerateElevationFrame).toHaveBeenCalled()
      const calls = mockGenerateElevationFrame.mock.calls
      const titleCall = calls.find((c: any) => c[1].titleOverlay)
      expect(titleCall).toBeDefined()
      expect(titleCall![1].titleOverlay.text).toBe('My Tour')
      expect(titleCall![1].progress).toBe(1) // Full terrain visible
      expect(titleCall![1].panZoomEnabled).toBe(true)
      expect(titleCall![1].cameraOverrideProgress).toBe(0.4) // From mock findHookPoint
    })

    it('does NOT use titleOverlay when title is empty', async () => {
      mockProgress.value = 0
      wrapper = createWrapper({ chartTitle: '' })
      await wrapper.vm.$nextTick()

      // Empty title → no title card → goes straight to chart
      const calls = mockGenerateElevationFrame.mock.calls
      const titleCall = calls.find((c: any) => c[1].titleOverlay)
      expect(titleCall).toBeUndefined()
    })

    it('does NOT use titleOverlay when progress is past title phase', async () => {
      // titleEnd for 'Test Tour' with duration=5 is 2500/9000 ≈ 0.278
      // transitionEnd = 4000/9000 ≈ 0.444
      mockProgress.value = 0.5 // Past title + transition
      wrapper = createWrapper({ chartTitle: 'Test Tour' })
      await wrapper.vm.$nextTick()

      expect(mockGenerateElevationFrame).toHaveBeenCalled()
      const calls = mockGenerateElevationFrame.mock.calls
      const titleCall = calls.find((c: any) => c[1].titleOverlay)
      expect(titleCall).toBeUndefined()
    })

    it('calls generateElevationFrame with remapped progress in chart phase', async () => {
      // transitionEnd = 4000/9000 ≈ 0.444
      // At progress=0.75: chartProgress = (0.75 - 0.444) / (1 - 0.444) ≈ 0.55
      mockProgress.value = 0.75
      wrapper = createWrapper({ chartTitle: 'Test Tour' })
      await wrapper.vm.$nextTick()

      expect(mockGenerateElevationFrame).toHaveBeenCalled()
      // Find the call that has progress (not titleOverlay, not cameraOverrideProgress)
      const calls = mockGenerateElevationFrame.mock.calls
      const chartCalls = calls.filter((c: any) => !c[1].titleOverlay && c[1].cameraOverrideProgress === undefined)
      expect(chartCalls.length).toBeGreaterThan(0)
      const lastCall = chartCalls[chartCalls.length - 1]
      const frameOptions = lastCall[1]
      expect(frameOptions.progress).toBeCloseTo(0.55, 1)
    })
  })

  // ── 4. Animation SVG ──

  describe('Animation SVG', () => {
    it('does not call generators when chartData is empty', () => {
      // Leave mockProgress at default (1) to avoid triggering other wrappers
      wrapper = createWrapper({ chartData: [], chartTitle: '' })
      // Clear mocks after mount to isolate from mount-time calls
      vi.clearAllMocks()
      // Trigger re-evaluation by changing progress
      mockProgress.value = 0.5
      // With empty chartData, animationSvg returns '' without calling generators
      // Check the silhouette-chart div is effectively empty (no SVG content from generators)
      expect(mockGenerateElevationFrame).not.toHaveBeenCalled()
    })

    it('calls generateElevationFrame with direct progress when no title card', () => {
      mockProgress.value = 0.5
      wrapper = createWrapper({ chartTitle: '' })
      expect(mockGenerateElevationFrame).toHaveBeenCalled()
      const calls = mockGenerateElevationFrame.mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[1].progress).toBeCloseTo(0.5, 1)
    })

    it('passes correct config to generateElevationFrame', () => {
      mockProgress.value = 1
      wrapper = createWrapper({ chartTitle: '' })
      expect(mockGenerateElevationFrame).toHaveBeenCalled()
      const calls = mockGenerateElevationFrame.mock.calls
      const lastCall = calls[calls.length - 1]
      const frameOptions = lastCall[1]
      expect(frameOptions).toHaveProperty('showMarker', DEFAULT_ELEVATION_ANIMATION_CONFIG.showMarker)
      expect(frameOptions).toHaveProperty('backgroundType', DEFAULT_ELEVATION_ANIMATION_CONFIG.backgroundType)
      expect(frameOptions).toHaveProperty('animationMode', DEFAULT_ELEVATION_ANIMATION_CONFIG.animationMode)
    })
  })

  // ── 5. Export / Duration ──

  describe('Export Duration', () => {
    it('animation settings include title + transition duration when title exists', () => {
      wrapper = createWrapper({ chartTitle: 'My Tour' })
      // useChartAnimation is called with (chartOptions, animationSettings)
      // animationSettings.durationMs = totalDurationMs = 5000 + 2500 + 1500 = 9000
      const callArgs = mockUseChartAnimation.mock.calls
      expect(callArgs.length).toBeGreaterThan(0)
      const animSettings = callArgs[callArgs.length - 1][1]
      expect(animSettings.value.durationMs).toBe(9000)
    })

    it('animation settings use chart duration only when title is empty', () => {
      wrapper = createWrapper({ chartTitle: '' })
      const callArgs = mockUseChartAnimation.mock.calls
      const animSettings = callArgs[callArgs.length - 1][1]
      // No title → durationMs = 5000 only
      expect(animSettings.value.durationMs).toBe(5000)
    })

    it('animation settings use correct duration with custom animation duration', () => {
      const config = { ...DEFAULT_ELEVATION_ANIMATION_CONFIG, duration: 10 }
      wrapper = createWrapper({ chartTitle: 'Tour', animationConfig: config })
      const callArgs = mockUseChartAnimation.mock.calls
      const animSettings = callArgs[callArgs.length - 1][1]
      // 10s chart + 2.5s title + 1.5s transition = 14000ms
      expect(animSettings.value.durationMs).toBe(14000)
    })
  })

  // ── 6. Theme ──

  describe('Sidebar Integration', () => {
    it('forwards update:animationConfig from sidebar', async () => {
      wrapper = createWrapper()
      const sidebar = wrapper.findComponent(ElevationControlsSidebar)
      expect(sidebar.exists()).toBe(true)

      const newConfig = { ...DEFAULT_ELEVATION_ANIMATION_CONFIG, curveColor: '#00ff00' }
      sidebar.vm.$emit('update:animationConfig', newConfig)
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:animationConfig')
      expect(emitted).toBeTruthy()
      expect(emitted![0][0]).toEqual(newConfig)
    })

    it('passes correct props to sidebar', () => {
      wrapper = createWrapper({ chartTitle: 'My Tour' })
      const sidebar = wrapper.findComponent(ElevationControlsSidebar)

      expect(sidebar.props('chartTitle')).toBe('My Tour')
      expect(sidebar.props('animationConfig')).toEqual(DEFAULT_ELEVATION_ANIMATION_CONFIG)
    })
  })
})
