import type { ChartOptions } from '@chart-generator/shared'
import { renderStatisticalOverlays, hasAnyOverlayEnabled } from '../statisticalOverlayRenderer'

// Helper function to generate legend with editable attributes
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
      <g id="legend-${series.name}" class="editable" data-type="legend" data-series="${series.name}" data-editable="true">
        <rect x="${x}" y="${legendY}" width="15" height="15" fill="${series.color}" />
        <text x="${x + 20}" y="${legendY + 12}" font-size="11" fill="#4B5563">
          ${series.name}
        </text>
      </g>
    `
  }).join('')
}

export function generateScatterChart(options: ChartOptions): string {
  const { data, seriesData, seriesConfig, colors, title, statisticalOverlays, styleOverrides } = options

  // Detect mode
  const isSingleSeries = !!data

  if (isSingleSeries) {
    // Legacy single-series mode
    return generateSingleSeriesScatter(data!, colors, title, statisticalOverlays, styleOverrides)
  } else {
    // Multi-series mode
    return generateMultiSeriesScatter(seriesData!, seriesConfig!, colors, title, statisticalOverlays, styleOverrides)
  }
}

function generateSingleSeriesScatter(
  data: Array<{ label: string, value: number }>,
  colors: { primary?: string, background: string },
  title: string,
  overlays?: ChartOptions['statisticalOverlays'],
  styleOverrides?: ChartOptions['styleOverrides']
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

  // Apply title style overrides
  const titleOverride = styleOverrides?.title
  const titleText = titleOverride?.text ?? title
  const titleFontSize = titleOverride?.fontSize ?? 20
  const titleColor = titleOverride?.color ?? '#1F2937'
  const titleWeight = titleOverride?.fontWeight ?? 'bold'
  const titleAlign = titleOverride?.alignment ?? 'center'
  const titleX = titleAlign === 'left' ? margin.left
               : titleAlign === 'right' ? width - margin.right
               : width / 2
  const titleAnchor = titleAlign === 'left' ? 'start'
                    : titleAlign === 'right' ? 'end'
                    : 'middle'

  // Apply x-axis label overrides
  const xAxisOverride = styleOverrides?.xAxis?.labels
  const labelRotation = xAxisOverride?.rotation ?? -45

  const points = data.map((d, i) => {
    const x = margin.left + i * xStep
    const y = margin.top + chartHeight - (d.value / maxValue) * chartHeight

    // Apply data point style overrides
    const dpOverride = styleOverrides?.dataPoints?.[i]
    const pointColor = dpOverride?.color ?? colors.primary ?? '#4F46E5'
    const isHighlighted = dpOverride?.highlight ?? false
    const highlightAttr = isHighlighted ? 'stroke="#1F2937" stroke-width="2"' : ''

    // Only show label for every nth item
    const showLabel = i % labelInterval === 0
    const labelY = margin.top + chartHeight + 15

    return `
      <circle id="point-${i}" class="editable" data-type="point" data-index="${i}"
              data-label="${d.label}" data-value="${d.value}" data-editable="true"
              cx="${x}" cy="${y}" r="5" fill="${pointColor}" opacity="0.7" ${highlightAttr}/>
      ${showLabel ? `
        <text id="x-label-${i}" class="editable" data-type="x-label" data-index="${i}"
              data-label="${d.label}" data-editable="true"
              x="${x}" y="${labelY}"
              text-anchor="end" font-size="${fontSize}" fill="#4B5563"
              transform="rotate(${labelRotation} ${x} ${labelY})">${d.label}</text>
      ` : ''}
      ${data.length <= 15 ? `
        <text id="value-label-${i}" class="editable" data-type="value-label" data-index="${i}"
              data-value="${d.value}" data-editable="true"
              x="${x}" y="${y - 15}"
              text-anchor="middle" font-size="10" font-weight="bold" fill="#1F2937">${d.value}</text>
      ` : ''}
    `
  }).join('')

  // Y-axis labels and grid lines
  const yAxis = yAxisLabels.map(({ value, y }, i) => `
    <line id="grid-line-${i}" data-type="grid-line" data-index="${i}" data-value="${value}"
          x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"
          stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
    <line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}"
          stroke="#9CA3AF" stroke-width="1"/>
    <text id="y-label-${i}" class="editable" data-type="y-label" data-index="${i}"
          data-value="${value}" data-editable="true"
          x="${margin.left - 10}" y="${y + 4}"
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
      <style>
        .editable { cursor: pointer; }
        .editable:hover { opacity: 0.8; }
      </style>
      <rect id="chart-background" data-type="background" data-editable="true"
            width="${width}" height="${height}" fill="${colors.background}"/>
      <text id="chart-title" class="editable" data-type="title" data-editable="true"
            x="${titleX}" y="${30 + (titleOverride?.offsetY ?? 0)}" text-anchor="${titleAnchor}"
            font-size="${titleFontSize}" font-weight="${titleWeight}" fill="${titleColor}">${titleText}</text>
      ${yAxis}
      ${statisticalOverlay}
      ${points}
      <line id="x-axis" data-type="axis" x1="${margin.left}" y1="${margin.top + chartHeight}"
            x2="${width - margin.right}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      <line id="y-axis" data-type="axis" x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
    </svg>
  `
}

function generateMultiSeriesScatter(
  seriesData: Array<{ label: string, values: Record<string, number> }>,
  seriesConfig: Array<{ name: string, columnKey: string, color: string }>,
  colors: { series?: string[], background: string },
  title: string,
  overlays?: ChartOptions['statisticalOverlays'],
  styleOverrides?: ChartOptions['styleOverrides']
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

  // Calculate max value across ALL series
  const allValues = seriesData.flatMap(d => Object.values(d.values))
  const maxValue = Math.max(...allValues, 1)

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

  // Apply title style overrides
  const titleOverride = styleOverrides?.title
  const titleText = titleOverride?.text ?? title
  const titleFontSize = titleOverride?.fontSize ?? 20
  const titleColor = titleOverride?.color ?? '#1F2937'
  const titleWeight = titleOverride?.fontWeight ?? 'bold'
  const titleAlign = titleOverride?.alignment ?? 'center'
  const titleX = titleAlign === 'left' ? margin.left
               : titleAlign === 'right' ? width - margin.right
               : width / 2
  const titleAnchor = titleAlign === 'left' ? 'start'
                    : titleAlign === 'right' ? 'end'
                    : 'middle'

  // Apply x-axis label overrides
  const xAxisOverride = styleOverrides?.xAxis?.labels
  const labelRotation = xAxisOverride?.rotation ?? -45

  // Generate points for each series
  let allPoints = ''

  seriesConfig.forEach(series => {
    // Apply series style override
    const seriesOverride = styleOverrides?.series?.[series.name]
    const seriesColor = seriesOverride?.color ?? series.color

    const seriesPoints = seriesData.map((d, i) => {
      const value = d.values[series.name] || 0
      const x = margin.left + i * xStep
      const y = margin.top + chartHeight - (value / maxValue) * chartHeight

      return `
        <circle id="point-${series.name}-${i}" class="editable" data-type="point"
                data-series="${series.name}" data-index="${i}"
                data-label="${d.label}" data-value="${value}" data-editable="true"
                cx="${x}" cy="${y}" r="5" fill="${seriesColor}" opacity="0.7"/>
      `
    }).join('')

    allPoints += seriesPoints
  })

  // X-axis labels (only once, not per series)
  const xLabels = seriesData.map((d, i) => {
    const showLabel = i % labelInterval === 0
    if (!showLabel) return ''

    const x = margin.left + i * xStep
    const labelY = margin.top + chartHeight + 15

    return `
      <text id="x-label-${i}" class="editable" data-type="x-label"
            data-index="${i}" data-label="${d.label}" data-editable="true"
            x="${x}" y="${labelY}"
            text-anchor="end" font-size="${fontSize}" fill="#4B5563"
            transform="rotate(${labelRotation} ${x} ${labelY})">${d.label}</text>
    `
  }).join('')

  // Y-axis
  const yAxis = yAxisLabels.map(({ value, y }, i) => `
    <line id="grid-line-${i}" data-type="grid-line" data-index="${i}" data-value="${value}"
          x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"
          stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
    <line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}"
          stroke="#9CA3AF" stroke-width="1"/>
    <text id="y-label-${i}" class="editable" data-type="y-label" data-index="${i}"
          data-value="${value}" data-editable="true"
          x="${margin.left - 10}" y="${y + 4}"
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
      <style>
        .editable { cursor: pointer; }
        .editable:hover { opacity: 0.8; }
      </style>
      <rect id="chart-background" data-type="background" data-editable="true"
            width="${width}" height="${height}" fill="${colors.background}"/>
      <text id="chart-title" class="editable" data-type="title" data-editable="true"
            x="${titleX}" y="${30 + (titleOverride?.offsetY ?? 0)}" text-anchor="${titleAnchor}"
            font-size="${titleFontSize}" font-weight="${titleWeight}" fill="${titleColor}">${titleText}</text>
      ${yAxis}
      ${statisticalOverlay}
      ${allPoints}
      ${xLabels}
      <line id="x-axis" data-type="axis" x1="${margin.left}" y1="${margin.top + chartHeight}"
            x2="${width - margin.right}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      <line id="y-axis" data-type="axis" x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      ${legend}
    </svg>
  `
}
