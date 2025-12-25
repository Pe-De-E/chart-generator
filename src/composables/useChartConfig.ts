import { ref, computed, type Ref } from 'vue'
import {
  generateBarChart,
  generateLineChart,
  generateAreaChart,
  generatePieChart,
  generateScatterChart,
  type DataPoint
} from '../utils/chartGenerators'

export interface ChartColors {
  primary: string
  secondary: string
  background: string
}

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter'

export function useChartConfig(data: Ref<DataPoint[]>) {
  const chartType = ref<ChartType>('bar')
  const chartTitle = ref('Mein Chart')
  const colors = ref<ChartColors>({
    primary: '#4F46E5',
    secondary: '#818CF8',
    background: '#FFFFFF'
  })

  const svgContent = computed(() => {
    const config = {
      data: data.value,
      colors: colors.value,
      title: chartTitle.value
    }

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
      primary: '#4F46E5',
      secondary: '#818CF8',
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
