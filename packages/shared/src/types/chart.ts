export interface DataPoint {
  label: string
  value: number
  // Additional columns stored as key-value pairs
  [key: string]: string | number
}

// Multi-series data structure
export interface SeriesDataPoint {
  label: string
  values: Record<string, number> // { "Umsatz": 1000, "Kosten": 800 }
}

// Series configuration (metadata for each series)
export interface SeriesConfig {
  name: string        // Display name (e.g., "Umsatz")
  columnKey: string   // Source column (e.g., "col_2")
  color: string       // Assigned color
}

export interface ChartColors {
  // Legacy colors (for backward compatibility with single-series)
  primary?: string
  secondary?: string

  // Multi-series colors
  series?: string[]   // Array of colors for each series

  background: string
}

export interface StatisticalOverlays {
  showMean: boolean
  showMedian: boolean
  showStdDev: boolean
  showMinMax: boolean
  showQuartiles: boolean
  color: string  // Color for statistical lines/areas
}

export interface ChartOptions {
  // Single-series mode (legacy)
  data?: DataPoint[]

  // Multi-series mode (new)
  seriesData?: SeriesDataPoint[]
  seriesConfig?: SeriesConfig[]

  colors: ChartColors
  title: string

  // Statistical overlays
  statisticalOverlays?: StatisticalOverlays
}
