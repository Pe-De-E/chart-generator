import { describe, it, expect } from 'vitest'
import {
  douglasPeucker,
  uniformDownsample,
  downsampleGPX,
  findEpsilonForTargetCount,
  DEFAULT_DOWNSAMPLE_OPTIONS,
  PREMIUM_DOWNSAMPLE_OPTIONS,
  type GPXPoint
} from './downsampling'

describe('douglasPeucker', () => {
  it('should return same points for 2 or fewer points', () => {
    const points: GPXPoint[] = [
      { distance: 0, elevation: 100 },
      { distance: 10, elevation: 200 }
    ]

    const result = douglasPeucker(points, 10)

    expect(result).toHaveLength(2)
    expect(result).toEqual(points)
  })

  it('should simplify a straight line to 2 points', () => {
    const points: GPXPoint[] = [
      { distance: 0, elevation: 100 },
      { distance: 5, elevation: 150 },
      { distance: 10, elevation: 200 }
    ]

    const result = douglasPeucker(points, 1)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ distance: 0, elevation: 100 })
    expect(result[1]).toEqual({ distance: 10, elevation: 200 })
  })

  it('should preserve significant peaks', () => {
    const points: GPXPoint[] = [
      { distance: 0, elevation: 100 },
      { distance: 5, elevation: 500 }, // significant peak
      { distance: 10, elevation: 100 }
    ]

    const result = douglasPeucker(points, 10)

    expect(result).toHaveLength(3)
    expect(result[1].elevation).toBe(500)
  })

  it('should handle complex elevation profile', () => {
    // Simulate a mountain pass: up, plateau, down
    const points: GPXPoint[] = [
      { distance: 0, elevation: 500 },
      { distance: 2, elevation: 700 },
      { distance: 4, elevation: 900 },
      { distance: 6, elevation: 1000 }, // peak
      { distance: 8, elevation: 1000 }, // plateau
      { distance: 10, elevation: 1000 }, // plateau
      { distance: 12, elevation: 800 },
      { distance: 14, elevation: 600 },
      { distance: 16, elevation: 500 }
    ]

    const result = douglasPeucker(points, 20)

    // Should preserve start, peak area, and end
    expect(result.length).toBeGreaterThanOrEqual(3)
    expect(result.length).toBeLessThan(points.length)
    expect(result[0].distance).toBe(0)
    expect(result[result.length - 1].distance).toBe(16)
  })
})

describe('uniformDownsample', () => {
  it('should return all points if under target', () => {
    const points: GPXPoint[] = [
      { distance: 0, elevation: 100 },
      { distance: 5, elevation: 150 },
      { distance: 10, elevation: 200 }
    ]

    const result = uniformDownsample(points, 10)

    expect(result).toHaveLength(3)
  })

  it('should reduce points to approximately target count', () => {
    const points: GPXPoint[] = Array.from({ length: 100 }, (_, i) => ({
      distance: i,
      elevation: 100 + i
    }))

    const result = uniformDownsample(points, 20)

    expect(result.length).toBeLessThanOrEqual(25) // Allow some margin
    expect(result.length).toBeGreaterThanOrEqual(15)
  })

  it('should always include first and last points', () => {
    const points: GPXPoint[] = Array.from({ length: 100 }, (_, i) => ({
      distance: i,
      elevation: 100 + i
    }))

    const result = uniformDownsample(points, 10)

    expect(result[0]).toEqual(points[0])
    expect(result[result.length - 1]).toEqual(points[points.length - 1])
  })
})

describe('findEpsilonForTargetCount', () => {
  it('should return 0 if points already under target', () => {
    const points: GPXPoint[] = [
      { distance: 0, elevation: 100 },
      { distance: 10, elevation: 200 }
    ]

    const epsilon = findEpsilonForTargetCount(points, 10)

    expect(epsilon).toBe(0)
  })

  it('should find epsilon that produces approximately target count', () => {
    const points: GPXPoint[] = Array.from({ length: 1000 }, (_, i) => ({
      distance: i * 0.1,
      elevation: 500 + Math.sin(i * 0.1) * 200
    }))

    const epsilon = findEpsilonForTargetCount(points, 100)
    const result = douglasPeucker(points, epsilon)

    // Should be within 20% of target
    expect(result.length).toBeGreaterThan(80)
    expect(result.length).toBeLessThan(120)
  })
})

