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
  /** Color segments by speed (blue=slow, green=medium, red=fast) — requires time data in GPX */
  speedColoring?: boolean
  /** Intensity of speed coloring (1-8, default 5) */
  speedColorIntensity?: number
  /** Render a dark outline/halo beneath the route for contrast against bright backgrounds */
  routeHalo?: boolean
  /** Opacity of the halo outline (0–1, default 0.35) */
  routeHaloOpacity?: number
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
 * Compute raw speed (km/h) for each segment from MapPoint time + distance.
 * Returns an empty array if no time data is available.
 */
function computeSegmentSpeeds(points: MapPoint[]): number[] {
  if (points.length < 2) return []

  const speeds: number[] = []
  let lastValidSpeed = 0

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]

    if (p1.time !== undefined && p2.time !== undefined) {
      const timeDiffMs = p2.time - p1.time
      if (timeDiffMs > 500) {
        // Only compute speed if time gap is > 0.5 s (avoids divide-by-zero / GPS duplicates)
        const distDiffKm = Math.max(0, p2.distance - p1.distance)
        lastValidSpeed = (distDiffKm / timeDiffMs) * 3_600_000
      }
      speeds.push(Math.max(0, lastValidSpeed))
    } else {
      speeds.push(0)
    }
  }

  return speeds
}

/**
 * Smooth an array of values with a centered moving average.
 */
