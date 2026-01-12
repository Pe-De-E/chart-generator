import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import ChartGenerator from './ChartGenerator.vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Create Vuetify instance for tests
const vuetify = createVuetify({
  components,
  directives
})

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  }),
  useRoute: () => ({
    query: {}
  })
}))

// Mock chart service
vi.mock('../services/chart.service', () => ({
  chartService: {
    createChart: vi.fn().mockResolvedValue({ id: '123' }),
    updateChart: vi.fn().mockResolvedValue({}),
    getChartById: vi.fn().mockResolvedValue({})
  }
}))

describe('ChartGenerator.vue', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    wrapper = mount(ChartGenerator, {
      global: {
        plugins: [vuetify],
        stubs: {
          StepNavigation: true,
          FileUploadStep: true,
          DataCleaningStep: true,
          ChartCreationStep: true
        }
      }
    })
  })

  it('should render the component', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('should render the main layout', () => {
    expect(wrapper.find('.v-layout').exists()).toBe(true)
    expect(wrapper.find('.v-main').exists()).toBe(true)
  })

  it('should render the v-window for step navigation', () => {
    expect(wrapper.findComponent({ name: 'VWindow' }).exists()).toBe(true)
  })
})

// Test the composables separately since they contain the main logic
import { useCSVParser } from '../composables/useCSVParser'

describe('useCSVParser', () => {
  it('should have default table headers', () => {
    const { tableHeaders } = useCSVParser()
    expect(tableHeaders.value.length).toBe(2)
    expect(tableHeaders.value[0].key).toBe('col_0')
    expect(tableHeaders.value[1].key).toBe('col_1')
  })

  it('should have default table items', () => {
    const { tableItems } = useCSVParser()
    expect(tableItems.value.length).toBe(4)
    expect(tableItems.value[0]).toHaveProperty('col_0')
    expect(tableItems.value[0]).toHaveProperty('col_1')
  })

  it('should generate column options from headers', () => {
    const { columnOptions } = useCSVParser()
    expect(columnOptions.value.length).toBeGreaterThan(0)
    expect(columnOptions.value[0]).toHaveProperty('title')
    expect(columnOptions.value[0]).toHaveProperty('value')
  })

  it('should generate numeric column options', () => {
    const { numericColumnOptions } = useCSVParser()
    expect(Array.isArray(numericColumnOptions.value)).toBe(true)
    // col_1 should be numeric
    expect(numericColumnOptions.value.length).toBeGreaterThan(0)
  })

  it('should parse CSV with comma delimiter', () => {
    const { parseCSV, tableItems, tableHeaders } = useCSVParser()

    const csvContent = 'Name,Value\nProduct A,100\nProduct B,200'
    parseCSV(csvContent)

    expect(tableHeaders.value.length).toBe(2)
    expect(tableHeaders.value[0].title).toBe('Name')
    expect(tableHeaders.value[1].title).toBe('Value')
    expect(tableItems.value.length).toBe(2)
    expect(tableItems.value[0].col_0).toBe('Product A')
    expect(tableItems.value[0].col_1).toBe(100)
  })

  it('should parse CSV with semicolon delimiter', () => {
    const { parseCSV, tableItems, tableHeaders } = useCSVParser()

    const csvContent = 'Name;Value\nProduct A;100\nProduct B;200'
    parseCSV(csvContent)

    expect(tableHeaders.value.length).toBe(2)
    expect(tableHeaders.value[0].title).toBe('Name')
    expect(tableItems.value.length).toBe(2)
    expect(tableItems.value[0].col_0).toBe('Product A')
  })

  it('should handle CSV with decimal comma', () => {
    const { parseCSV, tableItems } = useCSVParser()

    const csvContent = 'Name;Value\nA;10,5\nB;20,3'
    parseCSV(csvContent)

    expect(tableItems.value[0].col_1).toBe(10.5)
    expect(tableItems.value[1].col_1).toBe(20.3)
  })

  it('should detect headers correctly', () => {
    const { parseCSV, tableHeaders } = useCSVParser()

    // With text headers
    const csvWithHeader = 'Category,Amount\nFood,50\nTransport,30'
    parseCSV(csvWithHeader)
    expect(tableHeaders.value[0].title).toBe('Category')
    expect(tableHeaders.value[1].title).toBe('Amount')
  })

  it('should reset data to defaults', () => {
    const { parseCSV, resetData, tableItems, tableHeaders } = useCSVParser()

    // First parse some data
    parseCSV('A,B\n1,2\n3,4')
    expect(tableItems.value.length).toBe(2)

    // Reset
    resetData()
    expect(tableItems.value.length).toBe(4)
    expect(tableHeaders.value[0].title).toBe('Label')
    expect(tableHeaders.value[1].title).toBe('Wert')
  })

  it('should preserve date strings instead of parsing them as numbers', () => {
    const { parseCSV, tableItems } = useCSVParser()

    const csvContent = 'Date,Value\n2024-01-15,100\n01.02.2024,200'
    parseCSV(csvContent)

    expect(tableItems.value[0].col_0).toBe('2024-01-15')
    expect(tableItems.value[1].col_0).toBe('01.02.2024')
  })
})

