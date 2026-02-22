/**
 * Combined Frame Generator
 *
 * Renders both the route map (top portion) and elevation chart (bottom portion)
 * into a single 1080×1920 SVG frame. Both views share the same progress value
 * so markers are synchronized.
 */

import type { RoutePoint } from '@chart-generator/shared'
import type { ImageBackgroundOptions } from '@chart-generator/shared'
import type { BackgroundType, PanZoomConfig } from '../elevationChart/types'
import type { RouteLineStyle } from './routeLine'
import type { MapCameraConfig } from './mapCamera'
import { generateBackgroundElements } from '../elevationChart/background'
import { projectRouteToSvg, getProjectionParams } from './projection'
import { generateGeoLayers } from './geoFeatures'
import type { GeoLayerConfig } from './geoFeatures'
import { generateRouteLine, generateRouteMarker, DEFAULT_ROUTE_LINE_STYLE, elevationToColor } from './routeLine'
import { calculateMapCameraViewport, DEFAULT_MAP_CAMERA_CONFIG } from './mapCamera'
import { getMarkerPosition } from '../elevationChart/animation'
import {
  gpxToViewBox,
  pointsToPolyline,
  pointsToAreaPolygon,
  type GPXPoint,
  type ViewBoxConfig,
  type ViewBoxPoint,
} from '../../coordinateContract'
import { remapProgressByTime, remapProgressDirect, buildGradientTimeArray } from '../../timeMapping'

/** Options for the combined frame */
export interface CombinedFrameOptions {
  // Data
  routePoints: RoutePoint[]
  chartData: Array<{ label: string; value: number }>
  progress: number                     // 0-1, drives both map and elevation

  // Layout
  width: number                        // SVG width (default 1080)
  height: number                       // SVG height (default 1920)
  mapHeightRatio: number               // 0.4-0.8, default 0.6

  // Background (shared for entire frame)
  backgroundColor: string
  backgroundType: BackgroundType
  gradientColor?: string
  meshColor1?: string
  meshColor2?: string
  meshColor3?: string
  patternColor?: string
  patternOpacity?: number
  imageOptions?: ImageBackgroundOptions

  // Map section
  mapCameraMode: 'overview' | 'chase'
  mapCameraConfig: MapCameraConfig
  routeStyle: RouteLineStyle
  showMapMarker: boolean
  mapMarkerSize: number
  mapMarkerColor: string
  showDirection: boolean
  showDistanceMarkers?: boolean
  distanceMarkerInterval?: number
  showStartEndLabels?: boolean

  // Elevation section
  curveColor: string
  /** Color the elevation curve by height (same scale as route) */
  elevationCurveColoring?: boolean
  /** Intensity for elevation curve coloring (1-8, reuses route scale) */
  elevationColorIntensity?: number
  showElevationMarker: boolean
  elevationMarkerSize: number
  elevationMarkerColor: string
  showAreaFill: boolean
  showElevationLabels?: boolean
  elevationLabelColor?: string
  showDistanceLabels?: boolean
  distanceLabelColor?: string
  totalDistanceKm?: number

  // Animation mode
  animationMode?: 'uniform' | 'time-based' | 'gradient' | 'effort'
  timeArray?: number[]
  gradientSensitivity?: number

  // Pan-zoom for elevation section
  elevationPanZoomEnabled?: boolean
  elevationPanZoomConfig?: PanZoomConfig

  // Divider
  showDivider?: boolean
  dividerColor?: string
  dividerWidth?: number

  // Overall opacity (for fade transitions)
  sceneOpacity?: number

  // Geographic context layers (borders, rivers, cities)
  geoLayers?: GeoLayerConfig

  // Pre-rendered contour lines SVG (generated async from terrain tiles)
  contourLayerSvg?: string

  // Pre-rendered river SVG (generated async from OpenFreeMap vector tiles)
  riverLayerSvg?: string

  // Pre-rendered peak layer (async, from Overpass API)
  peakLayerSvg?: string

  // Title overlay (rendered on top of everything)
  titleOverlay?: {
    text: string
    opacity: number    // 0-1, controlled by getTitleCardOpacity()
    color: string
  }
}

export const DEFAULT_COMBINED_FRAME_OPTIONS: Partial<CombinedFrameOptions> = {
  width: 1080,
  height: 1920,
  mapHeightRatio: 0.6,
  backgroundColor: '#1a1a2e',
  backgroundType: 'solid',
  mapCameraMode: 'overview',
  mapCameraConfig: DEFAULT_MAP_CAMERA_CONFIG,
  routeStyle: DEFAULT_ROUTE_LINE_STYLE,
  showMapMarker: true,
  mapMarkerSize: 8,
  mapMarkerColor: '#ffffff',
  showDirection: true,
  curveColor: '#ffffff',
  showElevationMarker: true,
  elevationMarkerSize: 6,
  elevationMarkerColor: '#ffffff',
  showAreaFill: true,
  animationMode: 'uniform',
  showDivider: false,
  dividerColor: '#ffffff33',
  dividerWidth: 2,
}

