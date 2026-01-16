/**
 * Coordinate Contract Utilities
 *
 * Provides clean separation between data spaces:
 * 1. GPX Space (meters, kilometers) - raw data
 * 2. Normalized Space (0-1) - chart data
 * 3. ViewBox Space (pixels) - SVG rendering
 *
 * This contract ensures consistent coordinate handling across all chart generators.
 */

export interface GPXPoint {
  distance: number  // km
  elevation: number // m
}

export interface NormalizedPoint {
  x: number  // 0-1 (distance normalized)
  y: number  // 0-1 (elevation normalized)
  originalDistance: number
  originalElevation: number
}

export interface ViewBoxPoint {
  x: number  // pixels
  y: number  // pixels
  originalDistance: number
  originalElevation: number
}

export interface DataBounds {
  minDistance: number
  maxDistance: number
  minElevation: number
  maxElevation: number
  distanceRange: number
  elevationRange: number
}

export interface ViewBoxConfig {
  width: number
  height: number
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface ChartArea {
  x: number       // left edge of chart area
  y: number       // top edge of chart area
  width: number   // chart area width
  height: number  // chart area height
}

/**
 * Calculate bounds from GPX points
 */
export function calculateBounds(points: GPXPoint[]): DataBounds {
  if (points.length === 0) {
    return {
      minDistance: 0,
      maxDistance: 0,
      minElevation: 0,
      maxElevation: 0,
      distanceRange: 0,
      elevationRange: 0
    }
  }

  const distances = points.map(p => p.distance)
  const elevations = points.map(p => p.elevation)

  const minDistance = Math.min(...distances)
  const maxDistance = Math.max(...distances)
  const minElevation = Math.min(...elevations)
  const maxElevation = Math.max(...elevations)

  return {
    minDistance,
    maxDistance,
    minElevation,
    maxElevation,
    distanceRange: maxDistance - minDistance || 1,
    elevationRange: maxElevation - minElevation || 1
  }
}

/**
 * Add padding to bounds for better visualization
 * @param bounds Original bounds
 * @param paddingPercent Padding as percentage (e.g., 0.1 = 10%)
 */
export function padBounds(bounds: DataBounds, paddingPercent: number = 0.1): DataBounds {
  const elevationPadding = bounds.elevationRange * paddingPercent

  return {
    ...bounds,
    minElevation: bounds.minElevation - elevationPadding,
    maxElevation: bounds.maxElevation + elevationPadding,
    elevationRange: bounds.elevationRange + elevationPadding * 2
  }
}

/**
 * Normalize GPX points to 0-1 space
 * @param points Raw GPX points
 * @param bounds Optional pre-calculated bounds (for consistent scaling across multiple datasets)
 */
export function normalizePoints(
  points: GPXPoint[],
  bounds?: DataBounds
): NormalizedPoint[] {
  const actualBounds = bounds || calculateBounds(points)

  return points.map(p => ({
    x: actualBounds.distanceRange > 0
      ? (p.distance - actualBounds.minDistance) / actualBounds.distanceRange
      : 0.5,
    y: actualBounds.elevationRange > 0
      ? (p.elevation - actualBounds.minElevation) / actualBounds.elevationRange
      : 0.5,
    originalDistance: p.distance,
    originalElevation: p.elevation
  }))
}

/**
 * Scale normalized points to ViewBox pixels
 * @param points Normalized points (0-1)
 * @param config ViewBox configuration
 */
export function scaleToViewBox(
  points: NormalizedPoint[],
  config: ViewBoxConfig
): ViewBoxPoint[] {
  const chartArea = getChartArea(config)

  return points.map(p => ({
    // X: left to right
    x: chartArea.x + p.x * chartArea.width,
    // Y: inverted (SVG y=0 is top, but elevation increases upward)
    y: chartArea.y + chartArea.height - p.y * chartArea.height,
    originalDistance: p.originalDistance,
    originalElevation: p.originalElevation
  }))
}

/**
 * Calculate the chart drawing area from ViewBox config
 */
export function getChartArea(config: ViewBoxConfig): ChartArea {
  return {
    x: config.padding.left,
    y: config.padding.top,
    width: config.width - config.padding.left - config.padding.right,
    height: config.height - config.padding.top - config.padding.bottom
  }
}

/**
 * Complete transformation: GPX → ViewBox
 * Combines all steps for convenience
 */
export function gpxToViewBox(
  points: GPXPoint[],
  config: ViewBoxConfig,
  options: {
    paddingPercent?: number
    bounds?: DataBounds
  } = {}
): {
  viewBoxPoints: ViewBoxPoint[]
  bounds: DataBounds
  chartArea: ChartArea
} {
  let bounds = options.bounds || calculateBounds(points)

  if (options.paddingPercent !== undefined && options.paddingPercent > 0) {
    bounds = padBounds(bounds, options.paddingPercent)
  }

  const normalized = normalizePoints(points, bounds)
  const viewBoxPoints = scaleToViewBox(normalized, config)
  const chartArea = getChartArea(config)

  return {
    viewBoxPoints,
    bounds,
    chartArea
  }
}

/**
 * Convert a single value to Y coordinate
 * Useful for drawing horizontal lines (e.g., average, min/max)
 */
export function elevationToY(
  elevation: number,
  bounds: DataBounds,
  chartArea: ChartArea
): number {
  const normalizedY = (elevation - bounds.minElevation) / bounds.elevationRange
  return chartArea.y + chartArea.height - normalizedY * chartArea.height
}

/**
 * Convert a single value to X coordinate
 * Useful for drawing vertical lines (e.g., markers at specific distances)
 */
export function distanceToX(
  distance: number,
  bounds: DataBounds,
  chartArea: ChartArea
): number {
  const normalizedX = (distance - bounds.minDistance) / bounds.distanceRange
  return chartArea.x + normalizedX * chartArea.width
}

/**
 * Generate SVG path string from ViewBox points
 */
export function pointsToSvgPath(points: ViewBoxPoint[]): string {
  if (points.length === 0) return ''

  return points.map((p, i) =>
    i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`
  ).join(' ')
}

/**
 * Generate SVG polyline points string
 */
export function pointsToPolyline(points: ViewBoxPoint[]): string {
  return points.map(p => `${p.x},${p.y}`).join(' ')
}

/**
 * Generate closed area polygon points (for filled areas)
 */
export function pointsToAreaPolygon(
  points: ViewBoxPoint[],
  chartArea: ChartArea
): string {
  if (points.length === 0) return ''

  const linePoints = points.map(p => `${p.x},${p.y}`)
  const bottomY = chartArea.y + chartArea.height
  const bottomRight = `${points[points.length - 1].x},${bottomY}`
  const bottomLeft = `${points[0].x},${bottomY}`

  return [bottomLeft, ...linePoints, bottomRight].join(' ')
}

/**
 * Default ViewBox configurations for common use cases
 */
export const VIEW_BOX_PRESETS = {
  /** Standard chart (600x350) */
  standard: {
    width: 600,
    height: 350,
    padding: { top: 60, right: 40, bottom: 80, left: 70 }
  },
  /** Silhouette mode (800x200, minimal padding) */
  silhouette: {
    width: 800,
    height: 200,
    padding: { top: 10, right: 10, bottom: 10, left: 10 }
  },
  /** Instagram Reel (1080x1920) */
  instagramReel: {
    width: 1080,
    height: 1920,
    padding: { top: 100, right: 60, bottom: 100, left: 60 }
  },
  /** Instagram Square (1080x1080) */
  instagramSquare: {
    width: 1080,
    height: 1080,
    padding: { top: 80, right: 60, bottom: 80, left: 60 }
  }
} as const