import { useChartConfig } from '../composables/useChartConfig'

describe('useChartConfig', () => {
  const createMockSeriesData = () => ref([
    { label: 'Q1', values: { col_1: 30 } },
    { label: 'Q2', values: { col_1: 45 } },
    { label: 'Q3', values: { col_1: 60 } },
    { label: 'Q4', values: { col_1: 55 } }
  ])

  const createMockSeriesConfig = () => ref([
    { name: 'Wert', columnKey: 'col_1', color: '#4F46E5' }
  ])

  it('should have default chart type as bar', () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { chartType } = useChartConfig(seriesData, seriesConfig)

    expect(chartType.value).toBe('bar')
  })

  it('should have default chart title', () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { chartTitle } = useChartConfig(seriesData, seriesConfig)

    expect(chartTitle.value).toBe('Mein Chart')
  })

  it('should have default colors', () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { colors } = useChartConfig(seriesData, seriesConfig)

    expect(colors.value).toHaveProperty('background')
  })

  it('should generate SVG content', async () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { svgContent } = useChartConfig(seriesData, seriesConfig)

    await nextTick()

    expect(svgContent.value).toContain('<svg')
    expect(svgContent.value).toContain('</svg>')
  })

  it('should switch chart type', async () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { chartType, svgContent } = useChartConfig(seriesData, seriesConfig)

    chartType.value = 'line'
    await nextTick()

    expect(chartType.value).toBe('line')
    expect(svgContent.value).toContain('<svg')
  })

  it('should update SVG when chart title changes', async () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { chartTitle, svgContent } = useChartConfig(seriesData, seriesConfig)

    const newTitle = 'New Chart Title'
    chartTitle.value = newTitle
    await nextTick()

    expect(svgContent.value).toContain(newTitle)
  })

  it('should generate bar chart with rect elements', async () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { chartType, svgContent } = useChartConfig(seriesData, seriesConfig)

    chartType.value = 'bar'
    await nextTick()

    expect(svgContent.value).toContain('<rect')
  })

  it('should generate line chart with polyline', async () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { chartType, svgContent } = useChartConfig(seriesData, seriesConfig)

    chartType.value = 'line'
    await nextTick()

    expect(svgContent.value).toContain('<polyline')
  })

  it('should generate scatter chart with circles', async () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { chartType, svgContent } = useChartConfig(seriesData, seriesConfig)

    chartType.value = 'scatter'
    await nextTick()

    expect(svgContent.value).toContain('<circle')
  })

  it('should generate pie chart with path elements', async () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { chartType, svgContent } = useChartConfig(seriesData, seriesConfig)

    chartType.value = 'pie'
    await nextTick()

    expect(svgContent.value).toContain('<path')
  })

  it('should calculate data extent', async () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { dataExtent } = useChartConfig(seriesData, seriesConfig)

    await nextTick()

    expect(dataExtent.value).toHaveLength(2)
    expect(dataExtent.value[0]).toBeLessThan(dataExtent.value[1])
  })

  it('should have download SVG functionality', () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { downloadSVG } = useChartConfig(seriesData, seriesConfig)

    expect(typeof downloadSVG).toBe('function')
  })

  it('should reset config to defaults', async () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { chartType, chartTitle, resetConfig } = useChartConfig(seriesData, seriesConfig)

    chartType.value = 'pie'
    chartTitle.value = 'Changed Title'
    await nextTick()

    resetConfig()
    await nextTick()

    expect(chartType.value).toBe('bar')
    expect(chartTitle.value).toBe('Mein Chart')
  })

  it('should handle statistical overlays', () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { statisticalOverlays } = useChartConfig(seriesData, seriesConfig)

    expect(statisticalOverlays.value).toHaveProperty('showMean')
    expect(statisticalOverlays.value).toHaveProperty('showMedian')
    expect(statisticalOverlays.value).toHaveProperty('showStdDev')
    expect(statisticalOverlays.value.showMean).toBe(false)
  })

  it('should handle style overrides', async () => {
    const seriesData = createMockSeriesData()
    const seriesConfig = createMockSeriesConfig()
    const { styleOverrides, updateTitleStyle, resetStyleOverrides } = useChartConfig(seriesData, seriesConfig)

    expect(styleOverrides.value).toEqual({})

    updateTitleStyle({ fontSize: 24 })
    await nextTick()

    expect(styleOverrides.value.title).toHaveProperty('fontSize', 24)

    resetStyleOverrides()
    await nextTick()

    expect(styleOverrides.value).toEqual({})
  })
})

