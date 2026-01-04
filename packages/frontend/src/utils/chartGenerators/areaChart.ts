import type { ChartOptions } from '@chart-generator/shared'
import { renderStatisticalOverlays, hasAnyOverlayEnabled } from './statisticalOverlayRenderer'

// Helper function to generate legend
function generateLegend(
  seriesConfig: Array<{ name: string, color: string }>,
  y: number,
  width: number
): string {
  const itemWidth = 120
  const itemsPerRow = Math.floor((width - 100) / itemWidth)

  return seriesConfig.map((series, i) => {
    const row = Math.floor(i / itemsPerRow)
    const col = i % itemsPerRow
    const x = 50 + col * itemWidth
    const legendY = y + row * 25

    return `
      <rect x="${x}" y="${legendY}" width="15" height="15" fill="${series.color}" />
      <text x="${x + 20}" y="${legendY + 12}" font-size="11" fill="#4B5563">
        ${series.name}
      </text>
    `
  }).join('')
}

export function generateAreaChart(options: ChartOptions): string {
  const { data, seriesData, seriesConfig } = options

  // Detect mode
  const isSingleSeries = !!data

  if (isSingleSeries) {
    // Legacy single-series mode
    const { colors, title, statisticalOverlays } = options
    return generateSingleSeriesArea(data!, colors, title, statisticalOverlays)
  } else {
    // Multi-series mode
    const { colors, title, statisticalOverlays } = options
    return generateMultiSeriesArea(seriesData!, seriesConfig!, colors, title, statisticalOverlays)
  }
}

