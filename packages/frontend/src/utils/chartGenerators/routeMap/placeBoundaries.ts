/**
 * Place Boundary Layer — Overpass API
 *
 * Fetches city/town/village outline polygons from OpenStreetMap via the
 * Overpass API. Renders them as subtle filled polygons with a dotted outline,
 * giving a cartographic "urban footprint" look behind the route.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord, smoothPathD } from './geoFeatures'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlaceBoundaryConfig {
  color: string
  opacity: number
}

export const DEFAULT_PLACE_BOUNDARY_CONFIG: PlaceBoundaryConfig = {
  color: '#ffffff',
  opacity: 0.50,
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

async function fetchPlaceBoundaries(bounds: RouteBounds): Promise<OverpassElement[]> {
  const { minLat, maxLon, maxLat, minLon } = bounds

  const query =
    `[out:json][bbox:${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}][timeout:30];\n` +
    `(\n` +
    `  way[place~"^(city|town|village)$"];\n` +
    `  relation[place~"^(city|town|village)$"];\n` +
    `);\n` +
    `out geom;`

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) throw new Error(`Overpass place boundary fetch failed: ${response.status}`)

  const data = await response.json()
  return (data.elements || []) as OverpassElement[]
}

// ── Polygon Assembly ──────────────────────────────────────────────────────────

/**
 * Extract polygon rings from an Overpass element.
 * Ways have direct geometry; relations have outer member way geometries.
 */
function extractRings(el: OverpassElement): Array<Array<{ lat: number; lon: number }>> {
  if (el.type === 'way' && el.geometry && el.geometry.length >= 3) {
    return [el.geometry]
  }

  if (el.type === 'relation' && el.members) {
    const rings: Array<Array<{ lat: number; lon: number }>> = []
    for (const member of el.members) {
      if (member.role === 'outer' && member.geometry && member.geometry.length >= 3) {
        rings.push(member.geometry)
      }
    }
    return rings
  }

  return []
}

// ── SVG Rendering ─────────────────────────────────────────────────────────────

function renderPlaceBoundarySvg(
  elements: OverpassElement[],
  projParams: ProjectionParams,
  config: PlaceBoundaryConfig,
  viewWidth: number,
  viewHeight: number,
): string {
  const polygons: string[] = []

  // Limit total polygons to avoid clutter
  let count = 0
  const MAX_PLACES = 20

  for (const el of elements) {
    if (count >= MAX_PLACES) break
    if (!el.tags?.place) continue

    const rings = extractRings(el)
    if (rings.length === 0) continue

    for (const ring of rings) {
      const projected = ring.map(pt => projectGeoCoord(pt.lon, pt.lat, projParams))

      // Quick viewport check: skip if centroid is far outside
      const avgX = projected.reduce((s, p) => s + p.x, 0) / projected.length
      const avgY = projected.reduce((s, p) => s + p.y, 0) / projected.length
      const margin = 200
      if (avgX < -margin || avgX > viewWidth + margin || avgY < -margin || avgY > viewHeight + margin) continue

      const d = smoothPathD(projected)
      if (!d) continue

      polygons.push(
        `<path d="${d} Z" ` +
        `fill="${config.color}" fill-opacity="0.07" ` +
        `stroke="${config.color}" stroke-width="1.5" stroke-opacity="0.40" ` +
        `stroke-dasharray="5,3" ` +
        `stroke-linecap="round" stroke-linejoin="round"/>`
      )
    }

    count++
  }

  if (polygons.length === 0) return ''
  return `<g opacity="${config.opacity.toFixed(2)}">${polygons.join('\n')}</g>`
}

// ── Cache & Export ────────────────────────────────────────────────────────────

const placeBoundarySvgCache = new Map<string, string>()

function buildCacheKey(bounds: RouteBounds, config: PlaceBoundaryConfig, vw: number, vh: number): string {
  return `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},` +
    `${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)},${config.color},${vw},${vh}`
}

/**
 * Generate place boundary SVG for the given route bounds.
 * Queries Overpass API for city/town/village polygons, returns SVG string.
 */
export async function generatePlaceBoundaryLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: PlaceBoundaryConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  const cacheKey = buildCacheKey(routeBounds, config, viewWidth, viewHeight)
  const cached = placeBoundarySvgCache.get(cacheKey)
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

  const elements = await fetchPlaceBoundaries(paddedBounds)
  const svg = renderPlaceBoundarySvg(elements, projectionParams, config, viewWidth, viewHeight)

  placeBoundarySvgCache.set(cacheKey, svg)
  return svg
}
