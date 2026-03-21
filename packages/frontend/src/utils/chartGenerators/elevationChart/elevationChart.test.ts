import { describe, it, expect } from 'vitest'
import { generateElevationChart, generateElevationFrame } from './elevationChart'
import type { ChartOptions } from '@chart-generator/shared'

// Helper to create single-series chart options
function createSingleSeriesOptions(
  dataLength: number = 20,
  overrides: Partial<ChartOptions> = {}
): ChartOptions {
  const data = Array.from({ length: dataLength }, (_, i) => ({
    label: `${i}km`,
    value: 100 + Math.sin(i / 5) * 50
  }))

  return {
    data,
    colors: { primary: '#2E7D32', background: '#ffffff' },
    title: 'Test Elevation Chart',
    ...overrides
  }
}

// Helper to create multi-series chart options
function createMultiSeriesOptions(
  dataLength: number = 15,
  seriesCount: number = 2
): ChartOptions {
  const seriesData = Array.from({ length: dataLength }, (_, i) => ({
    label: `${i}km`,
    values: Object.fromEntries(
      Array.from({ length: seriesCount }, (_, s) => [
        `Series${s + 1}`,
        100 + Math.sin((i + s * 5) / 5) * 50
      ])
    )
  }))

  const seriesConfig = Array.from({ length: seriesCount }, (_, s) => ({
    name: `Series${s + 1}`,
    columnKey: `col_${s + 2}`,
    color: ['#2E7D32', '#1976D2', '#D32F2F', '#F57C00'][s % 4]
  }))

  return {
    seriesData,
    seriesConfig,
    colors: { background: '#ffffff' },
    title: 'Multi-Series Elevation'
  }
}

