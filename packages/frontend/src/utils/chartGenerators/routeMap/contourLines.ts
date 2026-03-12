/**
 * Contour Lines (Höhenlinien) Renderer
 *
 * Fetches elevation data from AWS Terrarium terrain tiles, generates
 * contour lines using d3-contour (marching squares), and renders them
 * as SVG paths. Contours are projected using the same equirectangular
 * projection as the route for perfect alignment.
 */

import { contours as d3contours } from 'd3-contour'
import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord, simplifyLine2D } from './geoFeatures'
import { fetchElevationGrid, chooseZoom, type ElevationGrid } from './terrainTiles'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ContourConfig {
  interval: number        // meters between contour lines (default 100)
  majorInterval: number   // meters for major/index lines (default 500)
  color: string           // contour line color
  opacity: number         // overall opacity
  minorWidth: number      // stroke width for minor lines
  majorWidth: number      // stroke width for major lines
  showLabels: boolean     // show elevation text on major contours
}

export const DEFAULT_CONTOUR_CONFIG: ContourConfig = {
  interval: 100,
  majorInterval: 500,
  color: '#8B7355',
  opacity: 0.25,
  minorWidth: 0.6,
  majorWidth: 1.2,
  showLabels: false,
}

// ── Contour Generation & SVG Rendering ───────────────────────────────────────

/**
 * Generate contour SVG from an elevation grid.
 */
function generateContourSvg(
  grid: ElevationGrid,
  projectionParams: ProjectionParams,
  config: ContourConfig,
  viewWidth: number,
  viewHeight: number,
): string {
  // Determine elevation range
  let minElev = Infinity, maxElev = -Infinity
  for (let i = 0; i < grid.data.length; i++) {
    const v = grid.data[i]
    if (v > -500 && v < 9000) { // filter out ocean/invalid
      if (v < minElev) minElev = v
      if (v > maxElev) maxElev = v
    }
  }
  if (minElev >= maxElev) return ''

  // Build threshold array at configured interval
  const startElev = Math.ceil(minElev / config.interval) * config.interval
  const thresholds: number[] = []
  for (let e = startElev; e <= maxElev; e += config.interval) {
    thresholds.push(e)
  }
  if (thresholds.length === 0) return ''

  // Generate contours using d3-contour (marching squares)
  const contourGenerator = d3contours()
    .size([grid.width, grid.height])
    .thresholds(thresholds)

  const contourFeatures = contourGenerator(grid.data as unknown as ArrayLike<number>)

  // Convert grid pixel coordinates to geo coordinates
  const lonPerPx = (grid.bounds.maxLon - grid.bounds.minLon) / grid.width
  const latPerPx = (grid.bounds.maxLat - grid.bounds.minLat) / grid.height

  const paths: string[] = []
  const labels: string[] = []

  for (const feature of contourFeatures) {
    const elevation = feature.value
    const isMajor = elevation % config.majorInterval === 0
    const strokeWidth = isMajor ? config.majorWidth : config.minorWidth

    // Process each ring of the MultiPolygon
    for (const polygon of feature.coordinates) {
      for (const ring of polygon) {
        if (ring.length < 3) continue

        // Convert grid coords → geo coords → SVG pixels
        const projected: Array<{ x: number; y: number }> = ring.map(([gx, gy]) => {
          const lon = grid.bounds.minLon + gx * lonPerPx
          const lat = grid.bounds.maxLat - gy * latPerPx
          return projectGeoCoord(lon, lat, projectionParams)
        })

        // Simplify to reduce path complexity
        const simplified = simplifyLine2D(projected, 1.0)
        if (simplified.length < 3) continue

        // Skip paths entirely outside viewport
        const inView = simplified.some(p =>
          p.x >= -50 && p.x <= viewWidth + 50 &&
          p.y >= -50 && p.y <= viewHeight + 50
        )
        if (!inView) continue

        // Build SVG path
        const d = simplified.map((p, i) =>
          `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
        ).join(' ')

        paths.push(
          `<path d="${d}" fill="none" stroke="${config.color}" ` +
          `stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
        )

        // Add elevation label on major contours
        if (isMajor && config.showLabels && simplified.length >= 4) {
          const label = renderContourLabel(simplified, elevation, config, viewWidth, viewHeight)
          if (label) labels.push(label)
        }
      }
    }
  }

  if (paths.length === 0) return ''

  return `<g class="contour-lines" opacity="${config.opacity.toFixed(2)}">${paths.join('\n')}${labels.length > 0 ? '\n' + labels.join('\n') : ''}</g>`
}

