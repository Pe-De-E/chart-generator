import { describe, it, expect } from 'vitest'
import {
  calculateRouteBounds,
  projectRouteToSvg,
  getRouteMarkerPosition,
  getRouteHeading,
} from './projection'
import type { RoutePoint } from '@chart-generator/shared'
import type { MapViewConfig } from './projection'

// Sample route: roughly a square in Munich area
const sampleRoute: RoutePoint[] = [
  { lat: 48.1351, lon: 11.5820, elevation: 520, distance: 0 },
  { lat: 48.1400, lon: 11.5820, elevation: 530, distance: 0.55 },
  { lat: 48.1400, lon: 11.5900, elevation: 540, distance: 1.15 },
  { lat: 48.1351, lon: 11.5900, elevation: 525, distance: 1.70 },
  { lat: 48.1351, lon: 11.5820, elevation: 520, distance: 2.30 },
]

const defaultConfig: MapViewConfig = {
  width: 1080,
  height: 1152,
  padding: { top: 40, right: 40, bottom: 40, left: 40 },
}

describe('calculateRouteBounds', () => {
  it('returns zero bounds for empty array', () => {
    const bounds = calculateRouteBounds([])
    expect(bounds.minLat).toBe(0)
    expect(bounds.maxLat).toBe(0)
  })

  it('calculates correct bounds for sample route', () => {
    const bounds = calculateRouteBounds(sampleRoute)
    expect(bounds.minLat).toBe(48.1351)
    expect(bounds.maxLat).toBe(48.1400)
    expect(bounds.minLon).toBe(11.5820)
    expect(bounds.maxLon).toBe(11.5900)
  })

  it('calculates center correctly', () => {
    const bounds = calculateRouteBounds(sampleRoute)
    expect(bounds.centerLat).toBeCloseTo(48.13755, 4)
    expect(bounds.centerLon).toBeCloseTo(11.5860, 4)
  })
})

describe('projectRouteToSvg', () => {
  it('returns empty for no points', () => {
    const result = projectRouteToSvg([], defaultConfig)
    expect(result.mapPoints).toHaveLength(0)
  })

  it('projects all points', () => {
    const result = projectRouteToSvg(sampleRoute, defaultConfig)
    expect(result.mapPoints).toHaveLength(5)
  })

  it('preserves original coordinates in MapPoint', () => {
    const result = projectRouteToSvg(sampleRoute, defaultConfig)
    const first = result.mapPoints[0]
    expect(first.lat).toBe(48.1351)
    expect(first.lon).toBe(11.5820)
    expect(first.elevation).toBe(520)
    expect(first.distance).toBe(0)
  })

  it('stays within padded bounds', () => {
    const result = projectRouteToSvg(sampleRoute, defaultConfig)
    const { padding } = defaultConfig

    for (const p of result.mapPoints) {
      expect(p.x).toBeGreaterThanOrEqual(padding.left - 1)
      expect(p.x).toBeLessThanOrEqual(defaultConfig.width - padding.right + 1)
      expect(p.y).toBeGreaterThanOrEqual(padding.top - 1)
      expect(p.y).toBeLessThanOrEqual(defaultConfig.height - padding.bottom + 1)
    }
  })

  it('north is up (higher lat = lower y)', () => {
    const result = projectRouteToSvg(sampleRoute, defaultConfig)
    // Point at lat 48.1400 should have lower y than point at lat 48.1351
    const northPoint = result.mapPoints[1] // lat 48.1400
    const southPoint = result.mapPoints[0] // lat 48.1351
    expect(northPoint.y).toBeLessThan(southPoint.y)
  })

  it('east is right (higher lon = higher x)', () => {
    const result = projectRouteToSvg(sampleRoute, defaultConfig)
    // Point at lon 11.5900 should have higher x than point at lon 11.5820
    const eastPoint = result.mapPoints[2] // lon 11.5900
    const westPoint = result.mapPoints[0] // lon 11.5820
    expect(eastPoint.x).toBeGreaterThan(westPoint.x)
  })

  it('handles single-point route without crashing', () => {
    const single: RoutePoint[] = [
      { lat: 48.0, lon: 11.0, elevation: 500, distance: 0 },
    ]
    const result = projectRouteToSvg(single, defaultConfig)
    expect(result.mapPoints).toHaveLength(1)
    // Point should be within padded bounds
    expect(result.mapPoints[0].x).toBeGreaterThanOrEqual(defaultConfig.padding.left)
    expect(result.mapPoints[0].x).toBeLessThanOrEqual(defaultConfig.width - defaultConfig.padding.right)
  })

  it('handles north-south line (zero longitude span)', () => {
    const line: RoutePoint[] = [
      { lat: 48.0, lon: 11.0, elevation: 500, distance: 0 },
      { lat: 48.1, lon: 11.0, elevation: 600, distance: 11 },
    ]
    const result = projectRouteToSvg(line, defaultConfig)
    expect(result.mapPoints).toHaveLength(2)
    // Both should have similar x
    expect(Math.abs(result.mapPoints[0].x - result.mapPoints[1].x)).toBeLessThan(1)
  })
})

describe('getRouteMarkerPosition', () => {
  const result = projectRouteToSvg(sampleRoute, defaultConfig)
  const points = result.mapPoints

  it('returns null for empty array', () => {
    expect(getRouteMarkerPosition([], 0.5)).toBeNull()
  })

  it('returns first point at progress 0', () => {
    const marker = getRouteMarkerPosition(points, 0)!
    expect(marker.x).toBe(points[0].x)
    expect(marker.y).toBe(points[0].y)
  })

  it('returns last point at progress 1', () => {
    const marker = getRouteMarkerPosition(points, 1)!
    expect(marker.x).toBe(points[points.length - 1].x)
    expect(marker.y).toBe(points[points.length - 1].y)
  })

  it('interpolates at progress 0.5', () => {
    const marker = getRouteMarkerPosition(points, 0.5)!
    // Should be between first and last point coordinates
    const allX = points.map(p => p.x)
    expect(marker.x).toBeGreaterThanOrEqual(Math.min(...allX))
    expect(marker.x).toBeLessThanOrEqual(Math.max(...allX))
  })

  it('clamps below 0', () => {
    const marker = getRouteMarkerPosition(points, -0.5)!
    expect(marker.x).toBe(points[0].x)
  })

  it('clamps above 1', () => {
    const marker = getRouteMarkerPosition(points, 1.5)!
    expect(marker.x).toBe(points[points.length - 1].x)
  })
})

describe('getRouteHeading', () => {
  it('returns 0 for single point', () => {
    expect(getRouteHeading([], 0.5)).toBe(0)
  })

  it('returns angle for horizontal east movement', () => {
    const { mapPoints } = projectRouteToSvg([
      { lat: 48.0, lon: 11.0, elevation: 500, distance: 0 },
      { lat: 48.0, lon: 12.0, elevation: 500, distance: 80 },
    ], defaultConfig)
    const heading = getRouteHeading(mapPoints, 0)
    // Moving east = positive x direction → ~0°
    expect(Math.abs(heading)).toBeLessThan(5)
  })

  it('returns ~90° for southward movement', () => {
    const { mapPoints } = projectRouteToSvg([
      { lat: 49.0, lon: 11.0, elevation: 500, distance: 0 },
      { lat: 48.0, lon: 11.0, elevation: 500, distance: 111 },
    ], defaultConfig)
    const heading = getRouteHeading(mapPoints, 0)
    // Moving south = positive y direction in SVG → ~90°
    expect(heading).toBeCloseTo(90, 0)
  })
})
