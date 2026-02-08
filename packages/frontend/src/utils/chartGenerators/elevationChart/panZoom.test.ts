import { describe, it, expect } from 'vitest'
import { calculateCameraViewport } from './panZoom'
import { generateElevationFrame } from './elevationChart'
import type { PanZoomConfig } from './types'
import type { ChartOptions } from '@chart-generator/shared'

describe('calculateCameraViewport', () => {
  const fullWidth = 1080
  const fullHeight = 1920
  // Curve area in the lower 30% of the reel
  const chartArea = { x: 0, y: 1344, width: 1080, height: 576 }
  const defaultConfig: PanZoomConfig = { zoomLevel: 3, zoomOutStart: 0.75 }

  describe('Phase 1: Zoomed-in panning', () => {
    it('returns full zoom at progress=0', () => {
      const marker = { x: 50, y: 1600 }
      const cam = calculateCameraViewport(0, defaultConfig, chartArea, marker, fullWidth, fullHeight)
      expect(cam.scale).toBe(3)
      expect(cam.w).toBe(fullWidth / 3)
      expect(cam.h).toBe(fullHeight / 3)
    })

    it('maintains zoom level during pan phase', () => {
      const marker = { x: 540, y: 1600 }
      const cam = calculateCameraViewport(0.5, defaultConfig, chartArea, marker, fullWidth, fullHeight)
      expect(cam.scale).toBe(3)
    })

    it('places marker at ~60% from left of viewport', () => {
      const markerX = 540
      const marker = { x: markerX, y: 1600 }
      const cam = calculateCameraViewport(0.5, defaultConfig, chartArea, marker, fullWidth, fullHeight)

      // Marker should be at 60% from left within the viewport
      const markerInViewport = markerX - cam.x
      const fraction = markerInViewport / cam.w
      expect(fraction).toBeCloseTo(0.6, 1)
    })

    it('clamps camera x to not go below 0', () => {
      // Marker very close to left edge
      const marker = { x: 20, y: 1600 }
      const cam = calculateCameraViewport(0.01, defaultConfig, chartArea, marker, fullWidth, fullHeight)
      expect(cam.x).toBeGreaterThanOrEqual(0)
    })

    it('clamps camera x to not exceed fullWidth - viewportWidth', () => {
      // Marker at right edge
      const marker = { x: 1070, y: 1600 }
      const cam = calculateCameraViewport(0.99, defaultConfig, chartArea, marker, fullWidth, fullHeight)
      expect(cam.x + cam.w).toBeLessThanOrEqual(fullWidth + 0.01)
    })

    it('clamps camera y within bounds', () => {
      const marker = { x: 540, y: 1900 }
      const cam = calculateCameraViewport(0.5, defaultConfig, chartArea, marker, fullWidth, fullHeight)
      expect(cam.y).toBeGreaterThanOrEqual(0)
      expect(cam.y + cam.h).toBeLessThanOrEqual(fullHeight + 0.01)
    })
  })

  describe('Phase 2: Zoom out', () => {
    it('starts zoom-out at zoomOutStart', () => {
      const marker = { x: 800, y: 1600 }
      const cam = calculateCameraViewport(0.76, defaultConfig, chartArea, marker, fullWidth, fullHeight)
      expect(cam.scale).toBeLessThan(3)
      expect(cam.scale).toBeGreaterThan(1)
    })

    it('reaches scale≈1 at progress=1', () => {
      const marker = { x: 1080, y: 1600 }
      const cam = calculateCameraViewport(1, defaultConfig, chartArea, marker, fullWidth, fullHeight)
      expect(cam.scale).toBeCloseTo(1, 5)
      expect(cam.w).toBeCloseTo(fullWidth, 1)
      expect(cam.h).toBeCloseTo(fullHeight, 1)
    })

    it('position approaches (0,0) at progress=1', () => {
      const marker = { x: 1080, y: 1600 }
      const cam = calculateCameraViewport(1, defaultConfig, chartArea, marker, fullWidth, fullHeight)
      expect(cam.x).toBeCloseTo(0, 1)
      expect(cam.y).toBeCloseTo(0, 1)
    })

    it('has smooth transition (no jump at zoomOutStart boundary)', () => {
      const marker = { x: 800, y: 1600 }
      const justBefore = calculateCameraViewport(0.749, defaultConfig, chartArea, marker, fullWidth, fullHeight)
      const justAfter = calculateCameraViewport(0.751, defaultConfig, chartArea, marker, fullWidth, fullHeight)

      // Scale should be very close across the boundary
      expect(Math.abs(justBefore.scale - justAfter.scale)).toBeLessThan(0.1)
    })
  })

  describe('edge cases', () => {
    it('handles null marker gracefully', () => {
      const cam = calculateCameraViewport(0.5, defaultConfig, chartArea, null, fullWidth, fullHeight)
      expect(cam.scale).toBe(3)
      expect(cam.x).toBe(0)
      // Curve area must be fully visible (not at y=0 far from the curve)
      expect(cam.y).toBeLessThanOrEqual(chartArea.y)
      expect(cam.y + cam.h).toBeGreaterThanOrEqual(chartArea.y + chartArea.height)
    })

    it('handles progress=0 correctly', () => {
      const marker = { x: 0, y: 1600 }
      const cam = calculateCameraViewport(0, defaultConfig, chartArea, marker, fullWidth, fullHeight)
      expect(cam.scale).toBe(3)
      expect(cam.x).toBeGreaterThanOrEqual(0)
    })

    it('caps zoom level to keep curve visible vertically', () => {
      const config: PanZoomConfig = { zoomLevel: 5, zoomOutStart: 0.8 }
      const marker = { x: 540, y: 1600 }
      const cam = calculateCameraViewport(0.5, config, chartArea, marker, fullWidth, fullHeight)
      // Zoom is capped: at 5x the viewport would be 384px tall, but curve is 576px
      expect(cam.scale).toBeLessThan(5)
      expect(cam.scale).toBeGreaterThan(1)
      // Full curve area must be within viewport
      expect(cam.y).toBeLessThanOrEqual(chartArea.y)
      expect(cam.y + cam.h).toBeGreaterThanOrEqual(chartArea.y + chartArea.height)
    })

    it('always shows full curve height even with large curveEndpoint', () => {
      // Simulate a 50% curve height — much taller than what 3x zoom can show
      const tallChartArea = { x: 0, y: 960, width: 1080, height: 940 }
      const marker = { x: 540, y: 1400 }
      const cam = calculateCameraViewport(0.5, defaultConfig, tallChartArea, marker, fullWidth, fullHeight)

      // Zoom should be reduced to fit the curve
      expect(cam.scale).toBeLessThan(3)
      // Full curve must be within viewport
      expect(cam.y).toBeLessThanOrEqual(tallChartArea.y)
      expect(cam.y + cam.h).toBeGreaterThanOrEqual(tallChartArea.y + tallChartArea.height)
    })

    it('works with different zoomOutStart values', () => {
      const config: PanZoomConfig = { zoomLevel: 3, zoomOutStart: 0.5 }
      const marker = { x: 540, y: 1600 }

      // At 60% progress, should already be zooming out
      const cam = calculateCameraViewport(0.6, config, chartArea, marker, fullWidth, fullHeight)
      expect(cam.scale).toBeLessThan(3)
      expect(cam.scale).toBeGreaterThan(1)
    })
  })
})

