/**
 * GPX Validation Utilities
 *
 * Validates GPX data and provides user-friendly warnings for edge cases:
 * - Too few points (< 50)
 * - Very long tracks (> 500 km)
 * - Flat elevation (no significant elevation change)
 * - Corrupt/invalid GPX files
 */

import type { GPXPoint } from './downsampling'

export type GPXWarningSeverity = 'info' | 'warning' | 'error'

export interface GPXWarning {
  type: 'too_few_points' | 'very_long_track' | 'flat_elevation' | 'no_elevation_data' | 'parse_error' | 'no_trackpoints'
  severity: GPXWarningSeverity
  message: string
  suggestion: string
  details?: Record<string, number | string>
}

export interface GPXValidationResult {
  isValid: boolean
  warnings: GPXWarning[]
  stats: GPXStats
}

export interface GPXStats {
  pointCount: number
  totalDistanceKm: number
  minElevation: number
  maxElevation: number
  elevationGain: number
  elevationLoss: number
  elevationRange: number
}

export interface GPXValidationOptions {
  /** Minimum number of points for a good animation (default: 50) */
  minPoints: number
  /** Info threshold for very long tracks in km (default: 800) - just informational, not a limitation */
  longTrackInfoThresholdKm: number
  /** Minimum elevation range in meters to be considered interesting (default: 10) */
  minElevationRange: number
}

export const DEFAULT_VALIDATION_OPTIONS: GPXValidationOptions = {
  minPoints: 50,
  longTrackInfoThresholdKm: 800,
  minElevationRange: 10,
}

/**
 * Calculate statistics from GPX points
 */
export function calculateGPXStats(points: GPXPoint[]): GPXStats {
  if (points.length === 0) {
    return {
      pointCount: 0,
      totalDistanceKm: 0,
      minElevation: 0,
      maxElevation: 0,
      elevationGain: 0,
      elevationLoss: 0,
      elevationRange: 0,
    }
  }

  let minElevation = points[0].elevation
  let maxElevation = points[0].elevation
  let elevationGain = 0
  let elevationLoss = 0

  for (let i = 0; i < points.length; i++) {
    const elevation = points[i].elevation

    if (elevation < minElevation) minElevation = elevation
    if (elevation > maxElevation) maxElevation = elevation

    if (i > 0) {
      const diff = elevation - points[i - 1].elevation
      if (diff > 0) {
        elevationGain += diff
      } else {
        elevationLoss += Math.abs(diff)
      }
    }
  }

  const lastPoint = points[points.length - 1]

  return {
    pointCount: points.length,
    totalDistanceKm: lastPoint.distance,
    minElevation: Math.round(minElevation),
    maxElevation: Math.round(maxElevation),
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    elevationRange: Math.round(maxElevation - minElevation),
  }
}

/**
 * Validate GPX data and return warnings
 */
export function validateGPX(
  points: GPXPoint[],
  options: GPXValidationOptions = DEFAULT_VALIDATION_OPTIONS
): GPXValidationResult {
  const warnings: GPXWarning[] = []
  const stats = calculateGPXStats(points)

  // Check for no points
  if (points.length === 0) {
    warnings.push({
      type: 'no_trackpoints',
      severity: 'error',
      message: 'Keine Trackpunkte gefunden',
      suggestion: 'Stellen Sie sicher, dass die GPX-Datei <trkpt> Elemente enthält.',
    })
    return { isValid: false, warnings, stats }
  }

  // Check for too few points
  if (points.length < options.minPoints) {
    warnings.push({
      type: 'too_few_points',
      severity: points.length < 20 ? 'warning' : 'info',
      message: `Wenige Datenpunkte (${points.length})`,
      suggestion: points.length < 20
        ? 'Die Animation könnte ruckelig aussehen. Versuchen Sie eine GPX-Datei mit mehr Trackpunkten.'
        : 'Die Animation ist möglicherweise kürzer als erwartet.',
      details: {
        pointCount: points.length,
        recommended: options.minPoints,
      },
    })
  }

  // Info for very long tracks (not a limitation, just informational)
  if (stats.totalDistanceKm > options.longTrackInfoThresholdKm) {
    warnings.push({
      type: 'very_long_track',
      severity: 'info',
      message: `Lange Strecke (${stats.totalDistanceKm.toFixed(0)} km)`,
      suggestion: 'Die Daten wurden automatisch optimiert, um eine flüssige Darstellung zu gewährleisten.',
      details: {
        distanceKm: stats.totalDistanceKm,
      },
    })
  }

  // Check for flat elevation
  if (stats.elevationRange < options.minElevationRange) {
    if (stats.elevationRange === 0) {
      warnings.push({
        type: 'no_elevation_data',
        severity: 'warning',
        message: 'Keine Höhendaten vorhanden',
        suggestion: 'Die GPX-Datei enthält keine Höheninformationen. Das Profil wird als flache Linie dargestellt.',
        details: {
          elevationRange: stats.elevationRange,
        },
      })
    } else {
      warnings.push({
        type: 'flat_elevation',
        severity: 'info',
        message: `Flaches Gelände (${stats.elevationRange} m Unterschied)`,
        suggestion: 'Das Höhenprofil wird automatisch skaliert, um die Unterschiede sichtbar zu machen.',
        details: {
          elevationRange: stats.elevationRange,
          minElevation: stats.minElevation,
          maxElevation: stats.maxElevation,
        },
      })
    }
  }

  const hasErrors = warnings.some(w => w.severity === 'error')

  return {
    isValid: !hasErrors,
    warnings,
    stats,
  }
}

/**
 * Get color for warning severity (Vuetify alert type)
 */
export function getWarningSeverityColor(severity: GPXWarningSeverity): 'error' | 'warning' | 'info' | 'success' {
  switch (severity) {
    case 'error': return 'error'
    case 'warning': return 'warning'
    case 'info': return 'info'
  }
}

/**
 * Get icon for warning type
 */
export function getWarningIcon(type: GPXWarning['type']): string {
  switch (type) {
    case 'too_few_points': return 'mdi-chart-scatter-plot'
    case 'very_long_track': return 'mdi-map-marker-distance'
    case 'flat_elevation': return 'mdi-arrow-right'
    case 'no_elevation_data': return 'mdi-terrain'
    case 'parse_error': return 'mdi-file-alert'
    case 'no_trackpoints': return 'mdi-map-marker-off'
  }
}
