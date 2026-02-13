import { describe, it, expect } from 'vitest'
import {
  mapPointsToPolyline,
  generateRouteLine,
  generateRouteMarker,
  DEFAULT_ROUTE_LINE_STYLE,
} from './routeLine'
import { projectRouteToSvg } from './projection'
import type { MapPoint } from './projection'
import type { RoutePoint } from '@chart-generator/shared'

const sampleRoute: RoutePoint[] = [
  { lat: 48.1351, lon: 11.5820, elevation: 520, distance: 0 },
  { lat: 48.1400, lon: 11.5820, elevation: 530, distance: 0.55 },
  { lat: 48.1400, lon: 11.5900, elevation: 540, distance: 1.15 },
  { lat: 48.1351, lon: 11.5900, elevation: 525, distance: 1.70 },
]

const config = { width: 500, height: 500, padding: { top: 20, right: 20, bottom: 20, left: 20 } }
const { mapPoints } = projectRouteToSvg(sampleRoute, config)

describe('mapPointsToPolyline', () => {
  it('converts points to SVG polyline string', () => {
    const result = mapPointsToPolyline(mapPoints)
    const parts = result.split(' ')
    expect(parts).toHaveLength(mapPoints.length)
    // Each part should be "x,y" format
    for (const part of parts) {
      expect(part).toMatch(/^[\d.]+,[\d.]+$/)
    }
  })

  it('returns empty string for empty array', () => {
    expect(mapPointsToPolyline([])).toBe('')
  })
})

describe('generateRouteLine', () => {
  it('returns empty for fewer than 2 points', () => {
    const result = generateRouteLine([], 0.5, DEFAULT_ROUTE_LINE_STYLE, 500, 500)
    expect(result.defs).toBe('')
    expect(result.elements).toBe('')
  })

  it('generates defs with glow filter when glow enabled', () => {
    const result = generateRouteLine(mapPoints, 0.5, DEFAULT_ROUTE_LINE_STYLE, 500, 500)
    expect(result.defs).toContain('route-glow')
    expect(result.defs).toContain('feGaussianBlur')
  })

  it('generates trail line (dashed) for full route', () => {
    const result = generateRouteLine(mapPoints, 0.5, DEFAULT_ROUTE_LINE_STYLE, 500, 500)
    expect(result.elements).toContain('stroke-dasharray')
  })

  it('generates revealed polyline at progress 0.5', () => {
    const result = generateRouteLine(mapPoints, 0.5, DEFAULT_ROUTE_LINE_STYLE, 500, 500)
    // Should have the main solid polyline
    expect(result.elements).toContain('<polyline')
    // Should have at least 2 polylines (trail + revealed glow + revealed solid)
    const polylineCount = (result.elements.match(/<polyline/g) || []).length
    expect(polylineCount).toBeGreaterThanOrEqual(2)
  })

  it('generates no revealed line at progress 0', () => {
    const result = generateRouteLine(mapPoints, 0, DEFAULT_ROUTE_LINE_STYLE, 500, 500)
    // Trail should still exist, but no revealed portion
    // At progress 0, partialPolyline returns '' so no revealed polylines
    const elements = result.elements
    // Only trail polyline should remain
    const polylineCount = (elements.match(/<polyline/g) || []).length
    expect(polylineCount).toBe(1) // Just the trail
  })

  it('generates full line at progress 1', () => {
    const result = generateRouteLine(mapPoints, 1, DEFAULT_ROUTE_LINE_STYLE, 500, 500)
    expect(result.elements).toContain('<polyline')
  })

  it('respects glow off setting', () => {
    const noGlow = { ...DEFAULT_ROUTE_LINE_STYLE, glow: false }
    const result = generateRouteLine(mapPoints, 0.5, noGlow, 500, 500)
    expect(result.defs).not.toContain('route-glow')
  })

  it('respects trail off setting', () => {
    const noTrail = { ...DEFAULT_ROUTE_LINE_STYLE, trailOpacity: 0 }
    const result = generateRouteLine(mapPoints, 0.5, noTrail, 500, 500)
    expect(result.elements).not.toContain('stroke-dasharray')
  })
})

describe('generateRouteMarker', () => {
  it('returns empty for empty points', () => {
    expect(generateRouteMarker([], 0.5, 8, '#fff', '#fff')).toBe('')
  })

  it('generates circle marker', () => {
    const svg = generateRouteMarker(mapPoints, 0.5, 8, '#ffffff', '#ff0000')
    expect(svg).toContain('<circle')
    expect(svg).toContain('fill="#ffffff"')
    expect(svg).toContain('stroke="#ff0000"')
    expect(svg).toContain('r="8"')
  })

  it('generates direction arrow by default', () => {
    const svg = generateRouteMarker(mapPoints, 0.5, 8, '#fff', '#fff', true)
    expect(svg).toContain('<polygon')
    expect(svg).toContain('rotate(')
  })

  it('hides direction arrow when disabled', () => {
    const svg = generateRouteMarker(mapPoints, 0.5, 8, '#fff', '#fff', false)
    expect(svg).not.toContain('<polygon')
  })

  it('positions marker at start for progress 0', () => {
    const svg = generateRouteMarker(mapPoints, 0, 8, '#fff', '#fff')
    expect(svg).toContain(`cx="${mapPoints[0].x}"`)
    expect(svg).toContain(`cy="${mapPoints[0].y}"`)
  })
})
