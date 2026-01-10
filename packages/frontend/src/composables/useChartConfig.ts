import { ref, computed, type Ref } from 'vue'
import {
  generateBarChart,
  generateLineChart,
  generateAreaChart,
  generatePieChart,
  generateScatterChart,
  generateElevationChart,
  type SeriesDataPoint,
  type SeriesConfig,
  type DataPoint,
  type StatisticalOverlays,
  type ChartStyleOverrides  // TODO [5/6]: Import hinzufügen wenn implementiert
} from '../utils/chartGenerators'

// =============================================================================
// TODO [5/6]: State-Management für Style-Overrides
// =============================================================================
//
// Ein neues ref für styleOverrides hinzufügen und an die Generatoren übergeben.
//
// 1. Neues ref erstellen:
//    const styleOverrides = ref<ChartStyleOverrides>({})
//
// 2. In svgContent computed property an config übergeben:
//    const config = {
//      ...
//      styleOverrides: styleOverrides.value
//    }
//
// 3. Funktionen zum Aktualisieren der Overrides:
//
//    function updateTitleStyle(style: Partial<TitleStyleOverride>) {
//      styleOverrides.value = {
//        ...styleOverrides.value,
//        title: { ...styleOverrides.value.title, ...style }
//      }
//    }
//
//    function updateDataPointStyle(index: number, style: Partial<DataPointStyleOverride>) {
//      styleOverrides.value = {
//        ...styleOverrides.value,
//        dataPoints: {
//          ...styleOverrides.value.dataPoints,
//          [index]: { ...styleOverrides.value.dataPoints?.[index], ...style }
//        }
//      }
//    }
//
//    function updateAxisStyle(axis: 'xAxis' | 'yAxis', style: Partial<AxisStyleOverride>) {
//      styleOverrides.value = {
//        ...styleOverrides.value,
//        [axis]: { ...styleOverrides.value[axis], ...style }
//      }
//    }
//
//    function resetStyleOverrides() {
//      styleOverrides.value = {}
//    }
//
//    function resetElementStyle(elementType: string, elementId?: string | number) {
//      // Einzelnes Element zurücksetzen
//      if (elementType === 'title') {
//        const { title, ...rest } = styleOverrides.value
//        styleOverrides.value = rest
//      } else if (elementType === 'dataPoint' && elementId !== undefined) {
//        const { [elementId]: removed, ...rest } = styleOverrides.value.dataPoints || {}
//        styleOverrides.value = { ...styleOverrides.value, dataPoints: rest }
//      }
//      // ... weitere Fälle
//    }
//
// 4. Im return-Objekt exportieren:
//    return {
//      ...
//      styleOverrides,
//      updateTitleStyle,
//      updateDataPointStyle,
//      updateAxisStyle,
//      resetStyleOverrides,
//      resetElementStyle
//    }
//
// =============================================================================

// Re-export ChartColors from types (for backward compatibility)
export type { ChartColors } from '../utils/chartGenerators/types'

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
    color: '#FF6B6B'
  })

  // Silhouette mode (elevation profile only) - pure curve for social media
  const silhouetteMode = ref(false)

  const svgContent = computed(() => {
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
        silhouetteMode: silhouetteMode.value
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
        silhouetteMode: silhouetteMode.value
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
  })

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
      color: '#FF6B6B'
    }
    silhouetteMode.value = false
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
    resetConfig
  }
}
