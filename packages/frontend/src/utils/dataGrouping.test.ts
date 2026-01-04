import { describe, it, expect } from 'vitest'
import { groupByCategorical, groupByDatePeriod, groupByNumericRange } from './dataGrouping'

describe('groupByCategorical', () => {
  it('should group by duplicate labels and sum values', () => {
    const labels = ['A', 'B', 'A', 'C', 'B', 'A']
    const values = [10, 20, 15, 30, 25, 5]

    const result = groupByCategorical(labels, values, 'sum')

    expect(result).toHaveLength(3)
    expect(result.find(r => r.label === 'A')).toEqual({
      label: 'A',
      value: 30, // 10 + 15 + 5
      count: 3,
      originalLabels: ['A', 'A', 'A']
    })
    expect(result.find(r => r.label === 'B')).toEqual({
      label: 'B',
      value: 45, // 20 + 25
      count: 2,
      originalLabels: ['B', 'B']
    })
    expect(result.find(r => r.label === 'C')).toEqual({
      label: 'C',
      value: 30,
      count: 1,
      originalLabels: ['C']
    })
  })

  it('should calculate average correctly', () => {
    const labels = ['A', 'A', 'B', 'B']
    const values = [10, 20, 30, 50]

    const result = groupByCategorical(labels, values, 'average')

    expect(result.find(r => r.label === 'A')?.value).toBe(15) // (10 + 20) / 2
    expect(result.find(r => r.label === 'B')?.value).toBe(40) // (30 + 50) / 2
  })

  it('should count occurrences', () => {
    const labels = ['A', 'A', 'A', 'B', 'B']
    const values = [10, 20, 30, 40, 50]

    const result = groupByCategorical(labels, values, 'count')

    expect(result.find(r => r.label === 'A')?.value).toBe(3)
    expect(result.find(r => r.label === 'B')?.value).toBe(2)
  })

  it('should find minimum value', () => {
    const labels = ['A', 'A', 'B', 'B']
    const values = [10, 5, 30, 25]

    const result = groupByCategorical(labels, values, 'min')

    expect(result.find(r => r.label === 'A')?.value).toBe(5)
    expect(result.find(r => r.label === 'B')?.value).toBe(25)
  })

  it('should find maximum value', () => {
    const labels = ['A', 'A', 'B', 'B']
    const values = [10, 25, 30, 15]

    const result = groupByCategorical(labels, values, 'max')

    expect(result.find(r => r.label === 'A')?.value).toBe(25)
    expect(result.find(r => r.label === 'B')?.value).toBe(30)
  })

  it('should ignore empty labels', () => {
    const labels = ['A', '', 'B', '', 'A']
    const values = [10, 20, 30, 40, 15]

    const result = groupByCategorical(labels, values, 'sum')

    expect(result).toHaveLength(2)
    expect(result.find(r => r.label === 'A')?.value).toBe(25)
    expect(result.find(r => r.label === 'B')?.value).toBe(30)
  })

  it('should sort results alphabetically', () => {
    const labels = ['C', 'A', 'B']
    const values = [10, 20, 30]

    const result = groupByCategorical(labels, values, 'sum')

    expect(result[0].label).toBe('A')
    expect(result[1].label).toBe('B')
    expect(result[2].label).toBe('C')
  })
})

describe('groupByDatePeriod', () => {
  it('should group by year (ISO format)', () => {
    const labels = ['2023-01-15', '2023-06-20', '2024-01-10', '2024-03-05']
    const values = [10, 20, 30, 40]

    const result = groupByDatePeriod(labels, values, 'year', 'sum')

    expect(result).toHaveLength(2)
    expect(result.find(r => r.label === '2023')?.value).toBe(30)
    expect(result.find(r => r.label === '2024')?.value).toBe(70)
  })

  it('should group by month (ISO format)', () => {
    const labels = ['2024-01-15', '2024-01-20', '2024-02-10', '2024-03-05']
    const values = [10, 20, 30, 40]

    const result = groupByDatePeriod(labels, values, 'month', 'sum')

    expect(result).toHaveLength(3)
    expect(result.find(r => r.label === '2024-01')?.value).toBe(30)
    expect(result.find(r => r.label === '2024-02')?.value).toBe(30)
    expect(result.find(r => r.label === '2024-03')?.value).toBe(40)
  })

  it('should group by quarter', () => {
    const labels = ['2024-01-15', '2024-03-20', '2024-04-10', '2024-07-05']
    const values = [10, 20, 30, 40]

    const result = groupByDatePeriod(labels, values, 'quarter', 'sum')

    expect(result).toHaveLength(3)
    expect(result.find(r => r.label === '2024-Q1')?.value).toBe(30)
    expect(result.find(r => r.label === '2024-Q2')?.value).toBe(30)
    expect(result.find(r => r.label === '2024-Q3')?.value).toBe(40)
  })

  it('should handle German date format (DD.MM.YYYY)', () => {
    const labels = ['15.01.2024', '20.01.2024', '10.02.2024']
    const values = [10, 20, 30]

    const result = groupByDatePeriod(labels, values, 'month', 'sum')

    expect(result).toHaveLength(2)
    expect(result.find(r => r.label === '2024-01')?.value).toBe(30)
    expect(result.find(r => r.label === '2024-02')?.value).toBe(30)
  })

  it('should handle US date format (MM/DD/YYYY)', () => {
    const labels = ['01/15/2024', '01/20/2024', '02/10/2024']
    const values = [10, 20, 30]

    const result = groupByDatePeriod(labels, values, 'month', 'sum')

    expect(result).toHaveLength(2)
    expect(result.find(r => r.label === '2024-01')?.value).toBe(30)
    expect(result.find(r => r.label === '2024-02')?.value).toBe(30)
  })

  it('should handle year-month format (YYYY-MM)', () => {
    const labels = ['2024-01', '2024-01', '2024-02']
    const values = [10, 20, 30]

    const result = groupByDatePeriod(labels, values, 'month', 'sum')

    expect(result).toHaveLength(2)
    expect(result.find(r => r.label === '2024-01')?.value).toBe(30)
    expect(result.find(r => r.label === '2024-02')?.value).toBe(30)
  })

  it('should handle year-only format', () => {
    const labels = ['2023', '2023', '2024']
    const values = [10, 20, 30]

    const result = groupByDatePeriod(labels, values, 'year', 'sum')

    expect(result).toHaveLength(2)
    expect(result.find(r => r.label === '2023')?.value).toBe(30)
    expect(result.find(r => r.label === '2024')?.value).toBe(30)
  })

  it('should calculate average for date groups', () => {
    const labels = ['2024-01-15', '2024-01-20', '2024-02-10']
    const values = [10, 20, 30]

    const result = groupByDatePeriod(labels, values, 'month', 'average')

    expect(result.find(r => r.label === '2024-01')?.value).toBe(15)
    expect(result.find(r => r.label === '2024-02')?.value).toBe(30)
  })

  it('should ignore invalid dates', () => {
    const labels = ['2024-01-15', 'invalid', '2024-02-10']
    const values = [10, 20, 30]

    const result = groupByDatePeriod(labels, values, 'month', 'sum')

    expect(result).toHaveLength(2)
    expect(result.find(r => r.label === '2024-01')?.value).toBe(10)
    expect(result.find(r => r.label === '2024-02')?.value).toBe(30)
  })
})

