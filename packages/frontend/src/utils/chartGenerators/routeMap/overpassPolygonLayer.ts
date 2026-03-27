/**
 * Shared Overpass API polygon layer pipeline.
 *
 * Provides the common fetch → extract → project → cull → render pipeline
 * used by forest, water, and place boundary layers. Each layer passes its
 * own Overpass filters, style constants, and per-layer cache map.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord, smoothPathD, type Point2D } from './geoFeatures'
// ALL Overpass fetches MUST go through this queue — see overpassQueue.ts for why.
import { enqueueOverpassPost } from './overpassQueue'

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
  /** Degrees of padding added to route bounds when fetching (default 0.3 ≈ 25 km).
   *  Use a smaller value for water to avoid fetching large distant water bodies. */
  fetchPaddingDeg?: number
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

const ELEMENTS_SESSION_PREFIX = 'overpass-elements-v1:'

/**
 * Module-level elements cache keyed by filters + bounds.
 * Shared across all layers so that color-only changes never re-fetch.
 */
const elementsCache = new Map<string, OverpassElement[]>()

function buildElementsCacheKey(filters: string[], bounds: RouteBounds): string {
  return (
    `${filters.join('|')},` +
    `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},` +
    `${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)}`
  )
}

function getSessionElements(key: string): OverpassElement[] | null {
  try {
    const raw = sessionStorage.getItem(ELEMENTS_SESSION_PREFIX + key)
    return raw ? (JSON.parse(raw) as OverpassElement[]) : null
  } catch { return null }
}

function setSessionElements(key: string, elements: OverpassElement[]): void {
  try {
    sessionStorage.setItem(ELEMENTS_SESSION_PREFIX + key, JSON.stringify(elements))
  } catch { /* quota exceeded or unavailable */ }
}

/** POST a single Overpass query for the given filters within bbox. */
export async function fetchOverpassElements(
  filters: string[],
  bounds: RouteBounds,
): Promise<OverpassElement[]> {
  const cacheKey = buildElementsCacheKey(filters, bounds)

  // 1. In-memory (fastest)
  const inMemory = elementsCache.get(cacheKey)
  if (inMemory) return inMemory

  // 2. sessionStorage (survives page reloads — avoids re-fetching on every HMR reload)
  const sessionHit = getSessionElements(cacheKey)
  if (sessionHit) {
    elementsCache.set(cacheKey, sessionHit)
    return sessionHit
  }

  const { minLat, maxLon, maxLat, minLon } = bounds
  const bbox = `${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}`
  const query =
    `[out:json][bbox:${bbox}][timeout:30];\n` +
    `(\n${filters.map(f => `  ${f};`).join('\n')}\n);\n` +
    `out geom;`

  // Enqueue through the shared rate-limiter with automatic endpoint fallback.
  // See overpassQueue.ts: concurrent requests from multiple layers → 504 → 429 loop.
  const data = await enqueueOverpassPost(`data=${encodeURIComponent(query)}`)
  const elements = (data.elements || []) as OverpassElement[]
  elementsCache.set(cacheKey, elements)
  setSessionElements(cacheKey, elements)
  return elements
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


/** Bump to bust all polygon SVG caches (e.g. after renderPolygons changes). */
const POLYGON_CACHE_VERSION = 2

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
    `v${POLYGON_CACHE_VERSION},` +
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

    // Build list of { outer, holes } groups.
    // For ways: single outer, no holes.
    // For relations: each outer member gets all inner members as holes (evenodd fill rule punches them out).
    type RingGroup = { outer: Array<{ lat: number; lon: number }>; holes: Array<Array<{ lat: number; lon: number }>> }
    const groups: RingGroup[] = []

    if (el.type === 'way' && el.geometry && el.geometry.length >= 3) {
      groups.push({ outer: el.geometry, holes: [] })
    } else if (el.type === 'relation' && el.members) {
      const outerMembers = el.members.filter(m => m.role === 'outer' && m.geometry && m.geometry.length >= 3)
      const innerMembers = el.members.filter(m => m.role === 'inner' && m.geometry && m.geometry.length >= 3)
      const holes = innerMembers.map(m => m.geometry!)
      for (const om of outerMembers) {
        groups.push({ outer: om.geometry!, holes })
      }
    }

    for (const { outer, holes } of groups) {
      if (count >= maxPolygons) break
      const projected = outer.map(pt => projectGeoCoord(pt.lon, pt.lat, projParams))

      // Skip if centroid is far outside viewport
      const avgX = projected.reduce((s, p) => s + p.x, 0) / projected.length
      const avgY = projected.reduce((s, p) => s + p.y, 0) / projected.length
      if (
        avgX < -viewportMargin || avgX > viewWidth + viewportMargin ||
        avgY < -viewportMargin || avgY > viewHeight + viewportMargin
      ) continue

      if (minAreaPx > 0 && polygonArea(projected) < minAreaPx) continue

      const outerD = smoothPathD(projected)
      if (!outerD) continue

      // Build compound path: outer ring + hole rings (evenodd rule punches holes)
      let pathD = outerD + ' Z'
      for (const hole of holes) {
        const holeProjected = hole.map(pt => projectGeoCoord(pt.lon, pt.lat, projParams))
        const holeD = smoothPathD(holeProjected)
        if (holeD) pathD += ' ' + holeD + ' Z'
      }

      const fillRule = holes.length > 0 ? ' fill-rule="evenodd"' : ''
      let attrs =
        `d="${pathD}" fill="${config.color}" fill-opacity="${fillOpacity}"${fillRule} ` +
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

  const pad = style.fetchPaddingDeg ?? 0.3
  const paddedBounds: RouteBounds = {
    minLat: bounds.minLat - pad, maxLat: bounds.maxLat + pad,
    minLon: bounds.minLon - pad, maxLon: bounds.maxLon + pad,
    centerLat: bounds.centerLat, centerLon: bounds.centerLon,
  }
  const elements = await fetchOverpassElements(filters, paddedBounds)
  const svg = renderPolygons(elements, projParams, config, style, viewWidth, viewHeight)

  cache.set(cacheKey, svg)
  return svg
}
