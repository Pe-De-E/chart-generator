import { describe, it, expect } from 'vitest'
import { calculateSegmentGradients, generateEffortCurve } from './effort'
import type { ViewBoxPoint } from '../../coordinateContract'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeData(values: number[]) {
  return values.map((v, i) => ({ label: String(i), value: v }))
}

function makePoints(n: number): ViewBoxPoint[] {
  return Array.from({ length: n }, (_, i) => ({ x: i * 10, y: 100 - i * 5 }))
}

// ── calculateSegmentGradients ─────────────────────────────────────────────────

describe('calculateSegmentGradients', () => {
  it('returns empty array for fewer than 2 points', () => {
    expect(calculateSegmentGradients([])).toEqual([])
    expect(calculateSegmentGradients([{ value: 500 }])).toEqual([])
  })

  it('returns length - 1 gradient values', () => {
    const data = makeData([100, 200, 300, 400, 500])
    expect(calculateSegmentGradients(data)).toHaveLength(4)
  })

  it('all values are between 0 and 1 (inclusive)', () => {
    const data = makeData([100, 500, 200, 800, 300, 100])
    const gradients = calculateSegmentGradients(data)
    for (const g of gradients) {
      expect(g).toBeGreaterThanOrEqual(0)
      expect(g).toBeLessThanOrEqual(1)
    }
  })

  it('purely ascending data has mostly high gradient values (> 0.5)', () => {
    const data = makeData([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000])
    const gradients = calculateSegmentGradients(data)
    const majority = gradients.filter(g => g >= 0.5).length
    expect(majority).toBeGreaterThan(gradients.length / 2)
  })

  it('purely descending data has mostly low gradient values (< 0.5)', () => {
    const data = makeData([1000, 900, 800, 700, 600, 500, 400, 300, 200, 100])
    const gradients = calculateSegmentGradients(data)
    const majority = gradients.filter(g => g <= 0.5).length
    expect(majority).toBeGreaterThan(gradients.length / 2)
  })

  it('flat data (all same value) has gradients near 0.5', () => {
    const data = makeData([500, 500, 500, 500, 500, 500, 500, 500])
    const gradients = calculateSegmentGradients(data)
    for (const g of gradients) {
      expect(g).toBeCloseTo(0.5, 1)
    }
  })
})

// ── generateEffortCurve ───────────────────────────────────────────────────────

describe('generateEffortCurve', () => {
  const baseConfig = {
    variableStroke: true,
    variableStrokeIntensity: 5,
    colorGradient: true,
    colorGradientIntensity: 5,
    glowAura: false,
    glowAuraIntensity: 5,
  }

  it('returns empty strings for fewer than 2 points', () => {
    const result = generateEffortCurve([], [], '#ffffff', baseConfig)
    expect(result.defs).toBe('')
    expect(result.curve).toBe('')
    expect(result.glowFilter).toBe('')
  })

  it('returns SVG line segments for valid input', () => {
    const points = makePoints(5)
    const data = makeData([100, 200, 300, 400, 500])
    const result = generateEffortCurve(points, data, '#ffffff', baseConfig)
    expect(result.curve).toContain('<line')
    expect(result.curve).toContain('stroke=')
  })

  it('includes glow filter when glowAura is enabled', () => {
    const points = makePoints(5)
    const data = makeData([100, 200, 300, 400, 500])
    const result = generateEffortCurve(points, data, '#ff0000', { ...baseConfig, glowAura: true })
    expect(result.defs).toContain('filter')
    expect(result.glowFilter).toBe('effort-glow-filter')
  })

  it('does not include glow filter when glowAura is disabled', () => {
    const points = makePoints(5)
    const data = makeData([100, 200, 300, 400, 500])
    const result = generateEffortCurve(points, data, '#ff0000', { ...baseConfig, glowAura: false })
    expect(result.defs).toBe('')
    expect(result.glowFilter).toBe('')
  })

  it('applies color gradient when colorGradient is true', () => {
    const points = makePoints(10)
    const data = makeData([100, 200, 300, 500, 800, 900, 700, 500, 300, 100])
    const result = generateEffortCurve(points, data, '#3399ff', { ...baseConfig, colorGradient: true })
    // With color gradient enabled, segments should use hsl() colors
    expect(result.curve).toContain('hsl(')
  })

  it('uses base color when colorGradient is false', () => {
    const points = makePoints(5)
    const data = makeData([100, 200, 300, 400, 500])
    const result = generateEffortCurve(points, data, '#3399ff', { ...baseConfig, colorGradient: false })
    expect(result.curve).toContain('#3399ff')
    expect(result.curve).not.toContain('hsl(')
  })
})
