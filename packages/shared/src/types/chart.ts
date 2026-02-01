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

// Individual colors for each statistical overlay type
export interface StatisticalOverlayColors {
  mean: string
  median: string
  stdDev: string
  minMax: string
  quartiles: string
  customRange: string
  zScore: string
}

export interface StatisticalOverlays {
  showMean: boolean
  showMedian: boolean
  showStdDev: boolean
  showMinMax: boolean
  showQuartiles: boolean
  showCustomRange: boolean
  customRangeMin: number
  customRangeMax: number
  showZScore: boolean
  zScoreThreshold: number  // Number of standard deviations (e.g., 2 = ±2σ)
  color: string  // Legacy: fallback color for all overlays
  colors: StatisticalOverlayColors  // Individual colors per overlay type
}

// Chart dimensions configuration
export interface ChartDimensions {
  // Width in pixels, or 'auto' for responsive (100% of container)
  // Default: 600
  width?: number | 'auto'
  // Height in pixels
  // Default: 400 (varies by chart type)
  height?: number
}

// Animation options for frame-based elevation chart animation
export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

// Curve endpoint: percentage of screen height where the curve ends (0 = natural/bottom, 100 = top)
// 0 = natural elevation (no stretching)
// 50 = middle of screen
// 100 = top of screen
export type CurveEndpoint = number

export interface AnimationOptions {
  enabled: boolean
  durationMs: number      // e.g. 5000 for 5 seconds
  fps: number             // e.g. 30 frames per second
  easing: EasingType
  showMarker: boolean     // Show moving dot at current position
  markerSize: number      // Marker radius in pixels
  markerColor: string     // Marker fill color
  curveEndpoint: CurveEndpoint  // 0-100: percentage of screen height where curve ends (0=natural, 100=top)
}

export const DEFAULT_ANIMATION_OPTIONS: AnimationOptions = {
  enabled: false,
  durationMs: 5000,
  fps: 30,
  easing: 'ease-in-out',
  showMarker: true,
  markerSize: 6,
  markerColor: '#ffffff',
  curveEndpoint: 0  // 0 = natural elevation, no stretching
}

export interface ChartOptions {
  // Single-series mode (legacy)
  data?: DataPoint[]

  // Multi-series mode (new)
  seriesData?: SeriesDataPoint[]
  seriesConfig?: SeriesConfig[]

  colors: ChartColors
  title: string

  // Chart dimensions (width/height)
  dimensions?: ChartDimensions

  // Statistical overlays
  statisticalOverlays?: StatisticalOverlays

  // Silhouette mode - pure curve, no axes, labels or background (perfect for social media)
  silhouetteMode?: boolean

  // Style overrides for interactive editing
  styleOverrides?: ChartStyleOverrides

  // Animation options (for elevation charts)
  animation?: AnimationOptions
}

// =============================================================================
// Style Overrides für interaktive Chart-Bearbeitung (Click-to-Edit)
// =============================================================================
// Diese Interfaces speichern alle visuellen Anpassungen, die der Benutzer vornimmt.
// Die Overrides werden getrennt von den Daten gespeichert und beim Rendern angewendet.

export interface ChartStyleOverrides {
  // Titel-Anpassungen
  title?: TitleStyleOverride

  // Achsen-Anpassungen
  xAxis?: AxisStyleOverride
  yAxis?: AxisStyleOverride

  // Legenden-Anpassungen
  legend?: LegendStyleOverride

  // Individuelle Datenpunkt-Anpassungen (nach Index oder Label)
  dataPoints?: Record<string | number, DataPointStyleOverride>

  // Serien-Anpassungen (für Multi-Series Charts)
  series?: Record<string, SeriesStyleOverride>
}

export interface TitleStyleOverride {
  text?: string              // Überschreibt den Titel-Text
  fontSize?: number          // Standard: 20
  fontWeight?: 'normal' | 'bold'
  color?: string             // Standard: #1F2937
  alignment?: 'left' | 'center' | 'right'
  offsetY?: number           // Vertikale Position anpassen
}

