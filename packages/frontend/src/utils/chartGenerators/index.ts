export { generateBarChart } from './barChart'
export { generateLineChart } from './lineChart'
export { generateAreaChart } from './areaChart'
export { generatePieChart } from './pieChart'
export { generateScatterChart } from './scatterChart'
export { generateElevationChart } from './elevationChart'

// Re-export types from shared package for backward compatibility
export type {
  DataPoint,
  ChartColors,
  ChartOptions,
  SeriesDataPoint,
  SeriesConfig,
  StatisticalOverlays
} from '@chart-generator/shared'

// TODO: Nach Implementierung des Features diese Types auch exportieren:
// export type {
//   ChartStyleOverrides,
//   TitleStyleOverride,
//   AxisStyleOverride,
//   LegendStyleOverride,
//   DataPointStyleOverride,
//   SeriesStyleOverride
// } from './types'
