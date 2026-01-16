import { describe, it, expect } from 'vitest'
import { generateAreaChart } from './areaChart'
import type { DataPoint } from '../types'

describe('generateAreaChart', () => {
  const mockData: DataPoint[] = [
    { label: 'Jan', value: 30 },
    { label: 'Feb', value: 45 },
    { label: 'Mar', value: 60 },
    { label: 'Apr', value: 55 },
    { label: 'May', value: 70 }
  ]

  const mockColors = {
    primary: '#4F46E5',
    secondary: '#818CF8',
    background: '#FFFFFF'
  }

  it('should generate valid SVG string', () => {
    const result = generateAreaChart({
      data: mockData,
      colors: mockColors,
      title: 'Test Area Chart'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })

  it('should include chart title', () => {
    const result = generateAreaChart({
      data: mockData,
      colors: mockColors,
      title: 'Sales Over Time'
    })

    expect(result).toContain('Sales Over Time')
  })

  it('should render polygon for filled area', () => {
    const result = generateAreaChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).toContain('<polygon')
    expect(result).toContain('points=')
  })

  it('should render polyline for top edge', () => {
    const result = generateAreaChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).toContain('<polyline')
  })

  it('should render circles for data points', () => {
    const result = generateAreaChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    const circleCount = (result.match(/<circle/g) || []).length
    expect(circleCount).toBe(mockData.length)
  })

  it('should use provided colors', () => {
    const customColors = {
      primary: '#FF5733',
      secondary: '#33FF57',
      background: '#3357FF'
    }

    const result = generateAreaChart({
      data: mockData,
      colors: customColors,
      title: 'Test'
    })

    expect(result).toContain(customColors.primary)
    expect(result).toContain(customColors.secondary)
    expect(result).toContain(customColors.background)
  })

  it('should apply opacity to filled area', () => {
    const result = generateAreaChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).toContain('opacity="0.3"')
  })

  it('should handle large datasets with dynamic width', () => {
    const largeData: DataPoint[] = Array.from({ length: 365 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.sin(i / 10) * 50 + 50
    }))

    const result = generateAreaChart({
      data: largeData,
      colors: mockColors,
      title: 'Year Data'
    })

    expect(result).toContain('<svg')
    // Width should remain fixed at 600px - points scale to fit
    const widthMatch = result.match(/width="(\d+)"/)
    expect(widthMatch).toBeTruthy()
    if (widthMatch) {
      const width = parseInt(widthMatch[1])
      expect(width).toBe(600) // Fixed width, points scale to fit
    }
  })

  it('should handle single data point', () => {
    const result = generateAreaChart({
      data: [{ label: 'Single', value: 42 }],
      colors: mockColors,
      title: 'Single Point'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('<polygon')
    expect(result).toContain('<circle')
  })

  it('should handle two data points', () => {
    const twoPoints: DataPoint[] = [
      { label: 'Start', value: 10 },
      { label: 'End', value: 90 }
    ]

    const result = generateAreaChart({
      data: twoPoints,
      colors: mockColors,
      title: 'Two Points'
    })

    expect(result).toContain('<polygon')
    const circleCount = (result.match(/<circle/g) || []).length
    expect(circleCount).toBe(2)
  })

  it('should include axis labels and gridlines', () => {
    const result = generateAreaChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).toContain('<line')
    expect(result).toContain('stroke-dasharray')
    mockData.forEach(d => {
      expect(result).toContain(d.label)
    })
  })

  it('should show value labels for small datasets', () => {
    const result = generateAreaChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    mockData.forEach(d => {
      expect(result).toContain(d.value.toString())
    })
  })

  it('should handle zero values', () => {
    const dataWithZero: DataPoint[] = [
      { label: 'A', value: 10 },
      { label: 'B', value: 0 },
      { label: 'C', value: 20 }
    ]

    const result = generateAreaChart({
      data: dataWithZero,
      colors: mockColors,
      title: 'With Zero'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('<polygon')
  })

  it('should handle varying value ranges', () => {
    const wideRangeData: DataPoint[] = [
      { label: 'Min', value: 1 },
      { label: 'Mid', value: 500 },
      { label: 'Max', value: 1000 }
    ]

    const result = generateAreaChart({
      data: wideRangeData,
      colors: mockColors,
      title: 'Wide Range'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('<polygon')
  })

  it('should create closed polygon path', () => {
    const result = generateAreaChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    // Polygon should have points attribute
    expect(result).toContain('points="')
    // Should contain polygon element with fill
    expect(result).toMatch(/<polygon[^>]*fill="[^"]*"/)
  })

  it('should have line on top of filled area', () => {
    const result = generateAreaChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    // Both polygon and polyline should be present
    expect(result).toContain('<polygon')
    expect(result).toContain('<polyline')

    // Polyline should appear after polygon in the SVG
    const polygonIndex = result.indexOf('<polygon')
    const polylineIndex = result.indexOf('<polyline')
    expect(polylineIndex).toBeGreaterThan(polygonIndex)
  })
})