describe('generateElevationChart', () => {
  describe('single-series mode', () => {
    it('generates valid SVG', () => {
      const options = createSingleSeriesOptions()
      const svg = generateElevationChart(options)

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    })

    it('includes title', () => {
      const options = createSingleSeriesOptions(20, { title: 'My Elevation' })
      const svg = generateElevationChart(options)

      expect(svg).toContain('My Elevation')
      expect(svg).toContain('id="chart-title"')
    })

    it('includes elevation line and area', () => {
      const options = createSingleSeriesOptions()
      const svg = generateElevationChart(options)

      expect(svg).toContain('id="elevation-line"')
      expect(svg).toContain('id="elevation-area"')
      expect(svg).toContain('<path')
    })

    it('includes axes', () => {
      const options = createSingleSeriesOptions()
      const svg = generateElevationChart(options)

      expect(svg).toContain('id="x-axis"')
      expect(svg).toContain('id="y-axis"')
    })

    it('includes Y-axis labels', () => {
      const options = createSingleSeriesOptions()
      const svg = generateElevationChart(options)

      expect(svg).toContain('id="y-label-')
      expect(svg).toContain('Höhe (m)')
    })

    it('includes X-axis labels', () => {
      const options = createSingleSeriesOptions()
      const svg = generateElevationChart(options)

      expect(svg).toContain('id="x-label-')
      expect(svg).toContain('Entfernung')
    })

    it('includes ascent/descent stats', () => {
      const options = createSingleSeriesOptions()
      const svg = generateElevationChart(options)

      expect(svg).toContain('id="elevation-stats"')
      expect(svg).toContain('↗')
      expect(svg).toContain('↘')
    })

    it('applies background color', () => {
      const options = createSingleSeriesOptions(20, {
        colors: { primary: '#2E7D32', background: '#f5f5f5' }
      })
      const svg = generateElevationChart(options)

      expect(svg).toContain('fill="#f5f5f5"')
    })

    it('applies primary color to line', () => {
      const options = createSingleSeriesOptions(20, {
        colors: { primary: '#FF5722', background: '#ffffff' }
      })
      const svg = generateElevationChart(options)

      expect(svg).toContain('stroke="#FF5722"')
    })

    it('includes gradient definition', () => {
      const options = createSingleSeriesOptions()
      const svg = generateElevationChart(options)

      expect(svg).toContain('<linearGradient')
      expect(svg).toContain('elevation-gradient')
    })

    it('handles large datasets (reduces label density)', () => {
      const options = createSingleSeriesOptions(50)
      const svg = generateElevationChart(options)

      // With 50 data points, not all labels should be shown
      const labelMatches = svg.match(/id="x-label-\d+"/g) || []
      expect(labelMatches.length).toBeLessThan(50)
      expect(labelMatches.length).toBeGreaterThan(0)
    })

    it('handles empty data gracefully', () => {
      const options = createSingleSeriesOptions(0)
      // Should not throw
      expect(() => generateElevationChart(options)).not.toThrow()
    })
  })

  describe('multi-series mode', () => {
    it('generates valid SVG', () => {
      const options = createMultiSeriesOptions()
      const svg = generateElevationChart(options)

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
    })

    it('includes all series lines', () => {
      const options = createMultiSeriesOptions(15, 3)
      const svg = generateElevationChart(options)

      expect(svg).toContain('id="line-Series1"')
      expect(svg).toContain('id="line-Series2"')
      expect(svg).toContain('id="line-Series3"')
    })

    it('includes all series areas', () => {
      const options = createMultiSeriesOptions(15, 2)
      const svg = generateElevationChart(options)

      expect(svg).toContain('id="area-Series1"')
      expect(svg).toContain('id="area-Series2"')
    })

    it('includes legend', () => {
      const options = createMultiSeriesOptions(15, 2)
      const svg = generateElevationChart(options)

      expect(svg).toContain('id="legend-Series1"')
      expect(svg).toContain('id="legend-Series2"')
    })

    it('uses different colors for each series', () => {
      const options = createMultiSeriesOptions(15, 2)
      const svg = generateElevationChart(options)

      expect(svg).toContain('stroke="#2E7D32"')
      expect(svg).toContain('stroke="#1976D2"')
    })
  })

  describe('silhouette mode', () => {
    it('generates minimal SVG without axes', () => {
      const options = createSingleSeriesOptions(20, { silhouetteMode: true })
      const svg = generateElevationChart(options)

      expect(svg).toContain('<svg')
      expect(svg).not.toContain('id="x-axis"')
      expect(svg).not.toContain('id="y-axis"')
      expect(svg).not.toContain('Höhe (m)')
    })

    it('uses Instagram Reel dimensions', () => {
      const options = createSingleSeriesOptions(20, { silhouetteMode: true })
      const svg = generateElevationChart(options)

      expect(svg).toContain('viewBox="0 0 1080 1920"')
    })

    it('includes gradient background', () => {
      const options = createSingleSeriesOptions(20, { silhouetteMode: true })
      const svg = generateElevationChart(options)

      expect(svg).toContain('background-gradient')
    })

    it('includes curve line and area', () => {
      const options = createSingleSeriesOptions(20, { silhouetteMode: true })
      const svg = generateElevationChart(options)

      expect(svg).toContain('<path')
    })
  })

  describe('style overrides', () => {
    it('applies title text override', () => {
      const options = createSingleSeriesOptions(20, {
        styleOverrides: {
          title: { text: 'Custom Title' }
        }
      })
      const svg = generateElevationChart(options)

      expect(svg).toContain('Custom Title')
    })

    it('applies title font size override', () => {
      const options = createSingleSeriesOptions(20, {
        styleOverrides: {
          title: { fontSize: 24 }
        }
      })
      const svg = generateElevationChart(options)

      expect(svg).toContain('font-size="24"')
    })

    it('applies title color override', () => {
      const options = createSingleSeriesOptions(20, {
        styleOverrides: {
          title: { color: '#FF0000' }
        }
      })
      const svg = generateElevationChart(options)

      expect(svg).toContain('fill="#FF0000"')
    })

    it('applies series color override', () => {
      const options = createSingleSeriesOptions(20, {
        styleOverrides: {
          series: { main: { color: '#9C27B0' } }
        }
      })
      const svg = generateElevationChart(options)

      expect(svg).toContain('stroke="#9C27B0"')
    })

    it('applies x-axis label overrides', () => {
      const options = createSingleSeriesOptions(20, {
        styleOverrides: {
          xAxis: {
            labels: { fontSize: 12, color: '#333333', rotation: -30 }
          }
        }
      })
      const svg = generateElevationChart(options)

      expect(svg).toContain('font-size="12"')
      expect(svg).toContain('fill="#333333"')
      expect(svg).toContain('rotate(-30')
    })
  })

  describe('statistical overlays', () => {
    it('renders without error when overlays enabled', () => {
      const options = createSingleSeriesOptions(20, {
        statisticalOverlays: {
          showMean: true,
          showMedian: true,
          showStdDev: false,
          showMinMax: false,
          showQuartiles: false,
          showCustomRange: false,
          customRangeMin: 0,
          customRangeMax: 100,
          showZScore: false,
          zScoreThreshold: 2,
          color: '#FF5722',
          colors: {
            mean: '#FF5722',
            median: '#2196F3',
            stdDev: '#4CAF50',
            minMax: '#9C27B0',
            quartiles: '#FF9800',
            customRange: '#607D8B',
            zScore: '#E91E63'
          }
        }
      })

      // Should generate valid SVG without throwing
      const svg = generateElevationChart(options)
      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
    })
  })
})

