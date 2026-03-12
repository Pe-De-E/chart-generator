/**
 * Shared Overpass API polygon layer pipeline.
 *
 * Provides the common fetch → extract → project → cull → render pipeline
 * used by forest, water, and place boundary layers. Each layer passes its
 * own Overpass filters, style constants, and per-layer cache map.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord, smoothPathD, type Point2D } from './geoFeatures'

// ── Shared Overpass types ─────────────────────────────────────────────────────

export interface OverpassMember {
  type: string
  ref: number
  role: string
  geometry?: Array<{ lat: number; lon: number }>
}

export interface OverpassElement {
  type: 'way' | 'relation' | 'node'
  id: number
  tags?: Record<string, string>
  geometry?: Array<{ lat: number; lon: number }>
  members?: OverpassMember[]
}

// ── Style config passed by each layer ────────────────────────────────────────

export interface PolygonLayerStyle {
  fillOpacity: number
  strokeWidth: number
  strokeOpacity: number
  strokeDasharray?: string
  strokeLinecap?: string
  strokeLinejoin?: string
  /** Skip polygons with projected pixel area below this threshold (default 0 = no filter). */
  minAreaPx?: number
  /** Cap total rendered rings (default 300). */
  maxPolygons?: number
  /** Skip centroids further than this many px outside the viewport (default 300). */
  viewportMargin?: number
  /** If set, skip elements that don't have this tag key (e.g. 'place'). */
  requireTag?: string
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

const OVERPASS_URL = '/overpass/interpreter'

/** POST a single Overpass query for the given filters within bbox. */
export async function fetchOverpassElements(
  filters: string[],
  bounds: RouteBounds,
): Promise<OverpassElement[]> {
  const { minLat, maxLon, maxLat, minLon } = bounds
  const bbox = `${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}`
  const query =
    `[out:json][bbox:${bbox}][timeout:30];\n` +
    `(\n${filters.map(f => `  ${f};`).join('\n')}\n);\n` +
    `out geom;`

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) throw new Error(`Overpass fetch failed: ${response.status}`)
  const data = await response.json()
  return (data.elements || []) as OverpassElement[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract outer polygon rings from a way or relation element. */
export function extractRings(el: OverpassElement): Array<Array<{ lat: number; lon: number }>> {
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

/** Shoelace formula — returns pixel area of a projected polygon. */
export function polygonArea(points: Point2D[]): number {
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area) / 2
}

/** Pad bounds outward by 0.05° to include polygons that straddle the edge. */
function padBounds(bounds: RouteBounds): RouteBounds {
  return {
    minLat: bounds.minLat - 0.05,
    maxLat: bounds.maxLat + 0.05,
    minLon: bounds.minLon - 0.05,
    maxLon: bounds.maxLon + 0.05,
    centerLat: bounds.centerLat,
    centerLon: bounds.centerLon,
  }
}

/**
 * Cache key that excludes opacity so we can cache the SVG once and swap
 * the opacity attribute on cache hits without re-fetching.
 */
export function buildPolygonCacheKey(
  bounds: RouteBounds,
  color: string,
  vw: number,
  vh: number,
): string {
  return (
    `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},` +
    `${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)},${color},${vw},${vh}`
  )
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderPolygons(
  elements: OverpassElement[],
  projParams: ProjectionParams,
  config: { color: string; opacity: number },
  style: PolygonLayerStyle,
  viewWidth: number,
  viewHeight: number,
): string {
  const {
    fillOpacity,
    strokeWidth,
    strokeOpacity,
    strokeDasharray,
    strokeLinecap,
    strokeLinejoin,
    minAreaPx = 0,
    maxPolygons = 300,
    viewportMargin = 300,
    requireTag,
  } = style

  const paths: string[] = []
  let count = 0

  for (const el of elements) {
    if (count >= maxPolygons) break
    if (requireTag && !el.tags?.[requireTag]) continue

    const rings = extractRings(el)
    for (const ring of rings) {
      const projected = ring.map(pt => projectGeoCoord(pt.lon, pt.lat, projParams))

      // Skip if centroid is far outside viewport
      const avgX = projected.reduce((s, p) => s + p.x, 0) / projected.length
      const avgY = projected.reduce((s, p) => s + p.y, 0) / projected.length
      if (
        avgX < -viewportMargin || avgX > viewWidth + viewportMargin ||
        avgY < -viewportMargin || avgY > viewHeight + viewportMargin
      ) continue

      if (minAreaPx > 0 && polygonArea(projected) < minAreaPx) continue

      const d = smoothPathD(projected)
      if (!d) continue

      let attrs =
        `d="${d} Z" fill="${config.color}" fill-opacity="${fillOpacity}" ` +
        `stroke="${config.color}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"`
      if (strokeDasharray) attrs += ` stroke-dasharray="${strokeDasharray}"`
      if (strokeLinecap)   attrs += ` stroke-linecap="${strokeLinecap}"`
      if (strokeLinejoin)  attrs += ` stroke-linejoin="${strokeLinejoin}"`

      paths.push(`<path ${attrs}/>`)
      count++
    }
  }

  if (paths.length === 0) return ''
  return `<g opacity="${config.opacity.toFixed(2)}">${paths.join('\n')}</g>`
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetch Overpass polygon data, render as SVG, and cache the result.
 *
 * @param filters  Overpass filter strings, e.g. `['way[natural=wood]', ...]`
 * @param cache    Per-layer Map — owned by the caller so each layer is independent
 * @param bounds   Route bounding box (will be padded by 0.05° before querying)
 * @param projParams  Projection parameters for pixel coordinate mapping
 * @param config   Layer config with `color` and `opacity`
 * @param style    Visual style constants (fill/stroke opacities, dashes, area filter…)
 * @param viewWidth  Canvas width in pixels
 * @param viewHeight Canvas height in pixels
 */
export async function generateOverpassPolygonLayer(
  filters: string[],
  cache: Map<string, string>,
  bounds: RouteBounds,
  projParams: ProjectionParams,
  config: { color: string; opacity: number },
  style: PolygonLayerStyle,
  viewWidth: number,
  viewHeight: number,
): Promise<string> {
  const cacheKey = buildPolygonCacheKey(bounds, config.color, viewWidth, viewHeight)
  const cached = cache.get(cacheKey)
  if (cached !== undefined) {
    // Swap opacity without re-fetching
    return cached.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
  }

  const elements = await fetchOverpassElements(filters, padBounds(bounds))
  const svg = renderPolygons(elements, projParams, config, style, viewWidth, viewHeight)

  cache.set(cacheKey, svg)
  return svg
}