/**
 * Render an elevation label at the midpoint of a contour line.
 */
function renderContourLabel(
  points: Array<{ x: number; y: number }>,
  elevation: number,
  config: ContourConfig,
  viewWidth: number,
  viewHeight: number,
): string | null {
  // Find the arc-length midpoint
  let totalLen = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    totalLen += Math.sqrt(dx * dx + dy * dy)
  }
  if (totalLen < 80) return null // too short for a label

  const halfLen = totalLen / 2
  let accum = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const segLen = Math.sqrt(dx * dx + dy * dy)
    if (accum + segLen >= halfLen) {
      const t = segLen > 0 ? (halfLen - accum) / segLen : 0
      const mx = points[i - 1].x + dx * t
      const my = points[i - 1].y + dy * t

      // Skip labels outside viewport
      if (mx < 20 || mx > viewWidth - 20 || my < 20 || my > viewHeight - 20) return null

      let angle = Math.atan2(dy, dx) * (180 / Math.PI)
      if (angle > 90) angle -= 180
      if (angle < -90) angle += 180

      const fontSize = 18
      const text = `${Math.round(elevation)}`

      return (
        `<text x="${mx.toFixed(1)}" y="${(my - 3).toFixed(1)}" ` +
        `fill="${config.color}" font-size="${fontSize}" font-family="system-ui, sans-serif" ` +
        `text-anchor="middle" ` +
        `transform="rotate(${angle.toFixed(1)} ${mx.toFixed(1)} ${(my - 3).toFixed(1)})">${text}</text>`
      )
    }
    accum += segLen
  }
  return null
}

// ── Caching & Main Export ────────────────────────────────────────────────────

// Cache generated contour SVG by bounds + config (excluding opacity)
const contourSvgCache = new Map<string, string>()

function buildCacheKey(
  bounds: RouteBounds,
  config: ContourConfig,
  vw: number,
  vh: number,
): string {
  return `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)},` +
    `${config.interval},${config.majorInterval},${config.color},${config.showLabels},${vw},${vh}`
}

/**
 * Generate contour lines SVG for the given route bounds.
 *
 * Fetches terrain tiles from AWS Terrarium, generates contour lines
 * using d3-contour, projects to SVG pixel space, and returns an SVG string.
 * Results are cached per bounds + config to avoid redundant processing.
 */
export async function generateContourLines(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: ContourConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  const cacheKey = buildCacheKey(routeBounds, config, viewWidth, viewHeight)
  const cached = contourSvgCache.get(cacheKey)
  if (cached !== undefined) {
    return cached.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
  }

  const zoom = chooseZoom(routeBounds)

  // Pad bounds slightly to ensure contours extend to viewport edges
  const paddedBounds: RouteBounds = {
    minLat: routeBounds.minLat - 0.05,
    maxLat: routeBounds.maxLat + 0.05,
    minLon: routeBounds.minLon - 0.05,
    maxLon: routeBounds.maxLon + 0.05,
    centerLat: routeBounds.centerLat,
    centerLon: routeBounds.centerLon,
  }

  const grid = await fetchElevationGrid(paddedBounds, zoom)
  const svg = generateContourSvg(grid, projectionParams, config, viewWidth, viewHeight)

  contourSvgCache.set(cacheKey, svg)
  return svg
}
