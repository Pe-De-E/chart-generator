import { describe, it, expect } from 'vitest'
import { generateCombinedFrame } from './combinedFrame'
import type { CombinedFrameOptions } from './combinedFrame'
import { DEFAULT_ROUTE_LINE_STYLE } from './routeLine'
import { DEFAULT_MAP_CAMERA_CONFIG } from './mapCamera'
import type { RoutePoint } from '@chart-generator/shared'

const sampleRoute: RoutePoint[] = [
  { lat: 48.1351, lon: 11.5820, elevation: 520, distance: 0 },
  { lat: 48.1400, lon: 11.5820, elevation: 530, distance: 0.55 },
  { lat: 48.1400, lon: 11.5900, elevation: 540, distance: 1.15 },
  { lat: 48.1351, lon: 11.5900, elevation: 525, distance: 1.70 },
  { lat: 48.1351, lon: 11.5820, elevation: 520, distance: 2.30 },
]

const sampleChartData = [
  { label: '0', value: 520 },
  { label: '0.55', value: 530 },
  { label: '1.15', value: 540 },
  { label: '1.70', value: 525 },
  { label: '2.30', value: 520 },
]

const baseOptions: CombinedFrameOptions = {
  routePoints: sampleRoute,
  chartData: sampleChartData,
  progress: 0.5,
  width: 1080,
  height: 1920,
  mapHeightRatio: 0.6,
  backgroundColor: '#1a1a2e',
  backgroundType: 'solid',
  mapCameraMode: 'overview',
  mapCameraConfig: DEFAULT_MAP_CAMERA_CONFIG,
  routeStyle: DEFAULT_ROUTE_LINE_STYLE,
  showMapMarker: true,
  mapMarkerSize: 8,
  mapMarkerColor: '#ffffff',
  showDirection: true,
  curveColor: '#ffffff',
  showElevationMarker: true,
  elevationMarkerSize: 6,
  elevationMarkerColor: '#ffffff',
  showAreaFill: true,
}

describe('generateCombinedFrame', () => {
  it('returns valid SVG string', () => {
    const svg = generateCombinedFrame(baseOptions)
    expect(svg).toContain('<svg')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('</svg>')
  })

  it('includes correct viewBox dimensions', () => {
    const svg = generateCombinedFrame(baseOptions)
    expect(svg).toContain('viewBox="0 0 1080 1920"')
  })

  it('renders shared background', () => {
    const svg = generateCombinedFrame(baseOptions)
    expect(svg).toContain('fill="#1a1a2e"')
  })

  it('renders route polyline (map section)', () => {
    const svg = generateCombinedFrame(baseOptions)
    expect(svg).toContain('<polyline')
  })

  it('renders elevation curve polyline', () => {
    const svg = generateCombinedFrame(baseOptions)
    // Should have multiple polylines (route trail + route revealed + elevation curve)
    const polylineCount = (svg.match(/<polyline/g) || []).length
    expect(polylineCount).toBeGreaterThanOrEqual(2)
  })

  it('renders map marker circle', () => {
    const svg = generateCombinedFrame(baseOptions)
    expect(svg).toContain('<circle')
  })

  it('renders elevation marker circle', () => {
    const svg = generateCombinedFrame(baseOptions)
    // Count circles — at least one for elevation marker
    const circleCount = (svg.match(/<circle/g) || []).length
    expect(circleCount).toBeGreaterThanOrEqual(2) // map marker + elevation marker
  })

  it('renders area fill polygon', () => {
    const svg = generateCombinedFrame(baseOptions)
    expect(svg).toContain('<polygon')
    expect(svg).toContain('combined-elev-gradient')
  })

  it('hides area fill when disabled', () => {
    const svg = generateCombinedFrame({ ...baseOptions, showAreaFill: false })
    expect(svg).not.toContain('combined-elev-gradient')
  })

  it('renders at progress 0', () => {
    const svg = generateCombinedFrame({ ...baseOptions, progress: 0 })
    expect(svg).toContain('<svg')
    // Route trail should still exist
    expect(svg).toContain('<polyline')
  })

  it('renders at progress 1', () => {
    const svg = generateCombinedFrame({ ...baseOptions, progress: 1 })
    expect(svg).toContain('<svg')
  })

  it('handles empty route gracefully', () => {
    const svg = generateCombinedFrame({ ...baseOptions, routePoints: [] })
    expect(svg).toContain('<svg')
    // Elevation should still render
    expect(svg).toContain('<polyline')
  })

  it('handles empty chart data gracefully', () => {
    const svg = generateCombinedFrame({ ...baseOptions, chartData: [] })
    expect(svg).toContain('<svg')
  })

  it('handles both empty gracefully', () => {
    const svg = generateCombinedFrame({
      ...baseOptions,
      routePoints: [],
      chartData: [],
    })
    expect(svg).toContain('<svg')
    expect(svg).toContain('fill="#1a1a2e"')
  })
})

