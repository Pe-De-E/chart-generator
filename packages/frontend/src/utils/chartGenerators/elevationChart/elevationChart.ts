import type { ChartOptions } from '@chart-generator/shared'
import { renderStatisticalOverlays, hasAnyOverlayEnabled } from '../statisticalOverlayRenderer'
import {
  gpxToViewBox,
  pointsToPolyline,
  pointsToAreaPolygon,
  elevationToY,
  getChartArea,
  calculateBounds,
  padBounds,
  VIEW_BOX_PRESETS,
  type GPXPoint,
  type ViewBoxConfig
} from '../../coordinateContract'

export function generateElevationChart(options: ChartOptions): string {
  const { data, seriesData, seriesConfig, silhouetteMode, styleOverrides } = options

  // Silhouette mode: pure curve only, no axes, labels, or background
  if (silhouetteMode) {
    const chartData = data || (seriesData ? seriesData.map(d => ({
      label: d.label,
      value: Object.values(d.values)[0] || 0
    })) : [])
    const color = styleOverrides?.series?.['main']?.color ?? options.colors.primary ?? seriesConfig?.[0]?.color ?? '#2E7D32'
    return generateSilhouette(chartData, color)
  }

  // Detect mode
  const isSingleSeries = !!data

  if (isSingleSeries) {
    const { colors, title, statisticalOverlays } = options
    return generateSingleSeriesElevation(data!, colors, title, statisticalOverlays, styleOverrides)
  } else {
    const { colors, title, statisticalOverlays } = options
    return generateMultiSeriesElevation(seriesData!, seriesConfig!, colors, title, statisticalOverlays, styleOverrides)
  }
}

function generateSilhouette(
  data: Array<{ label: string, value: number }>,
  color: string
): string {
  if (data.length === 0) return '<svg></svg>'

  // Convert to GPX format (label as distance index, value as elevation)
  const gpxPoints: GPXPoint[] = data.map((d, i) => ({
    distance: i,
    elevation: d.value
  }))

  const config = VIEW_BOX_PRESETS.silhouette
  const { viewBoxPoints, chartArea } = gpxToViewBox(gpxPoints, config)

  const linePoints = pointsToPolyline(viewBoxPoints)
  const areaPath = pointsToAreaPolygon(viewBoxPoints, chartArea)

  const gradientId = `silhouette-gradient-${Date.now()}`

  return `
    <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.4"/>
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.05"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPath}" fill="url(#${gradientId})"/>
      <polyline points="${linePoints}" fill="none" stroke="${color}"
                stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
  `
}

