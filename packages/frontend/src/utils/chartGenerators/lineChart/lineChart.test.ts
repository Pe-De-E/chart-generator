import { describe, it, expect } from 'vitest'
import { generateLineChart } from './lineChart'
import type { DataPoint } from '../types'

describe('generateLineChart', () => {
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
    const result = generateLineChart({
      data: mockData,
      colors: mockColors,
      title: 'Test Line Chart'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })

  it('should include chart title', () => {
    const result = generateLineChart({
      data: mockData,
      colors: mockColors,
      title: 'Monthly Sales'
    })

    expect(result).toContain('Monthly Sales')
  })

  it('should render polyline for connecting points', () => {
    const result = generateLineChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).toContain('<polyline')
    expect(result).toContain('points=')
  })

  it('should render circles for data points', () => {
    const result = generateLineChart({
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

    const result = generateLineChart({
      data: mockData,
      colors: customColors,
      title: 'Test'
    })

    expect(result).toContain(customColors.primary)
    expect(result).toContain(customColors.secondary)
    expect(result).toContain(customColors.background)
  })

  it('should handle large datasets with dynamic width', () => {
    const largeData: DataPoint[] = Array.from({ length: 365 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.sin(i / 10) * 50 + 50
    }))

    const result = generateLineChart({
      data: largeData,
      colors: mockColors,
      title: 'Year Data'
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
    const result = generateLineChart({
      data: [{ label: 'Single', value: 42 }],
      colors: mockColors,
      title: 'Single Point'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('<circle')
  })

  it('should handle two data points', () => {
    const twoPoints: DataPoint[] = [
      { label: 'Start', value: 10 },
      { label: 'End', value: 90 }
    ]

    const result = generateLineChart({
      data: twoPoints,
      colors: mockColors,
      title: 'Two Points'
    })

    expect(result).toContain('<polyline')
    const circleCount = (result.match(/<circle/g) || []).length
    expect(circleCount).toBe(2)
  })

  it('should include axis labels and gridlines', () => {
    const result = generateLineChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).toContain('<line')
    mockData.forEach(d => {
      expect(result).toContain(d.label)
    })
  })

  it('should show value labels for small datasets', () => {
    const result = generateLineChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    mockData.forEach(d => {
      expect(result).toContain(d.value.toString())
    })
  })

  it('should not use rounded stroke caps', () => {
    const result = generateLineChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).not.toContain('stroke-linecap="round"')
    expect(result).not.toContain('stroke-linejoin="round"')
  })
})
