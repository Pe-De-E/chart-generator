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
// ALL Overpass fetches MUST go through this queue — see overpassQueue.ts for why.
import { enqueueOverpassRequest } from './overpassQueue'

// ── Types ────────────────────────────────────────────────────────────────────

export interface RiverConfig {
  color: string
  opacity: number
  showLabels: boolean
  riverLabelOffsets?: Record<string, number>  // river name → 0–1 position along river
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

// Primary via Vite proxy; kumi.systems is a CORS-enabled mirror — used as fallback
// when the primary returns 5xx or times out (e.g. after the IP was rate-limited).
// DO NOT remove the fallback: without it, a temporary primary-server hiccup makes
// rivers permanently invisible until the user restarts the dev server.
const OVERPASS_URLS = [
  '/overpass/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/**
 * Query the Overpass API for river and canal ways within the given bounds.
 * Uses `out geom` to include geometry inline (no separate node download).
 *
 * Goes through `enqueueOverpassRequest` — do NOT call fetch() directly here.
 * See overpassQueue.ts for why: concurrent layer loads trigger 504 → 429 loops.
 * Tries each endpoint in order; falls back on 5xx or network error.
 */
async function fetchRiverGeometries(bounds: RouteBounds): Promise<OverpassElement[]> {
  const { minLat, maxLon, maxLat, minLon } = bounds

  const query =
    `[out:json][bbox:${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}][timeout:25];\n` +
    `way[waterway~"^(river|canal|stream)$"];\n` +
    `out geom;`

  const body = `data=${encodeURIComponent(query)}`

  return enqueueOverpassRequest(async () => {
    let lastError: Error = new Error('No Overpass endpoints available')
    for (const url of OVERPASS_URLS) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        })
        if (!response.ok) {
          lastError = new Error(`Overpass river fetch failed: ${response.status}`)
          continue // try next mirror
        }
        const data = await response.json()
        return (data.elements || []) as OverpassElement[]
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
      }
    }
    throw lastError
  })
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
  const detectedNames: string[] = []
  const newCandidates: Record<string, number[]> = {}

  for (const [name, { len, pts }] of longestByName) {
    const approxTextWidth = name.length * RIVER_FONT_SIZE * 0.55
    if (len < MIN_LABEL_LENGTH_PX || len < approxTextWidth * 1.3) continue

    // Compute candidate positions scored by straightness + distance from edges
    const candidates = computeLabelCandidates(pts, viewWidth, viewHeight)
    if (candidates.length === 0) continue
    newCandidates[name] = candidates

    const t = config.riverLabelOffsets?.[name] ?? candidates[0]
    const mid = midpointOnPolyline(pts, t)
    if (mid.x < 0 || mid.x > viewWidth || mid.y < 0 || mid.y > viewHeight) continue

    detectedNames.push(name)
    const tx = mid.x.toFixed(1)
    const ty = (mid.y - 20).toFixed(1)
    const rotate = `rotate(${mid.angle.toFixed(1)} ${tx} ${ty})`
    const baseAttrs = `x="${tx}" y="${ty}" font-size="${RIVER_FONT_SIZE}" font-family="system-ui, sans-serif" font-style="italic" text-anchor="middle"`

    // Halo: render stroke behind fill using paint-order; data attr for click cycling
    labels.push(
      `<text ${baseAttrs} fill="${config.color}" ` +
      `stroke="rgba(0,0,0,0.65)" stroke-width="7" stroke-linejoin="round" paint-order="stroke" ` +
      `transform="${rotate}" data-river-name="${name}" style="cursor:pointer">${name}</text>`
    )

    // Wide invisible hit area along the full river — makes the whole river line clickable
    const hitD = smoothPathD(pts)
    if (hitD) {
      labels.push(
        `<path d="${hitD}" fill="none" stroke="transparent" stroke-width="30" ` +
        `stroke-linecap="round" pointer-events="stroke" ` +
        `data-river-name="${name}" style="cursor:pointer"/>`
      )
    }
  }

  _lastDetectedNames = detectedNames
  _lastLabelCandidates = newCandidates

  const glowGroup = `<g>${glows.join('\n')}</g>`
  const lineGroup = `<g>${lines.join('\n')}</g>`
  return `<g opacity="${config.opacity.toFixed(2)}">${glowGroup}\n${lineGroup}${labels.length > 0 ? '\n' + labels.join('\n') : ''}</g>`
}

// ── Label candidate scoring ───────────────────────────────────────────────────

/**
 * Compute up to `count` good label positions (t=0..1) along a river polyline.
 * Scores each candidate by straightness (low angle delta) and viewport centrality.
 * Returns candidates sorted best-first, spaced at least 0.12 apart.
 */
