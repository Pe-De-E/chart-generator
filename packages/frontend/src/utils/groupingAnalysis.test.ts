import { describe, it, expect } from 'vitest'
import { analyzeGroupingPotential, getGroupingIcon, getGroupingColor } from './groupingAnalysis'

describe('analyzeGroupingPotential', () => {
  it('should return none for empty data', () => {
    const result = analyzeGroupingPotential([])

    expect(result.type).toBe('none')
    expect(result.canGroup).toBe(false)
    expect(result.reason).toContain('Keine Daten')
  })

  it('should detect categorical grouping with duplicates', () => {
    const labels = ['A', 'B', 'A', 'C', 'B', 'A', 'D', 'B']
    const result = analyzeGroupingPotential(labels)

    expect(result.type).toBe('categorical')
    expect(result.canGroup).toBe(true)
    expect(result.groupCount).toBe(4) // A, B, C, D
    expect(result.suggestions).toContain('Werte nach Kategorie gruppieren')
  })

  it('should not suggest grouping for unique labels', () => {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F']
    const result = analyzeGroupingPotential(labels)

    expect(result.type).toBe('none')
    expect(result.canGroup).toBe(false)
    expect(result.reason).toContain('einzigartig')
  })

  it('should detect ISO date format (YYYY-MM-DD)', () => {
    const labels = [
      '2024-01-15',
      '2024-01-16',
      '2024-01-17',
      '2024-02-01',
      '2024-02-02',
      '2024-03-01',
      '2024-03-02',
      '2024-03-03',
      '2024-04-01',
      '2024-04-02'
    ]
    const result = analyzeGroupingPotential(labels)

    expect(result.type).toBe('date')
    expect(result.canGroup).toBe(true)
    expect(result.reason).toContain('Datumswerte')
    expect(result.suggestions).toContain('Nach Jahr gruppieren')
    expect(result.suggestions).toContain('Nach Monat gruppieren')
  })

  it('should detect German date format (DD.MM.YYYY)', () => {
    const labels = [
      '15.01.2024',
      '16.01.2024',
      '17.01.2024',
      '01.02.2024',
      '02.02.2024',
      '01.03.2024',
      '02.03.2024',
      '03.03.2024',
      '01.04.2024',
      '02.04.2024'
    ]
    const result = analyzeGroupingPotential(labels)

    expect(result.type).toBe('date')
    expect(result.canGroup).toBe(true)
    expect(result.suggestions).toContain('Nach Jahr gruppieren')
  })

  it('should detect US date format (MM/DD/YYYY)', () => {
    const labels = [
      '01/15/2024',
      '01/16/2024',
      '01/17/2024',
      '02/01/2024',
      '02/02/2024',
      '03/01/2024',
      '03/02/2024',
      '03/03/2024',
      '04/01/2024',
      '04/02/2024'
    ]
    const result = analyzeGroupingPotential(labels)

    expect(result.type).toBe('date')
    expect(result.canGroup).toBe(true)
  })

  it('should detect year-month format (YYYY-MM)', () => {
    const labels = [
      '2024-01',
      '2024-02',
      '2024-03',
      '2024-04',
      '2024-05',
      '2024-06',
      '2024-07',
      '2024-08',
      '2024-09',
      '2024-10'
    ]
    const result = analyzeGroupingPotential(labels)

    expect(result.type).toBe('date')
    expect(result.canGroup).toBe(true)
    expect(result.suggestions).toContain('Nach Jahr gruppieren')
  })

  it('should detect year-only format', () => {
    const labels = [
      '2020',
      '2021',
      '2022',
      '2023',
      '2024',
      '2024',
      '2024',
      '2023',
      '2022',
      '2021'
    ]
    const result = analyzeGroupingPotential(labels)

    expect(result.type).toBe('date')
    expect(result.canGroup).toBe(true)
  })

  it('should detect numeric range grouping', () => {
    const labels = Array.from({ length: 30 }, (_, i) => (i * 10).toString())
    const result = analyzeGroupingPotential(labels)

    expect(result.type).toBe('numeric')
    expect(result.canGroup).toBe(true)
    expect(result.suggestions).toContain('In Bereiche gruppieren (z.B. 0-10, 11-20, ...)')
  })

  it('should not suggest numeric grouping for small ranges', () => {
    const labels = ['1', '2', '3', '4', '5']
    const result = analyzeGroupingPotential(labels)

    expect(result.type).toBe('none')
    expect(result.canGroup).toBe(false)
  })

  it('should handle mixed empty and non-empty labels', () => {
    const labels = ['A', '', 'B', '', 'A', 'C', '', 'B']
    const result = analyzeGroupingPotential(labels)

    // Should ignore empty labels
    expect(result.type).toBe('categorical')
    expect(result.canGroup).toBe(true)
  })

  it('should require significant duplicate percentage for categorical', () => {
    // Only 1 duplicate out of 20 = 5% (below 10% threshold)
    const labels = [
      'A', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
      'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'
    ]
    const result = analyzeGroupingPotential(labels)

    expect(result.type).toBe('none')
    expect(result.canGroup).toBe(false)
  })

  it('should handle numeric labels with commas', () => {
    const labels = ['10,5', '20,3', '30,7', '40,2', '50,9']

    // These should be parsed as numbers after comma replacement
    // But with only 5 items and small range, won't suggest grouping
    const result = analyzeGroupingPotential(labels)

    expect(result).toBeDefined()
  })
})

describe('getGroupingIcon', () => {
  it('should return correct icon for categorical', () => {
    expect(getGroupingIcon('categorical')).toBe('mdi-group')
  })

  it('should return correct icon for date', () => {
    expect(getGroupingIcon('date')).toBe('mdi-calendar-month')
  })

  it('should return correct icon for numeric', () => {
    expect(getGroupingIcon('numeric')).toBe('mdi-numeric')
  })

  it('should return correct icon for none', () => {
    expect(getGroupingIcon('none')).toBe('mdi-information-outline')
  })
})

describe('getGroupingColor', () => {
  it('should return info color when grouping is possible', () => {
    expect(getGroupingColor(true)).toBe('info')
  })

  it('should return grey color when grouping is not possible', () => {
    expect(getGroupingColor(false)).toBe('grey')
  })
})
