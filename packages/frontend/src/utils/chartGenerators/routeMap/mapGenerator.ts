/**
 * Map Frame Generator
 *
 * Generates complete SVG frames for the route map view.
 * Combines background, route line, marker, and camera viewport
 * into a single SVG string.
 */

import type { RoutePoint } from '@chart-generator/shared'
import type { BackgroundType } from '../elevationChart/types'
import type { ImageBackgroundOptions } from '@chart-generator/shared'
import type { MapPoint } from './projection'
import type { RouteLineStyle } from './routeLine'
import type { MapCameraConfig, MapCameraViewport } from './mapCamera'
import { projectRouteToSvg } from './projection'
import {
  generateRouteLine,
  generateRouteMarker,
  DEFAULT_ROUTE_LINE_STYLE,
} from './routeLine'
import { generateBackgroundElements } from '../elevationChart/background'
import {
  calculateMapCameraViewport,
  DEFAULT_MAP_CAMERA_CONFIG,
} from './mapCamera'

/** Options for rendering a map frame */
export interface MapFrameOptions {
  routePoints: RoutePoint[]
  progress: number                    // 0-1
  width: number                       // SVG width (e.g. 1080)
  height: number                      // SVG height (e.g. 1152 for 60% of 1920)
  // Background
  backgroundColor: string
  backgroundType: BackgroundType
  gradientColor?: string
  meshColor1?: string
  meshColor2?: string
  meshColor3?: string
  patternColor?: string
  patternOpacity?: number
  imageOptions?: ImageBackgroundOptions
  // Route styling
  routeStyle: RouteLineStyle
  // Marker
  showMarker: boolean
  markerSize: number
  markerColor: string
  showDirection: boolean
  // Camera
  cameraMode: 'overview' | 'chase'
  cameraConfig: MapCameraConfig
  // Labels (future)
  showDistanceMarkers?: boolean
  distanceMarkerInterval?: number
  showStartEndLabels?: boolean
  // Opacity
  sceneOpacity?: number               // 0-1, overall opacity (for fade transitions)
}

export const DEFAULT_MAP_FRAME_OPTIONS: Partial<MapFrameOptions> = {
  backgroundColor: '#1a1a2e',
  backgroundType: 'solid',
  routeStyle: DEFAULT_ROUTE_LINE_STYLE,
  showMarker: true,
  markerSize: 8,
  markerColor: '#ffffff',
  showDirection: true,
  cameraMode: 'overview',
  cameraConfig: DEFAULT_MAP_CAMERA_CONFIG,
}

/**
 * Generate distance markers along the route at regular intervals.
 */
function generateDistanceMarkers(
  points: MapPoint[],
  intervalKm: number,
  color: string,
  fontSize: number,
): string {
  if (points.length < 2 || intervalKm <= 0) return ''

  const totalDist = points[points.length - 1].distance
  const markers: string[] = []

  for (let km = intervalKm; km < totalDist; km += intervalKm) {
    // Find the two points bracketing this distance
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
 * Generate start and end labels for the route.
 */
function generateStartEndLabels(
  points: MapPoint[],
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
 * Generate a complete map frame SVG string.
 *
 * Overview mode: full route visible, marker moves along it.
 * Chase mode: camera follows marker with zoom, full route as faint background.
 */
export function generateMapFrame(options: MapFrameOptions): string {
  const {
    routePoints,
    progress,
    width,
    height,
    backgroundColor,
    backgroundType,
    gradientColor = '#1a1a2e',
    meshColor1 = '#0f3460',
    meshColor2 = '#16213e',
    meshColor3 = '#1a1a2e',
    patternColor = '#ffffff',
    patternOpacity = 0.1,
    imageOptions,
    routeStyle,
    showMarker,
    markerSize,
    markerColor,
    showDirection,
    cameraMode,
    cameraConfig,
    showDistanceMarkers = false,
    distanceMarkerInterval = 5,
    showStartEndLabels = false,
    sceneOpacity,
  } = options

  if (routePoints.length < 2) {
    // Fallback: just background
    const bg = generateBackgroundElements(
      width, height, backgroundType, backgroundColor,
      gradientColor, meshColor1, meshColor2, meshColor3,
      patternColor, patternOpacity, imageOptions,
    )
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      ${bg.defs ? `<defs>${bg.defs}</defs>` : ''}
      ${bg.elements}
    </svg>`
  }

  // Project route to SVG coordinates
  const mapConfig = {
    width,
    height,
    padding: { top: 60, right: 60, bottom: 60, left: 60 },
  }
  const { mapPoints, chartArea } = projectRouteToSvg(routePoints, mapConfig)

  // Calculate camera viewport
  const camera = calculateMapCameraViewport(
    progress, cameraMode, cameraConfig, mapPoints, chartArea, width, height,
  )

  // Background
  const bg = generateBackgroundElements(
    width, height, backgroundType, backgroundColor,
    gradientColor, meshColor1, meshColor2, meshColor3,
    patternColor, patternOpacity, imageOptions,
  )

  // Route line + marker
  const routeLine = generateRouteLine(mapPoints, progress, routeStyle, width, height)
  const marker = showMarker
    ? generateRouteMarker(mapPoints, progress, markerSize, markerColor, routeStyle.color, showDirection)
    : ''

  // Optional labels
  const distanceLabels = showDistanceMarkers
    ? generateDistanceMarkers(mapPoints, distanceMarkerInterval, markerColor, 14)
    : ''
  const startEnd = showStartEndLabels
    ? generateStartEndLabels(mapPoints, markerColor, 14)
    : ''

  // Build SVG
  const usesChase = cameraMode === 'chase'
  const hasSceneOpacity = sceneOpacity != null && sceneOpacity < 1

  // Collect all defs
  const allDefs = [bg.defs, routeLine.defs].filter(Boolean).join('\n')

  // Inner content: route + marker + labels
  const innerContent = `
    ${routeLine.elements}
    ${distanceLabels}
    ${startEnd}
    ${marker}
  `

  // For chase mode, we use a nested SVG with a dynamic viewBox
  // For overview mode, content is rendered directly
  let sceneContent: string

  if (usesChase) {
    // Background route (full, faint) stays in outer SVG — not affected by chase zoom
    const bgRoute = generateRouteLine(
      mapPoints, 1, // full route
      {
        ...routeStyle,
        opacity: 0.15,
        width: routeStyle.width * 0.5,
        glow: false,
        trailOpacity: 0,
        trailDash: undefined,
      },
      width, height,
    )

    const rotationAttr = camera.rotation !== 0
      ? ` transform="rotate(${camera.rotation.toFixed(1)} ${width / 2} ${height / 2})"`
      : ''

    sceneContent = `
      ${bg.elements}
      ${bgRoute.elements}
      <svg x="0" y="0" width="${width}" height="${height}"
           viewBox="${camera.x.toFixed(1)} ${camera.y.toFixed(1)} ${camera.w.toFixed(1)} ${camera.h.toFixed(1)}"
           preserveAspectRatio="xMidYMid slice"${rotationAttr}>
        ${bg.elements}
        ${innerContent}
      </svg>
    `
  } else {
    // Overview: no zoom, direct rendering
    sceneContent = `
      ${bg.elements}
      ${innerContent}
    `
  }

  // Wrap in opacity group if needed
  const opacityOpen = hasSceneOpacity ? `<g opacity="${sceneOpacity.toFixed(2)}">` : ''
  const opacityClose = hasSceneOpacity ? '</g>' : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    ${allDefs ? `<defs>${allDefs}</defs>` : ''}
    ${opacityOpen}
    ${sceneContent}
    ${opacityClose}
  </svg>`
}