function generateSingleSeriesArea(
  data: Array<{ label: string, value: number }>,
  colors: { primary?: string, secondary?: string, background: string },
  title: string,
  overlays?: ChartOptions['statisticalOverlays']
): string {
  // Dynamic width based on data count for better visibility
  const minPointSpacing = 4
  const baseWidth = 600
  const calculatedWidth = Math.max(baseWidth, data.length * minPointSpacing)
  const width = calculatedWidth
  const height = 400
  const margin = { top: 60, right: 40, bottom: 80, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const maxValue = Math.max(...data.map(d => d.value))
  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2

  // Show every nth label based on data count to avoid overlap
  const labelInterval = data.length > 20 ? Math.ceil(data.length / 15) : 1
  const fontSize = data.length > 15 ? 9 : 10

  // Y-axis scale - calculate nice round numbers
  const yAxisSteps = 5
  const stepValue = Math.ceil(maxValue / yAxisSteps)
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = i * stepValue
    const y = margin.top + chartHeight - (value / maxValue) * chartHeight
    return { value, y }
  }).filter(item => item.value <= maxValue)

  // Build the area path (polygon from bottom-left, through all points, to bottom-right)
  const areaPoints = data.map((d, i) => {
    const x = margin.left + i * xStep
    const y = margin.top + chartHeight - (d.value / maxValue) * chartHeight
    return `${x},${y}`
  })

  // Add bottom corners to close the area
  const lastX = margin.left + (data.length - 1) * xStep
  const bottomRight = `${lastX},${margin.top + chartHeight}`
  const bottomLeft = `${margin.left},${margin.top + chartHeight}`

  const fullAreaPath = [bottomLeft, ...areaPoints, bottomRight].join(' ')

  // Build the line path (just the top edge)
  const linePoints = areaPoints.join(' ')

  const circles = data.map((d, i) => {
    const x = margin.left + i * xStep
    const y = margin.top + chartHeight - (d.value / maxValue) * chartHeight

    // Only show label for every nth item
    const showLabel = i % labelInterval === 0
    const labelY = margin.top + chartHeight + 15

    return `
      <circle cx="${x}" cy="${y}" r="4" fill="${colors.secondary || '#818CF8'}"/>
      ${showLabel ? `
        <text x="${x}" y="${labelY}"
              text-anchor="end" font-size="${fontSize}" fill="#4B5563"
              transform="rotate(-45 ${x} ${labelY})">${d.label}</text>
      ` : ''}
      ${data.length <= 15 ? `
        <text x="${x}" y="${y - 15}"
              text-anchor="middle" font-size="10" font-weight="bold" fill="#1F2937">${d.value}</text>
      ` : ''}
    `
  }).join('')

  // Y-axis labels and grid lines
  const yAxis = yAxisLabels.map(({ value, y }) => `
    <line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}"
          stroke="#9CA3AF" stroke-width="1"/>
    <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"
          stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
    <text x="${margin.left - 10}" y="${y + 4}"
          text-anchor="end" font-size="10" fill="#6B7280">${value}</text>
  `).join('')

  // Statistical overlays
  const statisticalOverlay = overlays && hasAnyOverlayEnabled(overlays)
    ? renderStatisticalOverlays({
        overlays,
        values: data.map(d => d.value),
        chartX: margin.left,
        chartY: margin.top,
        chartWidth,
        chartHeight,
        minValue: 0,
        maxValue
      })
    : ''

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${colors.background}"/>
      <text x="${width/2}" y="30" text-anchor="middle" font-size="20"
            font-weight="bold" fill="#1F2937">${title}</text>
      ${yAxis}
      ${statisticalOverlay}
      <!-- Filled area -->
      <polygon points="${fullAreaPath}" fill="${colors.primary || '#4F46E5'}" opacity="0.3"/>
      <!-- Line on top of area -->
      <polyline points="${linePoints}" fill="none" stroke="${colors.primary || '#4F46E5'}"
                stroke-width="2"/>
      ${circles}
      <line x1="${margin.left}" y1="${margin.top + chartHeight}"
            x2="${width - margin.right}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      <line x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
    </svg>
  `
}

function generateMultiSeriesArea(
  seriesData: Array<{ label: string, values: Record<string, number> }>,
  seriesConfig: Array<{ name: string, columnKey: string, color: string }>,
  colors: { series?: string[], background: string },
  title: string,
  overlays?: ChartOptions['statisticalOverlays']
): string {
  // Dynamic width based on data count
  const minPointSpacing = 4
  const baseWidth = 600
  const calculatedWidth = Math.max(baseWidth, seriesData.length * minPointSpacing)
  const width = calculatedWidth
  const legendRows = Math.ceil(seriesConfig.length / Math.floor((width - 100) / 120))
  const legendHeight = legendRows * 25 + 20
  const height = 400 + legendHeight
  const margin = { top: 60, right: 40, bottom: 80 + legendHeight, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Calculate max value (sum of all series per label)
  const maxValue = Math.max(
    ...seriesData.map(d => {
      return Object.values(d.values).reduce((sum, v) => sum + v, 0)
    }),
    1
  )

  const xStep = seriesData.length > 1 ? chartWidth / (seriesData.length - 1) : chartWidth / 2

  // Show every nth label based on data count
  const labelInterval = seriesData.length > 20 ? Math.ceil(seriesData.length / 15) : 1
  const fontSize = seriesData.length > 15 ? 9 : 10

  // Y-axis scale
  const yAxisSteps = 5
  const stepValue = Math.ceil(maxValue / yAxisSteps)
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = i * stepValue
    const y = margin.top + chartHeight - (value / maxValue) * chartHeight
    return { value, y }
  }).filter(item => item.value <= maxValue)

  // Calculate cumulative values for stacking
  const cumulativeData = seriesData.map(d => {
    const cumulative: Record<string, number> = {}
    let sum = 0
    seriesConfig.forEach(series => {
      sum += d.values[series.name] || 0
      cumulative[series.name] = sum
    })
    return { label: d.label, cumulative }
  })

  // Generate stacked areas (draw from top to bottom)
  let allAreas = ''

  for (let i = seriesConfig.length - 1; i >= 0; i--) {
    const series = seriesConfig[i]
    const prevSeries = i > 0 ? seriesConfig[i - 1] : null

    // Top line (cumulative values of this series)
    const topPoints = cumulativeData.map((d, idx) => {
      const value = d.cumulative[series.name]
      const x = margin.left + idx * xStep
      const y = margin.top + chartHeight - (value / maxValue) * chartHeight
      return `${x},${y}`
    }).join(' ')

    // Bottom line (cumulative values of previous series or baseline)
    const bottomPoints = cumulativeData.map((d, idx) => {
      const value = prevSeries ? d.cumulative[prevSeries.name] : 0
      const x = margin.left + idx * xStep
      const y = margin.top + chartHeight - (value / maxValue) * chartHeight
      return `${x},${y}`
    }).reverse().join(' ')

    // Create polygon (top line + bottom line reversed)
    allAreas += `
      <polygon points="${topPoints} ${bottomPoints}" fill="${series.color}" opacity="0.7" />
    `
  }

  // X-axis labels
  const xLabels = seriesData.map((d, i) => {
    const showLabel = i % labelInterval === 0
    if (!showLabel) return ''

    const x = margin.left + i * xStep
    const labelY = margin.top + chartHeight + 15

    return `
      <text x="${x}" y="${labelY}"
            text-anchor="end" font-size="${fontSize}" fill="#4B5563"
            transform="rotate(-45 ${x} ${labelY})">${d.label}</text>
    `
  }).join('')

  // Y-axis
  const yAxis = yAxisLabels.map(({ value, y }) => `
    <line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}"
          stroke="#9CA3AF" stroke-width="1"/>
    <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"
          stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
    <text x="${margin.left - 10}" y="${y + 4}"
          text-anchor="end" font-size="10" fill="#6B7280">${value}</text>
  `).join('')

  // Legend
  const legendY = margin.top + chartHeight + 50
  const legend = generateLegend(seriesConfig, legendY, width)

  // Statistical overlays (using already calculated allValues from above)
  const statisticalOverlay = overlays && hasAnyOverlayEnabled(overlays)
    ? renderStatisticalOverlays({
        overlays,
        values: allValues.filter(v => typeof v === 'number' && !isNaN(v)),
        chartX: margin.left,
        chartY: margin.top,
        chartWidth,
        chartHeight,
        minValue: 0,
        maxValue
      })
    : ''

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${colors.background}"/>
      <text x="${width/2}" y="30" text-anchor="middle" font-size="20"
            font-weight="bold" fill="#1F2937">${title}</text>
      ${yAxis}
      ${statisticalOverlay}
      ${allAreas}
      ${xLabels}
      <line x1="${margin.left}" y1="${margin.top + chartHeight}"
            x2="${width - margin.right}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      <line x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      ${legend}
    </svg>
  `
}
