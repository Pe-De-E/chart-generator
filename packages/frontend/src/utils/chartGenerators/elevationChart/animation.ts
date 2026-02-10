import type { ChartOptions, CurveEndpoint, ImageBackgroundOptions } from '@chart-generator/shared'
import { renderStatisticalOverlays, hasAnyOverlayEnabled } from '../statisticalOverlayRenderer'
import {
  gpxToViewBox,
  pointsToPolyline,
  pointsToAreaPolygon,
  VIEW_BOX_PRESETS,
  type GPXPoint,
  type ViewBoxConfig,
  type ViewBoxPoint
} from '../../coordinateContract'
import { remapProgressByTime, remapProgressDirect, buildGradientTimeArray } from '../../timeMapping'
import type { BackgroundType, PanZoomConfig } from './types'
import { generateBackgroundElements } from './background'
import { generateEffortCurve } from './effort'
import { calculateCameraViewport } from './panZoom'

/**
 * Placeholder - returns points unchanged for now
 * TODO: Implement proper curve height adjustment
 */
export function adjustCurveEndpoint(
  points: ViewBoxPoint[],
  chartArea: { x: number; y: number; width: number; height: number },
  heightPercent: CurveEndpoint
): ViewBoxPoint[] {
  // Return points unchanged - slider has no effect yet
  return points
}

/**
 * Get the marker position by interpolating between ViewBox points
 */
export function getMarkerPosition(
  points: ViewBoxPoint[],
  progress: number
): ViewBoxPoint | null {
  if (points.length === 0) return null
  if (progress <= 0) return points[0]
  if (progress >= 1) return points[points.length - 1]

  // Find the exact position along the path
  const exactIndex = progress * (points.length - 1)
  const lowerIndex = Math.floor(exactIndex)
  const upperIndex = Math.min(lowerIndex + 1, points.length - 1)
  const fraction = exactIndex - lowerIndex

  const p1 = points[lowerIndex]
  const p2 = points[upperIndex]

  // Linear interpolation between points
  return {
    x: p1.x + (p2.x - p1.x) * fraction,
    y: p1.y + (p2.y - p1.y) * fraction,
    originalDistance: p1.originalDistance + (p2.originalDistance - p1.originalDistance) * fraction,
    originalElevation: p1.originalElevation + (p2.originalElevation - p1.originalElevation) * fraction
  }
}

/**
 * Animated silhouette mode
 * Always uses Instagram Reel dimensions (1080x1920) for consistent preview/export
 * The SVG scales to fit the container while maintaining aspect ratio
 */