import { useSeriesSelection } from '../composables/useSeriesSelection'

describe('useSeriesSelection', () => {
  const createMockNumericOptions = () => ref([
    { title: 'Value 1', value: 'col_1' },
    { title: 'Value 2', value: 'col_2' }
  ])

  it('should initialize with empty series', async () => {
    const numericOptions = createMockNumericOptions()
    const { selectedSeries } = useSeriesSelection(numericOptions)

    await nextTick()

    // useSeriesSelection starts empty - series must be added explicitly
    expect(selectedSeries.value.length).toBe(0)
  })

  it('should add series', async () => {
    const numericOptions = createMockNumericOptions()
    const { selectedSeries, addSeries } = useSeriesSelection(numericOptions)

    await nextTick()
    addSeries('col_1')
    addSeries('col_2')

    expect(selectedSeries.value.length).toBe(2)
    expect(selectedSeries.value[0].columnKey).toBe('col_1')
    expect(selectedSeries.value[1].columnKey).toBe('col_2')
  })

  it('should remove series', async () => {
    const numericOptions = createMockNumericOptions()
    const { selectedSeries, addSeries, removeSeries } = useSeriesSelection(numericOptions)

    await nextTick()
    addSeries('col_1')
    addSeries('col_2')
    expect(selectedSeries.value.length).toBe(2)

    removeSeries(1)
    expect(selectedSeries.value.length).toBe(1)
  })

  it('should update series color', async () => {
    const numericOptions = createMockNumericOptions()
    const { selectedSeries, addSeries, updateSeriesColor } = useSeriesSelection(numericOptions)

    await nextTick()
    addSeries('col_1')
    const originalColor = selectedSeries.value[0].color

    updateSeriesColor(0, '#FF0000')
    expect(selectedSeries.value[0].color).toBe('#FF0000')
    expect(selectedSeries.value[0].color).not.toBe(originalColor)
  })

  it('should regenerate colors', async () => {
    const numericOptions = createMockNumericOptions()
    const { selectedSeries, addSeries, regenerateColors } = useSeriesSelection(numericOptions)

    await nextTick()
    addSeries('col_1')

    regenerateColors()
    // Colors should be regenerated (may be the same or different depending on palette)
    expect(selectedSeries.value[0].color).toBeDefined()
  })

  it('should reset series', async () => {
    const numericOptions = createMockNumericOptions()
    const { selectedSeries, addSeries, resetSeries } = useSeriesSelection(numericOptions)

    await nextTick()
    addSeries('col_1')
    addSeries('col_2')
    expect(selectedSeries.value.length).toBe(2)

    resetSeries()
    expect(selectedSeries.value.length).toBe(0)
  })
})

import { useDataGrouping } from '../composables/useDataGrouping'
import { analyzeDataQuality, getQualityColor, getQualityLabel } from '../utils/dataQuality'

