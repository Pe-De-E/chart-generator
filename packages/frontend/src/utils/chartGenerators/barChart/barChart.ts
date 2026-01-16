import type { ChartOptions, ChartDimensions } from '@chart-generator/shared'
import { renderStatisticalOverlays, hasAnyOverlayEnabled } from '../statisticalOverlayRenderer'

// Default dimensions
const DEFAULT_WIDTH = 600
const DEFAULT_HEIGHT = 400

// Helper to get SVG dimension attributes
function getSvgDimensions(dimensions?: ChartDimensions, defaultHeight = DEFAULT_HEIGHT): {
  width: number
  height: number
  svgWidth: string
  svgHeight: string
} {
  const width = typeof dimensions?.width === 'number' ? dimensions.width : DEFAULT_WIDTH
  const height = dimensions?.height ?? defaultHeight

  // For 'auto' width, use 100% but keep internal calculations at DEFAULT_WIDTH
  const svgWidth = dimensions?.width === 'auto' ? '100%' : String(width)
  const svgHeight = String(height)

  return { width, height, svgWidth, svgHeight }
}

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

export function generateBarChart(options: ChartOptions): string {
  const { data, seriesData, seriesConfig, styleOverrides, dimensions } = options

  // Detect mode
  const isSingleSeries = !!data

  if (isSingleSeries) {
    // Legacy single-series mode
    const { colors, title, statisticalOverlays } = options
    return generateSingleSeriesBar(data!, colors, title, statisticalOverlays, styleOverrides, dimensions)
  } else {
    // Multi-series mode
    const { colors, title, statisticalOverlays } = options
    return generateMultiSeriesBar(seriesData!, seriesConfig!, colors, title, statisticalOverlays, styleOverrides, dimensions)
  }
}