export function generateAnimatedSilhouette(
  data: Array<{ label: string, value: number }>,
  color: string,
  progress: number,
  showMarker: boolean,
  markerSize: number,
  markerColor: string,
  curveEndpoint: CurveEndpoint = 30,
  _exportWidth?: number,
  _exportHeight?: number,
  backgroundColor: string = '#000000',
  showElevationLabels: boolean = false,
  elevationLabelColor: string = '#ffffffb3',
  backgroundType: BackgroundType = 'solid',
  gradientColor: string = '#302b63',
  meshColor1: string = '#667eea',
  meshColor2: string = '#764ba2',
  meshColor3: string = '#f093fb',
  patternColor: string = '#ffffff',
  patternOpacity: number = 0.1,
  showDistanceLabels: boolean = false,
  distanceLabelColor: string = '#ffffffb3',
  totalDistanceKm?: number,
  imageOptions?: ImageBackgroundOptions,
  timeArray?: number[],
  animationMode: 'uniform' | 'time-based' | 'gradient' | 'effort' = 'uniform',
  gradientSensitivity: number = 3,
  effortConfig?: {
    variableStroke: boolean
    variableStrokeIntensity: number
    colorGradient: boolean
    colorGradientIntensity: number
    glowAura: boolean
    glowAuraIntensity: number
  },
  showAreaFill: boolean = true,
  panZoomEnabled: boolean = false,
  panZoomConfig?: PanZoomConfig
): string {
  if (data.length === 0) return '<svg></svg>'

  // Remap progress based on animation mode
  let effectiveProgress: number
  if (animationMode === 'time-based' && timeArray && timeArray.length > 0) {
    effectiveProgress = remapProgressByTime(progress, timeArray)
  } else if (animationMode === 'gradient' && data.length > 2) {
    const elevations = data.map(d => d.value)
    const gradientArray = buildGradientTimeArray(elevations, gradientSensitivity)
    effectiveProgress = remapProgressDirect(progress, gradientArray)
  } else {
    effectiveProgress = progress
  }

  // Always use Instagram Reel dimensions for consistent preview/export
  const width = VIEW_BOX_PRESETS.instagramReel.width   // 1080
  const height = VIEW_BOX_PRESETS.instagramReel.height // 1920

  // Position curve in the lower portion of the reel
  // curveEndpoint is the percentage of reel height (15-100%)
  const curveHeightPercent = Math.max(15, Math.min(100, curveEndpoint)) / 100
  const curveHeight = Math.round(height * curveHeightPercent)
  const curveY = height - curveHeight  // Curve starts at bottom edge

  // Add padding for labels - no padding when labels are off (edge-to-edge curve)
  const leftPadding = showElevationLabels ? 80 : 0
  const rightPadding = 0
  const bottomPadding = showDistanceLabels ? 70 : 0

  // Create a config for the curve area only
  const curveConfig: ViewBoxConfig = {
    width: width,
    height: curveHeight,
    padding: { top: 20, right: rightPadding, bottom: bottomPadding, left: leftPadding }
  }

  const gpxPoints: GPXPoint[] = data.map((d, i) => ({
    distance: i,
    elevation: d.value
  }))

  const { viewBoxPoints, chartArea } = gpxToViewBox(gpxPoints, curveConfig)

  // Adjust points based on curveEndpoint setting
  const adjustedPoints = adjustCurveEndpoint(viewBoxPoints, chartArea, curveEndpoint)

  // Offset Y coordinates (curve is positioned in lower part of reel)
  const offsetPoints = adjustedPoints.map(p => ({ ...p, y: p.y + curveY }))

  // Adjust chartArea for offset
  const offsetChartArea = { ...chartArea, y: chartArea.y + curveY }

  const linePoints = pointsToPolyline(offsetPoints)
  const areaPath = pointsToAreaPolygon(offsetPoints, offsetChartArea)

  const gradientId = `silhouette-gradient-anim`
  const clipId = `reveal-clip-anim`

  // Calculate clip width based on effective progress
  const clipWidth = chartArea.width * effectiveProgress

  // Marker is always at the tip of the visible curve
  const markerPoint = getMarkerPosition(offsetPoints, effectiveProgress)

  // Calculate clip - start from x=0 to include the full chart area
  const clipX = 0
  const fullClipWidth = chartArea.x + clipWidth

  // Stroke and marker sizes for reel resolution
  const strokeWidth = 6
  const scaledMarkerSize = markerSize * 2
  const markerStrokeWidth = 4

  // Generate elevation labels if enabled
  let elevationLabelsHtml = ''
  if (showElevationLabels) {
    const values = data.map(d => d.value)
    const minElevation = Math.min(...values)
    const maxElevation = Math.max(...values)
    const elevationRange = maxElevation - minElevation

    // Create 5 labels from min to max
    const labelCount = 5
    const fontSize = 24
    const labels: string[] = []

    // Position labels along the curve height
    const labelAreaTop = offsetChartArea.y + 10
    const labelAreaBottom = offsetChartArea.y + offsetChartArea.height - 10
    const labelAreaHeight = labelAreaBottom - labelAreaTop
    const labelX = leftPadding - 10  // Position labels just left of the curve

    for (let i = 0; i < labelCount; i++) {
      const value = Math.round(minElevation + (elevationRange * i) / (labelCount - 1))
      const normalizedY = i / (labelCount - 1)
      const y = labelAreaBottom - (normalizedY * labelAreaHeight)

      labels.push(`
        <text x="${labelX}" y="${y + fontSize / 3}"
              text-anchor="end" font-size="${fontSize}" fill="${elevationLabelColor}"
              font-family="system-ui, sans-serif">${value}m</text>
        <line x1="${labelX + 3}" y1="${y}" x2="${leftPadding}" y2="${y}"
              stroke="${elevationLabelColor}" stroke-width="1" opacity="0.3"/>
      `)
    }

    elevationLabelsHtml = labels.join('')
  }

  // Generate distance labels if enabled
  let distanceLabelsHtml = ''
  if (showDistanceLabels) {
    // Estimate total distance from data length if not provided
    // Try to parse distance from labels (e.g., "5.2km" or "5.2")
    let estimatedTotalKm = totalDistanceKm
    if (!estimatedTotalKm && data.length > 0) {
      // Try to parse the last label as distance
      const lastLabel = data[data.length - 1].label
      const match = lastLabel.match(/^([\d.]+)/)
      if (match) {
        estimatedTotalKm = parseFloat(match[1])
      } else {
        // Fallback: assume 1 point per 100m
        estimatedTotalKm = data.length / 10
      }
    }

    const labelCount = 5
    const fontSize = 28
    const labels: string[] = []

    // Position labels along the bottom of the chart, below the curve
    const labelAreaLeft = offsetChartArea.x
    const labelAreaRight = offsetChartArea.x + offsetChartArea.width
    const labelAreaWidth = labelAreaRight - labelAreaLeft
    // Labels go in the bottom padding area, below the curve
    const curveBottom = offsetChartArea.y + offsetChartArea.height
    const labelY = curveBottom + 50  // 50px below curve bottom

    for (let i = 0; i < labelCount; i++) {
      const distanceKm = estimatedTotalKm ? (estimatedTotalKm * i) / (labelCount - 1) : 0
      const normalizedX = i / (labelCount - 1)
      const x = labelAreaLeft + (normalizedX * labelAreaWidth)

      // Format distance nicely
      const distanceStr = distanceKm < 10
        ? distanceKm.toFixed(1)
        : Math.round(distanceKm).toString()

      // Use different text anchors for edge labels to prevent cutoff
      const textAnchor = i === 0 ? 'start' : (i === labelCount - 1 ? 'end' : 'middle')

      labels.push(`
        <text x="${x}" y="${labelY}"
              text-anchor="${textAnchor}" font-size="${fontSize}" fill="${distanceLabelColor}"
              font-family="system-ui, sans-serif">${distanceStr}km</text>
        <line x1="${x}" y1="${curveBottom}"
              x2="${x}" y2="${curveBottom + 15}"
              stroke="${distanceLabelColor}" stroke-width="2" opacity="0.5"/>
      `)
    }

    distanceLabelsHtml = labels.join('')
  }

  // Generate background based on type
  const bgElements = generateBackgroundElements(
    width,
    height,
    backgroundType,
    backgroundColor,
    gradientColor,
    meshColor1,
    meshColor2,
    meshColor3,
    patternColor,
    patternOpacity,
    imageOptions
  )

  // Generate effort curve if in effort mode
  const isEffortMode = animationMode === 'effort' && effortConfig
  const effortElements = isEffortMode
    ? generateEffortCurve(offsetPoints, data, color, effortConfig)
    : { defs: '', curve: '', glowFilter: '' }

  // Standard curve rendering (with optional area fill)
  const areaFillElement = showAreaFill
    ? `<polygon points="${areaPath}" fill="url(#${gradientId})"/>`
    : ''

  const standardCurve = `
    ${areaFillElement}
    <polyline points="${linePoints}" fill="none" stroke="${color}"
              stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>
  `

  // Choose which curve to render
  const curveContent = isEffortMode
    ? `${areaFillElement}${effortElements.curve}`
    : standardCurve

  // Marker with optional glow in effort mode
  const markerGlow = isEffortMode && effortConfig.glowAura
    ? `filter="url(#${effortElements.glowFilter})"`
    : ''

  // Chart content: labels + clipped curve + marker
  const chartContentHtml = `
    ${elevationLabelsHtml}
    ${distanceLabelsHtml}
    <g clip-path="url(#${clipId})">
      ${curveContent}
    </g>
  `

  // Pan-Zoom: wrap chart content in nested SVG with animated viewBox
  if (panZoomEnabled && panZoomConfig) {
    const camera = calculateCameraViewport(
      effectiveProgress,
      panZoomConfig,
      offsetChartArea,
      markerPoint,
      width,
      height
    )

    // Adjust marker and stroke sizes for zoom (so they appear constant on screen)
    const zoomedMarkerSize = scaledMarkerSize / camera.scale
    const zoomedMarkerStroke = markerStrokeWidth / camera.scale

    return `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs>${bgElements.defs}
          ${effortElements.defs}
          <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:0.5"/>
            <stop offset="100%" style="stop-color:${color};stop-opacity:0.1"/>
          </linearGradient>
          <clipPath id="${clipId}">
            <rect x="${clipX}" y="0" width="${fullClipWidth}" height="${height}"/>
          </clipPath>
        </defs>
        <svg x="0" y="0" width="${width}" height="${height}"
             viewBox="${camera.x} ${camera.y} ${camera.w} ${camera.h}"
             preserveAspectRatio="xMidYMid meet">
          ${bgElements.elements}
          ${chartContentHtml}
          ${showMarker && markerPoint ? `
            <circle ${markerGlow} cx="${markerPoint.x}" cy="${markerPoint.y}" r="${zoomedMarkerSize}"
                    fill="${markerColor}" stroke="${color}" stroke-width="${zoomedMarkerStroke}"/>
          ` : ''}
        </svg>
      </svg>
    `
  }

  // Standard mode: no nested SVG
  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>${bgElements.defs}
        ${effortElements.defs}
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.5"/>
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.1"/>
        </linearGradient>
        <clipPath id="${clipId}">
          <rect x="${clipX}" y="0" width="${fullClipWidth}" height="${height}"/>
        </clipPath>
      </defs>
      ${bgElements.elements}
      ${chartContentHtml}
      ${showMarker && markerPoint ? `
        <circle ${markerGlow} cx="${markerPoint.x}" cy="${markerPoint.y}" r="${scaledMarkerSize}"
                fill="${markerColor}" stroke="${color}" stroke-width="${markerStrokeWidth}"/>
      ` : ''}
    </svg>
  `
}

/**
 * Animated single-series elevation chart
 */
export function generateAnimatedSingleSeries(
  data: Array<{ label: string, value: number }>,
  colors: { primary?: string, secondary?: string, background: string },
  title: string,
  overlays: ChartOptions['statisticalOverlays'],
  styleOverrides: ChartOptions['styleOverrides'],
  progress: number,
  showMarker: boolean,
  markerSize: number,
  markerColor: string
): string {
  const config: ViewBoxConfig = VIEW_BOX_PRESETS.standard
  const { width, height } = config

  const gpxPoints: GPXPoint[] = data.map((d, i) => ({
    distance: i,
    elevation: d.value
  }))

  const { viewBoxPoints, bounds, chartArea } = gpxToViewBox(gpxPoints, config, {
    paddingPercent: 0.1
  })

  const yMin = Math.floor(bounds.minElevation)
  const yMax = Math.ceil(bounds.maxElevation)
  const adjustedRange = yMax - yMin

  const labelInterval = data.length > 20 ? Math.ceil(data.length / 15) : 1

  // Apply x-axis label overrides (read early for fontSize)
  const xAxisOverride = styleOverrides?.xAxis?.labels
  const fontSize = xAxisOverride?.fontSize ?? (data.length > 15 ? 9 : 10)
  const labelColor = xAxisOverride?.color ?? '#4B5563'
  const labelRotation = xAxisOverride?.rotation ?? -45

  const yAxisSteps = 5
  const stepValue = Math.ceil(adjustedRange / yAxisSteps)
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = yMin + i * stepValue
    const normalizedY = (value - yMin) / adjustedRange
    const y = chartArea.y + chartArea.height - normalizedY * chartArea.height
    return { value, y }
  }).filter(item => item.value <= yMax)

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

  const primaryColor = styleOverrides?.series?.['main']?.color ?? colors.primary ?? '#2E7D32'

  const gradientId = `elevation-gradient-anim`
  const clipId = `reveal-clip-anim`

  const linePoints = pointsToPolyline(viewBoxPoints)
  const fullAreaPath = pointsToAreaPolygon(viewBoxPoints, chartArea)

  // Calculate clip width based on progress
  const clipWidth = chartArea.width * progress

  // Find marker position
  const markerPoint = getMarkerPosition(viewBoxPoints, progress)

  // X-axis labels - only show labels up to current progress
  const visibleLabelCount = Math.ceil(data.length * progress)
  const xLabels = data.map((d, i) => {
    if (i >= visibleLabelCount) return ''
    const showLabel = i % labelInterval === 0
    if (!showLabel) return ''

    const x = viewBoxPoints[i].x
    const labelY = chartArea.y + chartArea.height + 15

    return `
      <text id="x-label-${i}" class="editable" data-type="x-label"
            data-index="${i}" data-label="${d.label}" data-editable="true"
            x="${x}" y="${labelY}"
            text-anchor="end" font-size="${fontSize}" fill="${labelColor}"
            transform="rotate(${labelRotation} ${x} ${labelY})">${d.label}</text>
    `
  }).join('')

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

  // Calculate ascent/descent up to current progress
  let totalAscent = 0
  let totalDescent = 0
  const visibleCount = Math.ceil(data.length * progress)
  for (let i = 1; i < visibleCount && i < data.length; i++) {
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
        <clipPath id="${clipId}">
          <rect x="${chartArea.x}" y="0" width="${clipWidth}" height="${height}"/>
        </clipPath>
      </defs>
      <rect id="chart-background" data-type="background" data-editable="true"
            width="${width}" height="${height}" fill="${colors.background}"/>
      <text id="chart-title" class="editable" data-type="title" data-editable="true"
            x="${titleX}" y="${25 + (titleOverride?.offsetY ?? 0)}" text-anchor="${titleAnchor}"
            font-size="${titleFontSize}" font-weight="${titleWeight}" fill="${titleColor}">${titleText}</text>

      <!-- Ascent/Descent info (animated) -->
      <text id="elevation-stats" class="editable" data-type="elevation-stats"
            data-ascent="${totalAscent.toFixed(0)}" data-descent="${totalDescent.toFixed(0)}"
            data-editable="true" x="${chartArea.x}" y="45" font-size="11" fill="#4B5563">
        ↗ ${totalAscent.toFixed(0)} m  ↘ ${totalDescent.toFixed(0)} m
      </text>

      <!-- Y-axis label -->
      <text id="y-axis-title" class="editable" data-type="y-axis" data-editable="true"
            x="15" y="${chartArea.y + chartArea.height / 2}"
            text-anchor="middle" font-size="11" fill="#6B7280"
            transform="rotate(-90 15 ${chartArea.y + chartArea.height / 2})">Höhe (m)</text>

      <!-- X-axis label -->
      <text id="x-axis-title" class="editable" data-type="x-axis" data-editable="true"
            x="${chartArea.x + chartArea.width / 2}" y="${height - 10}"
            text-anchor="middle" font-size="11" fill="#6B7280">Entfernung</text>

      ${yAxis}
      ${statisticalOverlay}

      <!-- Animated elevation curve with clip-path -->
      <g clip-path="url(#${clipId})">
        <polygon id="elevation-area" class="editable" data-type="area" data-series="main" data-editable="true"
                 points="${fullAreaPath}" fill="url(#${gradientId})"/>
        <polyline id="elevation-line" class="editable" data-type="line" data-series="main" data-editable="true"
                  points="${linePoints}" fill="none" stroke="${primaryColor}"
                  stroke-width="2" stroke-linejoin="round"/>
      </g>

      <!-- Marker at current position -->
      ${showMarker && markerPoint ? `
        <circle id="animation-marker" cx="${markerPoint.x}" cy="${markerPoint.y}" r="${markerSize}"
                fill="${markerColor}" stroke="${primaryColor}" stroke-width="2">
          <title>Elevation: ${markerPoint.originalElevation.toFixed(0)}m</title>
        </circle>
      ` : ''}

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
