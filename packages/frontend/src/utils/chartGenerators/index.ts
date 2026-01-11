export { generateBarChart } from './barChart/barChart'
export { generateLineChart } from './lineChart/lineChart'
export { generateAreaChart } from './areaChart/areaChart'
export { generatePieChart } from './pieChart/pieChart'
export { generateScatterChart } from './scatterChart/scatterChart'
export { generateElevationChart } from './elevationChart/elevationChart'

// TODO Wieso ist das in einem Index file? wäre das nicht passender in types.ts? oder in dem jeweiligen Chart? Oder vielleicht ein ganz eigenes file für types?

// Re-export types from shared package for backward compatibility
export type {
  DataPoint,
  ChartColors,
  ChartOptions,
  SeriesDataPoint,
  SeriesConfig,
  StatisticalOverlays,
  ChartStyleOverrides,
  TitleStyleOverride,
  AxisStyleOverride,
  LegendStyleOverride,
  DataPointStyleOverride,
  SeriesStyleOverride,
} from '@chart-generator/shared'