function generateSingleSeriesBar(
  data: Array<{ label: string, value: number }>,
  colors: { primary?: string, secondary?: string, background: string },
  title: string,
  overlays?: ChartOptions['statisticalOverlays'],
  styleOverrides?: ChartOptions['styleOverrides'],
  dimensions?: ChartDimensions
): string {
  // Get dimensions - supports fixed width, 'auto' (100%), or custom values
  const { width, height, svgWidth, svgHeight } = getSvgDimensions(dimensions, DEFAULT_HEIGHT)
  const margin = { top: 60, right: 40, bottom: 80, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Apply Y-axis range overrides
  const yAxisOverride = styleOverrides?.yAxis
  const dataMaxValue = Math.max(...data.map(d => d.value), 1)
  const dataMinValue = Math.min(...data.map(d => d.value), 0)
  const maxValue = yAxisOverride?.range?.max ?? dataMaxValue
  const minValue = yAxisOverride?.range?.min ?? Math.min(0, dataMinValue)
  const valueRange = maxValue - minValue

  const barWidth = (chartWidth / data.length) * 0.8
  const barSpacing = chartWidth / data.length

  // Show every nth label based on data count to avoid overlap
  const labelInterval = data.length > 20 ? Math.ceil(data.length / 15) : 1
  const defaultFontSize = data.length > 15 ? 9 : 10

  // Y-axis scale - calculate nice round numbers
  const yAxisSteps = 5
  const stepValue = Math.ceil(valueRange / yAxisSteps)
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = minValue + i * stepValue
    const y = margin.top + chartHeight - ((value - minValue) / valueRange) * chartHeight
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
  const labelFontSize = xAxisOverride?.fontSize ?? defaultFontSize
  const labelColor = xAxisOverride?.color ?? '#4B5563'

  const bars = data.map((d, i) => {
    const barHeight = ((d.value - minValue) / valueRange) * chartHeight
    const x = margin.left + i * barSpacing + (barSpacing - barWidth) / 2
    const y = margin.top + chartHeight - barHeight

    // Apply data point style overrides
    const dpOverride = styleOverrides?.dataPoints?.[i]
    const barColor = dpOverride?.color ?? colors.primary ?? '#4F46E5'
    const isHighlighted = dpOverride?.highlight ?? false
    const highlightAttr = isHighlighted ? 'stroke="#1F2937" stroke-width="2"' : ''

    // Only show label for every nth item
    const showLabel = i % labelInterval === 0
    const labelX = x + barWidth/2
    const labelY = margin.top + chartHeight + 15

    return `
      <rect id="bar-${i}" class="editable" data-type="bar" data-index="${i}"
            data-label="${d.label}" data-value="${d.value}" data-editable="true"
            x="${x}" y="${y}" width="${barWidth}" height="${barHeight}"
            fill="${barColor}" rx="4" ${highlightAttr}/>
      ${showLabel ? `
        <text id="x-label-${i}" class="editable" data-type="x-label" data-index="${i}"
              data-label="${d.label}" data-editable="true"
              x="${labelX}" y="${labelY}"
              text-anchor="end" font-size="${labelFontSize}" fill="${labelColor}"
              transform="rotate(${labelRotation} ${labelX} ${labelY})">${d.label}</text>
      ` : ''}
      ${data.length <= 15 ? `
        <text id="value-label-${i}" class="editable" data-type="value-label" data-index="${i}"
              data-value="${d.value}" data-editable="true"
              x="${x + barWidth/2}" y="${y - 5}"
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
        minValue,
        maxValue
      })
    : ''

  // Axis titles
  const xAxisTitle = styleOverrides?.xAxis?.title?.text
  const yAxisTitle = styleOverrides?.yAxis?.title?.text
  const axisTitleFontSize = 12

  return `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
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
      ${bars}
      ${statisticalOverlay}
      <line id="x-axis-line" data-type="axis" x1="${margin.left}" y1="${margin.top + chartHeight}"
            x2="${width - margin.right}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      <line id="y-axis-line" data-type="axis" x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      <!-- Clickable Y-axis area -->
      <rect id="y-axis-clickable" class="editable" data-type="y-axis" data-editable="true"
            x="0" y="${margin.top}" width="${margin.left}" height="${chartHeight}"
            fill="transparent"/>
      <!-- Clickable X-axis area -->
      <rect id="x-axis-clickable" class="editable" data-type="x-axis" data-editable="true"
            x="${margin.left}" y="${margin.top + chartHeight}" width="${chartWidth}" height="${margin.bottom}"
            fill="transparent"/>
      ${xAxisTitle ? `
        <text id="x-axis-title" class="editable" data-type="x-axis" data-editable="true"
              x="${margin.left + chartWidth / 2}" y="${height - 10}"
              text-anchor="middle" font-size="${axisTitleFontSize}" fill="#4B5563">${xAxisTitle}</text>
      ` : ''}
      ${yAxisTitle ? `
        <text id="y-axis-title" class="editable" data-type="y-axis" data-editable="true"
              x="15" y="${margin.top + chartHeight / 2}"
              text-anchor="middle" font-size="${axisTitleFontSize}" fill="#4B5563"
              transform="rotate(-90 15 ${margin.top + chartHeight / 2})">${yAxisTitle}</text>
      ` : ''}
    </svg>
  `
}


function generateMultiSeriesBar(
  seriesData: Array<{ label: string, values: Record<string, number> }>,
  seriesConfig: Array<{ name: string, columnKey: string, color: string }>,
  colors: { series?: string[], background: string },
  title: string,
  overlays?: ChartOptions['statisticalOverlays'],
  styleOverrides?: ChartOptions['styleOverrides'],
  dimensions?: ChartDimensions
): string {
  const seriesCount = seriesConfig.length

  // Get base dimensions
  const baseWidth = typeof dimensions?.width === 'number' ? dimensions.width : DEFAULT_WIDTH
  const legendRows = Math.ceil(seriesConfig.length / Math.floor((baseWidth - 100) / 120))
  const legendHeight = legendRows * 25 + 20
  const baseHeight = (dimensions?.height ?? DEFAULT_HEIGHT) + legendHeight

  // Get SVG dimensions with viewBox support
  const { width, height, svgWidth, svgHeight } = getSvgDimensions(
    { width: dimensions?.width, height: baseHeight },
    baseHeight
  )
  const margin = { top: 60, right: 40, bottom: 80 + legendHeight, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Apply Y-axis range overrides
  const yAxisOverride = styleOverrides?.yAxis
  const allValues = seriesData.flatMap(d => Object.values(d.values))
  const dataMaxValue = Math.max(...allValues, 1)
  const dataMinValue = Math.min(...allValues, 0)
  const maxValue = yAxisOverride?.range?.max ?? dataMaxValue
  const minValue = yAxisOverride?.range?.min ?? Math.min(0, dataMinValue)
  const valueRange = maxValue - minValue

  // Group layout
  const groupWidth = chartWidth / seriesData.length
  const barWidth = (groupWidth / seriesCount) * 0.8
  const barSpacing = groupWidth / seriesCount

  // Show every nth label based on data count
  const labelInterval = seriesData.length > 20 ? Math.ceil(seriesData.length / 15) : 1
  const defaultFontSize = seriesData.length > 15 ? 9 : 10

  // Y-axis scale
  const yAxisSteps = 5
  const stepValue = Math.ceil(valueRange / yAxisSteps)
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = minValue + i * stepValue
    const y = margin.top + chartHeight - ((value - minValue) / valueRange) * chartHeight
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
  const labelFontSize = xAxisOverride?.fontSize ?? defaultFontSize
  const labelColor = xAxisOverride?.color ?? '#4B5563'

  // Generate grouped bars
  let allBars = ''

  seriesData.forEach((dataPoint, labelIndex) => {
    seriesConfig.forEach((series, seriesIndex) => {
      // Apply series style override
      const seriesOverride = styleOverrides?.series?.[series.name]
      const barColor = seriesOverride?.color ?? series.color

      const value = dataPoint.values[series.name] || 0
      const barHeight = ((value - minValue) / valueRange) * chartHeight

      // Position within the group
      const groupX = margin.left + labelIndex * groupWidth
      const barX = groupX + seriesIndex * barSpacing + (barSpacing - barWidth) / 2
      const barY = margin.top + chartHeight - barHeight

      allBars += `
        <rect id="bar-${series.name}-${labelIndex}" class="editable" data-type="bar"
              data-series="${series.name}" data-index="${labelIndex}"
              data-label="${dataPoint.label}" data-value="${value}" data-editable="true"
              x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}"
              fill="${barColor}" rx="2"/>
      `
    })

    // Label for the group (only once per label)
    const showLabel = labelIndex % labelInterval === 0
    if (showLabel) {
      const labelX = margin.left + labelIndex * groupWidth + groupWidth / 2
      const labelY = margin.top + chartHeight + 15

      allBars += `
        <text id="x-label-${labelIndex}" class="editable" data-type="x-label"
              data-index="${labelIndex}" data-label="${dataPoint.label}" data-editable="true"
              x="${labelX}" y="${labelY}"
              text-anchor="end" font-size="${labelFontSize}" fill="${labelColor}"
              transform="rotate(${labelRotation} ${labelX} ${labelY})">${dataPoint.label}</text>
      `
    }
  })

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
        minValue,
        maxValue
      })
    : ''

  // Axis titles
  const xAxisTitle = styleOverrides?.xAxis?.title?.text
  const yAxisTitle = styleOverrides?.yAxis?.title?.text
  const axisTitleFontSize = 12

  return `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
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
      ${allBars}
      ${statisticalOverlay}
      <line id="x-axis-line" data-type="axis" x1="${margin.left}" y1="${margin.top + chartHeight}"
            x2="${width - margin.right}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      <line id="y-axis-line" data-type="axis" x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      <!-- Clickable Y-axis area -->
      <rect id="y-axis-clickable" class="editable" data-type="y-axis" data-editable="true"
            x="0" y="${margin.top}" width="${margin.left}" height="${chartHeight}"
            fill="transparent"/>
      <!-- Clickable X-axis area -->
      <rect id="x-axis-clickable" class="editable" data-type="x-axis" data-editable="true"
            x="${margin.left}" y="${margin.top + chartHeight}" width="${chartWidth}" height="${margin.bottom - legendHeight}"
            fill="transparent"/>
      ${xAxisTitle ? `
        <text id="x-axis-title" class="editable" data-type="x-axis" data-editable="true"
              x="${margin.left + chartWidth / 2}" y="${margin.top + chartHeight + 45}"
              text-anchor="middle" font-size="${axisTitleFontSize}" fill="#4B5563">${xAxisTitle}</text>
      ` : ''}
      ${yAxisTitle ? `
        <text id="y-axis-title" class="editable" data-type="y-axis" data-editable="true"
              x="15" y="${margin.top + chartHeight / 2}"
              text-anchor="middle" font-size="${axisTitleFontSize}" fill="#4B5563"
              transform="rotate(-90 15 ${margin.top + chartHeight / 2})">${yAxisTitle}</text>
      ` : ''}
      ${legend}
    </svg>
  `
}