/**
 * Generate distance markers along the map route at regular intervals.
 */
function generateMapDistanceMarkers(
  points: Array<{ x: number; y: number; distance: number }>,
  intervalKm: number,
  color: string,
  fontSize: number,
): string {
  if (points.length < 2 || intervalKm <= 0) return ''

  const totalDist = points[points.length - 1].distance
  const markers: string[] = []

  for (let km = intervalKm; km < totalDist; km += intervalKm) {
    let i = 0
    while (i < points.length - 1 && points[i + 1].distance < km) i++
    if (i >= points.length - 1) break

    const a = points[i]
    const b = points[i + 1]
    const t = (km - a.distance) / (b.distance - a.distance || 1)
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t

    markers.push(`
      <circle cx="${x}" cy="${y}" r="3" fill="${color}" opacity="0.6"/>
      <text x="${x}" y="${y - 8}" fill="${color}" font-size="${fontSize}" font-family="sans-serif"
            text-anchor="middle" opacity="0.6">${km} km</text>
    `)
  }

  return markers.join('\n')
}

/**
 * Generate start/end labels for the map route.
 */
function generateMapStartEndLabels(
  points: Array<{ x: number; y: number }>,
  color: string,
  fontSize: number,
): string {
  if (points.length < 2) return ''

  const start = points[0]
  const end = points[points.length - 1]

  return `
    <circle cx="${start.x}" cy="${start.y}" r="5" fill="#00cc66" stroke="${color}" stroke-width="2"/>
    <text x="${start.x}" y="${start.y - 12}" fill="${color}" font-size="${fontSize}" font-family="sans-serif"
          text-anchor="middle" font-weight="bold">Start</text>
    <circle cx="${end.x}" cy="${end.y}" r="5" fill="#ff4444" stroke="${color}" stroke-width="2"/>
    <text x="${end.x}" y="${end.y - 12}" fill="${color}" font-size="${fontSize}" font-family="sans-serif"
          text-anchor="middle" font-weight="bold">Ziel</text>
  `
}

/**
 * Generate elevation labels for the curve section.
 */
function generateElevationLabels(
  data: Array<{ value: number }>,
  chartArea: { x: number; y: number; width: number; height: number },
  leftPadding: number,
  color: string,
): string {
  const values = data.map(d => d.value)
  const minElev = Math.min(...values)
  const maxElev = Math.max(...values)
  const range = maxElev - minElev

  const labelCount = 5
  const fontSize = 22
  const labels: string[] = []

  const labelAreaTop = chartArea.y + 10
  const labelAreaBottom = chartArea.y + chartArea.height - 10
  const labelAreaHeight = labelAreaBottom - labelAreaTop
  const labelX = leftPadding - 10

  for (let i = 0; i < labelCount; i++) {
    const value = Math.round(minElev + (range * i) / (labelCount - 1))
    const normalizedY = i / (labelCount - 1)
    const y = labelAreaBottom - normalizedY * labelAreaHeight

    labels.push(`
      <text x="${labelX}" y="${y + fontSize / 3}"
            text-anchor="end" font-size="${fontSize}" fill="${color}"
            font-family="system-ui, sans-serif">${value}m</text>
      <line x1="${labelX + 3}" y1="${y}" x2="${leftPadding}" y2="${y}"
            stroke="${color}" stroke-width="1" opacity="0.3"/>
    `)
  }

  return labels.join('')
}

/**
 * Generate distance labels for the elevation section.
 */
