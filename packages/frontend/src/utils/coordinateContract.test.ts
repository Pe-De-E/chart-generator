import { describe, it, expect } from 'vitest'
import {
  calculateBounds,
  padBounds,
  normalizePoints,
  scaleToViewBox,
  getChartArea,
  gpxToViewBox,
  elevationToY,
  distanceToX,
  pointsToPolyline,
  pointsToAreaPolygon,
  VIEW_BOX_PRESETS,
  type GPXPoint,
  type ViewBoxConfig
} from './coordinateContract'

describe('calculateBounds', () => {
  it('should return zero bounds for empty array', () => {
    const bounds = calculateBounds([])

    expect(bounds.minDistance).toBe(0)
    expect(bounds.maxDistance).toBe(0)
    expect(bounds.minElevation).toBe(0)
    expect(bounds.maxElevation).toBe(0)
  })

  it('should calculate correct bounds', () => {
    const points: GPXPoint[] = [
      { distance: 0, elevation: 500 },
      { distance: 10, elevation: 1000 },
      { distance: 20, elevation: 750 }
    ]

    const bounds = calculateBounds(points)

    expect(bounds.minDistance).toBe(0)
    expect(bounds.maxDistance).toBe(20)
    expect(bounds.minElevation).toBe(500)
    expect(bounds.maxElevation).toBe(1000)
    expect(bounds.distanceRange).toBe(20)
    expect(bounds.elevationRange).toBe(500)
  })

  it('should handle single point', () => {
    const points: GPXPoint[] = [{ distance: 5, elevation: 800 }]

    const bounds = calculateBounds(points)

    expect(bounds.minDistance).toBe(5)
    expect(bounds.maxDistance).toBe(5)
    expect(bounds.distanceRange).toBe(1) // Avoid division by zero
    expect(bounds.elevationRange).toBe(1)
  })
})

describe('padBounds', () => {
  it('should add padding to elevation bounds', () => {
    const bounds = {
      minDistance: 0,
      maxDistance: 10,
      minElevation: 500,
      maxElevation: 1000,
      distanceRange: 10,
      elevationRange: 500
    }

    const padded = padBounds(bounds, 0.1)

    expect(padded.minElevation).toBe(450) // 500 - 50
    expect(padded.maxElevation).toBe(1050) // 1000 + 50
    expect(padded.elevationRange).toBe(600) // 500 + 100
  })
})

describe('normalizePoints', () => {
  it('should normalize points to 0-1 range', () => {
    const points: GPXPoint[] = [
      { distance: 0, elevation: 500 },
      { distance: 10, elevation: 1000 },
      { distance: 20, elevation: 750 }
    ]

    const normalized = normalizePoints(points)

    expect(normalized[0].x).toBe(0)
    expect(normalized[0].y).toBe(0)
    expect(normalized[1].x).toBe(0.5)
    expect(normalized[1].y).toBe(1)
    expect(normalized[2].x).toBe(1)
    expect(normalized[2].y).toBe(0.5)
  })

  it('should preserve original values', () => {
    const points: GPXPoint[] = [{ distance: 5, elevation: 800 }]

    const normalized = normalizePoints(points)

    expect(normalized[0].originalDistance).toBe(5)
    expect(normalized[0].originalElevation).toBe(800)
  })

  it('should use provided bounds', () => {
    const points: GPXPoint[] = [{ distance: 5, elevation: 750 }]
    const bounds = {
      minDistance: 0,
      maxDistance: 10,
      minElevation: 500,
      maxElevation: 1000,
      distanceRange: 10,
      elevationRange: 500
    }

    const normalized = normalizePoints(points, bounds)

    expect(normalized[0].x).toBe(0.5)
    expect(normalized[0].y).toBe(0.5)
  })
})

describe('scaleToViewBox', () => {
  it('should scale normalized points to pixel coordinates', () => {
    const config: ViewBoxConfig = {
      width: 100,
      height: 100,
      padding: { top: 10, right: 10, bottom: 10, left: 10 }
    }

    const normalized = [
      { x: 0, y: 0, originalDistance: 0, originalElevation: 500 },
      { x: 1, y: 1, originalDistance: 10, originalElevation: 1000 }
    ]

    const viewBox = scaleToViewBox(normalized, config)

    // Chart area is 80x80 (100 - 20 padding)
    expect(viewBox[0].x).toBe(10)  // left padding
    expect(viewBox[0].y).toBe(90)  // bottom (y=0 is inverted)
    expect(viewBox[1].x).toBe(90)  // right edge
    expect(viewBox[1].y).toBe(10)  // top (y=1 is inverted)
  })
})

describe('getChartArea', () => {
  it('should calculate chart area correctly', () => {
    const config: ViewBoxConfig = {
      width: 600,
      height: 350,
      padding: { top: 60, right: 40, bottom: 80, left: 70 }
    }

    const area = getChartArea(config)

    expect(area.x).toBe(70)
    expect(area.y).toBe(60)
    expect(area.width).toBe(490)  // 600 - 70 - 40
    expect(area.height).toBe(210) // 350 - 60 - 80
  })
})

