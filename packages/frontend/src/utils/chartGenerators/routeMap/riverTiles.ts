/**
 * River Renderer — Overpass API
 *
 * Fetches river and canal geometries from the OpenStreetMap Overpass API
 * for the route's bounding box. Much simpler and more reliable than MVT
 * vector tiles — one POST request returns all waterway geometries as JSON.
 *
 * Rendered as SVG paths using the same equirectangular projection as the route.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import {
  projectGeoCoord,
  smoothPathD,
  polylineLength,
  midpointOnPolyline,
  clipPolylineToViewport,
  type Point2D,
} from './geoFeatures'

// ── Types ────────────────────────────────────────────────────────────────────

export interface RiverConfig {
  color: string
  opacity: number
  showLabels: boolean
}

export const DEFAULT_RIVER_CONFIG: RiverConfig = {
  color: '#4a90d9',
  opacity: 0.40,
  showLabels: true,
}

interface OverpassElement {
  type: string
  id: number
  tags?: Record<string, string>
  geometry?: Array<{ lat: number; lon: number }>
}

// ── Overpass API ──────────────────────────────────────────────────────────────

const OVERPASS_URL = '/overpass/interpreter'

/**
 * Query the Overpass API for river and canal ways within the given bounds.
 * Uses `out geom` to include geometry inline (no separate node download).
 */
async function fetchRiverGeometries(bounds: RouteBounds): Promise<OverpassElement[]> {
  const { minLat, maxLon, maxLat, minLon } = bounds

  const query =
    `[out:json][bbox:${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}][timeout:25];\n` +
    `way[waterway~"^(river|canal|stream)$"];\n` +
    `out geom;`

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) {
    throw new Error(`Overpass API failed: ${response.status}`)
  }

  const data = await response.json()
  return (data.elements || []) as OverpassElement[]
}

// ── SVG Rendering ─────────────────────────────────────────────────────────────

function renderRiverSvg(
  elements: OverpassElement[],
  projParams: ProjectionParams,
  config: RiverConfig,
  viewWidth: number,
  viewHeight: number,
): string {
  const glows: string[] = []
  const lines: string[] = []
  const longestByName = new Map<string, { len: number; pts: Point2D[] }>()

  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 2) continue

    const projected = el.geometry.map(pt => projectGeoCoord(pt.lon, pt.lat, projParams))
    const d = smoothPathD(projected)
    if (!d) continue

    const cls = el.tags?.waterway || 'river'
    const strokeWidth = cls === 'river' ? 2.5 : cls === 'canal' ? 1.5 : 0.8
    const glowWidth = strokeWidth * 3.5
    const glowOpacity = cls === 'stream' ? 0.25 : 0.35

    // Glow layer (wide, soft)
    glows.push(
      `<path d="${d}" fill="none" stroke="${config.color}" stroke-width="${glowWidth}" stroke-linecap="round" opacity="${glowOpacity}"/>`
    )
    // Crisp line on top
    lines.push(
      `<path d="${d}" fill="none" stroke="${config.color}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.9"/>`
    )

    // Track longest visible segment per river name for label placement
    if (config.showLabels && el.tags?.name) {
      const name = el.tags.name
      const visible = clipPolylineToViewport(projected, viewWidth, viewHeight)
      if (visible.length >= 2) {
        const len = polylineLength(visible)
        const prev = longestByName.get(name)
        if (!prev || len > prev.len) {
          longestByName.set(name, { len, pts: visible })
        }
      }
    }
  }

  if (lines.length === 0) return ''

  const labels: string[] = []
  const MIN_LABEL_LENGTH_PX = 80
  const RIVER_FONT_SIZE = 38
  for (const [name, { len, pts }] of longestByName) {
    const approxTextWidth = name.length * RIVER_FONT_SIZE * 0.55
    if (len < MIN_LABEL_LENGTH_PX || len < approxTextWidth * 1.3) continue

    const mid = midpointOnPolyline(pts)
    if (mid.x < 0 || mid.x > viewWidth || mid.y < 0 || mid.y > viewHeight) continue

    labels.push(
      `<text x="${mid.x.toFixed(1)}" y="${(mid.y - 20).toFixed(1)}" ` +
      `fill="${config.color}" font-size="${RIVER_FONT_SIZE}" font-family="system-ui, sans-serif" ` +
      `font-style="italic" text-anchor="middle" ` +
      `transform="rotate(${mid.angle.toFixed(1)} ${mid.x.toFixed(1)} ${(mid.y - 20).toFixed(1)})">${name}</text>`
    )
  }

  const glowGroup = `<g>${glows.join('\n')}</g>`
  const lineGroup = `<g>${lines.join('\n')}</g>`
  return `<g opacity="${config.opacity.toFixed(2)}">${glowGroup}\n${lineGroup}${labels.length > 0 ? '\n' + labels.join('\n') : ''}</g>`
}

// ── Cache & Export ────────────────────────────────────────────────────────────

const riverSvgCache = new Map<string, string>()

function buildCacheKey(bounds: RouteBounds, config: RiverConfig, vw: number, vh: number): string {
  return `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)},` +
    `${config.color},${config.showLabels},${vw},${vh}`
}

/**
 * Generate river SVG for the given route bounds.
 *
 * Fetches waterway data from the Overpass API (OpenStreetMap), projects
 * to SVG pixel space, and returns an SVG string. Results are cached
 * per bounds + config to avoid redundant requests.
 */
export async function generateRiverLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: RiverConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  const cacheKey = buildCacheKey(routeBounds, config, viewWidth, viewHeight)
  const cached = riverSvgCache.get(cacheKey)
  if (cached !== undefined) {
    return cached.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
  }

  // Pad bounds so rivers extend fully to the viewport edges.
  // 0.3° ≈ 25 km — enough for rivers that don't flow directly away from the route.
  const paddedBounds: RouteBounds = {
    minLat: routeBounds.minLat - 0.3,
    maxLat: routeBounds.maxLat + 0.3,
    minLon: routeBounds.minLon - 0.3,
    maxLon: routeBounds.maxLon + 0.3,
    centerLat: routeBounds.centerLat,
    centerLon: routeBounds.centerLon,
  }

  const elements = await fetchRiverGeometries(paddedBounds)
  const svg = renderRiverSvg(elements, projectionParams, config, viewWidth, viewHeight)

  riverSvgCache.set(cacheKey, svg)
  return svg
}
