/**
 * Combined Frame Generator
 *
 * Renders both the route map (top portion) and elevation chart (bottom portion)
 * into a single 1080×1920 SVG frame. Both views share the same progress value
 * so markers are synchronized.
 */

import type { RoutePoint } from '@chart-generator/shared'
import type { ImageBackgroundOptions } from '@chart-generator/shared'
import type { Annotation, BackgroundType, PanZoomConfig } from '../elevationChart/types'
import type { RouteLineStyle } from './routeLine'
import type { MapCameraConfig } from './mapCamera'
import { generateBackgroundElements } from '../elevationChart/background'
import { projectRouteToSvg, getProjectionParams } from './projection'
import type { RouteBounds } from './projection'
import { generateGeoLayers } from './geoFeatures'
import type { GeoLayerConfig } from './geoFeatures'
import { generateRouteLine, generateRouteMarker, DEFAULT_ROUTE_LINE_STYLE, elevationToColor } from './routeLine'
import { calculateMapCameraViewport, DEFAULT_MAP_CAMERA_CONFIG } from './mapCamera'
import { getMarkerPosition } from '../elevationChart/animation'
import {
  gpxToViewBox,
  pointsToSmoothPath,
  pointsToSmoothAreaPath,
  smoothViewBoxPointsY,
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

  // Privacy — trim route start/end by distance to hide home address
  anonymizeStart?: boolean
  anonymizeEnd?: boolean
  anonymizeRadiusM?: number            // meters to hide (default 300)

  // Layout
  width: number                        // SVG width (default 1080)
  height: number                       // SVG height (default 1920)
  mapHeightRatio: number               // 0.4-0.8, default 0.6
  showElevationChart: boolean          // show/hide elevation curve section

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
  showMarkerPulse?: boolean
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

  // Separate clip progress for the elevation curve reveal (default: same as progress).
  // Set to 1 to always show the full curve while the marker still tracks progress.
  elevationClipProgress?: number

  // Geographic context layers (borders, rivers, cities)
  geoLayers?: GeoLayerConfig

  // Pre-rendered contour lines SVG (generated async from terrain tiles)
  contourLayerSvg?: string

  // Pre-rendered river SVG (generated async from OpenFreeMap vector tiles)
  riverLayerSvg?: string

  // Pre-rendered peak layer (async, from Overpass API)
  peakLayerSvg?: string

  // Pre-rendered place boundary layer (async, from Overpass API)
  placeBoundaryLayerSvg?: string

  // Pre-rendered satellite imagery (async, from Esri World Imagery tiles)
  satelliteLayerSvg?: string

  // Pre-rendered hillshade (async, from terrain tiles)
  hillshadeLayerSvg?: string

  // Pre-rendered forest layer (async, from Overpass API)
  forestLayerSvg?: string

  // Pre-rendered vineyard & orchard layer (async, from Overpass API)
  vineyardLayerSvg?: string

  // Pre-rendered meadow & farmland layer (async, from Overpass API)
  meadowLayerSvg?: string

  // Pre-rendered water body layer (async, from Overpass API)
  waterLayerSvg?: string

  // Pre-rendered land cover layer: glaciers + urban areas (async, from Overpass API)
  landCoverLayerSvg?: string

  // Pre-rendered road layer (async, from Overpass API)
  roadLayerSvg?: string

  // Map visual enhancements
  showNorthArrow?: boolean
  showScaleBar?: boolean
  showMapFade?: boolean

  // Title overlay (rendered on top of everything)
  titleOverlay?: {
    text: string
    opacity: number    // 0-1, controlled by getTitleCardOpacity()
    color: string
  }

  // Outro/intro stats card overlay (full-screen summary)
  outroOverlay?: {
    title?: string
    totalDistance: number
    totalElevGain: number
    totalElevLoss: number
    totalTimeMs: number | null
    opacity: number   // 0-1
    color: string
  }

  // Weather overlay (temperature + condition chip)
  weatherOverlay?: {
    temp: string        // e.g. "18°C"
    condition: string   // e.g. "☀️ Sonnig"
    color: string       // text/icon color
    opacity: number     // 0-1
    x?: number          // 0-1 normalized horizontal position
    y?: number          // 0-1 normalized vertical position
  }

  // Stats overlay (distance, elevation gain, current elevation, time)
  showStatsOverlay?: boolean
  statsOverlayColor?: string
  statsX?: number   // 0-1, normalized horizontal position (0=left, 1=right)
  statsY?: number   // 0-1, normalized vertical position within map area (0=top, 1=bottom)
  annotations?: Annotation[]   // Text chips shown at specific progress points

  // Per-km label offsets (dx/dy in SVG coords from the route anchor point)
  kmLabelOffsets?: Record<number, { dx: number; dy: number }>

  // Per-annotation chip positions (absolute SVG x/y for the chip center)
  annotationPositions?: Record<string, { x: number; y: number }>

  // Show all enabled annotations regardless of progress (for live preview/editing).
  // When false/undefined only triggered annotations are shown (correct for export).
  showAllAnnotations?: boolean
}

export const DEFAULT_COMBINED_FRAME_OPTIONS: Partial<CombinedFrameOptions> = {
  width: 1080,
  height: 1920,
  mapHeightRatio: 0.6,
  showElevationChart: true,
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
  showNorthArrow: true,
  showScaleBar: true,
  showMapFade: true,
}

/** Stores the SVG dot-anchor position for each km value after the last render. */
let _lastKmAnchorPositions: Record<number, { x: number; y: number }> = {}

/** Returns anchor positions (the route dots) for each km label from the last frame render. */
export function getLastKmAnchorPositions(): Record<number, { x: number; y: number }> {
  return _lastKmAnchorPositions
}