function generateSingleSeriesElevation(
  data: Array<{ label: string, value: number }>,
  colors: { primary?: string, secondary?: string, background: string },
  title: string,
  overlays?: ChartOptions['statisticalOverlays'],
  styleOverrides?: ChartOptions['styleOverrides']
): string {
  // Use standard ViewBox preset
  const config: ViewBoxConfig = VIEW_BOX_PRESETS.standard
  const { width, height } = config

  // Convert data to GPX format for coordinate contract
  const gpxPoints: GPXPoint[] = data.map((d, i) => ({
    distance: i,
    elevation: d.value
  }))

  // Use coordinate contract for transformation (with 10% padding)
  const { viewBoxPoints, bounds, chartArea } = gpxToViewBox(gpxPoints, config, {
    paddingPercent: 0.1
  })

  // Round bounds for nice Y-axis labels
  const yMin = Math.floor(bounds.minElevation)
  const yMax = Math.ceil(bounds.maxElevation)
  const adjustedRange = yMax - yMin

  // Show every nth label based on data count
  const labelInterval = data.length > 20 ? Math.ceil(data.length / 15) : 1
  const fontSize = data.length > 15 ? 9 : 10

  // Y-axis scale with nice round numbers
  const yAxisSteps = 5
  const stepValue = Math.ceil(adjustedRange / yAxisSteps)
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = yMin + i * stepValue
    const normalizedY = (value - yMin) / adjustedRange
    const y = chartArea.y + chartArea.height - normalizedY * chartArea.height
    return { value, y }
  }).filter(item => item.value <= yMax)

  // Apply title style overrides
  const titleOverride = styleOverrides?.title
  const titleText = titleOverride?.text ?? title
  const titleFontSize = titleOverride?.fontSize ?? 18
  const titleColor = titleOverride?.color ?? '#1F2937'
  const titleWeight = titleOverride?.fontWeight ?? 'bold'
  const titleAlign = titleOverride?.alignment ?? 'center'
  const titleX = titleAlign === 'left' ? chartArea.x
               : titleAlign === 'right' ? width - config.padding.right
               : width / 2
  const titleAnchor = titleAlign === 'left' ? 'start'
                    : titleAlign === 'right' ? 'end'
                    : 'middle'

  // Apply x-axis label overrides
  const xAxisOverride = styleOverrides?.xAxis?.labels
  const labelRotation = xAxisOverride?.rotation ?? -45

  // Apply elevation color override
  const primaryColor = styleOverrides?.series?.['main']?.color ?? colors.primary ?? '#2E7D32'

  // Generate unique gradient ID
  const gradientId = `elevation-gradient-${Date.now()}`

  // Use coordinate contract for line and area paths
  const linePoints = pointsToPolyline(viewBoxPoints)
  const fullAreaPath = pointsToAreaPolygon(viewBoxPoints, chartArea)

  // X-axis labels (distance) - use ViewBox points for x coordinates
  const xLabels = data.map((d, i) => {
    const showLabel = i % labelInterval === 0
    if (!showLabel) return ''

    const x = viewBoxPoints[i].x
    const labelY = chartArea.y + chartArea.height + 15

    return `
      <text id="x-label-${i}" class="editable" data-type="x-label"
            data-index="${i}" data-label="${d.label}" data-editable="true"
            x="${x}" y="${labelY}"
            text-anchor="end" font-size="${fontSize}" fill="#4B5563"
            transform="rotate(${labelRotation} ${x} ${labelY})">${d.label}</text>
    `
  }).join('')

  // Y-axis labels and grid lines - using chartArea from coordinate contract
  const yAxis = yAxisLabels.map(({ value, y }, i) => `
    <line id="grid-line-${i}" data-type="grid-line" data-index="${i}" data-value="${value}"
          x1="${chartArea.x}" y1="${y}" x2="${chartArea.x + chartArea.width}" y2="${y}"
          stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
    <line x1="${chartArea.x - 5}" y1="${y}" x2="${chartArea.x}" y2="${y}"
          stroke="#9CA3AF" stroke-width="1"/>
    <text id="y-label-${i}" class="editable" data-type="y-label" data-index="${i}"
          data-value="${value}" data-editable="true"
          x="${chartArea.x - 10}" y="${y + 4}"
          text-anchor="end" font-size="10" fill="#6B7280">${value}</text>
  `).join('')

  // Statistical overlays - using chartArea from coordinate contract
  const statisticalOverlay = overlays && hasAnyOverlayEnabled(overlays)
    ? renderStatisticalOverlays({
        overlays,
        values: data.map(d => d.value),
        chartX: chartArea.x,
        chartY: chartArea.y,
        chartWidth: chartArea.width,
        chartHeight: chartArea.height,
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

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .editable { cursor: pointer; }
        .editable:hover { opacity: 0.8; }
      </style>
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:0.8"/>
          <stop offset="50%" style="stop-color:${primaryColor};stop-opacity:0.5"/>
          <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.2"/>
        </linearGradient>
      </defs>
      <rect id="chart-background" data-type="background" data-editable="true"
            width="${width}" height="${height}" fill="${colors.background}"/>
      <text id="chart-title" class="editable" data-type="title" data-editable="true"
            x="${titleX}" y="${25 + (titleOverride?.offsetY ?? 0)}" text-anchor="${titleAnchor}"
            font-size="${titleFontSize}" font-weight="${titleWeight}" fill="${titleColor}">${titleText}</text>

      <!-- Ascent/Descent info -->
      <text id="elevation-stats" class="editable" data-type="elevation-stats"
            data-ascent="${totalAscent.toFixed(0)}" data-descent="${totalDescent.toFixed(0)}"
            data-editable="true" x="${chartArea.x}" y="45" font-size="11" fill="#4B5563">
        ↗ ${totalAscent.toFixed(0)} m  ↘ ${totalDescent.toFixed(0)} m
      </text>

      <!-- Y-axis label -->
      <text id="y-axis-title" class="editable" data-type="axis-title" data-editable="true"
            x="15" y="${chartArea.y + chartArea.height / 2}"
            text-anchor="middle" font-size="11" fill="#6B7280"
            transform="rotate(-90 15 ${chartArea.y + chartArea.height / 2})">Höhe (m)</text>

      <!-- X-axis label -->
      <text id="x-axis-title" class="editable" data-type="axis-title" data-editable="true"
            x="${chartArea.x + chartArea.width / 2}" y="${height - 10}"
            text-anchor="middle" font-size="11" fill="#6B7280">Entfernung</text>

      ${yAxis}
      ${statisticalOverlay}

      <!-- Filled area with gradient -->
      <polygon id="elevation-area" class="editable" data-type="area" data-editable="true"
               points="${fullAreaPath}" fill="url(#${gradientId})"/>

      <!-- Line on top -->
      <polyline id="elevation-line" class="editable" data-type="line" data-editable="true"
                points="${linePoints}" fill="none" stroke="${primaryColor}"
                stroke-width="2" stroke-linejoin="round"/>

      ${xLabels}

      <!-- Axes -->
      <line id="x-axis" data-type="axis" x1="${chartArea.x}" y1="${chartArea.y + chartArea.height}"
            x2="${chartArea.x + chartArea.width}" y2="${chartArea.y + chartArea.height}"
            stroke="#9CA3AF" stroke-width="2"/>
      <line id="y-axis" data-type="axis" x1="${chartArea.x}" y1="${chartArea.y}"
            x2="${chartArea.x}" y2="${chartArea.y + chartArea.height}"
            stroke="#9CA3AF" stroke-width="2"/>
    </svg>
  `
}

function generateMultiSeriesElevation(
  seriesData: Array<{ label: string, values: Record<string, number> }>,
  seriesConfig: Array<{ name: string, columnKey: string, color: string }>,
  colors: { series?: string[], background: string },
  title: string,
  overlays?: ChartOptions['statisticalOverlays'],
  styleOverrides?: ChartOptions['styleOverrides']
): string {
  // Calculate legend dimensions
  const baseWidth = 600
  const legendRows = Math.ceil(seriesConfig.length / Math.floor((baseWidth - 100) / 120))
  const legendHeight = legendRows * 25 + 20

  // Create custom ViewBox config with legend space
  const config: ViewBoxConfig = {
    width: baseWidth,
    height: 350 + legendHeight,
    padding: { top: 60, right: 40, bottom: 80 + legendHeight, left: 70 }
  }
  const { width, height } = config
  const chartArea = getChartArea(config)

  // Find min/max across all series for shared bounds
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

  // Create bounds with padding
  const valueRange = maxValue - minValue || 1
  const yMin = Math.floor(minValue - valueRange * 0.1)
  const yMax = Math.ceil(maxValue + valueRange * 0.1)
  const adjustedRange = yMax - yMin

  // Show every nth label
  const labelInterval = seriesData.length > 20 ? Math.ceil(seriesData.length / 15) : 1
  const fontSize = seriesData.length > 15 ? 9 : 10

  // Y-axis scale using chartArea
  const yAxisSteps = 5
  const stepValue = Math.ceil(adjustedRange / yAxisSteps)
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = yMin + i * stepValue
    const normalizedY = (value - yMin) / adjustedRange
    const y = chartArea.y + chartArea.height - normalizedY * chartArea.height
    return { value, y }
  }).filter(item => item.value <= yMax)

  // Apply title style overrides
  const titleOverride = styleOverrides?.title
  const titleText = titleOverride?.text ?? title
  const titleFontSize = titleOverride?.fontSize ?? 18
  const titleColor = titleOverride?.color ?? '#1F2937'
  const titleWeight = titleOverride?.fontWeight ?? 'bold'
  const titleAlign = titleOverride?.alignment ?? 'center'
  const titleX = titleAlign === 'left' ? chartArea.x
               : titleAlign === 'right' ? width - config.padding.right
               : width / 2
  const titleAnchor = titleAlign === 'left' ? 'start'
                    : titleAlign === 'right' ? 'end'
                    : 'middle'

  // Apply x-axis label overrides
  const xAxisOverride = styleOverrides?.xAxis?.labels
  const labelRotation = xAxisOverride?.rotation ?? -45

  // Generate lines for each series using coordinate contract
  let allLines = ''
  const timestamp = Date.now()

  seriesConfig.forEach((series, seriesIndex) => {
    // Apply series style override
    const seriesOverride = styleOverrides?.series?.[series.name]
    const seriesColor = seriesOverride?.color ?? series.color

    const gradientId = `elevation-gradient-${timestamp}-${seriesIndex}`

    // Convert series data to GPX points
    const gpxPoints: GPXPoint[] = seriesData.map((d, i) => ({
      distance: i,
      elevation: d.values[series.name] || 0
    }))

    // Use shared bounds for consistent scaling across series
    const sharedBounds = {
      minDistance: 0,
      maxDistance: seriesData.length - 1 || 1,
      minElevation: yMin,
      maxElevation: yMax,
      distanceRange: seriesData.length - 1 || 1,
      elevationRange: adjustedRange
    }

    const { viewBoxPoints } = gpxToViewBox(gpxPoints, config, { bounds: sharedBounds })
    const linePoints = pointsToPolyline(viewBoxPoints)
    const fullAreaPath = pointsToAreaPolygon(viewBoxPoints, chartArea)

    allLines += `
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${seriesColor};stop-opacity:0.5"/>
          <stop offset="100%" style="stop-color:${seriesColor};stop-opacity:0.1"/>
        </linearGradient>
      </defs>
      <polygon id="area-${series.name}" class="editable" data-type="area"
               data-series="${series.name}" data-editable="true"
               points="${fullAreaPath}" fill="url(#${gradientId})"/>
      <polyline id="line-${series.name}" class="editable" data-type="line"
                data-series="${series.name}" data-editable="true"
                points="${linePoints}" fill="none" stroke="${seriesColor}"
                stroke-width="2" stroke-linejoin="round"/>
    `
  })

  // Calculate X positions for labels (using coordinate contract logic)
  const xStep = seriesData.length > 1 ? chartArea.width / (seriesData.length - 1) : chartArea.width / 2

  // X-axis labels using chartArea
  const xLabels = seriesData.map((d, i) => {
    const showLabel = i % labelInterval === 0
    if (!showLabel) return ''

    const x = chartArea.x + i * xStep
    const labelY = chartArea.y + chartArea.height + 15

    return `
      <text id="x-label-${i}" class="editable" data-type="x-label"
            data-index="${i}" data-label="${d.label}" data-editable="true"
            x="${x}" y="${labelY}"
            text-anchor="end" font-size="${fontSize}" fill="#4B5563"
            transform="rotate(${labelRotation} ${x} ${labelY})">${d.label}</text>
    `
  }).join('')

  // Y-axis using chartArea
  const yAxis = yAxisLabels.map(({ value, y }, i) => `
    <line id="grid-line-${i}" data-type="grid-line" data-index="${i}" data-value="${value}"
          x1="${chartArea.x}" y1="${y}" x2="${chartArea.x + chartArea.width}" y2="${y}"
          stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
    <line x1="${chartArea.x - 5}" y1="${y}" x2="${chartArea.x}" y2="${y}"
          stroke="#9CA3AF" stroke-width="1"/>
    <text id="y-label-${i}" class="editable" data-type="y-label" data-index="${i}"
          data-value="${value}" data-editable="true"
          x="${chartArea.x - 10}" y="${y + 4}"
          text-anchor="end" font-size="10" fill="#6B7280">${value}</text>
  `).join('')

  // Legend using chartArea
  const legendY = chartArea.y + chartArea.height + 50
  const legend = seriesConfig.map((series, i) => {
    const itemWidth = 120
    const itemsPerRow = Math.floor((width - 100) / itemWidth)
    const row = Math.floor(i / itemsPerRow)
    const col = i % itemsPerRow
    const x = 50 + col * itemWidth
    const y = legendY + row * 25

    return `
      <g id="legend-${series.name}" class="editable" data-type="legend" data-series="${series.name}" data-editable="true">
        <rect x="${x}" y="${y}" width="15" height="15" fill="${series.color}" />
        <text x="${x + 20}" y="${y + 12}" font-size="11" fill="#4B5563">
          ${series.name}
        </text>
      </g>
    `
  }).join('')

  // Statistical overlays using chartArea
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
        chartX: chartArea.x,
        chartY: chartArea.y,
        chartWidth: chartArea.width,
        chartHeight: chartArea.height,
        minValue: yMin,
        maxValue: yMax
      })
    : ''

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .editable { cursor: pointer; }
        .editable:hover { opacity: 0.8; }
      </style>
      <rect id="chart-background" data-type="background" data-editable="true"
            width="${width}" height="${height}" fill="${colors.background}"/>
      <text id="chart-title" class="editable" data-type="title" data-editable="true"
            x="${titleX}" y="${25 + (titleOverride?.offsetY ?? 0)}" text-anchor="${titleAnchor}"
            font-size="${titleFontSize}" font-weight="${titleWeight}" fill="${titleColor}">${titleText}</text>

      <!-- Y-axis label -->
      <text id="y-axis-title" class="editable" data-type="axis-title" data-editable="true"
            x="15" y="${chartArea.y + chartArea.height / 2}"
            text-anchor="middle" font-size="11" fill="#6B7280"
            transform="rotate(-90 15 ${chartArea.y + chartArea.height / 2})">Höhe (m)</text>

      <!-- X-axis label -->
      <text id="x-axis-title" class="editable" data-type="axis-title" data-editable="true"
            x="${chartArea.x + chartArea.width / 2}" y="${height - legendHeight - 10}"
            text-anchor="middle" font-size="11" fill="#6B7280">Entfernung</text>

      ${yAxis}
      ${statisticalOverlay}
      ${allLines}
      ${xLabels}

      <!-- Axes -->
      <line id="x-axis" data-type="axis" x1="${chartArea.x}" y1="${chartArea.y + chartArea.height}"
            x2="${chartArea.x + chartArea.width}" y2="${chartArea.y + chartArea.height}"
            stroke="#9CA3AF" stroke-width="2"/>
      <line id="y-axis" data-type="axis" x1="${chartArea.x}" y1="${chartArea.y}"
            x2="${chartArea.x}" y2="${chartArea.y + chartArea.height}"
            stroke="#9CA3AF" stroke-width="2"/>

      ${legend}
    </svg>
  `
}
