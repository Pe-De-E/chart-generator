/**
 * Road Renderer — Overpass API
 *
 * Fetches major road geometries from OSM Overpass API for the route's bounding
 * box. Renders motorway → secondary roads as subtle orientation aids using a
 * casing (dark outline) + fill (light stroke) technique for legibility on any
 * map background.
 *
 * Tertiary roads are intentionally excluded: they are far too numerous in
 * populated areas and would both slow down the Overpass query and clutter the
 * map. Motorway → secondary already gives a clear orientation skeleton.
 *
 * Request deduplication: if the same cache key is already in-flight, callers
 * share the pending Promise rather than firing duplicate Overpass requests.
 * This prevents the Vue watcher (which fires on every animationConfig change
 * due to contourProjParams returning a new object reference) from cancelling
 * an in-progress fetch by starting a parallel one.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord, smoothPathD } from './geoFeatures'
// ALL Overpass fetches MUST go through this queue — see overpassQueue.ts for why.
import { enqueueOverpassRequest } from './overpassQueue'

// ── Types ────────────────────────────────────────────────────────────────────

export interface RoadConfig {
  color: string
  opacity: number
}

export const DEFAULT_ROAD_CONFIG: RoadConfig = {
  color: '#ffffff',
  opacity: 0.30,
}

interface OverpassElement {
  type: string
  id: number
  tags?: Record<string, string>
  geometry?: Array<{ lat: number; lon: number }>
}

// ── Style map by highway type ─────────────────────────────────────────────────

const ROAD_STYLES: Record<string, { width: number; caseWidth: number }> = {
  motorway:  { width: 3.5, caseWidth: 5.5 },
  trunk:     { width: 2.8, caseWidth: 4.5 },
  primary:   { width: 2.2, caseWidth: 3.8 },
  secondary: { width: 1.6, caseWidth: 2.8 },
}

const ROAD_ORDER = ['motorway', 'trunk', 'primary', 'secondary'] as const

// ── Overpass API ──────────────────────────────────────────────────────────────

const OVERPASS_URL = '/overpass/interpreter'

async function fetchRoadGeometries(bounds: RouteBounds): Promise<OverpassElement[]> {
  const { minLat, maxLon, maxLat, minLon } = bounds

  const query =
    `[out:json][bbox:${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}][timeout:30];\n` +
    `way[highway~"^(motorway|trunk|primary|secondary)$"];\n` +
    `out geom;`

  // Enqueue through the shared rate-limiter — do NOT call fetch() directly.
  // See overpassQueue.ts: concurrent requests from multiple layers → 504 → 429 loop.
  return enqueueOverpassRequest(async () => {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    if (!response.ok) throw new Error(`Overpass road fetch failed: ${response.status}`)
    const data = await response.json()
    return (data.elements || []) as OverpassElement[]
  })
}

// ── SVG Rendering ─────────────────────────────────────────────────────────────

function renderRoadSvg(
  elements: OverpassElement[],
  projParams: ProjectionParams,
  config: RoadConfig,
): string {
  const byType = new Map<string, string[]>()
  for (const rt of ROAD_ORDER) byType.set(rt, [])

  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 2) continue
    const highway = el.tags?.highway ?? ''
    if (!byType.has(highway)) continue

    const projected = el.geometry.map(pt => projectGeoCoord(pt.lon, pt.lat, projParams))
    const d = smoothPathD(projected)
    if (!d) continue

    byType.get(highway)!.push(d)
  }

  const casePaths: string[] = []
  const fillPaths: string[] = []

  for (const rt of ROAD_ORDER) {
    const paths = byType.get(rt) ?? []
    if (paths.length === 0) continue

    const style = ROAD_STYLES[rt]
    for (const d of paths) {
      casePaths.push(
        `<path d="${d}" fill="none" stroke="#000000" stroke-width="${style.caseWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>`
      )
      fillPaths.push(
        `<path d="${d}" fill="none" stroke="${config.color}" stroke-width="${style.width}" stroke-linecap="round" stroke-linejoin="round"/>`
      )
    }
  }

  if (fillPaths.length === 0) return ''

  return `<g opacity="${config.opacity.toFixed(2)}">${casePaths.join('\n')}\n${fillPaths.join('\n')}</g>`
}

// ── Cache & Export ────────────────────────────────────────────────────────────

const roadSvgCache = new Map<string, string>()

/**
 * In-flight requests keyed by cache key.
 * If a caller asks for the same key while a fetch is in progress, they get
 * the same Promise — no duplicate Overpass requests.
 */
const pendingRequests = new Map<string, Promise<string>>()

function buildCacheKey(bounds: RouteBounds, config: RoadConfig): string {
  return (
    `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},` +
    `${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)},${config.color}`
  )
}

/**
 * Generate road SVG for the given route bounds.
 *
 * Fetches major road data from the Overpass API (OpenStreetMap), projects to
 * SVG pixel space, and returns an SVG string. Results are cached per
 * bounds + color so that opacity-only changes don't trigger a re-fetch.
 */
export async function generateRoadLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: RoadConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  const cacheKey = buildCacheKey(routeBounds, config)

  // Return cached result immediately (opacity swap only)
  const cached = roadSvgCache.get(cacheKey)
  if (cached !== undefined) {
    return cached.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
  }

  // Reuse an in-flight request for the same key instead of firing a duplicate
  const existing = pendingRequests.get(cacheKey)
  if (existing) {
    const svg = await existing
    return svg.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
  }

  // Pad bounds so roads extend fully to viewport edges
  const paddedBounds: RouteBounds = {
    minLat: routeBounds.minLat - 0.3,
    maxLat: routeBounds.maxLat + 0.3,
    minLon: routeBounds.minLon - 0.3,
    maxLon: routeBounds.maxLon + 0.3,
    centerLat: routeBounds.centerLat,
    centerLon: routeBounds.centerLon,
  }

  const promise = (async () => {
    const elements = await fetchRoadGeometries(paddedBounds)
    const svg = renderRoadSvg(elements, projectionParams, config)
    roadSvgCache.set(cacheKey, svg)
    pendingRequests.delete(cacheKey)
    return svg
  })()

  pendingRequests.set(cacheKey, promise)
  return promise
}
