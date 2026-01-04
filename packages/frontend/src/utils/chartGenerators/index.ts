export { generateBarChart } from './barChart'
export { generateLineChart } from './lineChart'
export { generateAreaChart } from './areaChart'
export { generatePieChart } from './pieChart'
export { generateScatterChart } from './scatterChart'

// Re-export types from shared package for backward compatibility
export type {
  DataPoint,
  ChartColors,
  ChartOptions,
  SeriesDataPoint,
  SeriesConfig,
  StatisticalOverlays
} from '@chart-generator/shared'
