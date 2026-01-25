import { describe, it, expect } from 'vitest'
import {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  getEasingFunction,
  applyEasing
} from './easing'

describe('easing functions', () => {
  describe('linear', () => {
    it('returns input unchanged', () => {
      expect(linear(0)).toBe(0)
      expect(linear(0.5)).toBe(0.5)
      expect(linear(1)).toBe(1)
    })

    it('handles intermediate values', () => {
      expect(linear(0.25)).toBe(0.25)
      expect(linear(0.75)).toBe(0.75)
    })
  })

  describe('easeIn', () => {
    it('starts at 0 and ends at 1', () => {
      expect(easeIn(0)).toBe(0)
      expect(easeIn(1)).toBe(1)
    })

    it('starts slower than linear', () => {
      // At 0.5 progress, easeIn should be less than 0.5
      expect(easeIn(0.5)).toBeLessThan(0.5)
      expect(easeIn(0.5)).toBe(0.25) // t^2 = 0.5^2 = 0.25
    })

    it('accelerates over time', () => {
      const early = easeIn(0.25) - easeIn(0)     // 0.0625
      const late = easeIn(1) - easeIn(0.75)       // 0.4375
      expect(late).toBeGreaterThan(early)
    })
  })

  describe('easeOut', () => {
    it('starts at 0 and ends at 1', () => {
      expect(easeOut(0)).toBe(0)
      expect(easeOut(1)).toBe(1)
    })

    it('starts faster than linear', () => {
      // At 0.5 progress, easeOut should be more than 0.5
      expect(easeOut(0.5)).toBeGreaterThan(0.5)
      expect(easeOut(0.5)).toBe(0.75) // t * (2 - t) = 0.5 * 1.5 = 0.75
    })

    it('decelerates over time', () => {
      const early = easeOut(0.25) - easeOut(0)   // 0.4375
      const late = easeOut(1) - easeOut(0.75)     // 0.0625
      expect(early).toBeGreaterThan(late)
    })
  })

  describe('easeInOut', () => {
    it('starts at 0 and ends at 1', () => {
      expect(easeInOut(0)).toBe(0)
      expect(easeInOut(1)).toBe(1)
    })

    it('is at 0.5 at the midpoint', () => {
      expect(easeInOut(0.5)).toBe(0.5)
    })

    it('is symmetric around the midpoint', () => {
      // easeInOut(0.25) should equal 1 - easeInOut(0.75)
      const early = easeInOut(0.25)
      const late = easeInOut(0.75)
      expect(early + late).toBeCloseTo(1, 10)
    })

    it('starts slow, speeds up, then slows down', () => {
      // First quarter: slow (like easeIn)
      expect(easeInOut(0.25)).toBeLessThan(0.25)
      // Last quarter: slow (like easeOut approaching 1)
      expect(easeInOut(0.75)).toBeGreaterThan(0.75)
    })
  })

  describe('getEasingFunction', () => {
    it('returns correct function for each type', () => {
      expect(getEasingFunction('linear')).toBe(linear)
      expect(getEasingFunction('ease-in')).toBe(easeIn)
      expect(getEasingFunction('ease-out')).toBe(easeOut)
      expect(getEasingFunction('ease-in-out')).toBe(easeInOut)
    })

    it('defaults to linear for unknown types', () => {
      // @ts-expect-error - testing invalid input
      expect(getEasingFunction('invalid')).toBe(linear)
    })
  })

  describe('applyEasing', () => {
    it('applies easing to progress value', () => {
      expect(applyEasing(0.5, 'linear')).toBe(0.5)
      expect(applyEasing(0.5, 'ease-in')).toBe(0.25)
      expect(applyEasing(0.5, 'ease-out')).toBe(0.75)
      expect(applyEasing(0.5, 'ease-in-out')).toBe(0.5)
    })

    it('clamps progress to 0-1 range', () => {
      expect(applyEasing(-0.5, 'linear')).toBe(0)
      expect(applyEasing(1.5, 'linear')).toBe(1)
    })

    it('handles edge cases', () => {
      expect(applyEasing(0, 'ease-in-out')).toBe(0)
      expect(applyEasing(1, 'ease-in-out')).toBe(1)
    })
  })
})
