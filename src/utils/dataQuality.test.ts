import { describe, it, expect } from 'vitest'
import { analyzeDataQuality, getQualityColor, getQualityLabel } from './dataQuality'

describe('analyzeDataQuality', () => {
  it('should return poor quality for empty data', () => {
    const result = analyzeDataQuality([])

    expect(result.totalRows).toBe(0)
    expect(result.qualityScore).toBe('poor')
    expect(result.issues).toContain('Keine Daten vorhanden')
  })

  it('should calculate correct metrics for complete data', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
      { label: 'C', value: 30 }
    ]

    const result = analyzeDataQuality(data)

    expect(result.totalRows).toBe(3)
    expect(result.totalFields).toBe(6) // 3 rows * 2 columns
    expect(result.filledFields).toBe(6)
    expect(result.emptyFields).toBe(0)
    expect(result.completenessPercentage).toBe(100)
  })

  it('should detect missing values', () => {
    const data: any[] = [
      { label: 'A', value: 10 },
      { label: '', value: 20 },
      { label: 'C', value: null }
    ]

    const result = analyzeDataQuality(data)

    expect(result.emptyFields).toBeGreaterThan(0)
    expect(result.completenessPercentage).toBeLessThan(100)
  })

  it('should award excellent score for perfect data', () => {
    const data = [
      { label: 'Q1', value: 100 },
      { label: 'Q2', value: 150 },
      { label: 'Q3', value: 200 },
      { label: 'Q4', value: 180 }
    ]

    const result = analyzeDataQuality(data)

    expect(result.qualityScore).toBe('excellent')
    expect(result.completenessPercentage).toBe(100)
    expect(result.issues.length).toBe(0)
  })

  it('should detect few datasets issue', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 }
    ]

    const result = analyzeDataQuality(data)

    expect(result.issues).toContain('Sehr wenige Datensätze (< 3)')
  })

  it('should detect columns with many missing values', () => {
    const data: any[] = [
      { label: 'A', value: 10, extra: 1 },
      { label: 'B', value: 20, extra: null },
      { label: 'C', value: 30, extra: null },
      { label: 'D', value: 40, extra: null }
    ]

    const result = analyzeDataQuality(data)

    expect(result.missingValuesByColumn.extra).toBe(3)
    const hasIssue = result.issues.some(issue => issue.includes('extra'))
    expect(hasIssue).toBe(true)
  })

  it('should detect empty labels', () => {
    const data: any[] = [
      { label: 'A', value: 10 },
      { label: '', value: 20 },
      { label: 'C', value: 30 }
    ]

    const result = analyzeDataQuality(data)

    const hasLabelIssue = result.issues.some(issue => issue.includes('ohne Bezeichnung'))
    expect(hasLabelIssue).toBe(true)
  })

  it('should detect duplicate labels', () => {
    const data = [
      { label: '2024', value: 10 },
      { label: '2024', value: 20 },
      { label: '2024', value: 30 },
      { label: '2025', value: 40 }
    ]

    const result = analyzeDataQuality(data)

    const hasDuplicateIssue = result.issues.some(issue => issue.includes('doppelte Bezeichnung'))
    expect(hasDuplicateIssue).toBe(true)
  })

  it('should detect negative values', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B', value: -5 },
      { label: 'C', value: -3 }
    ]

    const result = analyzeDataQuality(data)

    const hasNegativeIssue = result.issues.some(issue => issue.includes('negative Werte'))
    expect(hasNegativeIssue).toBe(true)
  })

  it('should detect many zero values', () => {
    const data = [
      { label: 'A', value: 0 },
      { label: 'B', value: 0 },
      { label: 'C', value: 0 },
      { label: 'D', value: 10 }
    ]

    const result = analyzeDataQuality(data)

    const hasZeroIssue = result.issues.some(issue => issue.includes('Null-Werte'))
    expect(hasZeroIssue).toBe(true)
  })

  it('should award good score for mostly complete data with few issues', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
      { label: 'C', value: 30 },
      { label: 'D', value: -5 } // One issue: negative value
    ]

    const result = analyzeDataQuality(data)

    expect(result.completenessPercentage).toBeGreaterThanOrEqual(85)
    expect(result.issues.length).toBeLessThanOrEqual(2)
    expect(['good', 'excellent']).toContain(result.qualityScore)
  })

  it('should award fair score for incomplete data', () => {
    const data: any[] = [
      { label: 'A', value: 10 },
      { label: '', value: 20 },
      { label: 'C', value: null },
      { label: 'D', value: 40 }
    ]

    const result = analyzeDataQuality(data)

    expect(result.completenessPercentage).toBeGreaterThanOrEqual(70)
    expect(result.completenessPercentage).toBeLessThan(85)
  })

  it('should handle data with extra columns', () => {
    const data: any[] = [
      { col_0: 'A', col_1: 10, col_2: 'extra1' },
      { col_0: 'B', col_1: 20, col_2: 'extra2' },
      { col_0: 'C', col_1: 30, col_2: 'extra3' }
    ]

    const result = analyzeDataQuality(data)

    expect(result.totalFields).toBe(9) // 3 rows * 3 columns
    expect(result.missingValuesByColumn).toHaveProperty('col_0')
    expect(result.missingValuesByColumn).toHaveProperty('col_1')
    expect(result.missingValuesByColumn).toHaveProperty('col_2')
  })

  it('should handle NaN values as empty', () => {
    const data: any[] = [
      { label: 'A', value: 10 },
      { label: 'B', value: NaN },
      { label: 'C', value: 30 }
    ]

    const result = analyzeDataQuality(data)

    expect(result.missingValuesByColumn.value).toBe(1)
  })
})

describe('getQualityColor', () => {
  it('should return success for excellent', () => {
    expect(getQualityColor('excellent')).toBe('success')
  })

  it('should return info for good', () => {
    expect(getQualityColor('good')).toBe('info')
  })

  it('should return warning for fair', () => {
    expect(getQualityColor('fair')).toBe('warning')
  })

  it('should return error for poor', () => {
    expect(getQualityColor('poor')).toBe('error')
  })
})

describe('getQualityLabel', () => {
  it('should return German label for excellent', () => {
    expect(getQualityLabel('excellent')).toBe('Ausgezeichnet')
  })

  it('should return German label for good', () => {
    expect(getQualityLabel('good')).toBe('Gut')
  })

  it('should return German label for fair', () => {
    expect(getQualityLabel('fair')).toBe('Befriedigend')
  })

  it('should return German label for poor', () => {
    expect(getQualityLabel('poor')).toBe('Mangelhaft')
  })
})
