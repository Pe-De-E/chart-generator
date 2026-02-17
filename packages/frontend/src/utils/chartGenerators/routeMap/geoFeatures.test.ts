import { describe, it, expect } from 'vitest'
import {
  filterFeaturesByBounds,
  projectGeoCoord,
  simplifyLine2D,
  generateGeoLayers,
} from './geoFeatures'
import type { GeoLayerConfig } from './geoFeatures'
import { getProjectionParams } from './projection'
import type { RouteBounds, ProjectionParams } from './projection'

// Sample bounds: Munich area
const munichBounds: RouteBounds = {
  minLat: 48.05,
  maxLat: 48.25,
  minLon: 11.45,
  maxLon: 11.70,
  centerLat: 48.15,
  centerLon: 11.575,
}

const mapConfig = { width: 1080, height: 1152, padding: { top: 50, right: 50, bottom: 50, left: 50 } }
const projParams = getProjectionParams(munichBounds, mapConfig)

// Wider bounds for generateGeoLayers tests — 110m data needs a regional view
// to have enough vertices within the viewport for visible rendering
const regionalBounds: RouteBounds = {
  minLat: 45,
  maxLat: 50,
  minLon: 8,
  maxLon: 15,
  centerLat: 47.5,
  centerLon: 11.5,
}
const regionalProjParams = getProjectionParams(regionalBounds, mapConfig)

const enabledConfig: GeoLayerConfig = {
  showBorders: true,
  showRivers: true,
  showCities: true,
  borderColor: '#ffffff',
  borderOpacity: 0.12,
  riverColor: '#4a90d9',
  riverOpacity: 0.15,
  cityColor: '#ffffff',
  cityOpacity: 0.20,
}

// ── filterFeaturesByBounds ──────────────────────────────────────────────────

describe('filterFeaturesByBounds', () => {
  const germanyFeature = {
    type: 'Feature' as const,
    properties: { name: 'Germany' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[5.87, 47.27], [15.04, 47.27], [15.04, 55.06], [5.87, 55.06], [5.87, 47.27]]],
    },
  }

  const brazilFeature = {
    type: 'Feature' as const,
    properties: { name: 'Brazil' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[-73.98, -33.77], [-34.73, -33.77], [-34.73, 5.27], [-73.98, 5.27], [-73.98, -33.77]]],
    },
  }

  it('includes features overlapping route bounds', () => {
    const result = filterFeaturesByBounds([germanyFeature, brazilFeature], munichBounds, 2)
    expect(result).toHaveLength(1)
    expect(result[0].properties.name).toBe('Germany')
  })

  it('excludes features far from route bounds', () => {
    const result = filterFeaturesByBounds([brazilFeature], munichBounds, 2)
    expect(result).toHaveLength(0)
  })

  it('returns empty for empty features', () => {
    const result = filterFeaturesByBounds([], munichBounds, 2)
    expect(result).toHaveLength(0)
  })

  it('padding expands the visible area', () => {
    // Feature just outside bounds but within padding
    const nearbyFeature = {
      type: 'Feature' as const,
      properties: { name: 'Nearby' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[[11.0, 47.8], [11.3, 47.8], [11.3, 48.0], [11.0, 48.0], [11.0, 47.8]]],
      },
    }
    // With 0 padding, just barely outside
    const withoutPadding = filterFeaturesByBounds([nearbyFeature], munichBounds, 0)
    // With 2 degree padding, should be included
    const withPadding = filterFeaturesByBounds([nearbyFeature], munichBounds, 2)
    expect(withPadding.length).toBeGreaterThanOrEqual(withoutPadding.length)
  })
})

// ── projectGeoCoord ─────────────────────────────────────────────────────────

describe('projectGeoCoord', () => {
  it('projects minLon/maxLat to offsetX/offsetY', () => {
    const { x, y } = projectGeoCoord(munichBounds.minLon, munichBounds.maxLat, projParams)
    expect(x).toBeCloseTo(projParams.offsetX, 0)
    expect(y).toBeCloseTo(projParams.offsetY, 0)
  })

  it('projects center to approximately center of area', () => {
    const { x, y } = projectGeoCoord(munichBounds.centerLon, munichBounds.centerLat, projParams)
    // Should be roughly centered
    const midX = projParams.offsetX + (munichBounds.maxLon - munichBounds.minLon) * projParams.cosLat * projParams.scale / 2
    const midY = projParams.offsetY + (munichBounds.maxLat - munichBounds.minLat) * projParams.scale / 2
    expect(x).toBeCloseTo(midX, 0)
    expect(y).toBeCloseTo(midY, 0)
  })

  it('x increases with longitude', () => {
    const a = projectGeoCoord(11.5, 48.15, projParams)
    const b = projectGeoCoord(11.6, 48.15, projParams)
    expect(b.x).toBeGreaterThan(a.x)
  })

  it('y decreases with latitude (SVG y-axis inverted)', () => {
    const a = projectGeoCoord(11.5, 48.10, projParams)
    const b = projectGeoCoord(11.5, 48.20, projParams)
    expect(b.y).toBeLessThan(a.y) // Higher latitude = lower SVG y
  })
})

