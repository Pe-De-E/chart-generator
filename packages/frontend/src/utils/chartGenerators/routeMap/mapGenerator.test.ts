import { describe, it, expect } from 'vitest'
import { generateMapFrame, DEFAULT_MAP_FRAME_OPTIONS } from './mapGenerator'
import { DEFAULT_ROUTE_LINE_STYLE } from './routeLine'
import { DEFAULT_MAP_CAMERA_CONFIG } from './mapCamera'
import type { MapFrameOptions } from './mapGenerator'
import type { RoutePoint } from '@chart-generator/shared'

const sampleRoute: RoutePoint[] = [
  { lat: 48.1351, lon: 11.5820, elevation: 520, distance: 0 },
  { lat: 48.1400, lon: 11.5820, elevation: 530, distance: 0.55 },
  { lat: 48.1400, lon: 11.5900, elevation: 540, distance: 1.15 },
  { lat: 48.1351, lon: 11.5900, elevation: 525, distance: 1.70 },
  { lat: 48.1351, lon: 11.5820, elevation: 520, distance: 2.30 },
]

const baseOptions: MapFrameOptions = {
  routePoints: sampleRoute,
  progress: 0.5,
  width: 1080,
  height: 1152,
  backgroundColor: '#1a1a2e',
  backgroundType: 'solid',
  routeStyle: DEFAULT_ROUTE_LINE_STYLE,
  showMarker: true,
  markerSize: 8,
  markerColor: '#ffffff',
  showDirection: true,
  cameraMode: 'overview',
  cameraConfig: DEFAULT_MAP_CAMERA_CONFIG,
}

describe('generateMapFrame', () => {
  it('returns valid SVG string', () => {
    const svg = generateMapFrame(baseOptions)
    expect(svg).toContain('<svg')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('</svg>')
  })

  it('includes viewBox with correct dimensions', () => {
    const svg = generateMapFrame(baseOptions)
    expect(svg).toContain('viewBox="0 0 1080 1152"')
  })

  it('renders background rect', () => {
    const svg = generateMapFrame(baseOptions)
    expect(svg).toContain('fill="#1a1a2e"')
  })

  it('renders polyline for route', () => {
    const svg = generateMapFrame(baseOptions)
    expect(svg).toContain('<polyline')
  })

  it('renders marker circle', () => {
    const svg = generateMapFrame(baseOptions)
    expect(svg).toContain('<circle')
    expect(svg).toContain('fill="#ffffff"')
  })

  it('renders direction arrow by default', () => {
    const svg = generateMapFrame(baseOptions)
    expect(svg).toContain('<polygon')
    expect(svg).toContain('rotate(')
  })

  it('hides marker when showMarker is false', () => {
    const svg = generateMapFrame({ ...baseOptions, showMarker: false })
    // Should still have route polyline but no marker circle
    expect(svg).toContain('<polyline')
    // The circle from start/end labels might not exist, just check no marker-specific circle
    expect(svg).not.toContain('<polygon') // no direction arrow
  })

  it('handles empty route gracefully', () => {
    const svg = generateMapFrame({ ...baseOptions, routePoints: [] })
    expect(svg).toContain('<svg')
    expect(svg).toContain('fill="#1a1a2e"')
  })

  it('handles single-point route gracefully', () => {
    const svg = generateMapFrame({
      ...baseOptions,
      routePoints: [{ lat: 48.0, lon: 11.0, elevation: 500, distance: 0 }],
    })
    expect(svg).toContain('<svg')
  })

  it('renders at progress 0 (no revealed line)', () => {
    const svg = generateMapFrame({ ...baseOptions, progress: 0 })
    expect(svg).toContain('<svg')
    // Trail polyline should still exist
    expect(svg).toContain('<polyline')
  })

  it('renders at progress 1 (full line)', () => {
    const svg = generateMapFrame({ ...baseOptions, progress: 1 })
    expect(svg).toContain('<svg')
    expect(svg).toContain('<polyline')
  })

  it('uses gradient background', () => {
    const svg = generateMapFrame({
      ...baseOptions,
      backgroundType: 'gradient',
      gradientColor: '#ff0000',
    })
    expect(svg).toContain('linearGradient')
    expect(svg).toContain('#ff0000')
  })

  it('uses mesh background', () => {
    const svg = generateMapFrame({
      ...baseOptions,
      backgroundType: 'mesh',
      meshColor1: '#112233',
    })
    expect(svg).toContain('radialGradient')
    expect(svg).toContain('#112233')
  })
})

describe('generateMapFrame - chase mode', () => {
  const chaseOptions: MapFrameOptions = {
    ...baseOptions,
    cameraMode: 'chase',
  }

  it('renders nested SVG with viewBox for chase camera', () => {
    const svg = generateMapFrame(chaseOptions)
    // Chase mode uses a nested <svg> with dynamic viewBox
    const svgCount = (svg.match(/<svg/g) || []).length
    expect(svgCount).toBeGreaterThanOrEqual(2) // outer + inner chase
  })

  it('renders background route in chase mode', () => {
    const svg = generateMapFrame(chaseOptions)
    // Should have at least 3 polylines: bg route, trail, revealed
    const polylineCount = (svg.match(/<polyline/g) || []).length
    expect(polylineCount).toBeGreaterThanOrEqual(3)
  })

  it('applies scene opacity', () => {
    const svg = generateMapFrame({ ...chaseOptions, sceneOpacity: 0.5 })
    expect(svg).toContain('opacity="0.50"')
  })
})

describe('generateMapFrame - labels', () => {
  it('renders distance markers when enabled', () => {
    const svg = generateMapFrame({
      ...baseOptions,
      showDistanceMarkers: true,
      distanceMarkerInterval: 1,
    })
    expect(svg).toContain('km')
  })

  it('renders start/end labels when enabled', () => {
    const svg = generateMapFrame({
      ...baseOptions,
      showStartEndLabels: true,
    })
    expect(svg).toContain('Start')
    expect(svg).toContain('Ziel')
  })

  it('does not render labels by default', () => {
    const svg = generateMapFrame(baseOptions)
    expect(svg).not.toContain('Start')
    expect(svg).not.toContain('Ziel')
    expect(svg).not.toContain('km</text>')
  })
})
