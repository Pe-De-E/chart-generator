import { ref, computed, type Ref } from 'vue'
import {
  generateBarChart,
  generateLineChart,
  generateAreaChart,
  generatePieChart,
  generateScatterChart,
  type SeriesDataPoint,
  type SeriesConfig,
  type DataPoint
} from '../utils/chartGenerators'

// Re-export ChartColors from types (for backward compatibility)
export type { ChartColors } from '../utils/chartGenerators/types'

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter'

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
        title: chartTitle.value
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
        title: chartTitle.value
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
  }

  return {
    chartType,
    chartTitle,
    colors,
    svgContent,
    downloadSVG,
    resetConfig
  }
}
