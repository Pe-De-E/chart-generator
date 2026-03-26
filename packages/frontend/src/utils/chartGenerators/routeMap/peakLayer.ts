/**
 * Peak Layer — Overpass API
 *
 * Fetches mountain peak data (natural=peak) from OpenStreetMap via the
 * Overpass API for the route's bounding box. Renders peaks as small
 * triangle symbols with name + elevation labels.
 *
 * Selection: sorts by elevation (highest first), applies minimum pixel
 * distance between peaks to avoid crowding, limits to 15 peaks.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord, labelOverlapsRoute } from './geoFeatures'
// ALL Overpass fetches MUST go through this queue — see overpassQueue.ts for why.
import { enqueueOverpassRequest } from './overpassQueue'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PeakConfig {
  color: string
  opacity: number
}

export const DEFAULT_PEAK_CONFIG: PeakConfig = {
  color: '#ffffff',
  opacity: 0.70,
}

interface OSMPeak {
  id: number
  lat: number
  lon: number
  name: string
  ele: number   // meters, 0 if unknown
}

// ── Overpass API ──────────────────────────────────────────────────────────────

const OVERPASS_URL = '/overpass/interpreter'

async function fetchPeaks(bounds: RouteBounds): Promise<OSMPeak[]> {
  const { minLat, maxLon, maxLat, minLon } = bounds

  const query =
    `[out:json][bbox:${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}][timeout:25];\n` +
    `node[natural=peak];\n` +
    `out body;`

  // Enqueue through the shared rate-limiter — do NOT call fetch() directly.
  // See overpassQueue.ts: concurrent requests from multiple layers → 504 → 429 loop.
  return enqueueOverpassRequest(async () => {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    if (!response.ok) throw new Error(`Overpass peak fetch failed: ${response.status}`)
    const data = await response.json()
    const elements = (data.elements || []) as Array<{
      id: number; lat: number; lon: number; tags?: Record<string, string>
    }>
    return elements.map(el => ({
      id: el.id,
      lat: el.lat,
      lon: el.lon,
      name: el.tags?.name || el.tags?.['name:de'] || '',
      ele: el.tags?.ele ? (parseFloat(el.tags.ele) || 0) : 0,
    }))
  })
}

// ── Peak Selection ────────────────────────────────────────────────────────────

/**
 * Select peaks to render: highest elevation first, decluttered by min
 * pixel distance, capped at maxCount. Unnamed peaks are excluded.
 */
function selectPeaks(
  peaks: OSMPeak[],
  projParams: ProjectionParams,
  viewWidth: number,
  viewHeight: number,
  maxCount = 10,
  minDistPx = 160,
): Array<OSMPeak & { svgX: number; svgY: number }> {
  // Highest peaks first; fall back to name-only peaks at the end
  const sorted = [...peaks].filter(p => p.name).sort((a, b) => b.ele - a.ele)

  const selected: Array<OSMPeak & { svgX: number; svgY: number }> = []

  for (const peak of sorted) {
    if (selected.length >= maxCount) break

    const { x, y } = projectGeoCoord(peak.lon, peak.lat, projParams)

    // Skip peaks outside the visible viewport (small margin)
    const margin = 40
    if (x < -margin || x > viewWidth + margin || y < -margin || y > viewHeight + margin) continue

    // Declutter: skip if too close to an already-selected peak
    let tooClose = false
    for (const s of selected) {
      const dx = x - s.svgX
      const dy = y - s.svgY
      if (dx * dx + dy * dy < minDistPx * minDistPx) { tooClose = true; break }
    }
    if (tooClose) continue

    selected.push({ ...peak, svgX: x, svgY: y })
  }

  return selected
}

// ── SVG Rendering ─────────────────────────────────────────────────────────────

