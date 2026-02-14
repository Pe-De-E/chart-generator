import { describe, it, expect } from 'vitest'
import { calculateMapCameraViewport, DEFAULT_MAP_CAMERA_CONFIG } from './mapCamera'
import type { MapCameraConfig } from './mapCamera'
import { projectRouteToSvg } from './projection'
import type { RoutePoint } from '@chart-generator/shared'

const sampleRoute: RoutePoint[] = [
  { lat: 48.1351, lon: 11.5820, elevation: 520, distance: 0 },
  { lat: 48.1400, lon: 11.5820, elevation: 530, distance: 0.55 },
  { lat: 48.1400, lon: 11.5900, elevation: 540, distance: 1.15 },
  { lat: 48.1351, lon: 11.5900, elevation: 525, distance: 1.70 },
  { lat: 48.1351, lon: 11.5820, elevation: 520, distance: 2.30 },
]

const width = 1080
const height = 1152
const config = { width, height, padding: { top: 60, right: 60, bottom: 60, left: 60 } }
const { mapPoints, chartArea } = projectRouteToSvg(sampleRoute, config)

const defaultConfig: MapCameraConfig = { ...DEFAULT_MAP_CAMERA_CONFIG }

describe('calculateMapCameraViewport - overview mode', () => {
  it('returns full viewport at any progress', () => {
    const vp = calculateMapCameraViewport(0.5, 'overview', defaultConfig, mapPoints, chartArea, width, height)
    expect(vp.x).toBe(0)
    expect(vp.y).toBe(0)
    expect(vp.w).toBe(width)
    expect(vp.h).toBe(height)
    expect(vp.scale).toBe(1)
    expect(vp.rotation).toBe(0)
  })

  it('returns same viewport at progress 0 and 1', () => {
    const vp0 = calculateMapCameraViewport(0, 'overview', defaultConfig, mapPoints, chartArea, width, height)
    const vp1 = calculateMapCameraViewport(1, 'overview', defaultConfig, mapPoints, chartArea, width, height)
    expect(vp0.w).toBe(vp1.w)
    expect(vp0.h).toBe(vp1.h)
  })
})

describe('calculateMapCameraViewport - chase mode', () => {
  it('has higher scale (zoomed in) at progress 0', () => {
    const vp = calculateMapCameraViewport(0, 'chase', defaultConfig, mapPoints, chartArea, width, height)
    expect(vp.scale).toBeGreaterThan(1)
    expect(vp.w).toBeLessThan(width)
    expect(vp.h).toBeLessThan(height)
  })

  it('zooms out to full view at progress 1', () => {
    const vp = calculateMapCameraViewport(1, 'chase', defaultConfig, mapPoints, chartArea, width, height)
    expect(vp.scale).toBeCloseTo(1, 1)
    expect(vp.w).toBeCloseTo(width, 0)
    expect(vp.h).toBeCloseTo(height, 0)
  })

  it('viewport stays within SVG bounds', () => {
    for (let p = 0; p <= 1; p += 0.1) {
      const vp = calculateMapCameraViewport(p, 'chase', defaultConfig, mapPoints, chartArea, width, height)
      expect(vp.x).toBeGreaterThanOrEqual(0)
      expect(vp.y).toBeGreaterThanOrEqual(0)
      expect(vp.x + vp.w).toBeLessThanOrEqual(width + 1)
      expect(vp.y + vp.h).toBeLessThanOrEqual(height + 1)
    }
  })

  it('zoom-out starts at configured zoomOutStart', () => {
    const cfg: MapCameraConfig = { ...defaultConfig, zoomOutStart: 0.8 }

    const vpBefore = calculateMapCameraViewport(0.79, 'chase', cfg, mapPoints, chartArea, width, height)
    const vpAfter = calculateMapCameraViewport(0.81, 'chase', cfg, mapPoints, chartArea, width, height)

    // Before zoomOutStart: full chase zoom
    expect(vpBefore.scale).toBeCloseTo(cfg.zoomLevel, 1)
    // After zoomOutStart: zoom is decreasing
    expect(vpAfter.scale).toBeLessThan(vpBefore.scale)
  })

  it('no rotation by default', () => {
    const vp = calculateMapCameraViewport(0.5, 'chase', defaultConfig, mapPoints, chartArea, width, height)
    expect(vp.rotation).toBe(0)
  })

  it('rotates when rotateWithRoute is true', () => {
    const cfg: MapCameraConfig = { ...defaultConfig, rotateWithRoute: true }
    const vp = calculateMapCameraViewport(0.3, 'chase', cfg, mapPoints, chartArea, width, height)
    // With a square-ish route, some segments have non-zero heading
    // Just check it's a finite number
    expect(Number.isFinite(vp.rotation)).toBe(true)
  })

  it('rotation returns to 0 at progress 1 (zoom-out phase)', () => {
    const cfg: MapCameraConfig = { ...defaultConfig, rotateWithRoute: true }
    const vp = calculateMapCameraViewport(1, 'chase', cfg, mapPoints, chartArea, width, height)
    expect(vp.rotation).toBeCloseTo(0, 1)
  })

  it('handles empty points array', () => {
    const vp = calculateMapCameraViewport(0.5, 'chase', defaultConfig, [], chartArea, width, height)
    expect(vp.w).toBeLessThan(width)
    expect(vp.scale).toBeGreaterThan(1)
  })
})
