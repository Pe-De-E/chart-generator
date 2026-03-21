import { describe, it, expect } from 'vitest'
import { findHookPoint } from './hookDetection'

function makeData(values: number[]) {
  return values.map(v => ({ value: v }))
}

describe('findHookPoint', () => {
  it('returns 0.3 for fewer than 10 points', () => {
    expect(findHookPoint([])).toBe(0.3)
    expect(findHookPoint(makeData([100, 200, 300]))).toBe(0.3)
    expect(findHookPoint(makeData(Array.from({ length: 9 }, (_, i) => i * 10)))).toBe(0.3)
  })

  it('returns a value between 0.05 and 0.9', () => {
    const data = makeData([100, 200, 400, 800, 600, 300, 200, 100, 150, 100, 200, 300])
    const result = findHookPoint(data)
    expect(result).toBeGreaterThanOrEqual(0.05)
    expect(result).toBeLessThanOrEqual(0.9)
  })

  it('returns a number for all-flat data', () => {
    const flat = makeData(Array.from({ length: 50 }, () => 500))
    const result = findHookPoint(flat)
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0.05)
    expect(result).toBeLessThanOrEqual(0.9)
  })

  it('points to the steepest section of the route', () => {
    // Steep section is in the second half (indices 50-70 out of 100)
    const data = makeData([
      ...Array.from({ length: 50 }, () => 500),           // flat
      ...Array.from({ length: 20 }, (_, i) => 500 + i * 50), // steep climb
      ...Array.from({ length: 30 }, (_, i) => 1500 - i * 20), // gradual descent
    ])
    const result = findHookPoint(data)
    // Steepest window should be somewhere in the second half
    expect(result).toBeGreaterThan(0.3)
  })

  it('is deterministic — same input gives same output', () => {
    const data = makeData([100, 300, 800, 500, 200, 600, 400, 900, 700, 300, 100, 200])
    expect(findHookPoint(data)).toBe(findHookPoint(data))
  })
})
