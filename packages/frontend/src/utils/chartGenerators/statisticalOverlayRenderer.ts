import type { StatisticalOverlays } from '@chart-generator/shared'
import { calculateStatistics, formatStatValue } from '../statisticalAnalysis'

interface OverlayRenderOptions {
  overlays: StatisticalOverlays
  values: number[]
  chartX: number
  chartY: number
  chartWidth: number
  chartHeight: number
  minValue: number
  maxValue: number
}

/**
 * Renders statistical overlay lines and areas on a chart
 * Returns SVG string to be inserted into the chart
 */
export function renderStatisticalOverlays(options: OverlayRenderOptions): string {
  const {
    overlays,
    values,
    chartX,
    chartY,
    chartWidth,
    chartHeight,
    minValue,
    maxValue
  } = options

  if (values.length === 0) return ''

  const stats = calculateStatistics(values)
  const range = maxValue - minValue
  const overlayParts: string[] = []

  // Helper function to convert value to Y coordinate
  const valueToY = (value: number): number => {
    const normalized = (value - minValue) / range
    return chartY + chartHeight - (normalized * chartHeight)
  }

  // Helper to get color for overlay type (use individual color or fallback to legacy color)
  const getColor = (type: keyof typeof overlays.colors): string => {
    return overlays.colors?.[type] ?? overlays.color
  }

  // Render quartiles area (Q1 to Q3)
  if (overlays.showQuartiles) {
    const q1Y = valueToY(stats.q1)
    const q3Y = valueToY(stats.q3)
    const height = q1Y - q3Y
    const color = getColor('quartiles')

    overlayParts.push(`
      <rect
        x="${chartX}"
        y="${q3Y}"
        width="${chartWidth}"
        height="${height}"
        fill="${color}"
        opacity="0.1"
        stroke="${color}"
        stroke-width="1"
        stroke-dasharray="4,4"
      />
      <text
        x="${chartX + chartWidth + 5}"
        y="${q1Y}"
        font-size="10"
        fill="${color}"
        font-weight="500"
      >Q1: ${formatStatValue(stats.q1)}</text>
      <text
        x="${chartX + chartWidth + 5}"
        y="${q3Y}"
        font-size="10"
        fill="${color}"
        font-weight="500"
      >Q3: ${formatStatValue(stats.q3)}</text>
    `)
  }

  // Render standard deviation area
  if (overlays.showStdDev) {
    const upperY = valueToY(stats.mean + stats.stdDev)
    const lowerY = valueToY(stats.mean - stats.stdDev)
    const height = lowerY - upperY
    const color = getColor('stdDev')

    overlayParts.push(`
      <rect
        x="${chartX}"
        y="${upperY}"
        width="${chartWidth}"
        height="${height}"
        fill="${color}"
        opacity="0.08"
      />
      <line
        x1="${chartX}"
        y1="${upperY}"
        x2="${chartX + chartWidth}"
        y2="${upperY}"
        stroke="${color}"
        stroke-width="1"
        stroke-dasharray="2,3"
        opacity="0.5"
      />
      <line
        x1="${chartX}"
        y1="${lowerY}"
        x2="${chartX + chartWidth}"
        y2="${lowerY}"
        stroke="${color}"
        stroke-width="1"
        stroke-dasharray="2,3"
        opacity="0.5"
      />
      <text
        x="${chartX + chartWidth + 5}"
        y="${upperY}"
        font-size="10"
        fill="${color}"
      >+1σ</text>
      <text
        x="${chartX + chartWidth + 5}"
        y="${lowerY}"
        font-size="10"
        fill="${color}"
      >-1σ</text>
    `)
  }

  // Render mean line
  if (overlays.showMean) {
    const meanY = valueToY(stats.mean)
    const color = getColor('mean')

    overlayParts.push(`
      <line
        x1="${chartX}"
        y1="${meanY}"
        x2="${chartX + chartWidth}"
        y2="${meanY}"
        stroke="${color}"
        stroke-width="2"
        opacity="0.8"
      />
      <text
        x="${chartX + chartWidth + 5}"
        y="${meanY + 4}"
        font-size="11"
        fill="${color}"
        font-weight="600"
      >Ø ${formatStatValue(stats.mean)}</text>
    `)
  }

  // Render median line
  if (overlays.showMedian) {
    const medianY = valueToY(stats.median)
    const color = getColor('median')

    overlayParts.push(`
      <line
        x1="${chartX}"
        y1="${medianY}"
        x2="${chartX + chartWidth}"
        y2="${medianY}"
        stroke="${color}"
        stroke-width="3"
        stroke-dasharray="8,4"
        opacity="1"
      />
      <text
        x="${chartX + chartWidth + 5}"
        y="${medianY + 4}"
        font-size="11"
        fill="${color}"
        font-weight="600"
      >~ ${formatStatValue(stats.median)}</text>
    `)
  }

  // Render min/max lines
  if (overlays.showMinMax) {
    const minY = valueToY(stats.min)
    const maxY = valueToY(stats.max)
    const color = getColor('minMax')

    overlayParts.push(`
      <line
        x1="${chartX}"
        y1="${minY}"
        x2="${chartX + chartWidth}"
        y2="${minY}"
        stroke="${color}"
        stroke-width="1"
        stroke-dasharray="3,3"
        opacity="0.6"
      />
      <line
        x1="${chartX}"
        y1="${maxY}"
        x2="${chartX + chartWidth}"
        y2="${maxY}"
        stroke="${color}"
        stroke-width="1"
        stroke-dasharray="3,3"
        opacity="0.6"
      />
      <text
        x="${chartX + chartWidth + 5}"
        y="${minY}"
        font-size="10"
        fill="${color}"
      >Min: ${formatStatValue(stats.min)}</text>
      <text
        x="${chartX + chartWidth + 5}"
        y="${maxY}"
        font-size="10"
        fill="${color}"
      >Max: ${formatStatValue(stats.max)}</text>
    `)
  }

  // Render Z-score threshold lines
  if (overlays.showZScore && overlays.zScoreThreshold !== undefined) {
    const threshold = overlays.zScoreThreshold
    const upperBound = stats.mean + (threshold * stats.stdDev)
    const lowerBound = stats.mean - (threshold * stats.stdDev)
    const upperY = valueToY(upperBound)
    const lowerY = valueToY(lowerBound)
    const height = lowerY - upperY
    const color = getColor('zScore')

    overlayParts.push(`
      <rect
        x="${chartX}"
        y="${upperY}"
        width="${chartWidth}"
        height="${height}"
        fill="${color}"
        opacity="0.12"
      />
      <line
        x1="${chartX}"
        y1="${upperY}"
        x2="${chartX + chartWidth}"
        y2="${upperY}"
        stroke="${color}"
        stroke-width="2"
        stroke-dasharray="5,3"
        opacity="0.8"
      />
      <line
        x1="${chartX}"
        y1="${lowerY}"
        x2="${chartX + chartWidth}"
        y2="${lowerY}"
        stroke="${color}"
        stroke-width="2"
        stroke-dasharray="5,3"
        opacity="0.8"
      />
      <text
        x="${chartX + chartWidth + 5}"
        y="${upperY + 4}"
        font-size="10"
        fill="${color}"
        font-weight="500"
      >+${threshold}σ (${formatStatValue(upperBound)})</text>
      <text
        x="${chartX + chartWidth + 5}"
        y="${lowerY + 4}"
        font-size="10"
        fill="${color}"
        font-weight="500"
      >-${threshold}σ (${formatStatValue(lowerBound)})</text>
    `)
  }

  // Render custom range area
  if (overlays.showCustomRange && overlays.customRangeMin !== undefined && overlays.customRangeMax !== undefined) {
    const customMinY = valueToY(overlays.customRangeMin)
    const customMaxY = valueToY(overlays.customRangeMax)
    const height = customMinY - customMaxY
    const color = getColor('customRange')

    overlayParts.push(`
      <rect
        x="${chartX}"
        y="${customMaxY}"
        width="${chartWidth}"
        height="${height}"
        fill="${color}"
        opacity="0.15"
        stroke="${color}"
        stroke-width="2"
        stroke-dasharray="6,3"
      />
      <line
        x1="${chartX}"
        y1="${customMinY}"
        x2="${chartX + chartWidth}"
        y2="${customMinY}"
        stroke="${color}"
        stroke-width="2"
        opacity="0.9"
      />
      <line
        x1="${chartX}"
        y1="${customMaxY}"
        x2="${chartX + chartWidth}"
        y2="${customMaxY}"
        stroke="${color}"
        stroke-width="2"
        opacity="0.9"
      />
      <text
        x="${chartX + chartWidth + 5}"
        y="${customMinY + 4}"
        font-size="11"
        fill="${color}"
        font-weight="600"
      >${formatStatValue(overlays.customRangeMin)}</text>
      <text
        x="${chartX + chartWidth + 5}"
        y="${customMaxY + 4}"
        font-size="11"
        fill="${color}"
        font-weight="600"
      >${formatStatValue(overlays.customRangeMax)}</text>
    `)
  }

  // Group all overlays
  return `
    <g class="statistical-overlays">
      ${overlayParts.join('\n')}
    </g>
  `
}

/**
 * Check if any statistical overlays are enabled
 */
export function hasAnyOverlayEnabled(overlays?: StatisticalOverlays): boolean {
  if (!overlays) return false
  return overlays.showMean ||
         overlays.showMedian ||
         overlays.showStdDev ||
         overlays.showMinMax ||
         overlays.showQuartiles ||
         overlays.showCustomRange ||
         overlays.showZScore
}