describe('groupByNumericRange', () => {
  it('should group by numeric ranges', () => {
    const labels = ['5', '12', '18', '25', '33']
    const values = [10, 20, 30, 40, 50]

    const result = groupByNumericRange(labels, values, 10, 'sum')

    expect(result).toHaveLength(4)
    expect(result.find(r => r.label === '0-9')?.value).toBe(10)
    expect(result.find(r => r.label === '10-19')?.value).toBe(50)
    expect(result.find(r => r.label === '20-29')?.value).toBe(40)
    expect(result.find(r => r.label === '30-39')?.value).toBe(50)
  })

  it('should handle custom range sizes', () => {
    const labels = ['5', '15', '25', '35']
    const values = [10, 20, 30, 40]

    const result = groupByNumericRange(labels, values, 20, 'sum')

    expect(result).toHaveLength(2)
    expect(result.find(r => r.label === '0-19')?.value).toBe(30)
    expect(result.find(r => r.label === '20-39')?.value).toBe(70)
  })

  it('should handle labels with comma as decimal separator', () => {
    const labels = ['10,5', '15,3', '20,7']
    const values = [10, 20, 30]

    const result = groupByNumericRange(labels, values, 10, 'sum')

    // 10,5 and 15,3 both fall in 10-19 range, 20,7 falls in 20-29 range
    expect(result).toHaveLength(2)
    expect(result.find(r => r.label === '10-19')?.value).toBe(30) // 10 + 20
    expect(result.find(r => r.label === '20-29')?.value).toBe(30) // 30
  })

  it('should calculate average for numeric ranges', () => {
    const labels = ['5', '8', '15']
    const values = [10, 20, 30]

    const result = groupByNumericRange(labels, values, 10, 'average')

    expect(result.find(r => r.label === '0-9')?.value).toBe(15) // (10 + 20) / 2
    expect(result.find(r => r.label === '10-19')?.value).toBe(30)
  })

  it('should count values in ranges', () => {
    const labels = ['5', '8', '12', '15']
    const values = [10, 20, 30, 40]

    const result = groupByNumericRange(labels, values, 10, 'count')

    expect(result.find(r => r.label === '0-9')?.value).toBe(2)
    expect(result.find(r => r.label === '10-19')?.value).toBe(2)
  })

  it('should ignore non-numeric labels', () => {
    const labels = ['5', 'abc', '15', 'xyz']
    const values = [10, 20, 30, 40]

    const result = groupByNumericRange(labels, values, 10, 'sum')

    expect(result).toHaveLength(2)
    expect(result.find(r => r.label === '0-9')?.value).toBe(10)
    expect(result.find(r => r.label === '10-19')?.value).toBe(30)
  })

  it('should sort ranges numerically', () => {
    const labels = ['35', '5', '25', '15']
    const values = [10, 20, 30, 40]

    const result = groupByNumericRange(labels, values, 10, 'sum')

    expect(result[0].label).toBe('0-9')
    expect(result[1].label).toBe('10-19')
    expect(result[2].label).toBe('20-29')
    expect(result[3].label).toBe('30-39')
  })

  it('should return empty array for no valid numeric labels', () => {
    const labels = ['abc', 'def', 'xyz']
    const values = [10, 20, 30]

    const result = groupByNumericRange(labels, values, 10, 'sum')

    expect(result).toHaveLength(0)
  })
})
