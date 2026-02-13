/**
 * Route Line Renderer
 *
 * Generates SVG elements for the route line with progress-based
 * clip-path reveal animation and marker rendering.
 */

import type { MapPoint } from './projection'
import { getRouteMarkerPosition, getRouteHeading } from './projection'

/** Styling options for the route line */
export interface RouteLineStyle {
  color: string
  width: number
  opacity: number
  glow: boolean
  glowColor: string
  glowIntensity: number // 1-8
  /** Dash pattern for the unrevealed portion of the route */
  trailDash?: string
  /** Opacity of the unrevealed trail */
  trailOpacity?: number
}

export const DEFAULT_ROUTE_LINE_STYLE: RouteLineStyle = {
  color: '#ffffff',
  width: 4,
  opacity: 1,
  glow: true,
  glowColor: '#ffffff',
  glowIntensity: 4,
  trailDash: '8 12',
  trailOpacity: 0.2,
}

/**
 * Convert MapPoints to an SVG polyline points string.
 */
export function mapPointsToPolyline(points: MapPoint[]): string {
  return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

/**
 * Generate SVG defs for the route line (glow filter, clip-path).
 */
export function generateRouteLineDefs(
  points: MapPoint[],
  progress: number,
  style: RouteLineStyle,
  clipId: string,
  svgWidth: number,
  svgHeight: number,
): string {
  const defs: string[] = []

  // Glow filter
  if (style.glow) {
    const stdDev = 2 + style.glowIntensity * 1.5
    defs.push(`
      <filter id="route-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${stdDev}" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `)
  }

  // Clip-path for progressive reveal
  // We clip based on distance along the polyline by index ratio
  // Since points are ordered, we can clip by including only the first N points
  // But SVG clip-path with a rect is simpler and visually close enough for curves
  // Instead, we'll use a path-length-based approach: render partial polyline
  defs.push(`
    <clipPath id="${clipId}">
      <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}"/>
    </clipPath>
  `)

  return defs.join('\n')
}

/**
 * Build a polyline string from a subset of points (0 to progress).
 */
function partialPolyline(points: MapPoint[], progress: number): string {
  if (points.length === 0 || progress <= 0) return ''

  const exactIndex = progress * (points.length - 1)
  const lastFullIndex = Math.floor(exactIndex)
  const fraction = exactIndex - lastFullIndex

  // Include all full points up to lastFullIndex
  const subset = points.slice(0, lastFullIndex + 1)

  // Add interpolated final point if we're between two points
  if (fraction > 0 && lastFullIndex + 1 < points.length) {
    const a = points[lastFullIndex]
    const b = points[lastFullIndex + 1]
    subset.push({
      ...a,
      x: a.x + (b.x - a.x) * fraction,
      y: a.y + (b.y - a.y) * fraction,
    })
  }

  return mapPointsToPolyline(subset)
}

/**
 * Generate the SVG elements for the route line.
 *
 * Returns an object with defs (filters) and elements (the visible SVG content).
 */
export function generateRouteLine(
  points: MapPoint[],
  progress: number,
  style: RouteLineStyle = DEFAULT_ROUTE_LINE_STYLE,
  svgWidth: number,
  svgHeight: number,
): { defs: string; elements: string } {
  if (points.length < 2) {
    return { defs: '', elements: '' }
  }

  const clipId = 'route-reveal-clip'
  const defs = generateRouteLineDefs(points, progress, style, clipId, svgWidth, svgHeight)

  const elements: string[] = []

  // Full trail (dashed, low opacity) — shows entire route outline
  if (style.trailDash && style.trailOpacity && style.trailOpacity > 0) {
    elements.push(`
      <polyline
        points="${mapPointsToPolyline(points)}"
        fill="none"
        stroke="${style.color}"
        stroke-width="${style.width * 0.5}"
        stroke-opacity="${style.trailOpacity}"
        stroke-dasharray="${style.trailDash}"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    `)
  }

  // Revealed portion of the route (solid line up to progress)
  const revealedPoints = partialPolyline(points, progress)
  if (revealedPoints) {
    const filterAttr = style.glow ? ' filter="url(#route-glow)"' : ''
    elements.push(`
      <polyline
        points="${revealedPoints}"
        fill="none"
        stroke="${style.glowColor}"
        stroke-width="${style.width + 4}"
        stroke-opacity="${style.glow ? 0.3 : 0}"
        stroke-linejoin="round"
        stroke-linecap="round"
        ${filterAttr}
      />
      <polyline
        points="${revealedPoints}"
        fill="none"
        stroke="${style.color}"
        stroke-width="${style.width}"
        stroke-opacity="${style.opacity}"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    `)
  }

  return { defs, elements: elements.join('\n') }
}

/**
 * Generate SVG for the route marker (circle + direction arrow).
 */
export function generateRouteMarker(
  points: MapPoint[],
  progress: number,
  markerSize: number,
  markerColor: string,
  routeColor: string,
  showDirection: boolean = true,
): string {
  const pos = getRouteMarkerPosition(points, progress)
  if (!pos) return ''

  const elements: string[] = []

  // Direction arrow
  if (showDirection && points.length >= 2) {
    const heading = getRouteHeading(points, progress)
    const arrowSize = markerSize * 1.8
    // Triangle pointing in direction of travel
    elements.push(`
      <g transform="translate(${pos.x}, ${pos.y}) rotate(${heading})">
        <polygon
          points="${arrowSize},0 ${-arrowSize * 0.6},${-arrowSize * 0.5} ${-arrowSize * 0.6},${arrowSize * 0.5}"
          fill="${markerColor}"
          opacity="0.6"
        />
      </g>
    `)
  }

  // Main marker circle
  elements.push(`
    <circle
      cx="${pos.x}" cy="${pos.y}" r="${markerSize}"
      fill="${markerColor}"
      stroke="${routeColor}"
      stroke-width="${Math.max(2, markerSize * 0.3)}"
    />
  `)

  return elements.join('\n')
}
