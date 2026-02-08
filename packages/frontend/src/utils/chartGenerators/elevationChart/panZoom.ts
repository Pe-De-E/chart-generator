import type { PanZoomConfig } from './types'

/**
 * Camera viewport state for pan-zoom animation
 */
export interface CameraViewport {
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
}

/**
 * Easing function for smooth zoom-out transition
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Calculate the panning viewport (Phase 1: zoomed in, following marker).
 * The zoom level is capped so the full curve area is always visible vertically.
 */
function calculatePanViewport(
  zoomLevel: number,
  markerPoint: { x: number; y: number } | null,
  chartArea: { x: number; y: number; width: number; height: number },
  fullWidth: number,
  fullHeight: number
): CameraViewport {
  // Cap zoom so the curve area always fits vertically (with small padding)
  const vPad = 20
  const neededHeight = chartArea.height + vPad * 2
  const maxZoomForCurve = fullHeight / neededHeight
  const scale = Math.min(zoomLevel, maxZoomForCurve)

  const w = fullWidth / scale
  const h = fullHeight / scale

  // Vertical: center viewport on the curve area
  const curveCenterY = chartArea.y + chartArea.height / 2
  const desiredY = curveCenterY - h / 2
  const y = clamp(desiredY, 0, fullHeight - h)

  if (!markerPoint) {
    return { x: 0, y, w, h, scale }
  }

  // Horizontal: place marker at ~60% from left edge of viewport
  const markerViewportFraction = 0.6
  const desiredX = markerPoint.x - w * markerViewportFraction
  const x = clamp(desiredX, 0, fullWidth - w)

  return { x, y, w, h, scale }
}

/**
 * Calculate camera viewport for a given animation progress.
 *
 * Phase 1 (0 to zoomOutStart): Zoomed in, panning right to follow the marker.
 * Phase 2 (zoomOutStart to 1): Smooth zoom out to show full chart.
 *
 * @param effectiveProgress - Animation progress 0-1 (already remapped by time/gradient modes)
 * @param config - Pan-zoom configuration (zoomLevel, zoomOutStart)
 * @param chartArea - The chart drawing area in viewBox coordinates
 * @param markerPoint - Current marker position in viewBox coordinates
 * @param fullWidth - Full SVG width (e.g. 1080)
 * @param fullHeight - Full SVG height (e.g. 1920)
 */
export function calculateCameraViewport(
  effectiveProgress: number,
  config: PanZoomConfig,
  chartArea: { x: number; y: number; width: number; height: number },
  markerPoint: { x: number; y: number } | null,
  fullWidth: number,
  fullHeight: number
): CameraViewport {
  const { zoomLevel, zoomOutStart } = config

  if (effectiveProgress >= zoomOutStart) {
    // Phase 2: Zoom out from current pan position to full view
    const zoomOutProgress = (effectiveProgress - zoomOutStart) / (1 - zoomOutStart)
    const easedProgress = easeOutCubic(zoomOutProgress)

    // Get where the camera would be if still panning at this progress
    const panViewport = calculatePanViewport(
      zoomLevel, markerPoint, chartArea, fullWidth, fullHeight
    )

    // Interpolate from pan viewport's effective scale to full view
    const startScale = panViewport.scale
    const scale = startScale + (1 - startScale) * easedProgress
    const w = fullWidth / scale
    const h = fullHeight / scale

    // Interpolate position towards (0, 0)
    const x = panViewport.x * (1 - easedProgress)
    const y = panViewport.y * (1 - easedProgress)

    return { x, y, w, h, scale }
  }

  // Phase 1: Zoomed in, panning
  return calculatePanViewport(
    zoomLevel, markerPoint, chartArea, fullWidth, fullHeight
  )
}
