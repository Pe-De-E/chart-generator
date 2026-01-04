import { describe, it, expect } from 'vitest'
import { generateScatterChart } from './scatterChart'
import type { DataPoint } from './types'

describe('generateScatterChart', () => {
  const mockData: DataPoint[] = [
    { label: 'A', value: 30 },
    { label: 'B', value: 45 },
    { label: 'C', value: 60 },
    { label: 'D', value: 25 },
    { label: 'E', value: 70 }
  ]

  const mockColors = {
    primary: '#4F46E5',
    secondary: '#818CF8',
    background: '#FFFFFF'
  }

  it('should generate valid SVG string', () => {
    const result = generateScatterChart({
      data: mockData,
      colors: mockColors,
      title: 'Test Scatter Chart'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })

  it('should include chart title', () => {
    const result = generateScatterChart({
      data: mockData,
      colors: mockColors,
      title: 'Scatter Plot Analysis'
    })

    expect(result).toContain('Scatter Plot Analysis')
  })

  it('should render circles for all data points', () => {
    const result = generateScatterChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    const circleCount = (result.match(/<circle/g) || []).length
    expect(circleCount).toBe(mockData.length)
  })

  it('should use provided colors', () => {
    const customColors = {
      primary: '#AA00BB',
      secondary: '#CCDDEE',
      background: '#112233'
    }

    const result = generateScatterChart({
      data: mockData,
      colors: customColors,
      title: 'Test'
    })

    expect(result).toContain(customColors.primary)
    expect(result).toContain(customColors.background)
  })

  it('should handle large datasets with dynamic width', () => {
    const largeData: DataPoint[] = Array.from({ length: 500 }, (_, i) => ({
      label: `Point ${i + 1}`,
      value: Math.random() * 100
    }))

    const result = generateScatterChart({
      data: largeData,
      colors: mockColors,
      title: 'Large Scatter'
    })

    expect(result).toContain('<svg')
    const widthMatch = result.match(/width="(\d+)"/)
    expect(widthMatch).toBeTruthy()
    if (widthMatch) {
      const width = parseInt(widthMatch[1])
      expect(width).toBeGreaterThan(600)
    }
  })

  it('should handle single data point', () => {
    const result = generateScatterChart({
      data: [{ label: 'Solo', value: 50 }],
      colors: mockColors,
      title: 'Single Point'
    })

    expect(result).toContain('<svg')
    const circleCount = (result.match(/<circle/g) || []).length
    expect(circleCount).toBe(1)
  })

  it('should include axis labels for small datasets', () => {
    const result = generateScatterChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    mockData.forEach(d => {
      expect(result).toContain(d.label)
    })
  })

  it('should show value labels for small datasets', () => {
    const result = generateScatterChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    mockData.forEach(d => {
      expect(result).toContain(d.value.toString())
    })
  })

  it('should include gridlines', () => {
    const result = generateScatterChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).toContain('<line')
    expect(result).toContain('stroke-dasharray')
  })

  it('should handle varying value ranges', () => {
    const wideRangeData: DataPoint[] = [
      { label: 'Min', value: 1 },
      { label: 'Mid', value: 500 },
      { label: 'Max', value: 1000 }
    ]

    const result = generateScatterChart({
      data: wideRangeData,
      colors: mockColors,
      title: 'Wide Range'
    })

    expect(result).toContain('<svg')
    const circleCount = (result.match(/<circle/g) || []).length
    expect(circleCount).toBe(3)
  })
})