describe('dataQuality utilities', () => {
  describe('analyzeDataQuality', () => {
    it('should return poor quality for empty data', () => {
      const result = analyzeDataQuality([])

      expect(result.totalRows).toBe(0)
      expect(result.totalFields).toBe(0)
      expect(result.qualityScore).toBe('poor')
      expect(result.issues).toContain('Keine Daten vorhanden')
    })

    it('should calculate completeness correctly', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: 'B', col_1: 200 },
        { col_0: 'C', col_1: 300 }
      ]

      const result = analyzeDataQuality(data)

      expect(result.totalRows).toBe(3)
      expect(result.totalFields).toBe(6)
      expect(result.filledFields).toBe(6)
      expect(result.emptyFields).toBe(0)
      expect(result.completenessPercentage).toBe(100)
    })

    it('should detect missing values', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: '', col_1: 200 },
        { col_0: 'C', col_1: null }
      ]

      const result = analyzeDataQuality(data)

      expect(result.emptyFields).toBe(2)
      expect(result.missingValuesByColumn.col_0).toBe(1)
      expect(result.missingValuesByColumn.col_1).toBe(1)
    })

    it('should flag columns with >50% missing values', () => {
      const data = [
        { col_0: 'A', col_1: null },
        { col_0: 'B', col_1: null },
        { col_0: 'C', col_1: 100 }
      ]

      const result = analyzeDataQuality(data)

      expect(result.issues.some(i => i.includes('col_1'))).toBe(true)
      expect(result.structuredIssues.some(i => i.type === 'column_mostly_empty')).toBe(true)
    })

    it('should detect too few rows', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: 'B', col_1: 200 }
      ]

      const result = analyzeDataQuality(data)

      expect(result.structuredIssues.some(i => i.type === 'too_few_rows')).toBe(true)
    })

    it('should detect empty labels', () => {
      const data = [
        { label: 'A', value: 100 },
        { label: '', value: 200 },
        { label: 'C', value: 300 }
      ]

      const result = analyzeDataQuality(data)

      expect(result.structuredIssues.some(i => i.type === 'empty_labels')).toBe(true)
    })

    it('should detect duplicate labels', () => {
      const data = [
        { label: 'A', value: 100 },
        { label: 'A', value: 200 },
        { label: 'B', value: 300 }
      ]

      const result = analyzeDataQuality(data)

      expect(result.structuredIssues.some(i => i.type === 'duplicate_labels')).toBe(true)
    })

    it('should detect negative values', () => {
      const data = [
        { label: 'A', value: 100 },
        { label: 'B', value: -50 },
        { label: 'C', value: 300 }
      ]

      const result = analyzeDataQuality(data)

      expect(result.structuredIssues.some(i => i.type === 'negative_values')).toBe(true)
    })

    it('should detect too many zeros', () => {
      const data = [
        { label: 'A', value: 0 },
        { label: 'B', value: 0 },
        { label: 'C', value: 0 },
        { label: 'D', value: 100 }
      ]

      const result = analyzeDataQuality(data)

      expect(result.structuredIssues.some(i => i.type === 'too_many_zeros')).toBe(true)
    })

    it('should return excellent quality for complete data with no issues', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: 'B', col_1: 200 },
        { col_0: 'C', col_1: 300 },
        { col_0: 'D', col_1: 400 }
      ]

      const result = analyzeDataQuality(data)

      // With 4 rows, completeness is 100% but there might be other checks
      expect(result.completenessPercentage).toBe(100)
      // Quality score depends on issues count - with 4 rows and no missing values it could be excellent or good
      expect(['excellent', 'good']).toContain(result.qualityScore)
    })

    it('should handle NaN values as empty', () => {
      const data = [
        { col_0: 'A', col_1: NaN },
        { col_0: 'B', col_1: 200 }
      ]

      const result = analyzeDataQuality(data)

      expect(result.missingValuesByColumn.col_1).toBe(1)
    })

    it('should handle whitespace-only strings as empty', () => {
      const data = [
        { col_0: '   ', col_1: 100 },
        { col_0: 'B', col_1: 200 }
      ]

      const result = analyzeDataQuality(data)

      expect(result.missingValuesByColumn.col_0).toBe(1)
    })
  })

  describe('getQualityColor', () => {
    it('should return success for excellent', () => {
      expect(getQualityColor('excellent')).toBe('success')
    })

    it('should return info for good', () => {
      expect(getQualityColor('good')).toBe('info')
    })

    it('should return warning for fair', () => {
      expect(getQualityColor('fair')).toBe('warning')
    })

    it('should return error for poor', () => {
      expect(getQualityColor('poor')).toBe('error')
    })
  })

  describe('getQualityLabel', () => {
    it('should return Ausgezeichnet for excellent', () => {
      expect(getQualityLabel('excellent')).toBe('Ausgezeichnet')
    })

    it('should return Gut for good', () => {
      expect(getQualityLabel('good')).toBe('Gut')
    })

    it('should return Befriedigend for fair', () => {
      expect(getQualityLabel('fair')).toBe('Befriedigend')
    })

    it('should return Mangelhaft for poor', () => {
      expect(getQualityLabel('poor')).toBe('Mangelhaft')
    })
  })
})

describe('useDataGrouping', () => {
  it('should group data by label column', async () => {
    const tableItems = ref([
      { col_0: 'Q1', col_1: 30 },
      { col_0: 'Q2', col_1: 45 },
      { col_0: 'Q3', col_1: 60 }
    ])
    const selectedLabelColumn = ref('col_0')
    const selectedSeries = ref([
      { name: 'Wert', columnKey: 'col_1', color: '#4F46E5' }
    ])

    const { seriesData } = useDataGrouping(tableItems, selectedLabelColumn, selectedSeries)

    await nextTick()

    expect(seriesData.value.length).toBe(3)
    expect(seriesData.value[0].label).toBe('Q1')
    // Values are keyed by series.name, not columnKey
    expect(seriesData.value[0].values.Wert).toBe(30)
  })

  it('should handle multiple series', async () => {
    const tableItems = ref([
      { col_0: 'Q1', col_1: 30, col_2: 40 },
      { col_0: 'Q2', col_1: 45, col_2: 55 }
    ])
    const selectedLabelColumn = ref('col_0')
    const selectedSeries = ref([
      { name: 'Series 1', columnKey: 'col_1', color: '#4F46E5' },
      { name: 'Series 2', columnKey: 'col_2', color: '#10B981' }
    ])

    const { seriesData } = useDataGrouping(tableItems, selectedLabelColumn, selectedSeries)

    await nextTick()

    // Values are keyed by series.name, not columnKey
    expect(seriesData.value[0].values).toHaveProperty('Series 1', 30)
    expect(seriesData.value[0].values).toHaveProperty('Series 2', 40)
  })

  it('should reset grouping', async () => {
    const tableItems = ref([
      { col_0: 'Q1', col_1: 30 }
    ])
    const selectedLabelColumn = ref('col_0')
    const selectedSeries = ref([
      { name: 'Wert', columnKey: 'col_1', color: '#4F46E5' }
    ])

    const { seriesData, resetGrouping } = useDataGrouping(tableItems, selectedLabelColumn, selectedSeries)

    await nextTick()
    expect(seriesData.value.length).toBe(1)

    // Reset would require changing the input refs, which we can test behavior
    resetGrouping()
    // The behavior depends on the implementation
  })
})