describe('panZoom SVG integration', () => {
  function makeOptions(): ChartOptions {
    return {
      data: Array.from({ length: 50 }, (_, i) => ({
        label: `${i}km`,
        value: 500 + Math.sin(i * 0.2) * 200
      })),
      colors: { primary: '#ffffff', background: '#000000' },
      title: 'Test',
      silhouetteMode: true,
    }
  }

  it('generates nested SVG when panZoom is enabled', () => {
    const svg = generateElevationFrame(makeOptions(), {
      progress: 0.5,
      showMarker: true,
      markerSize: 6,
      markerColor: '#ffffff',
      curveEndpoint: 30,
      panZoomEnabled: true,
      panZoomConfig: { zoomLevel: 3, zoomOutStart: 0.75 },
    })

    // Count SVG tags — should have 2 (outer + nested)
    const svgTags = (svg.match(/<svg /g) || []).length
    expect(svgTags).toBe(2)

    // Nested SVG should have a viewBox different from "0 0 1080 1920"
    expect(svg).toMatch(/<svg x="0" y="0" width="1080" height="1920"\s+viewBox="/)
  })

  it('does NOT generate nested SVG when panZoom is disabled', () => {
    const svg = generateElevationFrame(makeOptions(), {
      progress: 0.5,
      showMarker: true,
      markerSize: 6,
      markerColor: '#ffffff',
      curveEndpoint: 30,
      panZoomEnabled: false,
    })

    const svgTags = (svg.match(/<svg /g) || []).length
    expect(svgTags).toBe(1)
  })

  it('nested SVG viewBox is zoomed in (smaller than full dimensions)', () => {
    const svg = generateElevationFrame(makeOptions(), {
      progress: 0.5,
      showMarker: true,
      markerSize: 6,
      markerColor: '#ffffff',
      curveEndpoint: 30,
      panZoomEnabled: true,
      panZoomConfig: { zoomLevel: 3, zoomOutStart: 0.75 },
    })

    const viewBoxMatch = svg.match(/<svg x="0" y="0" width="1080" height="1920"\s+viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/)
    expect(viewBoxMatch).not.toBeNull()

    const [, , , w, h] = viewBoxMatch!
    // At 3x zoom, viewBox width should be ~360 (1080/3)
    expect(Number(w)).toBeCloseTo(360, 0)
    expect(Number(h)).toBeCloseTo(640, 0)
  })
})
