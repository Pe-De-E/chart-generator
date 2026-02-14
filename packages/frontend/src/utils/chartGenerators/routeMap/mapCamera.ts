/**
 * Map Camera System
 *
 * Provides chase-cam and overview viewport calculations for the route map.
 * Chase cam follows the marker along the route with a lookahead offset.
 * Overview shows the full route with optional gentle zoom on the active area.
 */

import type { MapPoint } from './projection'
import { getRouteMarkerPosition, getRouteHeading } from './projection'

/** Camera viewport for the map SVG (viewBox parameters) */
export interface MapCameraViewport {
  /** viewBox x origin */
  x: number
  /** viewBox y origin */
  y: number
  /** viewBox width */
  w: number
  /** viewBox height */
  h: number
  /** Current scale factor (1 = no zoom) */
  scale: number
  /** Rotation angle in degrees (0 = no rotation) */
  rotation: number
}

/** Configuration for the map camera */
export interface MapCameraConfig {
  /** Zoom level for chase cam (2 = see 50% of route area). Range: 1.5-6, default 3 */
  zoomLevel: number
  /** Progress value (0-1) where zoom-out phase begins. Range: 0.5-0.95, default 0.85 */
  zoomOutStart: number
  /** Whether to rotate camera with route direction */
  rotateWithRoute: boolean
  /** Lookahead fraction: marker is placed this far from the trailing edge (0.3 = 30% from back). Default 0.35 */
  lookaheadFraction: number
}

export const DEFAULT_MAP_CAMERA_CONFIG: MapCameraConfig = {
  zoomLevel: 3,
  zoomOutStart: 0.85,
  rotateWithRoute: false,
  lookaheadFraction: 0.35,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Smooth a heading angle to avoid jumps at direction reversals.
 * Uses a running average of recent headings.
 */
function smoothHeading(
  currentHeading: number,
  points: MapPoint[],
  progress: number,
  windowSize: number = 5,
): number {
  if (points.length < 2) return 0

  const totalSegments = points.length - 1
  const centerIdx = progress * totalSegments
  const halfWindow = windowSize / 2

  let sinSum = 0
  let cosSum = 0
  let count = 0

  for (let offset = -halfWindow; offset <= halfWindow; offset += 0.5) {
    const idx = clamp(centerIdx + offset, 0, totalSegments)
    const i = Math.min(Math.floor(idx), totalSegments - 1)
    const j = i + 1

    const dx = points[j].x - points[i].x
    const dy = points[j].y - points[i].y
    const angle = Math.atan2(dy, dx)

    sinSum += Math.sin(angle)
    cosSum += Math.cos(angle)
    count++
  }

  return (Math.atan2(sinSum / count, cosSum / count) * 180) / Math.PI
}

/**
 * Calculate the chase camera viewport — zoomed in, following the marker.
 */
function calculateChaseViewport(
  progress: number,
  config: MapCameraConfig,
  points: MapPoint[],
  chartArea: { x: number; y: number; width: number; height: number },
  fullWidth: number,
  fullHeight: number,
): MapCameraViewport {
  const scale = config.zoomLevel
  const w = fullWidth / scale
  const h = fullHeight / scale

  const marker = getRouteMarkerPosition(points, progress)
  const rotation = config.rotateWithRoute
    ? smoothHeading(getRouteHeading(points, progress), points, progress)
    : 0

  if (!marker) {
    return { x: 0, y: 0, w, h, scale, rotation }
  }

  // Place the marker with lookahead: marker sits at (1 - lookaheadFraction) from left
  // so there's more visible terrain ahead of the marker
  const markerFractionX = 1 - config.lookaheadFraction
  const markerFractionY = 0.5

  const desiredX = marker.x - w * markerFractionX
  const desiredY = marker.y - h * markerFractionY

  const x = clamp(desiredX, 0, fullWidth - w)
  const y = clamp(desiredY, 0, fullHeight - h)

  return { x, y, w, h, scale, rotation }
}

/**
 * Calculate the map camera viewport at a given progress.
 *
 * For chase mode:
 * - Phase 1 (0 to zoomOutStart): Zoomed in, following marker
 * - Phase 2 (zoomOutStart to 1): Smooth zoom out to show full route
 *
 * For overview mode: returns full viewport (scale 1)
 */
export function calculateMapCameraViewport(
  progress: number,
  cameraMode: 'overview' | 'chase',
  config: MapCameraConfig,
  points: MapPoint[],
  chartArea: { x: number; y: number; width: number; height: number },
  fullWidth: number,
  fullHeight: number,
): MapCameraViewport {
  if (cameraMode === 'overview') {
    return {
      x: 0,
      y: 0,
      w: fullWidth,
      h: fullHeight,
      scale: 1,
      rotation: 0,
    }
  }

  // Chase mode
  if (progress >= config.zoomOutStart) {
    // Phase 2: Zoom out from chase to full view
    const zoomOutProgress = (progress - config.zoomOutStart) / (1 - config.zoomOutStart)
    const eased = easeOutCubic(zoomOutProgress)

    const chaseVp = calculateChaseViewport(
      progress, config, points, chartArea, fullWidth, fullHeight,
    )

    const scale = chaseVp.scale + (1 - chaseVp.scale) * eased
    const w = fullWidth / scale
    const h = fullHeight / scale

    const x = chaseVp.x * (1 - eased)
    const y = chaseVp.y * (1 - eased)
    const rotation = chaseVp.rotation * (1 - eased)

    return { x, y, w, h, scale, rotation }
  }

  // Phase 1: Zoomed in, following marker
  return calculateChaseViewport(
    progress, config, points, chartArea, fullWidth, fullHeight,
  )
}