describe('generateCombinedFrame - layout', () => {
  it('uses clip path positioned at map/elevation boundary', () => {
    const svg = generateCombinedFrame(baseOptions)
    // With mapHeightRatio 0.6, boundary at y=1152
    expect(svg).toContain('y="1152"')
  })

  it('adjusts layout with different mapHeightRatio', () => {
    const svg = generateCombinedFrame({ ...baseOptions, mapHeightRatio: 0.5 })
    // With mapHeightRatio 0.5, boundary at y=960
    expect(svg).toContain('y="960"')
  })

  it('renders divider when enabled', () => {
    const svg = generateCombinedFrame({
      ...baseOptions,
      showDivider: true,
      dividerColor: '#ff0000',
    })
    expect(svg).toContain('stroke="#ff0000"')
    // Divider should be at the map/elevation boundary
    expect(svg).toContain('y1="1152"')
    expect(svg).toContain('y2="1152"')
  })

  it('does not render divider by default', () => {
    const svg = generateCombinedFrame(baseOptions)
    // No horizontal line at the boundary
    expect(svg).not.toContain('y1="1152" x2="1080" y2="1152"')
  })
})

describe('generateCombinedFrame - camera modes', () => {
  it('renders chase mode with nested SVG', () => {
    const svg = generateCombinedFrame({
      ...baseOptions,
      mapCameraMode: 'chase',
    })
    // Chase mode creates an extra nested <svg> for the zoomed viewport
    const svgCount = (svg.match(/<svg/g) || []).length
    expect(svgCount).toBeGreaterThanOrEqual(2)
  })

  it('overview mode has no nested map SVG', () => {
    const svg = generateCombinedFrame(baseOptions)
    // Overview mode: only the outer <svg>
    const svgCount = (svg.match(/<svg/g) || []).length
    expect(svgCount).toBe(1)
  })
})

describe('generateCombinedFrame - backgrounds', () => {
  it('renders gradient background', () => {
    const svg = generateCombinedFrame({
      ...baseOptions,
      backgroundType: 'gradient',
      gradientColor: '#ff0000',
    })
    expect(svg).toContain('linearGradient')
  })

  it('renders mesh background', () => {
    const svg = generateCombinedFrame({
      ...baseOptions,
      backgroundType: 'mesh',
    })
    expect(svg).toContain('radialGradient')
  })
})

describe('generateCombinedFrame - labels', () => {
  it('renders elevation labels when enabled', () => {
    const svg = generateCombinedFrame({
      ...baseOptions,
      showElevationLabels: true,
    })
    expect(svg).toContain('m</text>')
  })

  it('renders distance labels when enabled', () => {
    const svg = generateCombinedFrame({
      ...baseOptions,
      showDistanceLabels: true,
      totalDistanceKm: 10,
    })
    expect(svg).toContain('km</text>')
  })

  it('renders start/end labels when enabled', () => {
    const svg = generateCombinedFrame({
      ...baseOptions,
      showStartEndLabels: true,
    })
    expect(svg).toContain('Start')
    expect(svg).toContain('Ziel')
  })

  it('renders distance markers when enabled', () => {
    const svg = generateCombinedFrame({
      ...baseOptions,
      showDistanceMarkers: true,
      distanceMarkerInterval: 1,
    })
    expect(svg).toContain('km')
  })
})

describe('generateCombinedFrame - opacity', () => {
  it('wraps in opacity group when sceneOpacity set', () => {
    const svg = generateCombinedFrame({
      ...baseOptions,
      sceneOpacity: 0.5,
    })
    expect(svg).toContain('opacity="0.50"')
  })

  it('no opacity group at full opacity', () => {
    const svg = generateCombinedFrame(baseOptions)
    expect(svg).not.toContain('opacity="1.00"')
  })
})
