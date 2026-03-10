/**
 * Forest Layer — Overpass API
 *
 * Fetches forest and woodland polygon data (natural=wood, landuse=forest)
 * from OpenStreetMap via the Overpass API. Renders them as subtle green
 * filled polygons behind the route, giving cartographic depth.
 *
 * Small polygons are filtered by minimum pixel area to avoid clutter
 * in densely forested regions.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord, smoothPathD, type Point2D } from './geoFeatures'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ForestConfig {
  color: string
  opacity: number
}

export const DEFAULT_FOREST_CONFIG: ForestConfig = {
  color: '#4a8c3f',
  opacity: 0.60,
}

interface OverpassMember {
  type: string
  ref: number
  role: string
  geometry?: Array<{ lat: number; lon: number }>
}

interface OverpassElement {
  type: 'way' | 'relation' | 'node'
  id: number
  tags?: Record<string, string>
  geometry?: Array<{ lat: number; lon: number }>
  members?: OverpassMember[]
}

// ── Overpass API ──────────────────────────────────────────────────────────────

const OVERPASS_URL = '/overpass/interpreter'

async function fetchForests(bounds: RouteBounds): Promise<OverpassElement[]> {
  const { minLat, maxLon, maxLat, minLon } = bounds

  const query =
    `[out:json][bbox:${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}][timeout:30];\n` +
    `(\n` +
    `  way[natural=wood];\n` +
    `  way[landuse=forest];\n` +
    `  relation[natural=wood];\n` +
    `  relation[landuse=forest];\n` +
    `);\n` +
    `out geom;`

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) throw new Error(`Overpass forest fetch failed: ${response.status}`)

  const data = await response.json()
  return (data.elements || []) as OverpassElement[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Shoelace formula — returns pixel area of a projected polygon. */
function polygonArea(points: Point2D[]): number {
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area) / 2
}

/** Extract outer polygon rings from a way or relation element. */
function extractRings(el: OverpassElement): Array<Array<{ lat: number; lon: number }>> {
  if (el.type === 'way' && el.geometry && el.geometry.length >= 3) {
    return [el.geometry]
  }
  if (el.type === 'relation' && el.members) {
    return el.members
      .filter(m => m.role === 'outer' && m.geometry && m.geometry.length >= 3)
      .map(m => m.geometry!)
  }
  return []
}

// ── SVG Rendering ─────────────────────────────────────────────────────────────

const MIN_AREA_PX = 400   // skip forest patches smaller than this
const MAX_FORESTS  = 300  // cap total polygons rendered

function renderForestSvg(
  elements: OverpassElement[],
  projParams: ProjectionParams,
  config: ForestConfig,
  viewWidth: number,
  viewHeight: number,
): string {
  const polygons: string[] = []
  let count = 0

  for (const el of elements) {
    if (count >= MAX_FORESTS) break

    const rings = extractRings(el)
    for (const ring of rings) {
      const projected = ring.map(pt => projectGeoCoord(pt.lon, pt.lat, projParams))

      // Quick centroid viewport check
      const avgX = projected.reduce((s, p) => s + p.x, 0) / projected.length
      const avgY = projected.reduce((s, p) => s + p.y, 0) / projected.length
      const margin = 300
      if (avgX < -margin || avgX > viewWidth + margin || avgY < -margin || avgY > viewHeight + margin) continue

      // Skip tiny patches
      if (polygonArea(projected) < MIN_AREA_PX) continue

      const d = smoothPathD(projected)
      if (!d) continue

      polygons.push(
        `<path d="${d} Z" fill="${config.color}" fill-opacity="0.25" stroke="${config.color}" stroke-width="0.5" stroke-opacity="0.30"/>`
      )
      count++
    }
  }

  if (polygons.length === 0) return ''
  return `<g opacity="${config.opacity.toFixed(2)}">${polygons.join('\n')}</g>`
}

// ── Cache & Export ────────────────────────────────────────────────────────────

const forestSvgCache = new Map<string, string>()

function buildCacheKey(bounds: RouteBounds, config: ForestConfig, vw: number, vh: number): string {
  return `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},` +
    `${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)},${config.color},${vw},${vh}`
}

/**
 * Generate forest SVG for the given route bounds.
 * Queries Overpass API for wood/forest polygons, filters by area, returns SVG.
 */
export async function generateForestLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: ForestConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  const cacheKey = buildCacheKey(routeBounds, config, viewWidth, viewHeight)
  const cached = forestSvgCache.get(cacheKey)
  if (cached !== undefined) {
    return cached.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
  }

  const paddedBounds: RouteBounds = {
    minLat: routeBounds.minLat - 0.05,
    maxLat: routeBounds.maxLat + 0.05,
    minLon: routeBounds.minLon - 0.05,
    maxLon: routeBounds.maxLon + 0.05,
    centerLat: routeBounds.centerLat,
    centerLon: routeBounds.centerLon,
  }

  const elements = await fetchForests(paddedBounds)
  const svg = renderForestSvg(elements, projectionParams, config, viewWidth, viewHeight)

  forestSvgCache.set(cacheKey, svg)
  return svg
}