describe('gpxToViewBox', () => {
  it('should transform GPX points to ViewBox in one call', () => {
    const points: GPXPoint[] = [
      { distance: 0, elevation: 500 },
      { distance: 10, elevation: 1000 }
    ]

    const config: ViewBoxConfig = {
      width: 100,
      height: 100,
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    }

    const result = gpxToViewBox(points, config)

    expect(result.viewBoxPoints).toHaveLength(2)
    expect(result.viewBoxPoints[0].x).toBe(0)
    expect(result.viewBoxPoints[0].y).toBe(100)
    expect(result.viewBoxPoints[1].x).toBe(100)
    expect(result.viewBoxPoints[1].y).toBe(0)
  })

  it('should apply padding when specified', () => {
    const points: GPXPoint[] = [
      { distance: 0, elevation: 500 },
      { distance: 10, elevation: 1000 }
    ]

    const config: ViewBoxConfig = {
      width: 100,
      height: 100,
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    }

    const result = gpxToViewBox(points, config, { paddingPercent: 0.1 })

    // With 10% padding, min elevation becomes 450, max becomes 1050
    expect(result.bounds.minElevation).toBe(450)
    expect(result.bounds.maxElevation).toBe(1050)
  })
})

describe('elevationToY', () => {
  it('should convert elevation to Y coordinate', () => {
    const bounds = {
      minDistance: 0,
      maxDistance: 10,
      minElevation: 0,
      maxElevation: 100,
      distanceRange: 10,
      elevationRange: 100
    }

    const chartArea = { x: 0, y: 0, width: 100, height: 100 }

    expect(elevationToY(0, bounds, chartArea)).toBe(100)   // bottom
    expect(elevationToY(100, bounds, chartArea)).toBe(0)   // top
    expect(elevationToY(50, bounds, chartArea)).toBe(50)   // middle
  })
})

describe('distanceToX', () => {
  it('should convert distance to X coordinate', () => {
    const bounds = {
      minDistance: 0,
      maxDistance: 100,
      minElevation: 0,
      maxElevation: 100,
      distanceRange: 100,
      elevationRange: 100
    }

    const chartArea = { x: 0, y: 0, width: 100, height: 100 }

    expect(distanceToX(0, bounds, chartArea)).toBe(0)
    expect(distanceToX(100, bounds, chartArea)).toBe(100)
    expect(distanceToX(50, bounds, chartArea)).toBe(50)
  })

  it('should respect chart area offset', () => {
    const bounds = {
      minDistance: 0,
      maxDistance: 100,
      minElevation: 0,
      maxElevation: 100,
      distanceRange: 100,
      elevationRange: 100
    }

    const chartArea = { x: 50, y: 0, width: 100, height: 100 }

    expect(distanceToX(0, bounds, chartArea)).toBe(50)
    expect(distanceToX(100, bounds, chartArea)).toBe(150)
  })
})

describe('pointsToPolyline', () => {
  it('should generate polyline string', () => {
    const points = [
      { x: 10, y: 20, originalDistance: 0, originalElevation: 0 },
      { x: 30, y: 40, originalDistance: 0, originalElevation: 0 }
    ]

    const polyline = pointsToPolyline(points)

    expect(polyline).toBe('10,20 30,40')
  })
})

describe('pointsToAreaPolygon', () => {
  it('should generate closed polygon for area fill', () => {
    const points = [
      { x: 10, y: 20, originalDistance: 0, originalElevation: 0 },
      { x: 50, y: 30, originalDistance: 0, originalElevation: 0 }
    ]

    const chartArea = { x: 0, y: 0, width: 100, height: 100 }
    const polygon = pointsToAreaPolygon(points, chartArea)

    // Should close at bottom: bottomLeft, points, bottomRight
    expect(polygon).toBe('10,100 10,20 50,30 50,100')
  })

  it('should return empty string for empty points', () => {
    const chartArea = { x: 0, y: 0, width: 100, height: 100 }
    expect(pointsToAreaPolygon([], chartArea)).toBe('')
  })
})

describe('VIEW_BOX_PRESETS', () => {
  it('should have standard preset', () => {
    expect(VIEW_BOX_PRESETS.standard.width).toBe(600)
    expect(VIEW_BOX_PRESETS.standard.height).toBe(350)
  })

  it('should have silhouette preset', () => {
    expect(VIEW_BOX_PRESETS.silhouette.width).toBe(800)
    expect(VIEW_BOX_PRESETS.silhouette.height).toBe(200)
  })

  it('should have Instagram Reel preset', () => {
    expect(VIEW_BOX_PRESETS.instagramReel.width).toBe(1080)
    expect(VIEW_BOX_PRESETS.instagramReel.height).toBe(1920)
  })
})
