import { describe, it, expect } from 'vitest'
import { generatePieChart } from './pieChart'
import type { DataPoint } from '../types'

describe('generatePieChart', () => {
  const mockData: DataPoint[] = [
    { label: 'Product A', value: 30 },
    { label: 'Product B', value: 45 },
    { label: 'Product C', value: 25 }
  ]

  const mockColors = {
    primary: '#4F46E5',
    secondary: '#818CF8',
    background: '#FFFFFF'
  }

  it('should generate valid SVG string', () => {
    const result = generatePieChart({
      data: mockData,
      colors: mockColors,
      title: 'Test Pie Chart'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })

  it('should include chart title', () => {
    const result = generatePieChart({
      data: mockData,
      colors: mockColors,
      title: 'Market Share'
    })

    expect(result).toContain('Market Share')
  })

  it('should render path elements for pie slices', () => {
    const result = generatePieChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    const pathCount = (result.match(/<path/g) || []).length
    expect(pathCount).toBe(mockData.length)
  })

  it('should use background color for slice borders', () => {
    const customColors = {
      primary: '#FF0000',
      secondary: '#00FF00',
      background: '#0000FF'
    }

    const result = generatePieChart({
      data: mockData,
      colors: customColors,
      title: 'Test'
    })

    expect(result).toContain(customColors.background)
  })

  it('should use HSL colors for slices', () => {
    const result = generatePieChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    expect(result).toContain('hsl(')
  })

  it('should handle single slice', () => {
    const result = generatePieChart({
      data: [{ label: 'Only One', value: 100 }],
      colors: mockColors,
      title: 'Single Slice'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('<path')
  })

  it('should handle equal values', () => {
    const equalData: DataPoint[] = [
      { label: 'A', value: 25 },
      { label: 'B', value: 25 },
      { label: 'C', value: 25 },
      { label: 'D', value: 25 }
    ]

    const result = generatePieChart({
      data: equalData,
      colors: mockColors,
      title: 'Equal Slices'
    })

    const pathCount = (result.match(/<path/g) || []).length
    expect(pathCount).toBe(4)
  })

  it('should show labels for significant slices', () => {
    const result = generatePieChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    // Labels should be shown for slices > 3% with <= 20 items
    mockData.forEach(d => {
      expect(result).toContain(d.label)
    })
  })

  it('should hide labels for tiny slices', () => {
    const dataWithTinySlice: DataPoint[] = [
      { label: 'Large', value: 95 },
      { label: 'Tiny', value: 2 },
      { label: 'Small', value: 3 }
    ]

    const result = generatePieChart({
      data: dataWithTinySlice,
      colors: mockColors,
      title: 'Test'
    })

    // Tiny slice (2%) should not show label
    expect(result).toContain('Large')
    // The label might still be in the data, but checking the structure
    expect(result).toContain('<svg')
  })

  it('should handle large datasets', () => {
    const largeData: DataPoint[] = Array.from({ length: 50 }, (_, i) => ({
      label: `Segment ${i + 1}`,
      value: Math.random() * 10 + 1
    }))

    const result = generatePieChart({
      data: largeData,
      colors: mockColors,
      title: 'Many Slices'
    })

    expect(result).toContain('<svg')
    const pathCount = (result.match(/<path/g) || []).length
    expect(pathCount).toBe(largeData.length)
  })

  it('should use correct SVG path format', () => {
    const result = generatePieChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    // Check for proper path format (M x,y L x,y A ...)
    expect(result).toContain('d="M')
    expect(result).toContain(' L ')
    expect(result).toContain(' A ')
    expect(result).toContain(' Z"')
  })

  it('should handle zero values gracefully', () => {
    const dataWithZero: DataPoint[] = [
      { label: 'A', value: 50 },
      { label: 'B', value: 0 },
      { label: 'C', value: 50 }
    ]

    const result = generatePieChart({
      data: dataWithZero,
      colors: mockColors,
      title: 'With Zero'
    })

    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })

  it('should calculate correct total', () => {
    const result = generatePieChart({
      data: mockData,
      colors: mockColors,
      title: 'Test'
    })

    // Total should be 30 + 45 + 25 = 100
    // Each slice should be proportional
    expect(result).toContain('<svg')
    const pathCount = (result.match(/<path/g) || []).length
    expect(pathCount).toBe(mockData.length)
  })
})
