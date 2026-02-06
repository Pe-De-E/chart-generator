import { ref, computed, watch, type Ref } from 'vue'
import {
  generateBarChart,
  generateLineChart,
  generateAreaChart,
  generatePieChart,
  generateScatterChart,
  generateElevationChart,
} from '../utils/chartGenerators'
import type {
  SeriesDataPoint,
  SeriesConfig,
  DataPoint,
  StatisticalOverlays,
  ChartStyleOverrides,
  TitleStyleOverride,
  AxisStyleOverride,
  DataPointStyleOverride,
  SeriesStyleOverride,
  ChartColors,
} from '@chart-generator/shared'

export type { ChartColors }

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'elevation'

export function useChartConfig(
  seriesData: Ref<SeriesDataPoint[]>,
  seriesConfig: Ref<SeriesConfig[]>
) {
  const chartType = ref<ChartType>('bar')
  const chartTitle = ref('Mein Chart')

  // Colors are now managed by seriesConfig, but we keep background color here
  const colors = ref({
    background: '#FFFFFF'
  })

  // Compute data extent (min/max values from data)
  const dataExtent = computed(() => {
    if (seriesData.value.length === 0) {
      return [0, 100]
    }

    let min = Infinity
    let max = -Infinity

    seriesData.value.forEach(d => {
      Object.values(d.values).forEach(value => {
        if (typeof value === 'number') {
          min = Math.min(min, value)
          max = Math.max(max, value)
        }
      })
    })

    // Add 10% padding
    const padding = (max - min) * 0.1
    return [Math.floor(min - padding), Math.ceil(max + padding)]
  })

  // Statistical overlays
  const statisticalOverlays = ref<StatisticalOverlays>({
    showMean: false,
    showMedian: false,
    showStdDev: false,
    showMinMax: false,
    showQuartiles: false,
    showCustomRange: false,
    customRangeMin: dataExtent.value[0],
    customRangeMax: dataExtent.value[1],
    showZScore: false,
    zScoreThreshold: 2,
    color: '#FF6B6B',  // Legacy fallback
    colors: {
      mean: '#E53935',      // Red
      median: '#8E24AA',    // Purple
      stdDev: '#FB8C00',    // Orange
      minMax: '#43A047',    // Green
      quartiles: '#1E88E5', // Blue
      customRange: '#00ACC1', // Cyan
      zScore: '#F4511E'     // Deep Orange
    }
  })

  // Silhouette mode (elevation profile only) - pure curve for social media
  const silhouetteMode = ref(false)

  // Style overrides for interactive editing
  const styleOverrides = ref<ChartStyleOverrides>({})

  // Functions to update style overrides
  function updateTitleStyle(style: Partial<TitleStyleOverride>) {
    styleOverrides.value = {
      ...styleOverrides.value,
      title: { ...styleOverrides.value.title, ...style }
    }
  }

  function updateDataPointStyle(index: number | string, style: Partial<DataPointStyleOverride>) {
    styleOverrides.value = {
      ...styleOverrides.value,
      dataPoints: {
        ...styleOverrides.value.dataPoints,
        [index]: { ...styleOverrides.value.dataPoints?.[index], ...style }
      }
    }
  }

  function updateAxisStyle(axis: 'xAxis' | 'yAxis', style: Partial<AxisStyleOverride>) {
    styleOverrides.value = {
      ...styleOverrides.value,
      [axis]: { ...styleOverrides.value[axis], ...style }
    }
  }

  function updateSeriesStyle(seriesName: string, style: Partial<SeriesStyleOverride>) {
    styleOverrides.value = {
      ...styleOverrides.value,
      series: {
        ...styleOverrides.value.series,
        [seriesName]: { ...styleOverrides.value.series?.[seriesName], ...style }
      }
    }
  }

  function setStyleOverrides(overrides: ChartStyleOverrides) {
    styleOverrides.value = overrides
  }

  function resetStyleOverrides() {
    styleOverrides.value = {}
  }

  function resetElementStyle(elementType: string, elementId?: string | number) {
    if (elementType === 'title') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { title: _t, ...rest } = styleOverrides.value
      styleOverrides.value = rest
    } else if ((elementType === 'bar' || elementType === 'point' || elementType === 'line' || elementType === 'slice') && elementId !== undefined) {
      if (styleOverrides.value.dataPoints) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [elementId]: _removed, ...restPoints } = styleOverrides.value.dataPoints
        styleOverrides.value = { ...styleOverrides.value, dataPoints: restPoints }
      }
    } else if (elementType === 'series' && elementId !== undefined) {
      if (styleOverrides.value.series) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [elementId]: _removed, ...restSeries } = styleOverrides.value.series
        styleOverrides.value = { ...styleOverrides.value, series: restSeries }
      }
    }
  }

  // Helper function to generate SVG
  function generateSvg(): string {
    // Detect single-series vs multi-series mode
    const isSingleSeries = seriesConfig.value.length === 1

    if (isSingleSeries) {
      // Legacy mode: Convert SeriesDataPoint[] to DataPoint[]
      const legacyData: DataPoint[] = seriesData.value.map(d => ({
        label: d.label,
        value: Object.values(d.values)[0] || 0
      }))

      const config = {
        data: legacyData,
        colors: {
          primary: seriesConfig.value[0]?.color || '#4F46E5',
          secondary: '#818CF8',
          background: colors.value.background
        },
        title: chartTitle.value,
        statisticalOverlays: statisticalOverlays.value,
        silhouetteMode: silhouetteMode.value,
        styleOverrides: { ...styleOverrides.value }
      }

      // Call legacy single-series generators
      switch (chartType.value) {
        case 'bar':
          return generateBarChart(config)
        case 'line':
          return generateLineChart(config)
        case 'area':
          return generateAreaChart(config)
        case 'scatter':
          return generateScatterChart(config)
        case 'pie':
          return generatePieChart(config)
        case 'elevation':
          return generateElevationChart(config)
        default:
          return ''
      }
    } else {
      // Multi-series mode
      const config = {
        seriesData: seriesData.value,
        seriesConfig: seriesConfig.value,
        colors: {
          series: seriesConfig.value.map(s => s.color),
          background: colors.value.background
        },
        title: chartTitle.value,
        statisticalOverlays: statisticalOverlays.value,
        silhouetteMode: silhouetteMode.value,
        styleOverrides: { ...styleOverrides.value }
      }

      // Call multi-series generators (generators will detect multi-series mode)
      switch (chartType.value) {
        case 'bar':
          return generateBarChart(config)
        case 'line':
          return generateLineChart(config)
        case 'area':
          return generateAreaChart(config)
        case 'scatter':
          return generateScatterChart(config)
        case 'pie':
          return generatePieChart(config)
        case 'elevation':
          return generateElevationChart(config)
        default:
          return ''
      }
    }
  }

  // Use ref instead of computed for better reactivity control
  const svgContent = ref('')

  // Watch all dependencies and regenerate SVG
  watch(
    [
      () => seriesData.value,
      () => seriesConfig.value,
      () => chartType.value,
      () => chartTitle.value,
      () => colors.value,
      () => statisticalOverlays.value,
      () => silhouetteMode.value,
      () => JSON.stringify(styleOverrides.value)  // Deep watch via JSON
    ],
    () => {
      svgContent.value = generateSvg()
    },
    { immediate: true, deep: true }
  )

  function downloadSVG() {
    const blob = new Blob([svgContent.value], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chartTitle.value.replace(/\s+/g, '_')}_${chartType.value}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  function resetConfig() {
    chartType.value = 'bar'
    chartTitle.value = 'Mein Chart'
    colors.value = {
      background: '#FFFFFF'
    }
    statisticalOverlays.value = {
      showMean: false,
      showMedian: false,
      showStdDev: false,
      showMinMax: false,
      showQuartiles: false,
      showCustomRange: false,
      customRangeMin: dataExtent.value[0],
      customRangeMax: dataExtent.value[1],
      showZScore: false,
      zScoreThreshold: 2,
      color: '#FF6B6B',
      colors: {
        mean: '#E53935',
        median: '#8E24AA',
        stdDev: '#FB8C00',
        minMax: '#43A047',
        quartiles: '#1E88E5',
        customRange: '#00ACC1',
        zScore: '#F4511E'
      }
    }
    silhouetteMode.value = false
    styleOverrides.value = {}
  }

  return {
    chartType,
    chartTitle,
    colors,
    statisticalOverlays,
    silhouetteMode,
    dataExtent,
    svgContent,
    downloadSVG,
    resetConfig,
    // Style overrides state and functions
    styleOverrides,
    updateTitleStyle,
    updateDataPointStyle,
    updateAxisStyle,
    updateSeriesStyle,
    setStyleOverrides,
    resetStyleOverrides,
    resetElementStyle
  }
}