describe('generateElevationFrame', () => {
  describe('silhouette mode animation', () => {
    it('generates valid SVG frame', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: true,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
    })

    it('includes clip-path for progressive reveal', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: false,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })

      expect(svg).toContain('<clipPath')
      expect(svg).toContain('clip-path="url(#')
    })

    it('shows marker when enabled', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: true,
        markerSize: 8,
        markerColor: '#FF0000',
        curveEndpoint: 30
      })

      expect(svg).toContain('<circle')
      expect(svg).toContain('fill="#FF0000"')
    })

    it('hides marker when disabled', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: false,
        markerSize: 8,
        markerColor: '#FF0000',
        curveEndpoint: 30
      })

      // Should not have a marker circle with cx/cy positioning
      const markerPattern = /<circle[^>]*cx="[^"]*"[^>]*cy="[^"]*"[^>]*fill="#FF0000"/
      expect(markerPattern.test(svg)).toBe(false)
    })

    it('respects progress 0 (start)', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 0,
        showMarker: true,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })

      expect(svg).toContain('<svg')
      // Clip should be at minimum
      expect(svg).toContain('width="')
    })

    it('respects progress 1 (end)', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 1,
        showMarker: true,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })

      expect(svg).toContain('<svg')
    })

    it('clamps progress above 1', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      // Should not throw
      expect(() => generateElevationFrame(options, {
        progress: 1.5,
        showMarker: true,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })).not.toThrow()
    })

    it('clamps progress below 0', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      // Should not throw
      expect(() => generateElevationFrame(options, {
        progress: -0.5,
        showMarker: true,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })).not.toThrow()
    })

    it('shows elevation labels when enabled', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: true,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30,
        showElevationLabels: true,
        elevationLabelColor: '#ffffff'
      })

      // Should contain elevation value labels (ending with 'm')
      expect(svg).toMatch(/\d+m<\/text>/)
    })

    it('uses gradient background when enabled', () => {
      const options = createSingleSeriesOptions(50, {
        silhouetteMode: true,
        colors: { primary: '#2E7D32', background: '#000000' }
      })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: false,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30,
        useGradientBackground: true,
        gradientColor: '#302b63'
      })

      expect(svg).toContain('background-gradient')
      expect(svg).toContain('#302b63')
    })

    it('uses solid background when gradient disabled', () => {
      const options = createSingleSeriesOptions(50, {
        silhouetteMode: true,
        colors: { primary: '#2E7D32', background: '#1a1a1a' }
      })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: false,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30,
        useGradientBackground: false
      })

      expect(svg).toContain('fill="#1a1a1a"')
    })
  })

  describe('single-series mode animation', () => {
    it('generates valid animated SVG', () => {
      const options = createSingleSeriesOptions(30)
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: true,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
    })

    it('includes clip-path for animation', () => {
      const options = createSingleSeriesOptions(30)
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: false,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })

      expect(svg).toContain('<clipPath')
    })

    it('shows animated ascent/descent stats', () => {
      const options = createSingleSeriesOptions(30)
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: false,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })

      expect(svg).toContain('id="elevation-stats"')
    })

    it('shows marker at current position', () => {
      const options = createSingleSeriesOptions(30)
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: true,
        markerSize: 10,
        markerColor: '#FF5722',
        curveEndpoint: 30
      })

      expect(svg).toContain('id="animation-marker"')
      expect(svg).toContain('fill="#FF5722"')
      expect(svg).toContain('r="10"')
    })
  })

  describe('multi-series mode', () => {
    it('returns static chart for multi-series (not yet animated)', () => {
      const options = createMultiSeriesOptions(15, 2)
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: true,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })

      // Should return a valid SVG (static multi-series chart)
      expect(svg).toContain('<svg')
      expect(svg).toContain('id="line-Series1"')
    })
  })

  describe('edge cases', () => {
    it('handles empty data', () => {
      const options = createSingleSeriesOptions(0, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: true,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })

      expect(svg).toContain('<svg')
    })

    it('handles single data point', () => {
      const options = createSingleSeriesOptions(1, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: true,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 30
      })

      expect(svg).toContain('<svg')
    })

    it('handles curveEndpoint at minimum (15%)', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: false,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 15
      })

      expect(svg).toContain('<svg')
    })

    it('handles curveEndpoint at maximum (100%)', () => {
      const options = createSingleSeriesOptions(50, { silhouetteMode: true })
      const svg = generateElevationFrame(options, {
        progress: 0.5,
        showMarker: false,
        markerSize: 6,
        markerColor: '#ffffff',
        curveEndpoint: 100
      })

      expect(svg).toContain('<svg')
    })
  })
})
