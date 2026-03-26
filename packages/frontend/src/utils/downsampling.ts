/**
 * GPX Downsampling Utilities
 *
 * Implements Douglas-Peucker algorithm for intelligent downsampling
 * that preserves important curve features (peaks, valleys).
 */

export interface DownsampleOptions {
  /** false = Premium mode (no downsampling) */
  enabled: boolean
  /** Target number of points after downsampling */
  targetPoints: number
  /** Algorithm to use */
  algorithm: 'douglas-peucker' | 'uniform'
  /** Always keep min/max elevation points */
  preserveExtremes: boolean
}

export interface GPXPoint {
  distance: number  // km
  elevation: number // m
  time?: number     // ms since start of tour (0 = first point)
  lat?: number      // Latitude (degrees) — preserved for route map visualization
  lon?: number      // Longitude (degrees) — preserved for route map visualization
  hr?: number       // Heart rate (bpm), from GPX extensions
}

export interface DownsampleResult {
  points: GPXPoint[]
  originalCount: number
  downsampledCount: number
  wasDownsampled: boolean
}

export const DEFAULT_DOWNSAMPLE_OPTIONS: DownsampleOptions = {
  enabled: true,
  targetPoints: 1500,
  algorithm: 'douglas-peucker',
  preserveExtremes: true
}

export const PREMIUM_DOWNSAMPLE_OPTIONS: DownsampleOptions = {
  enabled: false,
  targetPoints: Infinity,
  algorithm: 'douglas-peucker',
  preserveExtremes: true
}

/**
 * Calculate perpendicular distance from point to line segment
 */
function perpendicularDistance(
  point: GPXPoint,
  lineStart: GPXPoint,
  lineEnd: GPXPoint
): number {
  // Normalize coordinates to similar scale (elevation is typically much larger than distance)
  // We use a scale factor to make distance and elevation comparable
  const scaleFactor = 10 // 1km ≈ 10m in visual importance

  const dx = (lineEnd.distance - lineStart.distance) * scaleFactor
  const dy = lineEnd.elevation - lineStart.elevation

  // Line length squared
  const lineLengthSquared = dx * dx + dy * dy

  if (lineLengthSquared === 0) {
    // Start and end are the same point
    const pdx = (point.distance - lineStart.distance) * scaleFactor
    const pdy = point.elevation - lineStart.elevation
    return Math.sqrt(pdx * pdx + pdy * pdy)
  }

  // Calculate perpendicular distance using cross product
  const px = (point.distance - lineStart.distance) * scaleFactor
  const py = point.elevation - lineStart.elevation

  // Cross product gives area of parallelogram, divide by base for height
  const crossProduct = Math.abs(dx * py - dy * px)
  return crossProduct / Math.sqrt(lineLengthSquared)
}

/**
 * Douglas-Peucker algorithm for line simplification
 * Recursively removes points that don't significantly contribute to the shape
 */
export function douglasPeucker(points: GPXPoint[], epsilon: number): GPXPoint[] {
  if (points.length <= 2) {
    return points
  }

  // Find the point with maximum distance from line between first and last
  let maxDistance = 0
  let maxIndex = 0

  const first = points[0]
  const last = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    // Recursive call on both halves
    const leftResult = douglasPeucker(points.slice(0, maxIndex + 1), epsilon)
    const rightResult = douglasPeucker(points.slice(maxIndex), epsilon)

    // Combine results (remove duplicate point at junction)
    return [...leftResult.slice(0, -1), ...rightResult]
  } else {
    // All intermediate points can be removed
    return [first, last]
  }
}

/**
 * Binary search to find epsilon value that results in approximately targetCount points
 */
export function findEpsilonForTargetCount(
  points: GPXPoint[],
  targetCount: number,
  maxIterations: number = 20
): number {
  if (points.length <= targetCount) {
    return 0
  }

  // Calculate elevation range for initial epsilon bounds
  const elevations = points.map(p => p.elevation)
  const minEle = Math.min(...elevations)
  const maxEle = Math.max(...elevations)
  const eleRange = maxEle - minEle

  let low = 0
  let high = eleRange / 2 // Start with half the elevation range
  let bestEpsilon = high / 2
  let bestDiff = Infinity

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2
    const result = douglasPeucker(points, mid)
    const count = result.length
    const diff = Math.abs(count - targetCount)

    if (diff < bestDiff) {
      bestDiff = diff
      bestEpsilon = mid
    }

    // Close enough (within 5% of target)
    if (diff <= targetCount * 0.05) {
      return mid
    }

    if (count > targetCount) {
      // Need more simplification, increase epsilon
      low = mid
    } else {
      // Too few points, decrease epsilon
      high = mid
    }
  }

  return bestEpsilon
}

/**
 * Uniform downsampling (every nth point)
 */
export function uniformDownsample(points: GPXPoint[], targetCount: number): GPXPoint[] {
  if (points.length <= targetCount) {
    return points
  }

  const step = Math.ceil(points.length / targetCount)
  const result: GPXPoint[] = []

  for (let i = 0; i < points.length; i += step) {
    result.push(points[i])
  }

  // Always include last point
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1])
  }

  return result
}

/**
 * Ensure extreme points (min/max elevation) are included
 */
function ensureExtremes(points: GPXPoint[], original: GPXPoint[]): GPXPoint[] {
  if (original.length === 0) return points

  // Find min/max elevation points in original
  let minElePoint = original[0]
  let maxElePoint = original[0]

  for (const p of original) {
    if (p.elevation < minElePoint.elevation) minElePoint = p
    if (p.elevation > maxElePoint.elevation) maxElePoint = p
  }

  // Check if they're already included
  const hasMin = points.some(p =>
    p.distance === minElePoint.distance && p.elevation === minElePoint.elevation
  )
  const hasMax = points.some(p =>
    p.distance === maxElePoint.distance && p.elevation === maxElePoint.elevation
  )

  if (hasMin && hasMax) {
    return points
  }

  // Add missing extreme points and re-sort by distance
  const result = [...points]
  if (!hasMin) result.push(minElePoint)
  if (!hasMax && minElePoint !== maxElePoint) result.push(maxElePoint)

  return result.sort((a, b) => a.distance - b.distance)
}

/**
 * Main downsampling function
 */
export function downsampleGPX(
  points: GPXPoint[],
  options: DownsampleOptions = DEFAULT_DOWNSAMPLE_OPTIONS
): DownsampleResult {
  const originalCount = points.length

  // No downsampling needed or disabled
  if (!options.enabled || points.length <= options.targetPoints) {
    return {
      points,
      originalCount,
      downsampledCount: points.length,
      wasDownsampled: false
    }
  }

  let result: GPXPoint[]

  if (options.algorithm === 'douglas-peucker') {
    const epsilon = findEpsilonForTargetCount(points, options.targetPoints)
    result = douglasPeucker(points, epsilon)
  } else {
    result = uniformDownsample(points, options.targetPoints)
  }

  // Preserve extreme points if requested
  if (options.preserveExtremes) {
    result = ensureExtremes(result, points)
  }

  return {
    points: result,
    originalCount,
    downsampledCount: result.length,
    wasDownsampled: true
  }
}
