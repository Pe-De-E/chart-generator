import { describe, it, expect } from 'vitest'
import {
  validateGPX,
  calculateGPXStats,
  getWarningSeverityColor,
  getWarningIcon,
  DEFAULT_VALIDATION_OPTIONS,
  type GPXValidationOptions,
} from './gpxValidation'
import type { GPXPoint } from './downsampling'

describe('gpxValidation', () => {
  describe('calculateGPXStats', () => {
    it('returns zeros for empty array', () => {
      const stats = calculateGPXStats([])
      expect(stats.pointCount).toBe(0)
      expect(stats.totalDistanceKm).toBe(0)
      expect(stats.elevationGain).toBe(0)
      expect(stats.elevationLoss).toBe(0)
    })

    it('calculates correct stats for normal track', () => {
      const points: GPXPoint[] = [
        { distance: 0, elevation: 100 },
        { distance: 5, elevation: 200 },
        { distance: 10, elevation: 150 },
        { distance: 15, elevation: 300 },
      ]
      const stats = calculateGPXStats(points)

      expect(stats.pointCount).toBe(4)
      expect(stats.totalDistanceKm).toBe(15)
      expect(stats.minElevation).toBe(100)
      expect(stats.maxElevation).toBe(300)
      expect(stats.elevationRange).toBe(200)
      expect(stats.elevationGain).toBe(250) // 100 + 150
      expect(stats.elevationLoss).toBe(50)  // 50
    })
  })

  describe('validateGPX', () => {
    it('returns error for empty points array', () => {
      const result = validateGPX([])
      expect(result.isValid).toBe(false)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].type).toBe('no_trackpoints')
      expect(result.warnings[0].severity).toBe('error')
    })

    it('warns about too few points', () => {
      const points: GPXPoint[] = Array.from({ length: 15 }, (_, i) => ({
        distance: i,
        elevation: 100 + i,
      }))
      const result = validateGPX(points)

      expect(result.isValid).toBe(true)
      const fewPointsWarning = result.warnings.find(w => w.type === 'too_few_points')
      expect(fewPointsWarning).toBeDefined()
      expect(fewPointsWarning?.severity).toBe('warning') // < 20 points = warning
    })

    it('gives info for moderately few points', () => {
      const points: GPXPoint[] = Array.from({ length: 35 }, (_, i) => ({
        distance: i,
        elevation: 100 + i,
      }))
      const result = validateGPX(points)

      const fewPointsWarning = result.warnings.find(w => w.type === 'too_few_points')
      expect(fewPointsWarning).toBeDefined()
      expect(fewPointsWarning?.severity).toBe('info')
    })

    it('no warning for sufficient points', () => {
      const points: GPXPoint[] = Array.from({ length: 100 }, (_, i) => ({
        distance: i,
        elevation: 100 + i,
      }))
      const result = validateGPX(points)

      const fewPointsWarning = result.warnings.find(w => w.type === 'too_few_points')
      expect(fewPointsWarning).toBeUndefined()
    })

    it('gives info for very long tracks', () => {
      const points: GPXPoint[] = [
        { distance: 0, elevation: 100 },
        { distance: 900, elevation: 200 }, // 900 km track
      ]
      const result = validateGPX(points)

      const longTrackWarning = result.warnings.find(w => w.type === 'very_long_track')
      expect(longTrackWarning).toBeDefined()
      expect(longTrackWarning?.severity).toBe('info')
    })

    it('warns about flat elevation (no data)', () => {
      const points: GPXPoint[] = Array.from({ length: 100 }, (_, i) => ({
        distance: i,
        elevation: 0,
      }))
      const result = validateGPX(points)

      const flatWarning = result.warnings.find(w => w.type === 'no_elevation_data')
      expect(flatWarning).toBeDefined()
      expect(flatWarning?.severity).toBe('warning')
    })

    it('gives info for minimal elevation range', () => {
      const points: GPXPoint[] = Array.from({ length: 100 }, (_, i) => ({
        distance: i,
        elevation: 100 + (i % 5), // Only 5m range
      }))
      const result = validateGPX(points)

      const flatWarning = result.warnings.find(w => w.type === 'flat_elevation')
      expect(flatWarning).toBeDefined()
      expect(flatWarning?.severity).toBe('info')
    })

    it('respects custom validation options', () => {
      const points: GPXPoint[] = Array.from({ length: 30 }, (_, i) => ({
        distance: i,
        elevation: 100 + i * 10,
      }))

      const customOptions: GPXValidationOptions = {
        minPoints: 20, // Lower threshold
        longTrackInfoThresholdKm: 800,
        minElevationRange: 10,
      }

      const result = validateGPX(points, customOptions)
      const fewPointsWarning = result.warnings.find(w => w.type === 'too_few_points')
      expect(fewPointsWarning).toBeUndefined()
    })
  })

  describe('getWarningSeverityColor', () => {
    it('returns correct colors', () => {
      expect(getWarningSeverityColor('error')).toBe('error')
      expect(getWarningSeverityColor('warning')).toBe('warning')
      expect(getWarningSeverityColor('info')).toBe('info')
    })
  })

  describe('getWarningIcon', () => {
    it('returns icons for all warning types', () => {
      expect(getWarningIcon('too_few_points')).toContain('mdi-')
      expect(getWarningIcon('very_long_track')).toContain('mdi-')
      expect(getWarningIcon('flat_elevation')).toContain('mdi-')
      expect(getWarningIcon('no_elevation_data')).toContain('mdi-')
      expect(getWarningIcon('parse_error')).toContain('mdi-')
      expect(getWarningIcon('no_trackpoints')).toContain('mdi-')
    })
  })
})