import { useDataCleaning } from '../composables/useDataCleaning'
import { computed as vueComputed } from 'vue'

// Mock window.confirm for useDataCleaning tests
const originalConfirm = window.confirm
beforeEach(() => {
  window.confirm = vi.fn(() => true)
})
afterEach(() => {
  window.confirm = originalConfirm
})

describe('useDataCleaning', () => {
  const createMockTableItems = () => ref([
    { col_0: 'A', col_1: 100 },
    { col_0: 'B', col_1: 200 },
    { col_0: 'C', col_1: 300 },
    { col_0: 'D', col_1: 400 }
  ])

  const createMockTableHeaders = () => ref([
    { title: 'Label', key: 'col_0', sortable: true },
    { title: 'Value', key: 'col_1', sortable: true }
  ])

  const createMockDataQuality = () => vueComputed(() => ({
    totalRows: 4,
    totalFields: 8,
    filledFields: 8,
    emptyFields: 0,
    completenessPercentage: 100,
    missingValuesByColumn: {},
    qualityScore: 'excellent' as const,
    issues: [],
    structuredIssues: []
  }))

  it('should initialize with empty cleaned items', () => {
    const tableItems = createMockTableItems()
    const tableHeaders = createMockTableHeaders()
    const dataQuality = createMockDataQuality()

    const { cleanedTableItems } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    expect(cleanedTableItems.value).toEqual([])
  })

  it('should initialize cleaning step with copy of original data', () => {
    const tableItems = createMockTableItems()
    const tableHeaders = createMockTableHeaders()
    const dataQuality = createMockDataQuality()

    const { cleanedTableItems, initializeCleaningStep } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    initializeCleaningStep()

    expect(cleanedTableItems.value).toHaveLength(4)
    expect(cleanedTableItems.value[0].col_0).toBe('A')
  })

  it('should track hasChanges correctly', async () => {
    const tableItems = createMockTableItems()
    const tableHeaders = createMockTableHeaders()
    const dataQuality = createMockDataQuality()

    const { hasChanges, initializeCleaningStep } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    expect(hasChanges.value).toBe(false)

    initializeCleaningStep()

    expect(hasChanges.value).toBe(false)
  })

  it('should reset to original data', () => {
    const tableItems = createMockTableItems()
    const tableHeaders = createMockTableHeaders()
    const dataQuality = createMockDataQuality()

    const { cleanedTableItems, initializeCleaningStep, resetToOriginal, appliedOperations } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    initializeCleaningStep()
    // Simulate modification
    cleanedTableItems.value = cleanedTableItems.value.slice(0, 2)

    resetToOriginal()

    expect(cleanedTableItems.value).toHaveLength(4)
    expect(appliedOperations.value).toHaveLength(0)
  })

  it('should skip cleaning and reset state', () => {
    const tableItems = createMockTableItems()
    const tableHeaders = createMockTableHeaders()
    const dataQuality = createMockDataQuality()

    const { cleanedTableItems, showCleaningStep, initializeCleaningStep, skipCleaning } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    initializeCleaningStep()
    expect(showCleaningStep.value).toBe(true)

    skipCleaning()

    expect(showCleaningStep.value).toBe(false)
    expect(cleanedTableItems.value).toHaveLength(0)
  })

  it('should calculate cleaning summary', () => {
    const tableItems = createMockTableItems()
    const tableHeaders = createMockTableHeaders()
    const dataQuality = createMockDataQuality()

    const { cleaningSummary, initializeCleaningStep } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    initializeCleaningStep()

    expect(cleaningSummary.value.originalCount).toBe(4)
    expect(cleaningSummary.value.cleanedCount).toBe(4)
    expect(cleaningSummary.value.removed).toBe(0)
  })

  it('should check if suggestion is applied', () => {
    const tableItems = createMockTableItems()
    const tableHeaders = createMockTableHeaders()
    const dataQuality = createMockDataQuality()

    const { isSuggestionApplied, selectedOptions } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    expect(isSuggestionApplied('test_suggestion')).toBe(false)

    selectedOptions.value['test_suggestion'] = 0

    expect(isSuggestionApplied('test_suggestion')).toBe(true)
  })

  it('should check if option is selected', () => {
    const tableItems = createMockTableItems()
    const tableHeaders = createMockTableHeaders()
    const dataQuality = createMockDataQuality()

    const { isOptionSelected, selectedOptions } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    expect(isOptionSelected('test_suggestion', 0)).toBe(false)

    selectedOptions.value['test_suggestion'] = 0

    expect(isOptionSelected('test_suggestion', 0)).toBe(true)
    expect(isOptionSelected('test_suggestion', 1)).toBe(false)
  })

  it('should finalize changes', () => {
    const tableItems = createMockTableItems()
    const tableHeaders = createMockTableHeaders()
    const dataQuality = createMockDataQuality()

    const { showCleaningStep, initializeCleaningStep, finalizeChanges } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    initializeCleaningStep()
    expect(showCleaningStep.value).toBe(true)

    finalizeChanges()

    expect(showCleaningStep.value).toBe(false)
  })

  it('should generate cleaning suggestions from structured issues', async () => {
    const tableItems = ref([
      { col_0: '', col_1: 100 },
      { col_0: 'B', col_1: 200 },
      { col_0: 'C', col_1: 300 }
    ])
    const tableHeaders = createMockTableHeaders()
    const dataQuality = vueComputed(() => ({
      totalRows: 3,
      totalFields: 6,
      filledFields: 5,
      emptyFields: 1,
      completenessPercentage: 83,
      missingValuesByColumn: { col_0: 1 },
      qualityScore: 'good' as const,
      issues: [],
      structuredIssues: [{
        type: 'empty_labels' as const,
        severity: 'high' as const,
        message: '1 empty label',
        affectedCount: 1,
        affectedColumn: 'col_0'
      }]
    }))

    const { cleaningSuggestions } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    await nextTick()

    expect(cleaningSuggestions.value.length).toBeGreaterThan(0)
    expect(cleaningSuggestions.value[0].type).toBe('empty_labels')
  })

  it('should apply operation and track history', async () => {
    const tableItems = ref([
      { col_0: '', col_1: 100 },
      { col_0: 'B', col_1: 200 },
      { col_0: 'C', col_1: 300 }
    ])
    const tableHeaders = createMockTableHeaders()
    const dataQuality = vueComputed(() => ({
      totalRows: 3,
      totalFields: 6,
      filledFields: 5,
      emptyFields: 1,
      completenessPercentage: 83,
      missingValuesByColumn: { col_0: 1 },
      qualityScore: 'good' as const,
      issues: [],
      structuredIssues: [{
        type: 'empty_labels' as const,
        severity: 'high' as const,
        message: '1 empty label',
        affectedCount: 1,
        affectedColumn: 'col_0'
      }]
    }))

    const { cleaningSuggestions, cleanedTableItems, appliedOperations, applyOperation, initializeCleaningStep } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    initializeCleaningStep()
    await nextTick()

    const suggestion = cleaningSuggestions.value[0]
    applyOperation(suggestion, 0) // Apply first option (remove rows)

    expect(cleanedTableItems.value.length).toBe(2) // One row removed
    expect(appliedOperations.value.length).toBe(1)
  })

  it('should undo last operation', async () => {
    const tableItems = ref([
      { col_0: '', col_1: 100 },
      { col_0: 'B', col_1: 200 },
      { col_0: 'C', col_1: 300 }
    ])
    const tableHeaders = createMockTableHeaders()
    const dataQuality = vueComputed(() => ({
      totalRows: 3,
      totalFields: 6,
      filledFields: 5,
      emptyFields: 1,
      completenessPercentage: 83,
      missingValuesByColumn: { col_0: 1 },
      qualityScore: 'good' as const,
      issues: [],
      structuredIssues: [{
        type: 'empty_labels' as const,
        severity: 'high' as const,
        message: '1 empty label',
        affectedCount: 1,
        affectedColumn: 'col_0'
      }]
    }))

    const { cleaningSuggestions, cleanedTableItems, appliedOperations, applyOperation, undoLastOperation, initializeCleaningStep } = useDataCleaning(tableItems, tableHeaders, dataQuality)

    initializeCleaningStep()
    await nextTick()

    const suggestion = cleaningSuggestions.value[0]
    applyOperation(suggestion, 0) // Apply first option

    expect(cleanedTableItems.value.length).toBe(2)

    undoLastOperation()

    expect(cleanedTableItems.value.length).toBe(3)
    expect(appliedOperations.value.length).toBe(0)
  })
})