function renderPeakSvg(
  peaks: OSMPeak[],
  projParams: ProjectionParams,
  config: PeakConfig,
  viewWidth: number,
  viewHeight: number,
  routePoints?: ReadonlyArray<{ x: number; y: number }>,
): string {
  const selected = selectPeaks(peaks, projParams, viewWidth, viewHeight)
  if (selected.length === 0) return ''

  const fontSize = 24
  const symbolHalf = 8   // half-width of triangle base
  const symbolHeight = 16 // total triangle height
  const gap = symbolHalf + 5
  const charWidth = fontSize * 0.65  // conservative estimate to avoid underestimating label width
  const elements: string[] = []

  // Track placed label bounding boxes to prevent label-to-label overlap
  const placedRects: Array<{ x: number; y: number; w: number; h: number }> = []

  for (const p of selected) {
    const { svgX: x, svgY: y } = p

    const label = p.ele > 0
      ? `${p.name} (${Math.round(p.ele)}m)`
      : p.name

    const labelW = Math.ceil(label.length * charWidth)
    const labelH = fontSize

    // textY is the SVG text baseline; vertically centers text beside the triangle
    const textY = y - symbolHeight / 2 + fontSize / 3

    // Try placement directions: right, left, above-right, above-left
    const placementCandidates = [
      { textX: x + gap, textY, anchor: 'start' as const },
      { textX: x - gap, textY, anchor: 'end' as const },
      { textX: x + gap, textY: y - symbolHeight - 4, anchor: 'start' as const },
      { textX: x - gap, textY: y - symbolHeight - 4, anchor: 'end' as const },
    ]

    let chosenRect: { x: number; y: number; w: number; h: number } | null = null
    let chosenPlacement = placementCandidates[0]

    for (const c of placementCandidates) {
      const rx = c.anchor === 'end' ? c.textX - labelW : c.textX
      const ry = c.textY - fontSize
      const rect = { x: rx, y: ry, w: labelW, h: labelH }

      // labelOverlapsRoute uses (x, baseline_y, w, h) convention
      const hitsRoute = routePoints && routePoints.length > 0
        && labelOverlapsRoute(rx, c.textY, labelW, labelH, routePoints, 10)

      const hitsLabel = placedRects.some(r =>
        rect.x < r.x + r.w + 12 && rect.x + rect.w + 12 > r.x &&
        rect.y < r.y + r.h + 12 && rect.y + rect.h + 12 > r.y
      )

      const outOfBounds = rx < 4 || rx + labelW > viewWidth - 4
        || ry < 4 || ry + labelH > viewHeight - 4

      if (!hitsRoute && !hitsLabel && !outOfBounds) {
        chosenRect = rect
        chosenPlacement = c
        break
      }
    }

    // Skip this peak entirely if no label placement is possible
    if (!chosenRect) continue

    placedRects.push(chosenRect)

    // Render triangle icon and label together (only when a clean spot was found)
    elements.push(
      `<polygon points="${x.toFixed(1)},${(y - symbolHeight).toFixed(1)} ` +
      `${(x - symbolHalf).toFixed(1)},${y.toFixed(1)} ` +
      `${(x + symbolHalf).toFixed(1)},${y.toFixed(1)}" fill="${config.color}"/>`
    )

    const anchorAttr = chosenPlacement.anchor === 'end' ? ' text-anchor="end"' : ''
    elements.push(
      `<text x="${chosenPlacement.textX.toFixed(1)}" y="${chosenPlacement.textY.toFixed(1)}" ` +
      `fill="${config.color}" font-size="${fontSize}" font-family="system-ui, sans-serif"${anchorAttr}>${label}</text>`
    )
  }

  return `<g opacity="${config.opacity.toFixed(2)}">${elements.join('\n')}</g>`
}

// ── Cache & Export ────────────────────────────────────────────────────────────

const peakSvgCache = new Map<string, string>()

function buildCacheKey(bounds: RouteBounds, config: PeakConfig, vw: number, vh: number): string {
  return `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},` +
    `${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)},${config.color},${vw},${vh}`
}

/**
 * Generate peak SVG for the given route bounds.
 * Queries Overpass API, selects highest named peaks, returns SVG string.
 */
export async function generatePeakLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: PeakConfig,
  viewWidth = 1080,
  viewHeight = 1152,
  rawRoutePoints?: ReadonlyArray<{ lat: number; lon: number }>,
): Promise<string> {
  const cacheKey = buildCacheKey(routeBounds, config, viewWidth, viewHeight)
  const cached = peakSvgCache.get(cacheKey)
  if (cached !== undefined) {
    return cached.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
  }

  // Small padding — we don't need much margin for point features
  const paddedBounds: RouteBounds = {
    minLat: routeBounds.minLat - 0.02,
    maxLat: routeBounds.maxLat + 0.02,
    minLon: routeBounds.minLon - 0.02,
    maxLon: routeBounds.maxLon + 0.02,
    centerLat: routeBounds.centerLat,
    centerLon: routeBounds.centerLon,
  }

  // Project raw geo route points to SVG space for label collision avoidance
  const routePoints = rawRoutePoints?.map(p => projectGeoCoord(p.lon, p.lat, projectionParams))

  const peaks = await fetchPeaks(paddedBounds)
  const svg = renderPeakSvg(peaks, projectionParams, config, viewWidth, viewHeight, routePoints)

  peakSvgCache.set(cacheKey, svg)
  return svg
}
