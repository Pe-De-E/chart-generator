/**
 * Water Layer — Overpass API
 *
 * Fetches lakes, ponds and reservoirs (natural=water) from OpenStreetMap
 * via the Overpass API. Rendered as soft blue filled polygons behind the
 * route, giving the map an immediate cartographic quality boost.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord, smoothPathD, type Point2D } from './geoFeatures'

// ── Types ────────────────────────────────────────────────────────────────────

export interface WaterConfig {
  color: string
  opacity: number
}

export const DEFAULT_WATER_CONFIG: WaterConfig = {
  color: '#4a90d9',
  opacity: 0.70,
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

async function fetchWaterBodies(bounds: RouteBounds): Promise<OverpassElement[]> {
  const { minLat, maxLon, maxLat, minLon } = bounds

  const query =
    `[out:json][bbox:${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}][timeout:30];\n` +
    `(\n` +
    `  way[natural=water];\n` +
    `  way[landuse=reservoir];\n` +
    `  relation[natural=water];\n` +
    `  relation[landuse=reservoir];\n` +
    `);\n` +
    `out geom;`

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) throw new Error(`Overpass water fetch failed: ${response.status}`)

  const data = await response.json()
  return (data.elements || []) as OverpassElement[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const MIN_AREA_PX = 200
const MAX_WATER_BODIES = 200

function renderWaterSvg(
  elements: OverpassElement[],
  projParams: ProjectionParams,
  config: WaterConfig,
  viewWidth: number,
  viewHeight: number,
): string {
  const polygons: string[] = []
  let count = 0

  for (const el of elements) {
    if (count >= MAX_WATER_BODIES) break

    const rings = extractRings(el)
    for (const ring of rings) {
      const projected = ring.map(pt => projectGeoCoord(pt.lon, pt.lat, projParams))

      const avgX = projected.reduce((s, p) => s + p.x, 0) / projected.length
      const avgY = projected.reduce((s, p) => s + p.y, 0) / projected.length
      const margin = 300
      if (avgX < -margin || avgX > viewWidth + margin || avgY < -margin || avgY > viewHeight + margin) continue

      if (polygonArea(projected) < MIN_AREA_PX) continue

      const d = smoothPathD(projected)
      if (!d) continue

      polygons.push(
        `<path d="${d} Z" fill="${config.color}" fill-opacity="0.55" stroke="${config.color}" stroke-width="1" stroke-opacity="0.70"/>`
      )
      count++
    }
  }

  if (polygons.length === 0) return ''
  return `<g opacity="${config.opacity.toFixed(2)}">${polygons.join('\n')}</g>`
}

// ── Cache & Export ────────────────────────────────────────────────────────────

const waterSvgCache = new Map<string, string>()

function buildCacheKey(bounds: RouteBounds, config: WaterConfig, vw: number, vh: number): string {
  return `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},` +
    `${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)},${config.color},${vw},${vh}`
}

export async function generateWaterLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: WaterConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  const cacheKey = buildCacheKey(routeBounds, config, viewWidth, viewHeight)
  const cached = waterSvgCache.get(cacheKey)
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

  const elements = await fetchWaterBodies(paddedBounds)
  const svg = renderWaterSvg(elements, projectionParams, config, viewWidth, viewHeight)

  waterSvgCache.set(cacheKey, svg)
  return svg
}