/** Stores the rendered chip center (x, y) for each annotation id after the last render. */
let _lastAnnotationChipPositions: Record<string, { x: number; y: number }> = {}

/** Returns chip center positions for rendered annotations from the last frame render. */
export function getLastAnnotationChipPositions(): Record<string, { x: number; y: number }> {
  return _lastAnnotationChipPositions
}

/**
 * Generate distance markers along the map route at regular intervals.
 */
function generateMapDistanceMarkers(
  points: Array<{ x: number; y: number; distance: number }>,
  intervalKm: number,
  color: string,
  fontSize: number,
  svgWidth: number,
  svgHeight: number,
  kmLabelOffsets?: Record<number, { dx: number; dy: number }>,
): string {
  _lastKmAnchorPositions = {}
  if (points.length < 2 || intervalKm <= 0) return ''

  const totalDist = points[points.length - 1].distance
  const markers: string[] = []

  // Pre-compute label dimensions
  const charWidth = fontSize * 0.6
  const padX = fontSize * 0.5
  const padY = fontSize * 0.35
  const labelH = fontSize + padY * 2
  const rx = fontSize * 0.35

  // Track placed label bounding boxes and leader lines for collision detection
  const placedBoxes: Array<{ x: number; y: number; w: number; h: number }> = []
  const placedLeaders: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const margin = fontSize * 0.5

  function segsCross(
    p1x: number, p1y: number, p2x: number, p2y: number,
    q1x: number, q1y: number, q2x: number, q2y: number,
  ): boolean {
    const cross = (ax: number, ay: number, bx: number, by: number, qx: number, qy: number) =>
      (bx - ax) * (qy - ay) - (by - ay) * (qx - ax)
    const d1 = cross(q1x, q1y, q2x, q2y, p1x, p1y)
    const d2 = cross(q1x, q1y, q2x, q2y, p2x, p2y)
    const d3 = cross(p1x, p1y, p2x, p2y, q1x, q1y)
    const d4 = cross(p1x, p1y, p2x, p2y, q2x, q2y)
    return d1 * d2 < 0 && d3 * d4 < 0
  }

  function segmentIntersectsRect(
    ax: number, ay: number, bx: number, by: number,
    lx: number, ly: number, lw: number, lh: number,
  ): boolean {
    const x0 = lx - margin, y0 = ly - margin
    const x1 = lx + lw + margin, y1 = ly + lh + margin
    if (ax >= x0 && ax <= x1 && ay >= y0 && ay <= y1) return true
    if (bx >= x0 && bx <= x1 && by >= y0 && by <= y1) return true
    return (
      segsCross(ax, ay, bx, by, x0, y0, x1, y0) ||
      segsCross(ax, ay, bx, by, x1, y0, x1, y1) ||
      segsCross(ax, ay, bx, by, x1, y1, x0, y1) ||
      segsCross(ax, ay, bx, by, x0, y1, x0, y0)
    )
  }

  function routeIntersectsRect(lx: number, ly: number, lw: number, lh: number): boolean {
    for (let j = 0; j < points.length - 1; j++) {
      if (segmentIntersectsRect(points[j].x, points[j].y, points[j+1].x, points[j+1].y, lx, ly, lw, lh))
        return true
    }
    return false
  }

  /** Check if leader line (anchorX,anchorY)→(cx,cy) crosses any route segment.
   *  Skips segments adjacent to the anchor index to avoid false positives. */
  function leaderIntersectsRoute(
    anchorX: number, anchorY: number, cx: number, cy: number, anchorIdx: number,
  ): boolean {
    for (let j = 0; j < points.length - 1; j++) {
      if (j === anchorIdx - 1 || j === anchorIdx) continue  // adjacent segments
      if (segsCross(anchorX, anchorY, cx, cy, points[j].x, points[j].y, points[j+1].x, points[j+1].y))
        return true
    }
    return false
  }

  function overlapsAny(
    lx: number, ly: number, lw: number, lh: number,
    anchorX: number, anchorY: number, cx: number, cy: number, anchorIdx: number,
  ): boolean {
    if (lx < 0 || ly < 0 || lx + lw > svgWidth || ly + lh > svgHeight) return true
    if (routeIntersectsRect(lx, ly, lw, lh)) return true
    if (leaderIntersectsRoute(anchorX, anchorY, cx, cy, anchorIdx)) return true
    // Label box vs already-placed leader lines
    if (placedLeaders.some(l => segmentIntersectsRect(l.x1, l.y1, l.x2, l.y2, lx, ly, lw, lh)))
      return true
    // New leader line vs already-placed label boxes
    if (placedBoxes.some(b => segmentIntersectsRect(anchorX, anchorY, cx, cy, b.x, b.y, b.w, b.h)))
      return true
    // New leader line vs already-placed leader lines
    if (placedLeaders.some(l => segsCross(anchorX, anchorY, cx, cy, l.x1, l.y1, l.x2, l.y2)))
      return true
    // Label box vs other label boxes
    return placedBoxes.some(
      b =>
        lx < b.x + b.w + margin &&
        lx + lw > b.x - margin &&
        ly < b.y + b.h + margin &&
        ly + lh > b.y - margin,
    )
  }

  for (let km = intervalKm; km < totalDist; km += intervalKm) {
    let i = 0
    while (i < points.length - 1 && points[i + 1].distance < km) i++
    if (i >= points.length - 1) break

    const a = points[i]
    const b = points[i + 1]
    const t = (km - a.distance) / (b.distance - a.distance || 1)
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t

    // Unit normal perpendicular to route tangent
    const dx = b.x - a.x
    const dy = b.y - a.y
    const segLen = Math.sqrt(dx * dx + dy * dy) || 1
    let nx = -dy / segLen
    let ny = dx / segLen
    if (ny > 0) { nx = -nx; ny = -ny }  // prefer upward side

    const label = `${km} km`
    const labelW = label.length * charWidth + padX * 2

    // Store anchor position (the route dot) so drag code can use it
    _lastKmAnchorPositions[km] = { x, y }

    let finalCx: number
    let finalCy: number
    let placed = false

    const customOffset = kmLabelOffsets?.[km]
    if (customOffset) {
      // Use user-specified offset directly — skip collision detection
      finalCx = x + customOffset.dx
      finalCy = y + customOffset.dy
      placed = true
      const lx = finalCx - labelW / 2
      const ly = finalCy - labelH / 2
      placedBoxes.push({ x: lx, y: ly, w: labelW, h: labelH })
      placedLeaders.push({ x1: x, y1: y, x2: finalCx, y2: finalCy })
    } else {
      finalCx = x
      finalCy = y

      // Build candidate angles: start with perpendicular normals, then sweep all 16 directions
      const baseAngle = Math.atan2(ny, nx)
      const candidateAngles: number[] = []
      // First: perpendicular sides (preferred — shortest leader)
      candidateAngles.push(baseAngle, baseAngle + Math.PI)
      // Then: all 16 directions in order of angular distance from preferred normal
      for (let deg = 22.5; deg < 180; deg += 22.5) {
        const rad = deg * (Math.PI / 180)
        candidateAngles.push(baseAngle + rad, baseAngle - rad)
      }

      outer: for (let step = 3; step <= 12; step++) {
        const offsetDist = fontSize * step
        for (const angle of candidateAngles) {
          const cx = x + Math.cos(angle) * offsetDist
          const cy = y + Math.sin(angle) * offsetDist
          const lx = cx - labelW / 2
          const ly = cy - labelH / 2
          if (!overlapsAny(lx, ly, labelW, labelH, x, y, cx, cy, i)) {
            finalCx = cx
            finalCy = cy
            placedBoxes.push({ x: lx, y: ly, w: labelW, h: labelH })
            placedLeaders.push({ x1: x, y1: y, x2: cx, y2: cy })
            placed = true
            break outer
          }
        }
      }
    }

    if (!placed) continue  // skip only if truly no valid position exists

    const labelX = finalCx - labelW / 2
    const labelY = finalCy - labelH / 2

    markers.push(`
      <circle cx="${x}" cy="${y}" r="${fontSize * 0.32}" fill="${color}" opacity="0.9"/>
      <line x1="${x}" y1="${y}" x2="${finalCx}" y2="${finalCy}"
            stroke="${color}" stroke-width="2" opacity="0.55"/>
      <rect x="${labelX}" y="${labelY}" width="${labelW}" height="${labelH}" rx="${rx}"
            fill="rgba(0,0,0,0.70)" stroke="${color}" stroke-width="1.5" opacity="0.95"
            data-km-value="${km}" style="cursor:grab"/>
      <text x="${finalCx}" y="${labelY + labelH - padY}" fill="${color}" font-size="${fontSize}"
            font-family="sans-serif" text-anchor="middle" opacity="1"
            data-km-value="${km}" style="cursor:grab">${label}</text>
      <rect x="${labelX - 8}" y="${labelY - 8}" width="${labelW + 16}" height="${labelH + 16}"
            fill="transparent" pointer-events="all"
            data-km-value="${km}" style="cursor:grab"/>
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
 * Calculate current stats at a given animation progress.
 */
function calculateCurrentStats(
  routePoints: RoutePoint[],
  chartData: Array<{ value: number }>,
  effectiveProgress: number,
): { distance: number; elevGain: number; currentElev: number; elapsedMs: number | null } {
  if (routePoints.length === 0 || chartData.length === 0) {
    return { distance: 0, elevGain: 0, currentElev: 0, elapsedMs: null }
  }

  // Distance + time: interpolate from routePoints
  const rpIdx = effectiveProgress * (routePoints.length - 1)
  const rpI = Math.min(Math.floor(rpIdx), routePoints.length - 2)
  const rpFrac = rpIdx - rpI
  const distance = routePoints[rpI].distance + (routePoints[rpI + 1].distance - routePoints[rpI].distance) * rpFrac

  // Elapsed GPS time — use routePoints[i].time (ms since start) if present
  let elapsedMs: number | null = null
  const t0 = routePoints[rpI].time
  const t1 = routePoints[rpI + 1].time
  if (t0 != null && t1 != null) {
    elapsedMs = t0 + (t1 - t0) * rpFrac
  }

  // Current elevation: interpolate from chartData
  const cdIdx = effectiveProgress * (chartData.length - 1)
  const cdI = Math.min(Math.floor(cdIdx), chartData.length - 2)
  const cdFrac = cdIdx - cdI
  const currentElev = chartData[cdI].value + (chartData[cdI + 1].value - chartData[cdI].value) * cdFrac

  // Elevation gain: sum positive differences up to current index
  const endIdx = Math.round(effectiveProgress * (chartData.length - 1))
  let elevGain = 0
  for (let i = 1; i <= endIdx; i++) {
    const diff = chartData[i].value - chartData[i - 1].value
    if (diff > 0) elevGain += diff
  }

  return { distance, elevGain, currentElev, elapsedMs }
}

function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Render a stats overlay panel at a freely specified normalized position.
 * statsX/statsY are 0-1 values: 0=top/left edge flush, 1=bottom/right edge flush.
 */
function generateStatsOverlay(
  stats: { distance: number; elevGain: number; currentElev: number; elapsedMs: number | null },
  width: number,
  mapHeight: number,
  color: string,
  statsX: number,
  statsY: number,
): string {
  const fontSize = 32
  const rowHeight = 48
  const paddingX = 20
  const paddingY = 16
  const boxWidth = 270

  const rows: Array<{ icon: string; value: string }> = [
    {
      icon: '↔',
      value: stats.distance >= 100
        ? `${Math.round(stats.distance)} km`
        : `${stats.distance.toFixed(1)} km`,
    },
    { icon: '↑', value: `+${Math.round(stats.elevGain)} m` },
    { icon: '▲', value: `${Math.round(stats.currentElev)} m` },
  ]
  if (stats.elapsedMs !== null) {
    rows.push({ icon: '⏱', value: formatElapsedTime(stats.elapsedMs) })
  }

  const boxHeight = rows.length * rowHeight + 2 * paddingY

  const maxX = width - boxWidth
  const maxY = mapHeight - boxHeight
  const boxX = Math.round(statsX * maxX)
  const boxY = Math.round(statsY * maxY)

  const textLines = rows.map((row, i) => {
    const x = boxX + paddingX
    const y = Math.round(boxY + paddingY + rowHeight * i + fontSize * 0.78)
    return `<text x="${x}" y="${y}" fill="${color}" font-size="${fontSize}" font-weight="bold"
      font-family="system-ui, sans-serif"
      stroke="rgba(0,0,0,0.75)" stroke-width="5" paint-order="stroke fill"
      stroke-linejoin="round">${row.icon}  ${row.value}</text>`
  }).join('\n    ')

  return textLines
}

/**
 * Generate a full-screen stats summary overlay for the outro / intro stats card.
 * Renders a semi-transparent scrim + centered title + stat rows.
 */
function generateOutroStatsCard(
  options: NonNullable<CombinedFrameOptions['outroOverlay']>,
  width: number,
  height: number,
): string {
  const { title, totalDistance, totalElevGain, totalElevLoss, totalTimeMs, opacity, color } = options
  if (opacity <= 0) return ''

  const escape = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const shadow = `stroke="rgba(0,0,0,0.85)" stroke-width="7" paint-order="stroke fill" stroke-linejoin="round"`
  const titleFontSize = Math.min(Math.round(width * 0.05), 54)
  const valueFontSize = Math.min(Math.round(width * 0.07), 76)
  const labelFontSize = Math.min(Math.round(width * 0.028), 30)
  const cx = width / 2

  const distStr = totalDistance >= 100
    ? `${Math.round(totalDistance)} km`
    : `${totalDistance.toFixed(1)} km`
  const gainStr = `+${Math.round(totalElevGain)} m`
  const lossStr = `-${Math.round(Math.abs(totalElevLoss))} m`

  const rows: Array<{ icon: string; value: string; label: string }> = [
    { icon: '↔', value: distStr, label: 'Strecke' },
    { icon: '↑', value: gainStr, label: 'Aufstieg' },
    { icon: '↓', value: lossStr, label: 'Abstieg' },
  ]
  if (totalTimeMs !== null) {
    rows.push({ icon: '⏱', value: formatElapsedTime(totalTimeMs), label: 'Dauer' })
  }

  const rowBlockHeight = valueFontSize * 1.2 + labelFontSize * 1.6 + 28
  const totalRowsHeight = rows.length * rowBlockHeight
  const titleBlockHeight = title ? titleFontSize * 1.4 + 48 : 0
  const contentHeight = titleBlockHeight + totalRowsHeight
  let nextY = (height - contentHeight) / 2

  const parts: string[] = []

  // Scrim
  parts.push(`<rect width="${width}" height="${height}" fill="rgba(0,0,0,${(0.72 * opacity).toFixed(2)})"/>`)

  // Title + thin divider
  if (title) {
    const titleY = nextY + titleFontSize
    parts.push(`<text x="${cx}" y="${titleY}" text-anchor="middle"
      font-size="${titleFontSize}" font-weight="bold" fill="${color}" opacity="${opacity.toFixed(2)}"
      font-family="system-ui, -apple-system, sans-serif"
      ${shadow}>${escape(title)}</text>`)
    const lineY = titleY + titleFontSize * 0.65
    const lineHalfW = Math.round(width * 0.22)
    parts.push(`<line x1="${cx - lineHalfW}" y1="${lineY}" x2="${cx + lineHalfW}" y2="${lineY}"
      stroke="${color}" stroke-width="1.5" opacity="${(opacity * 0.3).toFixed(2)}"/>`)
    nextY += titleBlockHeight
  }

  // Stat rows
  for (const row of rows) {
    const valueY = nextY + valueFontSize
    const labelY = valueY + labelFontSize * 1.6
    parts.push(`<text x="${cx}" y="${valueY}" text-anchor="middle"
      font-size="${valueFontSize}" font-weight="bold" fill="${color}" opacity="${opacity.toFixed(2)}"
      font-family="system-ui, -apple-system, sans-serif"
      ${shadow}>${row.icon}  ${row.value}</text>`)
    parts.push(`<text x="${cx}" y="${labelY}" text-anchor="middle"
      font-size="${labelFontSize}" fill="${color}" opacity="${(opacity * 0.5).toFixed(2)}"
      font-family="system-ui, -apple-system, sans-serif"
      letter-spacing="3">${row.label.toUpperCase()}</text>`)
    nextY += rowBlockHeight
  }

  return parts.join('\n')
}

/**
 * Generate a small weather chip (temperature + condition) pinned to the bottom-left.
 * Rendered as a pill with a semi-transparent dark background.
 */
function generateWeatherChip(
  options: NonNullable<CombinedFrameOptions['weatherOverlay']>,
  width: number,
  height: number,
): string {
  const { temp, condition, opacity, x = 0.0, y = 0.5 } = options
  const color = options.color || '#ffffff'   // fallback — prevents fill="undefined" → black
  if (opacity <= 0 || (!temp && !condition)) return ''

  const escape = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const shadow = `stroke="rgba(0,0,0,0.9)" stroke-width="6" paint-order="stroke fill" stroke-linejoin="round"`

  const condFontSize = Math.round(width * 0.042)   // ~45px at 1080 — condition line (has emoji)
  const tempFontSize = Math.round(width * 0.052)   // ~56px at 1080 — temperature, bigger + bold
  const padX = Math.round(width * 0.04)
  const padY = Math.round(width * 0.022)
  const gap  = Math.round(width * 0.012)           // space between condition and temp

  const condLine = escape(condition)
  const tempLine = escape(temp)

  const contentH = (condLine ? condFontSize : 0) + (condLine && tempLine ? gap : 0) + (tempLine ? tempFontSize : 0)
  const chipH    = contentH + padY * 2
  const chipW    = Math.round(width * 0.44)

  // Position from normalized x/y (0-1) over the full frame
  const chipX = Math.round(x * (width  - chipW))
  const chipY = Math.round(y * (height - chipH))

  const rx = 16   // subtle rounded corners, not a full pill

  const parts: string[] = []

  // Background — more opaque for legibility
  parts.push(
    `<rect x="${chipX}" y="${chipY}" width="${chipW}" height="${chipH}" rx="${rx}" ry="${rx}"` +
    ` fill="rgba(0,0,0,0.72)" opacity="${opacity.toFixed(2)}"/>`
  )

  let ty = chipY + padY

  // Condition line (emoji + label) — smaller, sits above temp
  if (condLine) {
    ty += condFontSize
    parts.push(
      `<text x="${chipX + padX}" y="${ty}" font-size="${condFontSize}" font-weight="600"` +
      ` fill="${color}" opacity="${opacity.toFixed(2)}"` +
      ` font-family="system-ui, -apple-system, sans-serif"` +
      ` ${shadow}>${condLine}</text>`
    )
    ty += gap
  }

  // Temperature — large + bold, most prominent
  if (tempLine) {
    ty += tempFontSize
    parts.push(
      `<text x="${chipX + padX}" y="${ty}" font-size="${tempFontSize}" font-weight="bold"` +
      ` fill="${color}" opacity="${opacity.toFixed(2)}"` +
      ` font-family="system-ui, -apple-system, sans-serif"` +
      ` ${shadow}>${tempLine}</text>`
    )
  }

  return parts.join('\n')
}

/**
 * Remove near-duplicate consecutive points to smooth animation through GPS pauses.
 *
 * GPS devices keep recording during pauses, creating many clustered points at the
 * same location. With index-based progress mapping, each cluster consumes equal
 * animation time — making the drawn line appear frozen ("abgehakt") for those frames.
 *
 * This function keeps only points that are at least `minStepKm` apart, so the
 * animation speed is proportional to actual distance traveled.
 *
 * Threshold: max(5m, 0.1% of route length) — preserves route detail for short
 * routes while aggressively filtering pauses on long routes.
 */
function deduplicateRouteForAnimation<T extends { distance: number }>(points: T[]): T[] {
  if (points.length < 2) return points

  const totalDist = points[points.length - 1].distance
  if (totalDist <= 0) return points

  const minStep = Math.max(0.005, totalDist * 0.001)

  const result: T[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    if (points[i].distance - result[result.length - 1].distance >= minStep) {
      result.push(points[i])
    }
  }
  result.push(points[points.length - 1]) // always keep last point
  return result
}

/**
 * Generate a north arrow indicator for the top-right corner of the map.
 */
function generateNorthArrow(width: number, color: string): string {
  const cx = width - 72
  const cy = 72
  return `
    <g transform="translate(${cx}, ${cy})">
      <circle r="30" fill="rgba(0,0,0,0.5)" stroke="${color}" stroke-width="1" stroke-opacity="0.25"/>
      <path d="M 0,-22 L 7,3 L 0,-4 L -7,3 Z" fill="${color}" opacity="0.95"/>
      <path d="M 0,-4 L 7,3 L 0,22 L -7,3 Z" fill="${color}" opacity="0.22"/>
      <text y="-25" text-anchor="middle" font-size="10" font-weight="700"
            fill="${color}" font-family="system-ui, sans-serif" opacity="0.9">N</text>
    </g>
  `
}

/**
 * Generate a scale bar for the bottom-left corner of the map.
 * Calculates km/pixel from the geographic bounds.
 */
function generateScaleBar(bounds: RouteBounds, width: number, mapHeight: number, color: string): string {
  const cosLat = Math.cos(bounds.centerLat * Math.PI / 180)
  const contentW = width - 100
  const contentH = mapHeight - 100
  const geoW = (bounds.maxLon - bounds.minLon) * cosLat * 111.32
  const geoH = (bounds.maxLat - bounds.minLat) * 111.32
  if (geoW <= 0 || geoH <= 0 || contentW <= 0 || contentH <= 0) return ''

  const pxPerKmX = contentW / geoW
  const pxPerKmY = contentH / geoH
  const pxPerKm = Math.min(pxPerKmX, pxPerKmY)
  const kmPerPx = 1 / pxPerKm

  // Pick a nice round scale bar length targeting ~130px width
  const targetKm = kmPerPx * 130
  const niceValues = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
  const barKm = niceValues.find(v => v >= targetKm) ?? niceValues[niceValues.length - 1]
  const barPx = barKm / kmPerPx

  const x = 72
  const y = mapHeight - 72
  const tickH = 9
  const label = barKm >= 1 ? `${barKm} km` : `${Math.round(barKm * 1000)} m`

  return `
    <g opacity="0.85">
      <line x1="${x}" y1="${y}" x2="${x + barPx}" y2="${y}"
            stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="${x}" y1="${y - tickH / 2}" x2="${x}" y2="${y + tickH / 2}"
            stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="${x + barPx}" y1="${y - tickH / 2}" x2="${x + barPx}" y2="${y + tickH / 2}"
            stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
      <text x="${x + barPx / 2}" y="${y - 14}" text-anchor="middle"
            font-size="21" fill="${color}" font-family="system-ui, sans-serif" font-weight="600"
            stroke="rgba(0,0,0,0.65)" stroke-width="5" paint-order="stroke fill"
            stroke-linejoin="round">${label}</text>
    </g>
  `
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
    showMarkerPulse = false,
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
    // Elevation visibility
    showElevationChart = true,
    // Divider
    showDivider = false,
    dividerColor = '#ffffff33',
    dividerWidth = 2,
    // Opacity
    sceneOpacity,
    // Elevation clip progress
    elevationClipProgress,
    // Geo context
    geoLayers,
    contourLayerSvg,
    riverLayerSvg,
    peakLayerSvg,
    placeBoundaryLayerSvg,
    satelliteLayerSvg,
    hillshadeLayerSvg,
    forestLayerSvg,
    vineyardLayerSvg,
    meadowLayerSvg,
    waterLayerSvg,
    landCoverLayerSvg,
    roadLayerSvg,
    // Title / outro stats card
    titleOverlay,
    outroOverlay,
    // Weather chip
    weatherOverlay,
    // Stats
    showStatsOverlay = false,
    statsOverlayColor = '#ffffff',
    statsX = 1.0,
    statsY = 1.0,
    annotations = [],
    // Map visual enhancements
    showNorthArrow = true,
    showScaleBar = true,
    showMapFade = true,
    // Privacy
    anonymizeStart = false,
    anonymizeEnd = false,
    anonymizeRadiusM = 300,
  } = options

  // ── Privacy: trim route points near start/end ──
  const visibleRoutePoints = (() => {
    if (!anonymizeStart && !anonymizeEnd) return routePoints
    const total = routePoints.length
    if (total < 2) return routePoints
    const totalDist = routePoints[total - 1].distance
    const radiusKm = anonymizeRadiusM / 1000
    const startIdx = anonymizeStart
      ? routePoints.findIndex(p => p.distance >= radiusKm)
      : 0
    const endIdx = anonymizeEnd
      ? routePoints.findLastIndex(p => p.distance <= totalDist - radiusKm)
      : total - 1
    if (startIdx < 0 || endIdx < 0 || startIdx >= endIdx) return routePoints
    return routePoints.slice(startIdx, endIdx + 1)
  })()

  // Layout split — if elevation is hidden, map takes full height
  const mapHeight = showElevationChart ? Math.round(height * mapHeightRatio) : height
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

  // Accent color for Momente annotation chips — distinct from km labels (white)
  const ANNOT_COLOR = '#ffd166'

  // All enabled annotations to render — when showAllAnnotations is set (live preview)
  // every enabled annotation is included; otherwise only triggered ones (for export).
  const activeAnnotations = annotations
    .filter(a => a.enabled && (options.showAllAnnotations || effectiveProgress >= a.progress))
    .sort((a, b) => a.progress - b.progress)  // ascending: first-triggered at bottom of stack

  // Per-annotation SVG anchor positions on the route (filled in by map section)
  const annotationAnchorPositions = new Map<string, { x: number; y: number }>()

  // ── Map Section (top) ──
  let mapContent = ''
  let mapDefs = ''

  if (visibleRoutePoints.length >= 2) {
    const mapConfig = {
      width,
      height: mapHeight,
      padding: { top: 50, right: 50, bottom: 50, left: 50 },
    }
    const { mapPoints, bounds: routeBounds, chartArea: mapChartArea } = projectRouteToSvg(visibleRoutePoints, mapConfig)

    // Geographic context layers (borders, rivers, cities)
    const projParams = getProjectionParams(routeBounds, mapConfig)
    const geoLayersHtml = geoLayers
      ? generateGeoLayers(routeBounds, projParams, geoLayers, width, mapHeight, mapPoints)
      : ''

    // Deduplicate for animation — removes GPS pause clusters so the drawing
    // speed is proportional to distance traveled, not GPS point count.
    const animPoints = deduplicateRouteForAnimation(mapPoints)

    // Find the SVG route position for every active annotation (overview only —
    // in chase mode camera-space coords can't be mixed with screen-space chip coords)
    if (mapCameraMode === 'overview' && animPoints.length >= 2 && activeAnnotations.length > 0) {
      const totalDist = animPoints[animPoints.length - 1].distance
      if (totalDist > 0) {
        for (const annot of activeAnnotations) {
          const targetDist = annot.progress * totalDist
          let ai = 0
          while (ai < animPoints.length - 1 && animPoints[ai + 1].distance < targetDist) ai++
          const pa = animPoints[Math.min(ai, animPoints.length - 2)]
          const pb = animPoints[Math.min(ai + 1, animPoints.length - 1)]
          const at = pa.distance !== pb.distance ? (targetDist - pa.distance) / (pb.distance - pa.distance) : 0
          annotationAnchorPositions.set(annot.id, { x: pa.x + (pb.x - pa.x) * at, y: pa.y + (pb.y - pa.y) * at })
        }
      }
    }

    const camera = calculateMapCameraViewport(
      effectiveProgress, mapCameraMode, mapCameraConfig,
      animPoints, mapChartArea, width, mapHeight,
    )

    const routeLine = generateRouteLine(animPoints, effectiveProgress, routeStyle, width, mapHeight)
    const marker = showMapMarker
      ? generateRouteMarker(animPoints, effectiveProgress, mapMarkerSize, mapMarkerColor, routeStyle.color, showDirection, showMarkerPulse)
      : ''

    const distLabels = showDistanceMarkers
      ? generateMapDistanceMarkers(animPoints, distanceMarkerInterval, mapMarkerColor, 28, width, mapHeight, options.kmLabelOffsets)
      : ''
    const startEnd = showStartEndLabels
      ? generateMapStartEndLabels(animPoints, mapMarkerColor, 14)
      : ''

    const fadeDef = showMapFade ? `
      <linearGradient id="map-fade-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${backgroundColor}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${backgroundColor}" stop-opacity="1"/>
      </linearGradient>
    ` : ''
    mapDefs = [routeLine.defs, fadeDef].filter(Boolean).join('\n')

    // Wrap geo/contour layers in a clipping container — coordinates extend far
    // beyond the viewport since 110m data covers a wide area
    const satelliteHtml = satelliteLayerSvg || ''
    const hillshadeHtml = hillshadeLayerSvg || ''
    const forestHtml = forestLayerSvg || ''
    const vineyardHtml = vineyardLayerSvg || ''
    const meadowHtml = meadowLayerSvg || ''
    const contourHtml = contourLayerSvg || ''
    const riverHtml = riverLayerSvg || ''
    const peakHtml = peakLayerSvg || ''
    const placeBoundaryHtml = placeBoundaryLayerSvg || ''
    const waterHtml = waterLayerSvg || ''
    const landCoverHtml = landCoverLayerSvg || ''
    const roadHtml = roadLayerSvg || ''

    // Build an SVG mask from water polygon paths so vegetation layers never
    // render inside lake/reservoir areas (OSM forest polygons often extend into
    // water bodies — the mask cuts them out geometrically).
    const vegetationMaskDef = waterHtml ? (() => {
      // Extract every <path d="..." fill-rule="..."> from the water SVG
      const maskPaths: string[] = []
      const pathRe = /<path\s[^>]*>/g
      const dRe = /\bd="([^"]+)"/
      const frRe = /\bfill-rule="([^"]+)"/
      let m: RegExpExecArray | null
      while ((m = pathRe.exec(waterHtml)) !== null) {
        const d = m[0].match(dRe)?.[1]
        if (!d) continue
        const fr = m[0].match(frRe)?.[1]
        const frAttr = fr ? ` fill-rule="${fr}"` : ''
        maskPaths.push(`<path d="${d}"${frAttr} fill="black"/>`)
      }
      if (maskPaths.length === 0) return ''
      return (
        `<mask id="veg-exclude-water">` +
        `<rect x="0" y="0" width="${width}" height="${mapHeight}" fill="white"/>` +
        maskPaths.join('') +
        `</mask>`
      )
    })() : ''

    // Wrap vegetation layers in mask (water areas become invisible in these layers)
    const vegHtml = forestHtml + vineyardHtml + meadowHtml + landCoverHtml
    const maskedVegHtml = vegetationMaskDef
      ? `<g mask="url(#veg-exclude-water)">${vegHtml}</g>`
      : vegHtml

    // Render order (back to front): satellite → hillshade → vegetation (masked by water) → water → place boundaries → contours → roads → rivers → geo → peaks
    const allGeoHtml = satelliteHtml + hillshadeHtml + maskedVegHtml + waterHtml + placeBoundaryHtml + contourHtml + roadHtml + riverHtml + geoLayersHtml + peakHtml
    const geoDefs = vegetationMaskDef ? `<defs>${vegetationMaskDef}</defs>` : ''
    const geoClipped = allGeoHtml
      ? `<svg x="0" y="0" width="${width}" height="${mapHeight}" overflow="hidden">${geoDefs}${allGeoHtml}</svg>`
      : ''

    // These overlays are always in screen-space (unaffected by chase zoom)
    const fadeOverlay = showMapFade
      ? `<rect x="0" y="${Math.round(mapHeight * 0.62)}" width="${width}" height="${Math.round(mapHeight * 0.38)}"
               fill="url(#map-fade-gradient)" pointer-events="none"/>`
      : ''
    const northArrowHtml = showNorthArrow ? generateNorthArrow(width, mapMarkerColor) : ''
    const scaleBarHtml = showScaleBar ? generateScaleBar(routeBounds, width, mapHeight, mapMarkerColor) : ''
    const mapOverlays = `${fadeOverlay}${northArrowHtml}${scaleBarHtml}`

    const annotDot = activeAnnotations
      .map(annot => {
        const pos = annotationAnchorPositions.get(annot.id)
        if (!pos) return ''
        const isTriggered = effectiveProgress >= annot.progress
        const dotOpacity = isTriggered ? 0.9 : 0.4
        return `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}"
                  r="8" fill="${ANNOT_COLOR}" stroke="rgba(0,0,0,0.55)" stroke-width="2" opacity="${dotOpacity}"/>`
      })
      .join('\n')

    const mapInnerContent = `
      ${geoClipped}
      ${routeLine.elements}
      ${distLabels}
      ${startEnd}
      ${annotDot}
      ${marker}
    `

    if (mapCameraMode === 'chase') {
      // Background route (faint, full) — not affected by chase zoom
      const bgRoute = generateRouteLine(
        animPoints, 1,
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
          ${mapOverlays}
        </g>
      `
    } else {
      // Overview: direct rendering
      mapContent = `
        <g>
          ${mapInnerContent}
          ${mapOverlays}
        </g>
      `
    }
  }

  // ── Elevation Section (bottom) ──
  let elevContent = ''
  let elevDefs = ''

  if (showElevationChart && chartData.length > 0) {
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

    const smoothLinePath = pointsToSmoothPath(offsetPoints)
    const smoothAreaPath = pointsToSmoothAreaPath(offsetPoints, offsetChartArea)

    const elevGradientId = 'combined-elev-gradient'
    const elevClipId = 'combined-elev-clip'

    const clipProgress = elevationClipProgress ?? effectiveProgress
    const clipWidth = elevChartArea.width * clipProgress
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
      const smoothedForColor = smoothViewBoxPointsY(offsetPoints)
      const coloredArea = showAreaFill
        ? generateColoredElevationArea(smoothedForColor, offsetChartArea, elevationColorIntensity)
        : ''
      const coloredLine = generateColoredElevationLine(smoothedForColor, elevationColorIntensity, strokeWidth)
      curveElements = `${coloredArea}\n${coloredLine}`
    } else {
      const areaFillElement = showAreaFill
        ? `<path d="${smoothAreaPath}" fill="url(#${elevGradientId})"/>`
        : ''
      curveElements = `${areaFillElement}
        <path d="${smoothLinePath}" fill="none" stroke="${curveColor}"
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
  const dividerHtml = showDivider && showElevationChart
    ? `<line x1="0" y1="${mapHeight}" x2="${width}" y2="${mapHeight}"
            stroke="${dividerColor}" stroke-width="${dividerWidth}"/>`
    : ''

  // ── Stats Overlay ──
  let statsHtml = ''
  if (showStatsOverlay && routePoints.length > 1 && chartData.length > 1) {
    const stats = calculateCurrentStats(routePoints, chartData, effectiveProgress)
    statsHtml = generateStatsOverlay(stats, width, mapHeight, statsOverlayColor, statsX, statsY)
  }

  // ── Annotations ──
  _lastAnnotationChipPositions = {}
  const annotFontSize = 36
  const annotChipH = 58
  const annotParts = activeAnnotations.map((active, i) => {
    const isTriggered = effectiveProgress >= active.progress
    // Triggered: fade-in over 3% of progress. Not-yet-triggered (ghost): fixed 35% opacity.
    const chipOpacity = isTriggered
      ? Math.min(1, (effectiveProgress - active.progress) / 0.03)
      : 0.35
    const escaped = active.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    const annotChipWidth = Math.max(280, escaped.length * 20 + 60)
    const customPos = options.annotationPositions?.[active.id]
    // Default stack: first-triggered at bottom, subsequent above it
    const chipX = customPos?.x ?? width / 2
    const chipY = customPos?.y ?? (mapHeight - 100 - i * (annotChipH + 12))
    _lastAnnotationChipPositions[active.id] = { x: chipX, y: chipY }

    const anchorPos = annotationAnchorPositions.get(active.id)
    const leaderLine = anchorPos ? `
      <line x1="${anchorPos.x.toFixed(1)}" y1="${anchorPos.y.toFixed(1)}"
            x2="${chipX}" y2="${chipY}"
            stroke="${ANNOT_COLOR}" stroke-width="2" stroke-dasharray="6 5" opacity="0.7"
            pointer-events="none"/>` : ''

    return `
      <g opacity="${chipOpacity}">
        ${leaderLine}
        <rect x="${chipX - annotChipWidth / 2}" y="${chipY - annotChipH / 2}"
              width="${annotChipWidth}" height="${annotChipH}"
              rx="${annotChipH / 2}" ry="${annotChipH / 2}"
              fill="rgba(0,0,0,0.80)"
              stroke="${ANNOT_COLOR}" stroke-width="2.5"
              data-annotation-id="${active.id}" style="cursor:grab"/>
        <text x="${chipX}" y="${chipY}"
              text-anchor="middle" dominant-baseline="middle"
              font-size="${annotFontSize}" font-weight="600"
              font-family="system-ui, -apple-system, sans-serif"
              fill="#ffffff"
              data-annotation-id="${active.id}" style="cursor:grab">${escaped}</text>
        <rect x="${chipX - annotChipWidth / 2 - 12}" y="${chipY - annotChipH / 2 - 12}"
              width="${annotChipWidth + 24}" height="${annotChipH + 24}"
              fill="transparent" pointer-events="all"
              data-annotation-id="${active.id}" style="cursor:grab"/>
      </g>`
  })
  const annotationsHtml = annotParts.join('\n')

  // ── Title Overlay ──
  let titleHtml = ''
  if (titleOverlay && titleOverlay.text && titleOverlay.opacity > 0) {
    const fontSize = Math.min(Math.round(width * 0.06), 72)
    const maxWidth = width - 120  // 60px padding each side
    const avgCharWidth = fontSize * 0.58
    const charsPerLine = Math.floor(maxWidth / avgCharWidth)

    // Word-wrap: split into lines that fit within maxWidth
    const words = titleOverlay.text.split(' ')
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (test.length > charsPerLine && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)

    const lineHeight = fontSize * 1.25
    const totalHeight = lines.length * lineHeight
    const startY = height / 2 - totalHeight / 2 + fontSize * 0.5

    const escape = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    const tspans = lines
      .map((line, i) =>
        `<tspan x="${width / 2}" y="${(startY + i * lineHeight).toFixed(1)}">${escape(line)}</tspan>`
      )
      .join('')

    titleHtml = `
      <text
        text-anchor="middle"
        font-size="${fontSize}" font-weight="bold"
        fill="${titleOverlay.color}"
        opacity="${titleOverlay.opacity.toFixed(2)}"
        font-family="system-ui, -apple-system, sans-serif"
      >${tspans}</text>
    `
  }

  // ── Outro / Intro Stats Card ──
  const outroHtml = outroOverlay
    ? generateOutroStatsCard(outroOverlay, width, height)
    : ''

  // ── Weather Chip ──
  const weatherHtml = weatherOverlay
    ? generateWeatherChip(weatherOverlay, width, height)
    : ''

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
    ${statsHtml}
    ${annotationsHtml}
    ${elevContent}
    ${dividerHtml}
    ${opacityClose}
    ${weatherHtml}
    ${titleHtml}
    ${outroHtml}
  </svg>`
}
