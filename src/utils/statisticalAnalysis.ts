import type { SeriesDataPoint } from './chartGenerators'

export interface StatisticalMetrics {
  mean: number
  median: number
  min: number
  max: number
  stdDev: number
  q1: number
  q3: number
  iqr: number
  range: number
}

/**
 * Calculate statistical metrics for a single series of values
 */
export function calculateStatistics(values: number[]): StatisticalMetrics {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      range: 0
    }
  }

  // Sort values for median and quartile calculations
  const sorted = [...values].sort((a, b) => a - b)

  // Mean
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length

  // Median
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]

  // Min and Max
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  // Standard Deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  // Quartiles
  const q1Index = Math.floor(sorted.length * 0.25)
  const q3Index = Math.floor(sorted.length * 0.75)
  const q1 = sorted[q1Index]
  const q3 = sorted[q3Index]

  // IQR and Range
  const iqr = q3 - q1
  const range = max - min

  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    q1: Math.round(q1 * 100) / 100,
    q3: Math.round(q3 * 100) / 100,
    iqr: Math.round(iqr * 100) / 100,
    range: Math.round(range * 100) / 100
  }
}

/**
 * Calculate statistics for multi-series data
 * Returns a map of series name to statistics
 */
export function calculateMultiSeriesStatistics(
  seriesData: SeriesDataPoint[],
  seriesNames: string[]
): Record<string, StatisticalMetrics> {
  const stats: Record<string, StatisticalMetrics> = {}

  seriesNames.forEach(seriesName => {
    const values = seriesData.map(point => point.values[seriesName]).filter(val => !isNaN(val))
    stats[seriesName] = calculateStatistics(values)
  })

  return stats
}

/**
 * Calculate aggregate statistics across all series
 */
export function calculateAggregateStatistics(
  seriesData: SeriesDataPoint[]
): StatisticalMetrics {
  const allValues: number[] = []

  seriesData.forEach(point => {
    Object.values(point.values).forEach(val => {
      if (typeof val === 'number' && !isNaN(val)) {
        allValues.push(val)
      }
    })
  })

  return calculateStatistics(allValues)
}

/**
 * Format statistic value for display
 */
export function formatStatValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  return value.toFixed(2)
}
