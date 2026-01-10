import type { ChartOptions } from '@chart-generator/shared'
import { renderStatisticalOverlays, hasAnyOverlayEnabled } from './statisticalOverlayRenderer'

export function generateElevationChart(options: ChartOptions): string {
  const { data, seriesData, seriesConfig, silhouetteMode } = options

  // Silhouette mode: pure curve only, no axes, labels, or background
  if (silhouetteMode) {
    const chartData = data || (seriesData ? seriesData.map(d => ({
      label: d.label,
      value: Object.values(d.values)[0] || 0
    })) : [])
    const color = options.colors.primary || seriesConfig?.[0]?.color || '#2E7D32'
    return generateSilhouette(chartData, color)
  }

  // Detect mode
  const isSingleSeries = !!data

  if (isSingleSeries) {
    const { colors, title, statisticalOverlays } = options
    return generateSingleSeriesElevation(data!, colors, title, statisticalOverlays)
  } else {
    const { colors, title, statisticalOverlays } = options
    return generateMultiSeriesElevation(seriesData!, seriesConfig!, colors, title, statisticalOverlays)
  }
}

function generateSilhouette(
  data: Array<{ label: string, value: number }>,
  color: string
): string {
  if (data.length === 0) return '<svg></svg>'

  const width = 800
  const height = 200
  const padding = 10

  const values = data.map(d => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue || 1

  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2

  // Build the line path
  const linePoints = data.map((d, i) => {
    const x = padding + i * xStep
    const y = padding + chartHeight - ((d.value - minValue) / valueRange) * chartHeight
    return `${x},${y}`
  }).join(' ')

  // Build area path (for subtle gradient fill)
  const areaPoints = data.map((d, i) => {
    const x = padding + i * xStep
    const y = padding + chartHeight - ((d.value - minValue) / valueRange) * chartHeight
    return `${x},${y}`
  })
  const lastX = padding + (data.length - 1) * xStep
  const bottomRight = `${lastX},${height - padding}`
  const bottomLeft = `${padding},${height - padding}`
  const fullAreaPath = [bottomLeft, ...areaPoints, bottomRight].join(' ')

  const gradientId = `silhouette-gradient-${Date.now()}`

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.4"/>
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.05"/>
        </linearGradient>
      </defs>
      <polygon points="${fullAreaPath}" fill="url(#${gradientId})"/>
      <polyline points="${linePoints}" fill="none" stroke="${color}"
                stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
  `
}

function generateSingleSeriesElevation(
  data: Array<{ label: string, value: number }>,
  colors: { primary?: string, secondary?: string, background: string },
  title: string,
  overlays?: ChartOptions['statisticalOverlays']
): string {
  // Dynamic width based on data count
  const minPointSpacing = 4
  const baseWidth = 600
  const calculatedWidth = Math.max(baseWidth, data.length * minPointSpacing)
  const width = calculatedWidth
  const height = 350
  const margin = { top: 60, right: 40, bottom: 80, left: 70 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const values = data.map(d => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  // Add padding to Y-axis range
  const valueRange = maxValue - minValue
  const yMin = Math.floor(minValue - valueRange * 0.1)
  const yMax = Math.ceil(maxValue + valueRange * 0.1)
  const adjustedRange = yMax - yMin

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2

  // Show every nth label based on data count
  const labelInterval = data.length > 20 ? Math.ceil(data.length / 15) : 1
  const fontSize = data.length > 15 ? 9 : 10

  // Y-axis scale with nice round numbers
  const yAxisSteps = 5
  const stepValue = Math.ceil(adjustedRange / yAxisSteps)
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = yMin + i * stepValue
    const y = margin.top + chartHeight - ((value - yMin) / adjustedRange) * chartHeight
    return { value, y }
  }).filter(item => item.value <= yMax)

  // Generate unique gradient ID
  const gradientId = `elevation-gradient-${Date.now()}`

  // Build the area path
  const areaPoints = data.map((d, i) => {
    const x = margin.left + i * xStep
    const y = margin.top + chartHeight - ((d.value - yMin) / adjustedRange) * chartHeight
    return `${x},${y}`
  })

  // Add bottom corners to close the area
  const lastX = margin.left + (data.length - 1) * xStep
  const bottomRight = `${lastX},${margin.top + chartHeight}`
  const bottomLeft = `${margin.left},${margin.top + chartHeight}`
  const fullAreaPath = [bottomLeft, ...areaPoints, bottomRight].join(' ')

  // Line path
  const linePoints = areaPoints.join(' ')

  // X-axis labels (distance)
  const xLabels = data.map((d, i) => {
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
        minValue: yMin,
        maxValue: yMax
      })
    : ''

  // Calculate total ascent and descent
  let totalAscent = 0
  let totalDescent = 0
  for (let i = 1; i < data.length; i++) {
    const diff = data[i].value - data[i - 1].value
    if (diff > 0) totalAscent += diff
    else totalDescent += Math.abs(diff)
  }

  const primaryColor = colors.primary || '#2E7D32'

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:0.8"/>
          <stop offset="50%" style="stop-color:${primaryColor};stop-opacity:0.5"/>
          <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.2"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="${colors.background}"/>
      <text x="${width/2}" y="25" text-anchor="middle" font-size="18"
            font-weight="bold" fill="#1F2937">${title}</text>

      <!-- Ascent/Descent info -->
      <text x="${margin.left}" y="45" font-size="11" fill="#4B5563">
        ↗ ${totalAscent.toFixed(0)} m  ↘ ${totalDescent.toFixed(0)} m
      </text>

      <!-- Y-axis label -->
      <text x="15" y="${margin.top + chartHeight / 2}"
            text-anchor="middle" font-size="11" fill="#6B7280"
            transform="rotate(-90 15 ${margin.top + chartHeight / 2})">Höhe (m)</text>

      <!-- X-axis label -->
      <text x="${margin.left + chartWidth / 2}" y="${height - 10}"
            text-anchor="middle" font-size="11" fill="#6B7280">Entfernung</text>

      ${yAxis}
      ${statisticalOverlay}

      <!-- Filled area with gradient -->
      <polygon points="${fullAreaPath}" fill="url(#${gradientId})"/>

      <!-- Line on top -->
      <polyline points="${linePoints}" fill="none" stroke="${primaryColor}"
                stroke-width="2" stroke-linejoin="round"/>

      ${xLabels}

      <!-- Axes -->
      <line x1="${margin.left}" y1="${margin.top + chartHeight}"
            x2="${width - margin.right}" y2="${margin.top + chartHeight}"
            stroke="#9CA3AF" stroke-width="2"/>
      <line x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${margin.top + chartHeight}"
            stroke="#9CA3AF" stroke-width="2"/>
    </svg>
  `
}

function generateMultiSeriesElevation(
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
  const height = 350 + legendHeight
  const margin = { top: 60, right: 40, bottom: 80 + legendHeight, left: 70 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Find min/max across all series
  let minValue = Infinity
  let maxValue = -Infinity
  seriesData.forEach(d => {
    Object.values(d.values).forEach(v => {
      if (typeof v === 'number') {
        minValue = Math.min(minValue, v)
        maxValue = Math.max(maxValue, v)
      }
    })
  })

  // Add padding to Y-axis range
  const valueRange = maxValue - minValue
  const yMin = Math.floor(minValue - valueRange * 0.1)
  const yMax = Math.ceil(maxValue + valueRange * 0.1)
  const adjustedRange = yMax - yMin

  const xStep = seriesData.length > 1 ? chartWidth / (seriesData.length - 1) : chartWidth / 2

  // Show every nth label
  const labelInterval = seriesData.length > 20 ? Math.ceil(seriesData.length / 15) : 1
  const fontSize = seriesData.length > 15 ? 9 : 10

  // Y-axis scale
  const yAxisSteps = 5
  const stepValue = Math.ceil(adjustedRange / yAxisSteps)
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = yMin + i * stepValue
    const y = margin.top + chartHeight - ((value - yMin) / adjustedRange) * chartHeight
    return { value, y }
  }).filter(item => item.value <= yMax)

  // Generate lines for each series (no stacking for elevation profiles)
  let allLines = ''
  const timestamp = Date.now()

  seriesConfig.forEach((series, seriesIndex) => {
    const gradientId = `elevation-gradient-${timestamp}-${seriesIndex}`

    const points = seriesData.map((d, i) => {
      const value = d.values[series.name] || 0
      const x = margin.left + i * xStep
      const y = margin.top + chartHeight - ((value - yMin) / adjustedRange) * chartHeight
      return `${x},${y}`
    })

    // Build area path
    const lastX = margin.left + (seriesData.length - 1) * xStep
    const bottomRight = `${lastX},${margin.top + chartHeight}`
    const bottomLeft = `${margin.left},${margin.top + chartHeight}`
    const fullAreaPath = [bottomLeft, ...points, bottomRight].join(' ')
    const linePoints = points.join(' ')

    allLines += `
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${series.color};stop-opacity:0.5"/>
          <stop offset="100%" style="stop-color:${series.color};stop-opacity:0.1"/>
        </linearGradient>
      </defs>
      <polygon points="${fullAreaPath}" fill="url(#${gradientId})"/>
      <polyline points="${linePoints}" fill="none" stroke="${series.color}"
                stroke-width="2" stroke-linejoin="round"/>
    `
  })

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
  const legend = seriesConfig.map((series, i) => {
    const itemWidth = 120
    const itemsPerRow = Math.floor((width - 100) / itemWidth)
    const row = Math.floor(i / itemsPerRow)
    const col = i % itemsPerRow
    const x = 50 + col * itemWidth
    const y = legendY + row * 25

    return `
      <rect x="${x}" y="${y}" width="15" height="15" fill="${series.color}" />
      <text x="${x + 20}" y="${y + 12}" font-size="11" fill="#4B5563">
        ${series.name}
      </text>
    `
  }).join('')

  // Statistical overlays
  const allValues: number[] = []
  seriesData.forEach(d => {
    Object.values(d.values).forEach(v => {
      if (typeof v === 'number' && !isNaN(v)) {
        allValues.push(v)
      }
    })
  })

  const statisticalOverlay = overlays && hasAnyOverlayEnabled(overlays)
    ? renderStatisticalOverlays({
        overlays,
        values: allValues,
        chartX: margin.left,
        chartY: margin.top,
        chartWidth,
        chartHeight,
        minValue: yMin,
        maxValue: yMax
      })
    : ''

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${colors.background}"/>
      <text x="${width/2}" y="25" text-anchor="middle" font-size="18"
            font-weight="bold" fill="#1F2937">${title}</text>

      <!-- Y-axis label -->
      <text x="15" y="${margin.top + chartHeight / 2}"
            text-anchor="middle" font-size="11" fill="#6B7280"
            transform="rotate(-90 15 ${margin.top + chartHeight / 2})">Höhe (m)</text>

      <!-- X-axis label -->
      <text x="${margin.left + chartWidth / 2}" y="${height - legendHeight - 10}"
            text-anchor="middle" font-size="11" fill="#6B7280">Entfernung</text>

      ${yAxis}
      ${statisticalOverlay}
      ${allLines}
      ${xLabels}

      <!-- Axes -->
      <line x1="${margin.left}" y1="${margin.top + chartHeight}"
            x2="${width - margin.right}" y2="${margin.top + chartHeight}"
            stroke="#9CA3AF" stroke-width="2"/>
      <line x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${margin.top + chartHeight}"
            stroke="#9CA3AF" stroke-width="2"/>

      ${legend}
    </svg>
  `
}