function generateCurveDistanceLabels(
  data: Array<{ label: string; value: number }>,
  chartArea: { x: number; y: number; width: number; height: number },
  totalDistanceKm: number | undefined,
  color: string,
): string {
  let totalKm = totalDistanceKm
  if (!totalKm && data.length > 0) {
    const lastLabel = data[data.length - 1].label
    const match = lastLabel.match(/^([\d.]+)/)
    totalKm = match ? parseFloat(match[1]) : data.length / 10
  }

  const labelCount = 5
  const fontSize = 24
  const labels: string[] = []

  const labelAreaLeft = chartArea.x
  const labelAreaWidth = chartArea.width
  const curveBottom = chartArea.y + chartArea.height
  const labelY = curveBottom + 45

  for (let i = 0; i < labelCount; i++) {
    const distKm = totalKm ? (totalKm * i) / (labelCount - 1) : 0
    const normalizedX = i / (labelCount - 1)
    const x = labelAreaLeft + normalizedX * labelAreaWidth

    const distStr = distKm < 10 ? distKm.toFixed(1) : Math.round(distKm).toString()
    const textAnchor = i === 0 ? 'start' : i === labelCount - 1 ? 'end' : 'middle'

    labels.push(`
      <text x="${x}" y="${labelY}"
            text-anchor="${textAnchor}" font-size="${fontSize}" fill="${color}"
            font-family="system-ui, sans-serif">${distStr}km</text>
      <line x1="${x}" y1="${curveBottom}" x2="${x}" y2="${curveBottom + 12}"
            stroke="${color}" stroke-width="2" opacity="0.5"/>
    `)
  }

  return labels.join('')
}

/**
 * Generate elevation-colored segments for the elevation curve line.
 * Each segment gets its color based on average elevation of endpoints.
 */