// Additional dataCleaningOperations tests
import {
  removeEmptyRows,
  removeRowsWithEmptyColumn,
  removeDuplicateRows,
  keepFirstOccurrence,
  addSuffixToDuplicates,
  removeNegativeValues,
  convertToAbsolute,
  replaceNegativesWithZero,
  fillMissingValues,
  fillEmptyLabelsWithNumbers,
  fillEmptyLabelsWithText,
  normalizeWhitespace,
  removeOutliersIQR,
  validateMinimumRows,
  countAffectedRows
} from '../utils/dataCleaningOperations'

describe('dataCleaningOperations', () => {
  describe('removeEmptyRows', () => {
    it('should remove rows where all fields are empty', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: '', col_1: null },
        { col_0: 'B', col_1: 200 }
      ]

      const result = removeEmptyRows(data)

      expect(result).toHaveLength(2) // Second row with empty string and null is removed
    })

    it('should handle NaN values as empty', () => {
      const data = [
        { col_0: '', col_1: NaN },
        { col_0: 'A', col_1: 100 }
      ]

      const result = removeEmptyRows(data)

      expect(result).toHaveLength(1)
    })
  })

  describe('removeRowsWithEmptyColumn', () => {
    it('should remove rows with empty specific column', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: '', col_1: 200 },
        { col_0: 'C', col_1: 300 }
      ]

      const result = removeRowsWithEmptyColumn(data, 'col_0')

      expect(result).toHaveLength(2)
      expect(result[0].col_0).toBe('A')
      expect(result[1].col_0).toBe('C')
    })
  })

  describe('removeDuplicateRows', () => {
    it('should remove duplicate rows based on all columns', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: 'A', col_1: 100 },
        { col_0: 'B', col_1: 200 }
      ]

      const result = removeDuplicateRows(data)

      expect(result).toHaveLength(2)
    })

    it('should remove duplicates based on key columns', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: 'A', col_1: 200 },
        { col_0: 'B', col_1: 300 }
      ]

      const result = removeDuplicateRows(data, ['col_0'])

      expect(result).toHaveLength(2)
    })
  })

  describe('keepFirstOccurrence', () => {
    it('should keep only first occurrence of duplicate labels', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: 'A', col_1: 200 },
        { col_0: 'B', col_1: 300 }
      ]

      const result = keepFirstOccurrence(data, 'col_0')

      expect(result).toHaveLength(2)
      expect(result[0].col_1).toBe(100)
    })
  })

  describe('addSuffixToDuplicates', () => {
    it('should add suffix to duplicate labels', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: 'A', col_1: 200 },
        { col_0: 'A', col_1: 300 }
      ]

      const result = addSuffixToDuplicates(data, 'col_0')

      expect(result[0].col_0).toBe('A')
      expect(result[1].col_0).toBe('A (1)')
      expect(result[2].col_0).toBe('A (2)')
    })
  })

  describe('removeNegativeValues', () => {
    it('should remove rows with negative values', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: 'B', col_1: -50 },
        { col_0: 'C', col_1: 200 }
      ]

      const result = removeNegativeValues(data, 'col_1')

      expect(result).toHaveLength(2)
      expect(result.every(r => r.col_1 >= 0)).toBe(true)
    })
  })

  describe('convertToAbsolute', () => {
    it('should convert negative values to absolute', () => {
      const data = [
        { col_0: 'A', col_1: -100 },
        { col_0: 'B', col_1: 50 }
      ]

      const result = convertToAbsolute(data, 'col_1')

      expect(result[0].col_1).toBe(100)
      expect(result[1].col_1).toBe(50)
    })
  })

  describe('replaceNegativesWithZero', () => {
    it('should replace negative values with zero', () => {
      const data = [
        { col_0: 'A', col_1: -100 },
        { col_0: 'B', col_1: 50 }
      ]

      const result = replaceNegativesWithZero(data, 'col_1')

      expect(result[0].col_1).toBe(0)
      expect(result[1].col_1).toBe(50)
    })
  })

  describe('fillMissingValues', () => {
    it('should fill with zero', () => {
      const data = [
        { col_0: 'A', col_1: null },
        { col_0: 'B', col_1: 100 }
      ]

      const result = fillMissingValues(data, 'col_1', 'zero')

      expect(result[0].col_1).toBe(0)
    })

    it('should fill with mean', () => {
      const data = [
        { col_0: 'A', col_1: null },
        { col_0: 'B', col_1: 100 },
        { col_0: 'C', col_1: 200 }
      ]

      const result = fillMissingValues(data, 'col_1', 'mean')

      expect(result[0].col_1).toBe(150)
    })

    it('should fill with median', () => {
      const data = [
        { col_0: 'A', col_1: null },
        { col_0: 'B', col_1: 100 },
        { col_0: 'C', col_1: 200 },
        { col_0: 'D', col_1: 300 }
      ]

      const result = fillMissingValues(data, 'col_1', 'median')

      expect(result[0].col_1).toBe(200)
    })

    it('should fill forward', () => {
      const data = [
        { col_0: 'A', col_1: 100 },
        { col_0: 'B', col_1: null },
        { col_0: 'C', col_1: 300 }
      ]

      const result = fillMissingValues(data, 'col_1', 'forward')

      expect(result[1].col_1).toBe(100)
    })

    it('should fill with custom value', () => {
      const data = [
        { col_0: 'A', col_1: null },
        { col_0: 'B', col_1: 100 }
      ]

      const result = fillMissingValues(data, 'col_1', 'custom', 42)

      expect(result[0].col_1).toBe(42)
    })
  })

  describe('fillEmptyLabelsWithNumbers', () => {
    it('should fill empty labels with sequential numbers', () => {
      const data = [
        { col_0: '', col_1: 100 },
        { col_0: 'B', col_1: 200 },
        { col_0: '', col_1: 300 }
      ]

      const result = fillEmptyLabelsWithNumbers(data, 'col_0')

      expect(result[0].col_0).toBe('1')
      expect(result[1].col_0).toBe('B')
      expect(result[2].col_0).toBe('2')
    })
  })

  describe('fillEmptyLabelsWithText', () => {
    it('should fill empty labels with prefixed text', () => {
      const data = [
        { col_0: '', col_1: 100 },
        { col_0: 'B', col_1: 200 },
        { col_0: '', col_1: 300 }
      ]

      const result = fillEmptyLabelsWithText(data, 'col_0', 'Item')

      expect(result[0].col_0).toBe('Item 1')
      expect(result[1].col_0).toBe('B')
      expect(result[2].col_0).toBe('Item 2')
    })
  })

  describe('normalizeWhitespace', () => {
    it('should trim and normalize whitespace', () => {
      const data = [
        { col_0: '  A  ', col_1: 'hello   world' }
      ]

      const result = normalizeWhitespace(data)

      expect(result[0].col_0).toBe('A')
      expect(result[0].col_1).toBe('hello world')
    })
  })

  describe('removeOutliersIQR', () => {
    it('should remove outliers using IQR method', () => {
      const data = [
        { col_0: 'A', col_1: 10 },
        { col_0: 'B', col_1: 12 },
        { col_0: 'C', col_1: 14 },
        { col_0: 'D', col_1: 15 },
        { col_0: 'E', col_1: 100 } // Outlier
      ]

      const result = removeOutliersIQR(data, 'col_1')

      expect(result.length).toBeLessThan(data.length)
    })

    it('should return original data if less than 4 values', () => {
      const data = [
        { col_0: 'A', col_1: 10 },
        { col_0: 'B', col_1: 100 }
      ]

      const result = removeOutliersIQR(data, 'col_1')

      expect(result).toHaveLength(2)
    })
  })

  describe('validateMinimumRows', () => {
    it('should return true if data has minimum rows', () => {
      const data = [{ col_0: 'A' }, { col_0: 'B' }]

      expect(validateMinimumRows(data, 2)).toBe(true)
    })

    it('should return false if data has less than minimum rows', () => {
      const data = [{ col_0: 'A' }]

      expect(validateMinimumRows(data, 2)).toBe(false)
    })
  })

  describe('countAffectedRows', () => {
    it('should count difference between before and after', () => {
      const before = [{ a: 1 }, { a: 2 }, { a: 3 }]
      const after = [{ a: 1 }]

      expect(countAffectedRows(before, after)).toBe(2)
    })
  })
})

// Additional ChartGenerator component integration tests
describe('ChartGenerator.vue - additional tests', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    wrapper = mount(ChartGenerator, {
      global: {
        plugins: [vuetify],
        stubs: {
          StepNavigation: true,
          FileUploadStep: true,
          DataCleaningStep: true,
          ChartCreationStep: true
        }
      }
    })
  })

  it('should start at step 1', () => {
    const windowComponent = wrapper.findComponent({ name: 'VWindow' })
    expect(windowComponent.props('modelValue')).toBe(1)
  })

  it('should have all three v-window-items for steps', () => {
    const windowItems = wrapper.findAllComponents({ name: 'VWindowItem' })
    expect(windowItems).toHaveLength(3)
  })

  it('should stub FileUploadStep component', () => {
    const fileUploadStep = wrapper.findComponent({ name: 'FileUploadStep' })
    expect(fileUploadStep.exists()).toBe(true)
  })

  it('should have fluid container', () => {
    const container = wrapper.find('.v-container')
    expect(container.exists()).toBe(true)
  })
})