describe('downsampleGPX', () => {
  const createTestPoints = (count: number): GPXPoint[] =>
    Array.from({ length: count }, (_, i) => ({
      distance: i * 0.1,
      elevation: 500 + Math.sin(i * 0.05) * 300
    }))

  it('should not downsample when disabled (Premium mode)', () => {
    const points = createTestPoints(3000)

    const result = downsampleGPX(points, PREMIUM_DOWNSAMPLE_OPTIONS)

    expect(result.wasDownsampled).toBe(false)
    expect(result.downsampledCount).toBe(3000)
    expect(result.points).toHaveLength(3000)
  })

  it('should not downsample when under target', () => {
    const points = createTestPoints(500)

    const result = downsampleGPX(points, DEFAULT_DOWNSAMPLE_OPTIONS)

    expect(result.wasDownsampled).toBe(false)
    expect(result.downsampledCount).toBe(500)
  })

  it('should downsample when over target with Douglas-Peucker', () => {
    const points = createTestPoints(3000)

    const result = downsampleGPX(points, {
      ...DEFAULT_DOWNSAMPLE_OPTIONS,
      algorithm: 'douglas-peucker'
    })

    expect(result.wasDownsampled).toBe(true)
    expect(result.originalCount).toBe(3000)
    expect(result.downsampledCount).toBeLessThan(2000)
    expect(result.downsampledCount).toBeGreaterThan(1000)
  })

  it('should downsample with uniform algorithm', () => {
    const points = createTestPoints(3000)

    const result = downsampleGPX(points, {
      ...DEFAULT_DOWNSAMPLE_OPTIONS,
      algorithm: 'uniform'
    })

    expect(result.wasDownsampled).toBe(true)
    expect(result.downsampledCount).toBeLessThan(2000)
  })

  it('should preserve extreme elevation points when preserveExtremes is true', () => {
    // Create points with clear min/max
    const points: GPXPoint[] = [
      { distance: 0, elevation: 500 },
      { distance: 1, elevation: 100 },  // min
      { distance: 2, elevation: 500 },
      { distance: 3, elevation: 500 },
      { distance: 4, elevation: 1000 }, // max
      { distance: 5, elevation: 500 },
      { distance: 6, elevation: 500 },
      { distance: 7, elevation: 500 },
      { distance: 8, elevation: 500 },
      { distance: 9, elevation: 500 },
      { distance: 10, elevation: 500 }
    ]

    const result = downsampleGPX(points, {
      enabled: true,
      targetPoints: 5,
      algorithm: 'uniform',
      preserveExtremes: true
    })

    const elevations = result.points.map(p => p.elevation)
    expect(elevations).toContain(100)  // min preserved
    expect(elevations).toContain(1000) // max preserved
  })

  it('should return correct metadata', () => {
    const points = createTestPoints(2500)

    const result = downsampleGPX(points, DEFAULT_DOWNSAMPLE_OPTIONS)

    expect(result.originalCount).toBe(2500)
    expect(result.wasDownsampled).toBe(true)
    expect(typeof result.downsampledCount).toBe('number')
    expect(Array.isArray(result.points)).toBe(true)
  })
})

describe('DEFAULT_DOWNSAMPLE_OPTIONS', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_DOWNSAMPLE_OPTIONS.enabled).toBe(true)
    expect(DEFAULT_DOWNSAMPLE_OPTIONS.targetPoints).toBe(1500)
    expect(DEFAULT_DOWNSAMPLE_OPTIONS.algorithm).toBe('douglas-peucker')
    expect(DEFAULT_DOWNSAMPLE_OPTIONS.preserveExtremes).toBe(true)
  })
})

describe('PREMIUM_DOWNSAMPLE_OPTIONS', () => {
  it('should disable downsampling', () => {
    expect(PREMIUM_DOWNSAMPLE_OPTIONS.enabled).toBe(false)
    expect(PREMIUM_DOWNSAMPLE_OPTIONS.targetPoints).toBe(Infinity)
  })
})