export interface AxisStyleOverride {
  // Label-Anpassungen
  labels?: {
    fontSize?: number        // Standard: 10
    color?: string           // Standard: #6B7280
    rotation?: number        // Grad (Standard: -45 für X-Achse)
    show?: boolean           // Labels ein-/ausblenden
  }
  // Achsentitel (optional)
  title?: {
    text?: string
    fontSize?: number
    color?: string
  }
  // Grid-Linien
  gridLines?: {
    show?: boolean
    color?: string           // Standard: #E5E7EB
    dashArray?: string       // z.B. "4" für gestrichelt
  }
  // Wertebereich (für Y-Achse)
  range?: {
    min?: number             // Minimum überschreiben
    max?: number             // Maximum überschreiben
  }
}

export interface LegendStyleOverride {
  show?: boolean             // Legende ein-/ausblenden
  position?: 'top' | 'bottom' | 'left' | 'right'
  fontSize?: number          // Standard: 11
  // Individuelle Legenden-Einträge umbenennen
  labels?: Record<string, string>  // { "Umsatz": "Revenue", ... }
}

export interface DataPointStyleOverride {
  color?: string             // Farbe überschreiben
  label?: string             // Anzeigetext überschreiben
  showValue?: boolean        // Wert-Label ein-/ausblenden
  highlight?: boolean        // Hervorheben (z.B. größere Größe, Rahmen)
}

export interface SeriesStyleOverride {
  color?: string             // Serienfarbe überschreiben
  name?: string              // Anzeigename überschreiben
  lineStyle?: 'solid' | 'dashed' | 'dotted'  // Für Linien-Charts
  lineWidth?: number         // Linienstärke
}

// Chart persistence types
export type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'area' | 'elevation'

export interface SavedChart {
  id: string
  userId: string
  title: string
  type: ChartType
  data: Record<string, unknown> // JSON data
  config: Record<string, unknown> // JSON config
  svgContent: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateChartRequest {
  title: string
  type: ChartType
  data: Record<string, unknown>
  config: Record<string, unknown>
  svgContent?: string
  isPublic?: boolean
}

export interface UpdateChartRequest {
  title?: string
  type?: ChartType
  data?: Record<string, unknown>
  config?: Record<string, unknown>
  svgContent?: string
  isPublic?: boolean
}

// =============================================================================
// Chart Presets - Styling-Vorlagen für Bar, Line, Scatter, Pie, Area Charts
// =============================================================================

export interface ChartPresetColors {
  background: string
  series: string[]
}

export interface ChartPresetConfig {
  chartType?: ChartType  // Optional: for filtering presets by chart type
  colors: ChartPresetColors
  statisticalOverlays: StatisticalOverlays
  styleOverrides?: ChartStyleOverrides
}

export interface SavedChartPreset {
  id: string
  userId: string
  name: string
  config: ChartPresetConfig
  createdAt: string
  updatedAt: string
}

export interface SystemChartPreset {
  id: string
  name: string
  config: ChartPresetConfig
  isSystem: true
}

export type ChartPreset = (SavedChartPreset & { isSystem?: false }) | SystemChartPreset

export interface CreateChartPresetRequest {
  name: string
  config: ChartPresetConfig
}

export interface UpdateChartPresetRequest {
  name?: string
  config?: ChartPresetConfig
}

// =============================================================================
// Elevation Themes - Styling-Vorlagen für Elevation Charts
// =============================================================================

export type BackgroundType = 'solid' | 'gradient' | 'mesh'

export interface ElevationThemeTokens {
  curve: {
    color: string
    strokeWidth: number
  }
  marker: {
    size: number
    color: string
    show: boolean
  }
  background: {
    type: BackgroundType
    color: string
    gradientColor: string
    meshColors: [string, string, string]
  }
  labels: {
    elevationColor: string
    distanceColor: string
    showElevation: boolean
    showDistance: boolean
  }
  pattern: {
    color: string
    opacity: number
  }
  animation: {
    duration: number
    easing: EasingType
  }
}

export interface SavedElevationTheme {
  id: string
  userId: string
  name: string
  description?: string
  preview: string
  tokens: ElevationThemeTokens
  createdAt: string
  updatedAt: string
}

export interface SystemElevationTheme {
  id: string
  name: string
  description: string
  preview: string
  tokens: ElevationThemeTokens
  isSystem: true
}

export type ElevationTheme = (SavedElevationTheme & { isSystem?: false }) | SystemElevationTheme

export interface CreateElevationThemeRequest {
  name: string
  description?: string
  preview: string
  tokens: ElevationThemeTokens
}

export interface UpdateElevationThemeRequest {
  name?: string
  description?: string
  preview?: string
  tokens?: ElevationThemeTokens
}