function generateColoredElevationLine(
  points: ViewBoxPoint[],
  intensity: number,
  strokeWidth: number,
): string {
  if (points.length < 2) return ''

  const elevations = points.map(p => p.originalElevation)
  const minElev = Math.min(...elevations)
  const maxElev = Math.max(...elevations)
  const range = maxElev - minElev

  const segments: string[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const avgElev = (p1.originalElevation + p2.originalElevation) / 2
    const normalizedElev = range > 0 ? (avgElev - minElev) / range : 0.5
    const color = elevationToColor(normalizedElev, intensity)

    segments.push(
      `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
    )
  }

  return segments.join('\n')
}

/**
 * Generate elevation-colored area fill for the elevation curve.
 * Each vertical strip gets its color based on average elevation.
 */
function generateColoredElevationArea(
  points: ViewBoxPoint[],
  chartArea: { x: number; y: number; width: number; height: number },
  intensity: number,
): string {
  if (points.length < 2) return ''

  const elevations = points.map(p => p.originalElevation)
  const minElev = Math.min(...elevations)
  const maxElev = Math.max(...elevations)
  const range = maxElev - minElev
  const bottom = chartArea.y + chartArea.height

  const strips: string[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const avgElev = (p1.originalElevation + p2.originalElevation) / 2
    const normalizedElev = range > 0 ? (avgElev - minElev) / range : 0.5
    const color = elevationToColor(normalizedElev, intensity)

    // Vertical strip from curve to bottom
    const polyPoints = `${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p2.x.toFixed(1)},${bottom.toFixed(1)} ${p1.x.toFixed(1)},${bottom.toFixed(1)}`
    strips.push(
      `<polygon points="${polyPoints}" fill="${color}" opacity="0.35"/>`
    )
  }

  return strips.join('\n')
}

/**
 * Generate a combined frame with map (top) and elevation chart (bottom).
 *
 * Both views are synchronized via a shared progress value (0-1).
 * The frame uses a single shared background.
 */
export function generateCombinedFrame(options: CombinedFrameOptions): string {
  const {
    routePoints,
    chartData,
    progress,
    width,
    height,
    mapHeightRatio,
    // Background
    backgroundColor,
    backgroundType,
    gradientColor = '#1a1a2e',
    meshColor1 = '#0f3460',
    meshColor2 = '#16213e',
    meshColor3 = '#1a1a2e',
    patternColor = '#ffffff',
    patternOpacity = 0.1,
    imageOptions,
    // Map
    mapCameraMode,
    mapCameraConfig,
    routeStyle,
    showMapMarker,
    mapMarkerSize,
    mapMarkerColor,
    showDirection,
    showDistanceMarkers = false,
    distanceMarkerInterval = 5,
    showStartEndLabels = false,
    // Elevation
    curveColor,
    elevationCurveColoring = false,
    elevationColorIntensity = 5,
    showElevationMarker,
    elevationMarkerSize,
    elevationMarkerColor,
    showAreaFill,
    showElevationLabels = false,
    elevationLabelColor = '#ffffffb3',
    showDistanceLabels = false,
    distanceLabelColor = '#ffffffb3',
    totalDistanceKm,
    // Animation
    animationMode = 'uniform',
    timeArray,
    gradientSensitivity = 3,
    // Divider
    showDivider = false,
    dividerColor = '#ffffff33',
    dividerWidth = 2,
    // Opacity
    sceneOpacity,
    // Geo context
    geoLayers,
    contourLayerSvg,
    riverLayerSvg,
    peakLayerSvg,
    // Title
    titleOverlay,
  } = options

  // Layout split
  const mapHeight = Math.round(height * mapHeightRatio)
  const elevHeight = height - mapHeight

  // Remap progress based on animation mode
  let effectiveProgress: number
  if (animationMode === 'time-based' && timeArray && timeArray.length > 0) {
    effectiveProgress = remapProgressByTime(progress, timeArray)
  } else if (animationMode === 'gradient' && chartData.length > 2) {
    const elevations = chartData.map(d => d.value)
    const gradientArray = buildGradientTimeArray(elevations, gradientSensitivity)
    effectiveProgress = remapProgressDirect(progress, gradientArray)
  } else {
    effectiveProgress = progress
  }

  // ── Shared Background ──
  const bg = generateBackgroundElements(
    width, height, backgroundType, backgroundColor,
    gradientColor, meshColor1, meshColor2, meshColor3,
    patternColor, patternOpacity, imageOptions,
  )

  // ── Map Section (top) ──
  let mapContent = ''
  let mapDefs = ''

  if (routePoints.length >= 2) {
    const mapConfig = {
      width,
      height: mapHeight,
      padding: { top: 50, right: 50, bottom: 50, left: 50 },
    }
    const { mapPoints, bounds: routeBounds, chartArea: mapChartArea } = projectRouteToSvg(routePoints, mapConfig)

    // Geographic context layers (borders, rivers, cities)
    const projParams = getProjectionParams(routeBounds, mapConfig)
    const geoLayersHtml = geoLayers
      ? generateGeoLayers(routeBounds, projParams, geoLayers, width, mapHeight, mapPoints)
      : ''

    const camera = calculateMapCameraViewport(
      effectiveProgress, mapCameraMode, mapCameraConfig,
      mapPoints, mapChartArea, width, mapHeight,
    )

    const routeLine = generateRouteLine(mapPoints, effectiveProgress, routeStyle, width, mapHeight)
    const marker = showMapMarker
      ? generateRouteMarker(mapPoints, effectiveProgress, mapMarkerSize, mapMarkerColor, routeStyle.color, showDirection)
      : ''

    const distLabels = showDistanceMarkers
      ? generateMapDistanceMarkers(mapPoints, distanceMarkerInterval, mapMarkerColor, 14)
      : ''
    const startEnd = showStartEndLabels
      ? generateMapStartEndLabels(mapPoints, mapMarkerColor, 14)
      : ''

    mapDefs = routeLine.defs

    // Wrap geo/contour layers in a clipping container — coordinates extend far
    // beyond the viewport since 110m data covers a wide area
    const contourHtml = contourLayerSvg || ''
    const riverHtml = riverLayerSvg || ''
    const peakHtml = peakLayerSvg || ''
    const allGeoHtml = contourHtml + riverHtml + geoLayersHtml + peakHtml
    const geoClipped = allGeoHtml
      ? `<svg x="0" y="0" width="${width}" height="${mapHeight}" overflow="hidden">${allGeoHtml}</svg>`
      : ''

    const mapInnerContent = `
      ${geoClipped}
      ${routeLine.elements}
      ${distLabels}
      ${startEnd}
      ${marker}
    `

    if (mapCameraMode === 'chase') {
      // Background route (faint, full) — not affected by chase zoom
      const bgRoute = generateRouteLine(
        mapPoints, 1,
        { ...routeStyle, opacity: 0.15, width: routeStyle.width * 0.5, glow: false, trailOpacity: 0, trailDash: undefined },
        width, mapHeight,
      )

      mapContent = `
        <g>
          ${bgRoute.elements}
          <svg x="0" y="0" width="${width}" height="${mapHeight}"
               viewBox="${camera.x.toFixed(1)} ${camera.y.toFixed(1)} ${camera.w.toFixed(1)} ${camera.h.toFixed(1)}"
               preserveAspectRatio="xMidYMid slice">
            ${mapInnerContent}
          </svg>
        </g>
      `
    } else {
      // Overview: direct rendering
      mapContent = `
        <g>
          ${mapInnerContent}
        </g>
      `
    }
  }

  // ── Elevation Section (bottom) ──
  let elevContent = ''
  let elevDefs = ''

  if (chartData.length > 0) {
    const leftPadding = showElevationLabels ? 70 : 0
    const bottomPadding = showDistanceLabels ? 60 : 0

    const curveConfig: ViewBoxConfig = {
      width,
      height: elevHeight,
      padding: { top: 20, right: 0, bottom: bottomPadding, left: leftPadding },
    }

    const gpxPoints: GPXPoint[] = chartData.map((d, i) => ({
      distance: i,
      elevation: d.value,
    }))

    const { viewBoxPoints, chartArea: elevChartArea } = gpxToViewBox(gpxPoints, curveConfig)

    // Offset Y coordinates to position in the bottom portion
    const offsetPoints = viewBoxPoints.map(p => ({ ...p, y: p.y + mapHeight }))
    const offsetChartArea = { ...elevChartArea, y: elevChartArea.y + mapHeight }

    const linePoints = pointsToPolyline(offsetPoints)
    const areaPath = pointsToAreaPolygon(offsetPoints, offsetChartArea)

    const elevGradientId = 'combined-elev-gradient'
    const elevClipId = 'combined-elev-clip'

    const clipWidth = elevChartArea.width * effectiveProgress
    const fullClipWidth = elevChartArea.x + clipWidth

    const markerPoint = getMarkerPosition(offsetPoints, effectiveProgress)

    const strokeWidth = 5
    const scaledMarkerSize = elevationMarkerSize * 2
    const markerStrokeWidth = 3

    const gradientDef = (showAreaFill && !elevationCurveColoring)
      ? `<linearGradient id="${elevGradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${curveColor};stop-opacity:0.5"/>
          <stop offset="100%" style="stop-color:${curveColor};stop-opacity:0.1"/>
        </linearGradient>`
      : ''

    elevDefs = `
      ${gradientDef}
      <clipPath id="${elevClipId}">
        <rect x="0" y="${mapHeight}" width="${fullClipWidth}" height="${elevHeight}"/>
      </clipPath>
    `

    // Labels
    const elevLabelsHtml = showElevationLabels
      ? generateElevationLabels(chartData, offsetChartArea, leftPadding, elevationLabelColor)
      : ''
    const distLabelsHtml = showDistanceLabels
      ? generateCurveDistanceLabels(chartData, offsetChartArea, totalDistanceKm, distanceLabelColor)
      : ''

    // Curve rendering: colored segments or standard monochrome
    let curveElements: string
    if (elevationCurveColoring) {
      const coloredArea = showAreaFill
        ? generateColoredElevationArea(offsetPoints, offsetChartArea, elevationColorIntensity)
        : ''
      const coloredLine = generateColoredElevationLine(offsetPoints, elevationColorIntensity, strokeWidth)
      curveElements = `${coloredArea}\n${coloredLine}`
    } else {
      const areaFillElement = showAreaFill
        ? `<polygon points="${areaPath}" fill="url(#${elevGradientId})"/>`
        : ''
      curveElements = `${areaFillElement}
        <polyline points="${linePoints}" fill="none" stroke="${curveColor}"
                  stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`
    }

    elevContent = `
      ${elevLabelsHtml}
      ${distLabelsHtml}
      <g clip-path="url(#${elevClipId})">
        ${curveElements}
      </g>
      ${showElevationMarker && markerPoint ? `
        <circle cx="${markerPoint.x}" cy="${markerPoint.y}" r="${scaledMarkerSize}"
                fill="${elevationMarkerColor}" stroke="${curveColor}" stroke-width="${markerStrokeWidth}"/>
      ` : ''}
    `
  }

  // ── Divider ──
  const dividerHtml = showDivider
    ? `<line x1="0" y1="${mapHeight}" x2="${width}" y2="${mapHeight}"
            stroke="${dividerColor}" stroke-width="${dividerWidth}"/>`
    : ''

  // ── Title Overlay ──
  let titleHtml = ''
  if (titleOverlay && titleOverlay.text && titleOverlay.opacity > 0) {
    const fontSize = Math.min(Math.round(width * 0.06), 72)
    const escapedText = titleOverlay.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    titleHtml = `
      <text
        x="${width / 2}" y="${height / 2}"
        text-anchor="middle" dominant-baseline="central"
        font-size="${fontSize}" font-weight="bold"
        fill="${titleOverlay.color}"
        opacity="${titleOverlay.opacity.toFixed(2)}"
        font-family="system-ui, -apple-system, sans-serif"
      >${escapedText}</text>
    `
  }

  // ── Compose ──
  const allDefs = [bg.defs, mapDefs, elevDefs].filter(Boolean).join('\n')
  const hasSceneOpacity = sceneOpacity != null && sceneOpacity < 1

  const opacityOpen = hasSceneOpacity ? `<g opacity="${sceneOpacity.toFixed(2)}">` : ''
  const opacityClose = hasSceneOpacity ? '</g>' : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    ${allDefs ? `<defs>${allDefs}</defs>` : ''}
    ${opacityOpen}
    ${bg.elements}
    ${mapContent}
    ${elevContent}
    ${dividerHtml}
    ${opacityClose}
    ${titleHtml}
  </svg>`
}
