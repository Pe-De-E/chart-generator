import { describe, it, expect } from 'vitest'
import { generateBarChart } from './barChart'
import type { DataPoint } from './types'

describe('generateBarChart', () => {
  const mockData: DataPoint[] = [
    { label: 'Q1', value: 30 },
    { label: 'Q2', value: 45 },
    { label: 'Q3', value: 60 },
    { label: 'Q4', value: 55 }
  ]

  const mockColors = {
    primary: '#4F46E5',
    secondary: '#818CF8',
    background: '#FFFFFF'
  }

  it('should generate valid SVG string', () => {
    const result = generateBarChart({
      data: mockData,
      colors: mockColors,
      title: 'Test Chart'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })

  it('should include chart title', () => {
    const result = generateBarChart({
      data: mockData,
      colors: mockColors,
      title: 'My Test Title'
    })

    expect(result).toContain('My Test Title')
  })

  it('should render correct number of bars', () => {
    const result = generateBarChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    const rectCount = (result.match(/<rect/g) || []).length
    expect(rectCount).toBeGreaterThanOrEqual(mockData.length)
  })

  it('should use provided colors', () => {
    const customColors = {
      primary: '#FF0000',
      secondary: '#00FF00',
      background: '#0000FF'
    }

    const result = generateBarChart({
      data: mockData,
      colors: customColors,
      title: 'Test'
    })

    expect(result).toContain(customColors.primary)
    expect(result).toContain(customColors.background)
  })

  it('should handle large datasets with dynamic width', () => {
    const largeData: DataPoint[] = Array.from({ length: 365 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.random() * 100
    }))

    const result = generateBarChart({
      data: largeData,
      colors: mockColors,
      title: 'Large Dataset'
    })

    expect(result).toContain('<svg')
    // Should have dynamic width for large datasets
    const widthMatch = result.match(/width="(\d+)"/)
    expect(widthMatch).toBeTruthy()
    if (widthMatch) {
      const width = parseInt(widthMatch[1])
      expect(width).toBeGreaterThan(600) // Should be larger than base width
    }
  })

  it('should handle empty data gracefully', () => {
    const result = generateBarChart({
      data: [],
      colors: mockColors,
      title: 'Empty'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })

  it('should handle single data point', () => {
    const result = generateBarChart({
      data: [{ label: 'Single', value: 42 }],
      colors: mockColors,
      title: 'Single Point'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('Single')
  })

  it('should show value labels for small datasets', () => {
    const result = generateBarChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    // Should contain value labels for datasets <= 15 items
    mockData.forEach(d => {
      expect(result).toContain(d.value.toString())
    })
  })

  it('should include axis labels', () => {
    const result = generateBarChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    mockData.forEach(d => {
      expect(result).toContain(d.label)
    })
  })

  it('should handle zero values', () => {
    const dataWithZero: DataPoint[] = [
      { label: 'A', value: 10 },
      { label: 'B', value: 0 },
      { label: 'C', value: 20 }
    ]

    const result = generateBarChart({
      data: dataWithZero,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })

  it('should handle negative values', () => {
    const dataWithNegative: DataPoint[] = [
      { label: 'A', value: 10 },
      { label: 'B', value: -5 },
      { label: 'C', value: 20 }
    ]

    const result = generateBarChart({
      data: dataWithNegative,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })
})