function computeLabelCandidates(pts: Point2D[], vw: number, vh: number, count = 5): number[] {
  const edgeMargin = Math.min(vw, vh) * 0.08
  const steps = 30
  const scored: { t: number; score: number }[] = []

  for (let i = 1; i < steps - 1; i++) {
    const t = i / (steps - 1)
    const pos = midpointOnPolyline(pts, t)

    // Discard positions outside viewport with margin
    if (pos.x < edgeMargin || pos.x > vw - edgeMargin ||
        pos.y < edgeMargin || pos.y > vh - edgeMargin) continue

    // Straightness: compare angles slightly before and after
    const before = midpointOnPolyline(pts, Math.max(0, t - 0.08))
    const after  = midpointOnPolyline(pts, Math.min(1, t + 0.08))
    const angleDelta = Math.abs(before.angle - after.angle)
    const straightScore = 1 / (1 + angleDelta * 0.05)

    // Centrality: prefer positions toward the center of viewport
    const dx = (pos.x / vw - 0.5) * 2
    const dy = (pos.y / vh - 0.5) * 2
    const centerScore = 1 - Math.sqrt(dx * dx + dy * dy) * 0.5

    scored.push({ t, score: straightScore * 0.65 + centerScore * 0.35 })
  }

  scored.sort((a, b) => b.score - a.score)

  // Pick top candidates ensuring minimum spacing of 0.12
  const result: number[] = []
  for (const { t } of scored) {
    if (result.every(r => Math.abs(r - t) >= 0.12)) {
      result.push(t)
      if (result.length >= count) break
    }
  }
  return result
}

// ── Cache & Export ────────────────────────────────────────────────────────────

// SVG cache — keyed WITHOUT offsets (offsets only affect label positions, not geometry)
const riverSvgCache = new Map<string, string>()
const RIVER_SVG_SESSION_PREFIX = 'river-svg-v1:'

// Element cache — keyed by padded bounds; avoids repeat Overpass fetches on offset change
const riverElementsCache = new Map<string, OverpassElement[]>()
const RIVER_ELEMENTS_SESSION_PREFIX = 'river-elements-v2:'

// Module state read by useRiverTiles / RouteMapChartStep for click cycling
let _lastDetectedNames: string[] = []
let _lastLabelCandidates: Record<string, number[]> = {}
export function getLastDetectedRiverNames(): string[] { return _lastDetectedNames }
export function getLastRiverLabelCandidates(): Record<string, number[]> { return _lastLabelCandidates }

/** Cache key excludes label offsets — offset changes only trigger a re-render, not a re-fetch. */
function buildSvgCacheKey(bounds: RouteBounds, config: RiverConfig, vw: number, vh: number): string {
  return `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)},` +
    `${config.color},${config.showLabels},${vw},${vh}`
}

function buildElementsCacheKey(bounds: RouteBounds): string {
  return `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)}`
}

function getSessionSvg(key: string): string | null {
  try { return sessionStorage.getItem(RIVER_SVG_SESSION_PREFIX + key) } catch { return null }
}
function setSessionSvg(key: string, svg: string): void {
  try { sessionStorage.setItem(RIVER_SVG_SESSION_PREFIX + key, svg) } catch { /* quota */ }
}
function getSessionElements(key: string): OverpassElement[] | null {
  try {
    const raw = sessionStorage.getItem(RIVER_ELEMENTS_SESSION_PREFIX + key)
    return raw ? JSON.parse(raw) as OverpassElement[] : null
  } catch { return null }
}
function setSessionElements(key: string, elements: OverpassElement[]): void {
  try { sessionStorage.setItem(RIVER_ELEMENTS_SESSION_PREFIX + key, JSON.stringify(elements)) } catch { /* quota */ }
}

async function fetchCachedElements(paddedBounds: RouteBounds): Promise<OverpassElement[]> {
  const key = buildElementsCacheKey(paddedBounds)
  const mem = riverElementsCache.get(key)
  if (mem) return mem
  const session = getSessionElements(key)
  if (session) { riverElementsCache.set(key, session); return session }
  const elements = await fetchRiverGeometries(paddedBounds)
  riverElementsCache.set(key, elements)
  setSessionElements(key, elements)
  return elements
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
  const paddedBounds: RouteBounds = {
    minLat: routeBounds.minLat - 0.3,
    maxLat: routeBounds.maxLat + 0.3,
    minLon: routeBounds.minLon - 0.3,
    maxLon: routeBounds.maxLon + 0.3,
    centerLat: routeBounds.centerLat,
    centerLon: routeBounds.centerLon,
  }

  // SVG cache key excludes label offsets — if offsets changed, re-render from cached elements
  // (fast, no network call) rather than re-fetching from Overpass.
  const hasCustomOffsets = config.riverLabelOffsets && Object.keys(config.riverLabelOffsets).length > 0
  const svgKey = buildSvgCacheKey(routeBounds, config, viewWidth, viewHeight)

  if (!hasCustomOffsets) {
    // Try SVG cache first (standard path — no user-defined offsets)
    const inMemory = riverSvgCache.get(svgKey)
    if (inMemory !== undefined)
      return inMemory.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
    const sessionHit = getSessionSvg(svgKey)
    if (sessionHit) {
      riverSvgCache.set(svgKey, sessionHit)
      return sessionHit.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
    }
  }

  // Fetch elements (cached separately — no Overpass call if already loaded)
  const elements = await fetchCachedElements(paddedBounds)
  const svg = renderRiverSvg(elements, projectionParams, config, viewWidth, viewHeight)

  if (!hasCustomOffsets) {
    riverSvgCache.set(svgKey, svg)
    setSessionSvg(svgKey, svg)
  }
  return svg
}
