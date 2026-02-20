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
  /** Color segments by elevation (blue=low, green=mid, red=high) */
  elevationColoring?: boolean
  /** Intensity of elevation coloring (1-8, default 5) */
  elevationColorIntensity?: number
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
 * Convert hex color to HSL components.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

/**
 * Get elevation-based color for a normalized elevation value (0-1).
 * Maps from blue (low) through green (mid) to red (high).
 */
export function elevationToColor(normalizedElev: number, intensity: number): string {
  // Hue: 240 (blue) → 120 (green) → 0 (red)
  const hue = 240 - normalizedElev * 240
  // Saturation scales with intensity
  const sat = 50 + (intensity / 8) * 40  // 50-90%
  const lightness = 45 + (1 - intensity / 8) * 15  // 45-60%
  return `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${lightness.toFixed(0)}%)`
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
 * Get the last visible point index for the given progress.
 */
function getLastRevealedIndex(points: MapPoint[], progress: number): number {
  if (progress <= 0) return -1
  const exactIndex = progress * (points.length - 1)
  return Math.floor(exactIndex)
}

/**
 * Generate elevation-colored route segments as individual <line> elements.
 */
function generateColoredSegments(
  points: MapPoint[],
  progress: number,
  style: RouteLineStyle,
  isGlow: boolean,
): string {
  const lastIndex = getLastRevealedIndex(points, progress)
  if (lastIndex < 0) return ''

  // Calculate elevation range
  const elevations = points.map(p => p.elevation)
  const minElev = Math.min(...elevations)
  const maxElev = Math.max(...elevations)
  const range = maxElev - minElev

  const intensity = style.elevationColorIntensity ?? 5
  const segments: string[] = []
  const strokeWidth = isGlow ? style.width + 4 : style.width
  const opacity = isGlow ? 0.3 : style.opacity

  for (let i = 0; i < lastIndex && i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const avgElev = (p1.elevation + p2.elevation) / 2
    const normalizedElev = range > 0 ? (avgElev - minElev) / range : 0.5
    const color = elevationToColor(normalizedElev, intensity)

    segments.push(`
      <line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}"
            stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}"
            stroke-linecap="round"/>
    `)
  }

  // Handle fractional last segment
  const exactIndex = progress * (points.length - 1)
  const fraction = exactIndex - lastIndex
  if (fraction > 0 && lastIndex + 1 < points.length) {
    const p1 = points[lastIndex]
    const p2 = points[lastIndex + 1]
    const endX = p1.x + (p2.x - p1.x) * fraction
    const endY = p1.y + (p2.y - p1.y) * fraction
    const avgElev = (p1.elevation + p2.elevation) / 2
    const normalizedElev = range > 0 ? (avgElev - minElev) / range : 0.5
    const color = elevationToColor(normalizedElev, intensity)

    segments.push(`
      <line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}"
            stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}"
            stroke-linecap="round"/>
    `)
  }

  return segments.join('\n')
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

  // Revealed portion of the route
  if (style.elevationColoring) {
    // Elevation-colored: individual <line> segments per point pair
    const filterAttr = style.glow ? ' filter="url(#route-glow)"' : ''

    if (style.glow) {
      elements.push(`<g${filterAttr}>${generateColoredSegments(points, progress, style, true)}</g>`)
    }
    elements.push(generateColoredSegments(points, progress, style, false))
  } else {
    // Monochrome: single <polyline>
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
