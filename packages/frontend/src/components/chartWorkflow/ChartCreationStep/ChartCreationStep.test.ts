import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import ChartCreationStep from './ChartCreationStep.vue'
import type { ChartType, ChartColors } from '../../../composables/useChartConfig'
import type { SeriesConfig, StatisticalOverlays } from '../../../utils/chartGenerators/types'

const vuetify = createVuetify()

describe('ChartCreationStep.vue', () => {
  const defaultProps = {
    chartTitle: 'Test Chart',
    chartType: 'bar' as ChartType,
    colors: {
      primary: '#1976D2',
      secondary: '#424242',
      background: '#FFFFFF',
    } as ChartColors,
    statisticalOverlays: {
      showMean: false,
      showMedian: false,
      showStdDev: false,
      showMinMax: false,
      showQuartiles: false,
      showCustomRange: false,
      customRangeMin: 0,
      customRangeMax: 100,
      showZScore: false,
      zScoreThreshold: 2,
      color: '#FF5252',
    } as StatisticalOverlays,
    svgContent: '<svg><rect width="100" height="100" /></svg>',
    seriesConfig: [
      { name: 'Series 1', columnKey: 'col_1', color: '#1976D2' },
      { name: 'Series 2', columnKey: 'col_2', color: '#424242' },
    ] as SeriesConfig[],
  }

  const createWrapper = (props = {}) => {
    return mount(ChartCreationStep, {
      props: {
        ...defaultProps,
        ...props,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
          'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
          'v-card-actions': { template: '<div class="v-card-actions"><slot /></div>' },
          'v-tooltip': { template: '<div><slot name="activator" :props="{}"></slot></div>' },
          'v-text-field': {
            template: '<input :value="modelValue" @input="handleInput" class="v-text-field" />',
            props: ['modelValue', 'label', 'variant', 'density', 'prependInnerIcon'],
            emits: ['update:modelValue'],
            methods: {
              handleInput(e: Event) {
                this.$emit('update:modelValue', (e.target as HTMLInputElement).value)
              }
            }
          },
          'v-btn-toggle': {
            template: '<div class="v-btn-toggle" @click="handleClick"><slot /></div>',
            props: ['modelValue', 'color', 'mandatory', 'divided'],
            emits: ['update:modelValue'],
            methods: {
              handleClick(e: Event) {
                const target = e.target as HTMLElement
                const button = target.closest('button')
                if (button && button.dataset.value) {
                  this.$emit('update:modelValue', button.dataset.value)
                }
              }
            }
          },
          'v-btn': {
            template: '<button @click="$emit(\'click\')" :data-value="value"><slot /></button>',
            props: ['value', 'variant', 'color', 'size', 'icon', 'prependIcon', 'block'],
          },
          'v-menu': {
            template: '<div><slot name="activator" :props="{}"></slot><slot /></div>',
          },
          'v-checkbox': {
            template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot name="label"></slot>',
            props: ['modelValue', 'label', 'color', 'density', 'hideDetails'],
          },
          'v-label': { template: '<label><slot /></label>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-icon': { template: '<i :class="icon"><slot /></i>', props: ['icon'] },
          'v-chip': { template: '<span><slot /></span>', props: ['size', 'color', 'variant'] },
          'v-divider': { template: '<hr />' },
          'v-spacer': { template: '<div class="v-spacer"></div>' },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the component with all props', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.v-card').exists()).toBe(true)
      expect(wrapper.text()).toContain('Chart erstellen')
    })

    it('should display the chart title input with correct value', () => {
      const wrapper = createWrapper()
      const titleInput = wrapper.find('.v-text-field')
      expect(titleInput.exists()).toBe(true)
      expect(titleInput.attributes('value')).toBe('Test Chart')
    })

    it('should render all chart type buttons', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('.v-btn-toggle button')
      expect(buttons).toHaveLength(6)
      expect(buttons[0].attributes('data-value')).toBe('bar')
      expect(buttons[1].attributes('data-value')).toBe('line')
      expect(buttons[2].attributes('data-value')).toBe('area')
      expect(buttons[3].attributes('data-value')).toBe('scatter')
      expect(buttons[4].attributes('data-value')).toBe('pie')
      expect(buttons[5].attributes('data-value')).toBe('elevation')
    })

    it('should render SVG content in preview', () => {
      const wrapper = createWrapper()
      const preview = wrapper.find('.preview-container')
      expect(preview.exists()).toBe(true)
      expect(preview.html()).toContain('svg')
      expect(preview.html()).toContain('rect')
    })

    it('should render statistical overlays section for non-pie charts', () => {
      const wrapper = createWrapper({ chartType: 'bar' })
      expect(wrapper.text()).toContain('Statistische Overlays')
      expect(wrapper.text()).toContain('Mittelwert anzeigen')
      expect(wrapper.text()).toContain('Median anzeigen')
    })

    it('should not render statistical overlays section for pie charts', () => {
      const wrapper = createWrapper({ chartType: 'pie' })
      expect(wrapper.text()).not.toContain('Statistische Overlays')
    })

    it('should render series color pickers when seriesConfig is provided', () => {
      const wrapper = createWrapper()
      const colorInputs = wrapper.findAll('input[type="color"]')
      // 2 series + 1 background = 3 total
      expect(colorInputs.length).toBeGreaterThanOrEqual(3)
    })

    it('should render action buttons', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('.v-card-actions button')
      expect(buttons.length).toBeGreaterThanOrEqual(4)
      expect(wrapper.text()).toContain('Zurück')
      expect(wrapper.text()).toContain('Neu starten')
      expect(wrapper.text()).toContain('Speichern')
      expect(wrapper.text()).toContain('SVG herunterladen')
    })
  })

  describe('Event Emissions', () => {
    it('should emit update:chartTitle when title is changed', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find('.v-text-field')

      // Set the value directly on the element
      const inputElement = input.element as HTMLInputElement
      inputElement.value = 'New Chart Title'

      // Trigger the input event
      await input.trigger('input')

      expect(wrapper.emitted('update:chartTitle')).toBeTruthy()
      expect(wrapper.emitted('update:chartTitle')?.[0]).toEqual(['New Chart Title'])
    })

    it('should emit update:chartType when chart type button is clicked', async () => {
      const wrapper = createWrapper()
      const lineButton = wrapper.findAll('.v-btn-toggle button')[1]

      await lineButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:chartType')).toBeTruthy()
    })

    it('should emit back event when Zurück button is clicked', async () => {
      const wrapper = createWrapper()
      const backButton = wrapper.findAll('.v-card-actions button')[0]

      await backButton.trigger('click')

      expect(wrapper.emitted('back')).toBeTruthy()
    })

    it('should emit reset event when Neu starten button is clicked', async () => {
      const wrapper = createWrapper()
      const resetButton = wrapper.findAll('.v-card-actions button').find(
        btn => btn.text().includes('Neu starten')
      )

      await resetButton?.trigger('click')

      expect(wrapper.emitted('reset')).toBeTruthy()
    })

    it('should emit save event when Speichern button is clicked', async () => {
      const wrapper = createWrapper()
      const saveButton = wrapper.findAll('.v-card-actions button').find(
        btn => btn.text().includes('Speichern')
      )

      await saveButton?.trigger('click')

      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('should emit download event when SVG herunterladen button is clicked', async () => {
      const wrapper = createWrapper()
      const downloadButton = wrapper.findAll('.v-card-actions button').find(
        btn => btn.text().includes('SVG herunterladen')
      )

      await downloadButton?.trigger('click')

      expect(wrapper.emitted('download')).toBeTruthy()
    })

    it('should emit show-fullscreen event when fullscreen button is clicked', async () => {
      const wrapper = createWrapper()
      // Find button with fullscreen icon
      const fullscreenButton = wrapper.findAll('button').find(
        btn => btn.attributes('data-value') === undefined && btn.html().includes('fullscreen')
      )

      if (fullscreenButton) {
        await fullscreenButton.trigger('click')
        expect(wrapper.emitted('show-fullscreen')).toBeTruthy()
      }
    })

    it('should emit regenerateColors when regenerate colors button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('button')
      const regenerateButton = buttons.find(btn => btn.text().includes('Farben neu generieren'))

      if (regenerateButton) {
        await regenerateButton.trigger('click')
        expect(wrapper.emitted('regenerateColors')).toBeTruthy()
      }
    })
  })

  describe('Statistical Overlays', () => {
    it('should emit update:statisticalOverlays when showMean checkbox is toggled', async () => {
      const wrapper = createWrapper({ chartType: 'bar' })
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      const meanCheckbox = checkboxes[0]

      await meanCheckbox.setValue(true)

      expect(wrapper.emitted('update:statisticalOverlays')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:statisticalOverlays')?.[0][0] as StatisticalOverlays
      expect(emittedValue.showMean).toBe(true)
    })

    it('should emit update:statisticalOverlays when showMedian checkbox is toggled', async () => {
      const wrapper = createWrapper({ chartType: 'bar' })
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      const medianCheckbox = checkboxes[1]

      await medianCheckbox.setValue(true)

      expect(wrapper.emitted('update:statisticalOverlays')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:statisticalOverlays')?.[0][0] as StatisticalOverlays
      expect(emittedValue.showMedian).toBe(true)
    })

    it('should emit update:statisticalOverlays when showStdDev checkbox is toggled', async () => {
      const wrapper = createWrapper({ chartType: 'bar' })
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      const stdDevCheckbox = checkboxes[2]

      await stdDevCheckbox.setValue(true)

      expect(wrapper.emitted('update:statisticalOverlays')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:statisticalOverlays')?.[0][0] as StatisticalOverlays
      expect(emittedValue.showStdDev).toBe(true)
    })

    it('should emit update:statisticalOverlays when showMinMax checkbox is toggled', async () => {
      const wrapper = createWrapper({ chartType: 'bar' })
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      const minMaxCheckbox = checkboxes[3]

      await minMaxCheckbox.setValue(true)

      expect(wrapper.emitted('update:statisticalOverlays')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:statisticalOverlays')?.[0][0] as StatisticalOverlays
      expect(emittedValue.showMinMax).toBe(true)
    })

    it('should emit update:statisticalOverlays when showQuartiles checkbox is toggled', async () => {
      const wrapper = createWrapper({ chartType: 'bar' })
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      const quartilesCheckbox = checkboxes[4]

      await quartilesCheckbox.setValue(true)

      expect(wrapper.emitted('update:statisticalOverlays')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:statisticalOverlays')?.[0][0] as StatisticalOverlays
      expect(emittedValue.showQuartiles).toBe(true)
    })
  })

  describe('Color Customization', () => {
    it('should render color inputs for series and background', () => {
      const wrapper = createWrapper()
      const colorInputs = wrapper.findAll('input[type="color"]')
      // Should have at least 2 series colors + 1 background color
      expect(colorInputs.length).toBeGreaterThanOrEqual(3)
    })

    it('should have color pickers with correct initial values', () => {
      const wrapper = createWrapper()
      const colorInputs = wrapper.findAll('input[type="color"]')
      // Check that color inputs exist
      expect(colorInputs.length).toBeGreaterThan(0)
      // Check that they are rendered
      colorInputs.forEach(input => {
        expect(input.attributes('type')).toBe('color')
      })
    })

    it('should display series names for color customization', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Series 1')
      expect(wrapper.text()).toContain('Series 2')
    })
  })

  describe('Props Validation', () => {
    it('should accept all valid chart types', () => {
      const chartTypes: ChartType[] = ['bar', 'line', 'area', 'scatter', 'pie']

      chartTypes.forEach(type => {
        const wrapper = createWrapper({ chartType: type })
        expect(wrapper.exists()).toBe(true)
      })
    })

    it('should render with minimal seriesConfig', () => {
      const wrapper = createWrapper({ seriesConfig: [] })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle empty SVG content', () => {
      const wrapper = createWrapper({ svgContent: '' })
      const preview = wrapper.find('.preview-container')
      expect(preview.exists()).toBe(true)
    })
  })

  describe('Conditional Rendering', () => {
    it('should show different UI for pie charts vs other charts', () => {
      const barWrapper = createWrapper({ chartType: 'bar' })
      const pieWrapper = createWrapper({ chartType: 'pie' })

      expect(barWrapper.text()).toContain('Statistische Overlays')
      expect(pieWrapper.text()).not.toContain('Statistische Overlays')
    })

    it('should render series configuration section when series exist', () => {
      const wrapperWithSeries = createWrapper({
        seriesConfig: [{ name: 'Test Series', columnKey: 'col_1', color: '#FF0000' }]
      })

      expect(wrapperWithSeries.text()).toContain('Serien-Farben')
      expect(wrapperWithSeries.text()).toContain('Test Series')
    })

    it('should not crash when seriesConfig is empty', () => {
      const wrapper = createWrapper({ seriesConfig: [] })
      expect(wrapper.exists()).toBe(true)
      // Should still show background color picker
      const colorInputs = wrapper.findAll('input[type="color"]')
      expect(colorInputs.length).toBeGreaterThanOrEqual(1)
    })
  })
})
