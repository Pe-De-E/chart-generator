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
  time?: number     // ms since start of tour (0 = first point)
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
 * Visual normalization options for elevation data
 * Ensures flat routes don't look boring and steep routes don't explode the scale
 */
export interface VisualNormalizationOptions {
  /** Enable visual normalization (default: true) */
  enabled: boolean
  /** Minimum visual elevation range in meters (default: 100m) */
  minVisualRange: number
  /** Maximum visual elevation range in meters (default: 2000m) */
  maxVisualRange: number
  /** Visual exaggeration factor 1.0 = accurate, 1.5 = 50% steeper looking (default: 1.0) */
  exaggeration: number
}

export const DEFAULT_VISUAL_NORMALIZATION: VisualNormalizationOptions = {
  enabled: true,
  minVisualRange: 100,  // Flat routes get at least 100m visual range
  maxVisualRange: 2000, // Very mountainous routes get compressed to 2000m
  exaggeration: 1.0     // No exaggeration by default
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
 * Apply visual normalization to bounds
 * - Expands flat routes (< minVisualRange) for visual interest
 * - Compresses extreme routes (> maxVisualRange) to fit nicely
 * - Optionally applies exaggeration factor
 *
 * @param bounds Original calculated bounds
 * @param options Visual normalization settings
 * @returns Adjusted bounds with visual normalization applied
 */
export function applyVisualNormalization(
  bounds: DataBounds,
  options: VisualNormalizationOptions = DEFAULT_VISUAL_NORMALIZATION
): DataBounds & { wasNormalized: boolean; normalizationType: 'expanded' | 'compressed' | 'none' } {
  if (!options.enabled) {
    return { ...bounds, wasNormalized: false, normalizationType: 'none' }
  }

  const actualRange = bounds.elevationRange
  let adjustedMin = bounds.minElevation
  let adjustedMax = bounds.maxElevation
  let normalizationType: 'expanded' | 'compressed' | 'none' = 'none'

  // Flat route: expand to minimum visual range
  if (actualRange < options.minVisualRange) {
    const expansion = (options.minVisualRange - actualRange) / 2
    const midPoint = (bounds.minElevation + bounds.maxElevation) / 2
    adjustedMin = midPoint - options.minVisualRange / 2
    adjustedMax = midPoint + options.minVisualRange / 2
    normalizationType = 'expanded'
  }
  // Extreme route: compress to maximum visual range
  else if (actualRange > options.maxVisualRange) {
    const compression = (actualRange - options.maxVisualRange) / 2
    const midPoint = (bounds.minElevation + bounds.maxElevation) / 2
    adjustedMin = midPoint - options.maxVisualRange / 2
    adjustedMax = midPoint + options.maxVisualRange / 2
    normalizationType = 'compressed'
  }

  // Apply exaggeration (makes curves look steeper without changing actual values)
  // This works by shrinking the visual range, making the same elevation change
  // appear larger relative to the chart height
  if (options.exaggeration !== 1.0 && options.exaggeration > 0) {
    const currentRange = adjustedMax - adjustedMin
    const exaggeratedRange = currentRange / options.exaggeration
    const midPoint = (adjustedMin + adjustedMax) / 2
    adjustedMin = midPoint - exaggeratedRange / 2
    adjustedMax = midPoint + exaggeratedRange / 2
    if (normalizationType === 'none') {
      normalizationType = options.exaggeration > 1 ? 'compressed' : 'expanded'
    }
  }

  return {
    ...bounds,
    minElevation: adjustedMin,
    maxElevation: adjustedMax,
    elevationRange: adjustedMax - adjustedMin,
    wasNormalized: normalizationType !== 'none',
    normalizationType
  }
}

/**
 * Analyze elevation profile and suggest visual settings
 * Useful for auto-configuration based on route characteristics
 */
export function analyzeElevationProfile(points: GPXPoint[]): {
  totalAscent: number
  totalDescent: number
  maxGradient: number
  averageGradient: number
  profileType: 'flat' | 'rolling' | 'hilly' | 'mountainous'
  suggestedExaggeration: number
} {
  if (points.length < 2) {
    return {
      totalAscent: 0,
      totalDescent: 0,
      maxGradient: 0,
      averageGradient: 0,
      profileType: 'flat',
      suggestedExaggeration: 1.5
    }
  }

  let totalAscent = 0
  let totalDescent = 0
  let maxGradient = 0
  let totalGradient = 0

  for (let i = 1; i < points.length; i++) {
    const elevDiff = points[i].elevation - points[i - 1].elevation
    const distDiff = (points[i].distance - points[i - 1].distance) * 1000 // km to m

    if (elevDiff > 0) totalAscent += elevDiff
    else totalDescent += Math.abs(elevDiff)

    if (distDiff > 0) {
      const gradient = Math.abs(elevDiff / distDiff) * 100 // as percentage
      maxGradient = Math.max(maxGradient, gradient)
      totalGradient += gradient
    }
  }

  const averageGradient = totalGradient / (points.length - 1)

  // Classify profile type based on total elevation gain per km
  const totalDistance = points[points.length - 1].distance - points[0].distance
  const ascentPerKm = totalDistance > 0 ? totalAscent / totalDistance : 0

  let profileType: 'flat' | 'rolling' | 'hilly' | 'mountainous'
  let suggestedExaggeration: number

  if (ascentPerKm < 10) {
    profileType = 'flat'
    suggestedExaggeration = 2.0 // Exaggerate flat routes more
  } else if (ascentPerKm < 30) {
    profileType = 'rolling'
    suggestedExaggeration = 1.3
  } else if (ascentPerKm < 60) {
    profileType = 'hilly'
    suggestedExaggeration = 1.0 // No exaggeration needed
  } else {
    profileType = 'mountainous'
    suggestedExaggeration = 0.8 // Slight compression for extreme routes
  }

  return {
    totalAscent,
    totalDescent,
    maxGradient,
    averageGradient,
    profileType,
    suggestedExaggeration
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
    visualNormalization?: VisualNormalizationOptions | boolean
  } = {}
): {
  viewBoxPoints: ViewBoxPoint[]
  bounds: DataBounds
  chartArea: ChartArea
  visualInfo?: {
    wasNormalized: boolean
    normalizationType: 'expanded' | 'compressed' | 'none'
    originalRange: number
    visualRange: number
  }
} {
  let bounds = options.bounds || calculateBounds(points)
  const originalRange = bounds.elevationRange

  // Apply visual normalization if enabled
  let visualInfo: {
    wasNormalized: boolean
    normalizationType: 'expanded' | 'compressed' | 'none'
    originalRange: number
    visualRange: number
  } | undefined

  if (options.visualNormalization !== undefined && options.visualNormalization !== false) {
    const normOptions = options.visualNormalization === true
      ? DEFAULT_VISUAL_NORMALIZATION
      : options.visualNormalization
    const normalized = applyVisualNormalization(bounds, normOptions)
    bounds = normalized
    visualInfo = {
      wasNormalized: normalized.wasNormalized,
      normalizationType: normalized.normalizationType,
      originalRange,
      visualRange: normalized.elevationRange
    }
  }

  // Apply padding after visual normalization
  if (options.paddingPercent !== undefined && options.paddingPercent > 0) {
    bounds = padBounds(bounds, options.paddingPercent)
  }

  const normalized = normalizePoints(points, bounds)
  const viewBoxPoints = scaleToViewBox(normalized, config)
  const chartArea = getChartArea(config)

  return {
    viewBoxPoints,
    bounds,
    chartArea,
    visualInfo
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
 * Generate a smooth SVG path using Catmull-Rom → cubic-bezier conversion.
 * Produces a visually smooth curve for elevation profiles with few data points.
 */
export function pointsToSmoothPath(points: ViewBoxPoint[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`
  }

  const alpha = 0.4  // tension — lower = tighter to data, higher = smoother
  const d: string[] = [`M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`]

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) * alpha
    const cp1y = p1.y + (p2.y - p0.y) * alpha
    const cp2x = p2.x - (p3.x - p1.x) * alpha
    const cp2y = p2.y - (p3.y - p1.y) * alpha

    d.push(`C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`)
  }

  return d.join(' ')
}

/**
 * Generate a smooth closed area path (for elevation fill).
 * Uses the same Catmull-Rom curve as pointsToSmoothPath, closed to the chart bottom.
 */
export function pointsToSmoothAreaPath(points: ViewBoxPoint[], chartArea: ChartArea): string {
  if (points.length === 0) return ''

  const bottomY = (chartArea.y + chartArea.height).toFixed(1)
  const smoothCurve = pointsToSmoothPath(points)
  const last = points[points.length - 1]
  const first = points[0]

  return `${smoothCurve} L ${last.x.toFixed(1)},${bottomY} L ${first.x.toFixed(1)},${bottomY} Z`
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