function movingAverage(values: number[], window: number): number[] {
  const half = Math.floor(window / 2)
  return values.map((_, i) => {
    const start = Math.max(0, i - half)
    const end = Math.min(values.length, i + half + 1)
    const slice = values.slice(start, end)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

/**
 * Normalize an array of values to [0, 1] using percentile clamping
 * to prevent outliers from collapsing the color range.
 */
function normalizePercentile(values: number[], pLow = 5, pHigh = 95): number[] {
  if (values.length === 0) return []
  const sorted = [...values].sort((a, b) => a - b)
  const low = sorted[Math.floor((sorted.length - 1) * pLow / 100)]
  const high = sorted[Math.floor((sorted.length - 1) * pHigh / 100)]
  const range = high - low
  if (range === 0) return values.map(() => 0.5)
  return values.map(v => Math.max(0, Math.min(1, (v - low) / range)))
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
 * Get the exact interpolated tip coordinate at the current progress.
 */
function getLineTip(points: MapPoint[], progress: number): { x: number; y: number } | null {
  if (points.length === 0 || progress <= 0) return null

  const exactIndex = progress * (points.length - 1)
  const lastFullIndex = Math.floor(exactIndex)
  const fraction = exactIndex - lastFullIndex

  if (fraction === 0 || lastFullIndex + 1 >= points.length) {
    const p = points[Math.min(lastFullIndex, points.length - 1)]
    return { x: p.x, y: p.y }
  }

  const a = points[lastFullIndex]
  const b = points[lastFullIndex + 1]
  return {
    x: a.x + (b.x - a.x) * fraction,
    y: a.y + (b.y - a.y) * fraction,
  }
}

/**
 * Generate a "drawing tip" sparkle at the leading edge of the drawn line.
 * This gives the visual impression of a pen/marker actively drawing the route.
 *
 * Renders three layers:
 *  1. Outer soft halo  — wide, very transparent (glow bleed)
 *  2. Mid ring         — medium, semi-transparent
 *  3. Inner bright dot — tight, fully opaque (the "pen point")
 */
function generateDrawTip(
  tipX: number,
  tipY: number,
  lineWidth: number,
  glowColor: string,
  hasGlow: boolean,
): string {
  const core = lineWidth * 1.1
  const mid  = lineWidth * 2.2
  const halo = lineWidth * 4.5
  const filterAttr = hasGlow ? ' filter="url(#route-glow)"' : ''
  return [
    `<circle cx="${tipX.toFixed(1)}" cy="${tipY.toFixed(1)}" r="${halo.toFixed(1)}" fill="${glowColor}" opacity="0.12"${filterAttr}/>`,
    `<circle cx="${tipX.toFixed(1)}" cy="${tipY.toFixed(1)}" r="${mid.toFixed(1)}"  fill="${glowColor}" opacity="0.30"/>`,
    `<circle cx="${tipX.toFixed(1)}" cy="${tipY.toFixed(1)}" r="${core.toFixed(1)}" fill="${glowColor}" opacity="0.95"/>`,
  ].join('\n')
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
 * Generate colored route segments as individual <line> elements.
 * Supports both elevation coloring and speed coloring (speed takes precedence).
 */
function generateColoredSegments(
  points: MapPoint[],
  progress: number,
  style: RouteLineStyle,
  isGlow: boolean,
): string {
  const lastIndex = getLastRevealedIndex(points, progress)
  if (lastIndex < 0) return ''

  // ── Determine normalized color value per segment ──────────────────────────
  let normalizedValues: number[]

  if (style.speedColoring) {
    const rawSpeeds = computeSegmentSpeeds(points)
    const hasTimeData = rawSpeeds.some(s => s > 0)
    if (hasTimeData) {
      const smoothed = movingAverage(rawSpeeds, 5)
      normalizedValues = normalizePercentile(smoothed)
    } else {
      // No time data — fall back to elevation coloring
      const elevs = points.map(p => p.elevation)
      const minElev = Math.min(...elevs)
      const range = Math.max(...elevs) - minElev
      normalizedValues = points.slice(0, -1).map((p, i) => {
        const avg = (p.elevation + points[i + 1].elevation) / 2
        return range > 0 ? (avg - minElev) / range : 0.5
      })
    }
  } else {
    // Elevation coloring
    const elevs = points.map(p => p.elevation)
    const minElev = Math.min(...elevs)
    const range = Math.max(...elevs) - minElev
    normalizedValues = points.slice(0, -1).map((p, i) => {
      const avg = (p.elevation + points[i + 1].elevation) / 2
      return range > 0 ? (avg - minElev) / range : 0.5
    })
  }

  const intensity = style.speedColoring
    ? (style.speedColorIntensity ?? 5)
    : (style.elevationColorIntensity ?? 5)
  const strokeWidth = isGlow ? style.width + 4 : style.width
  const opacity = isGlow ? 0.3 : style.opacity
  const segments: string[] = []

  for (let i = 0; i < lastIndex && i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const color = elevationToColor(normalizedValues[i] ?? 0.5, intensity)
    segments.push(
      `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}"` +
      ` stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" stroke-linecap="round"/>`
    )
  }

  // Handle fractional last segment
  const exactIndex = progress * (points.length - 1)
  const fraction = exactIndex - lastIndex
  if (fraction > 0 && lastIndex + 1 < points.length) {
    const p1 = points[lastIndex]
    const p2 = points[lastIndex + 1]
    const endX = p1.x + (p2.x - p1.x) * fraction
    const endY = p1.y + (p2.y - p1.y) * fraction
    const color = elevationToColor(normalizedValues[lastIndex] ?? 0.5, intensity)
    segments.push(
      `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}"` +
      ` stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" stroke-linecap="round"/>`
    )
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

  // Halo/outline — wider soft copy of the revealed route for depth/readability
  // Uses the route's own color at reduced opacity so it's visible on any background
  if (style.routeHalo) {
    const haloOpacity = style.routeHaloOpacity ?? 0.25
    const haloWidth = style.width + 8
    const revealedForHalo = partialPolyline(points, progress)
    if (revealedForHalo) {
      elements.push(`
        <polyline
          points="${revealedForHalo}"
          fill="none"
          stroke="${style.color}"
          stroke-width="${haloWidth}"
          stroke-opacity="${haloOpacity}"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      `)
    }
  }

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
  if (style.elevationColoring || style.speedColoring) {
    // Colored segments (elevation or speed): individual <line> elements per point pair
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

  // Drawing tip — bright "pen point" at the leading edge (only while animating)
  if (progress > 0 && progress < 1) {
    const tip = getLineTip(points, progress)
    if (tip) {
      elements.push(generateDrawTip(tip.x, tip.y, style.width, style.glowColor, style.glow))
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
  showPulse: boolean = false,
): string {
  const pos = getRouteMarkerPosition(points, progress)
  if (!pos) return ''

  const elements: string[] = []

  // Pulse rings (3 concentric rings at staggered phases)
  if (showPulse) {
    const PULSE_CYCLES = 8
    for (let i = 0; i < 3; i++) {
      const phase = ((progress * PULSE_CYCLES) + i / 3) % 1
      const r = (markerSize * (1.5 + phase * 3.5)).toFixed(1)
      const opacity = (0.55 * (1 - phase)).toFixed(2)
      elements.push(
        `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${r}" ` +
        `fill="none" stroke="${markerColor}" stroke-width="1.5" opacity="${opacity}"/>`
      )
    }
  }

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