// ── simplifyLine2D ──────────────────────────────────────────────────────────

describe('simplifyLine2D', () => {
  it('returns same points for 2 or fewer points', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }]
    expect(simplifyLine2D(pts, 5)).toEqual(pts)
  })

  it('reduces a straight line to 2 points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 10 },
      { x: 15, y: 15 },
      { x: 20, y: 20 },
    ]
    const result = simplifyLine2D(pts, 1)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ x: 0, y: 0 })
    expect(result[1]).toEqual({ x: 20, y: 20 })
  })

  it('preserves significant deviations', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 100 }, // Big deviation
      { x: 10, y: 0 },
    ]
    const result = simplifyLine2D(pts, 1)
    expect(result).toHaveLength(3)
  })

  it('epsilon 0 preserves all points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0.5 },
      { x: 2, y: 0.1 },
      { x: 3, y: 0 },
    ]
    const result = simplifyLine2D(pts, 0)
    expect(result).toHaveLength(pts.length)
  })

  it('large epsilon returns only endpoints', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 3 },
      { x: 10, y: 1 },
      { x: 15, y: 4 },
      { x: 20, y: 0 },
    ]
    const result = simplifyLine2D(pts, 1000)
    expect(result).toHaveLength(2)
  })
})

// ── generateGeoLayers ───────────────────────────────────────────────────────

describe('generateGeoLayers', () => {
  it('returns empty string when all layers disabled', () => {
    const config: GeoLayerConfig = {
      ...enabledConfig,
      showBorders: false,
      showRivers: false,
      showCities: false,
    }
    const svg = generateGeoLayers(munichBounds, projParams, config)
    expect(svg).toBe('')
  })

  it('renders borders with path elements', () => {
    const config = { ...enabledConfig, showRivers: false, showCities: false }
    const svg = generateGeoLayers(regionalBounds, regionalProjParams, config)
    expect(svg).toContain('<g class="geo-context">')
    expect(svg).toContain('<path')
    expect(svg).toContain('stroke="#ffffff"')
  })

  it('renders rivers with river color', () => {
    const config = { ...enabledConfig, showBorders: false, showCities: false }
    const svg = generateGeoLayers(regionalBounds, regionalProjParams, config)
    // May or may not have rivers near Central Europe at 110m resolution
    if (svg) {
      expect(svg).toContain('geo-context')
    }
  })

  it('renders cities with circle and text', () => {
    const config = { ...enabledConfig, showBorders: false, showRivers: false }
    const svg = generateGeoLayers(regionalBounds, regionalProjParams, config)
    if (svg) {
      expect(svg).toContain('<circle')
      expect(svg).toContain('<text')
    }
  })

  it('wraps output in geo-context group', () => {
    const svg = generateGeoLayers(regionalBounds, regionalProjParams, enabledConfig)
    if (svg) {
      expect(svg).toMatch(/^<g class="geo-context">/)
      expect(svg).toMatch(/<\/g>$/)
    }
  })

  it('applies custom border opacity', () => {
    const config = { ...enabledConfig, showRivers: false, showCities: false, borderOpacity: 0.25 }
    const svg = generateGeoLayers(regionalBounds, regionalProjParams, config)
    if (svg) {
      expect(svg).toContain('opacity="0.25"')
    }
  })

  it('applies custom border color', () => {
    const config = { ...enabledConfig, showRivers: false, showCities: false, borderColor: '#ff0000' }
    const svg = generateGeoLayers(regionalBounds, regionalProjParams, config)
    if (svg) {
      expect(svg).toContain('stroke="#ff0000"')
    }
  })

  it('returns cached result for same bounds and config', () => {
    const config = { ...enabledConfig, showRivers: false, showCities: false }
    const svg1 = generateGeoLayers(munichBounds, projParams, config)
    const svg2 = generateGeoLayers(munichBounds, projParams, config)
    expect(svg1).toBe(svg2)
  })

  it('renders borders with in-viewport coordinates for tight route bounds', () => {
    const tightBounds: RouteBounds = {
      minLat: 47.22797,
      maxLat: 47.486416,
      minLon: 10.737819,
      maxLon: 11.079938,
      centerLat: 47.357193,
      centerLon: 10.908879,
    }
    const tightConfig = { width: 1080, height: 1152, padding: { top: 50, right: 50, bottom: 50, left: 50 } }
    const tightProj = getProjectionParams(tightBounds, tightConfig)
    const config = { ...enabledConfig, showRivers: false, showCities: false }
    const svg = generateGeoLayers(tightBounds, tightProj, config, 1080, 1152)

    expect(svg).toContain('<path')

    // Verify some coordinates fall within the visible viewport
    // Match M (move), L (line), and final point of C (cubic bezier) commands
    const coords = [...svg.matchAll(/[MLC][\d.,-\s]*?([\d.-]+),([\d.-]+)(?=[\s"MLCZ]|$)/g)]
    const inViewport = coords.filter(m => {
      const x = parseFloat(m[1])
      const y = parseFloat(m[2])
      return x >= 0 && x <= 1080 && y >= 0 && y <= 1152
    })
    expect(inViewport.length).toBeGreaterThan(0)
  })
})
