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
import { projectGeoCoord } from './geoFeatures'

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
  maxCount = 15,
  minDistPx = 100,
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
): string {
  const selected = selectPeaks(peaks, projParams, viewWidth, viewHeight)
  if (selected.length === 0) return ''

  const fontSize = 24
  const elements: string[] = []

  for (const p of selected) {
    const { svgX: x, svgY: y } = p

    // Upward-pointing triangle (classic cartographic peak symbol)
    elements.push(
      `<polygon points="${x.toFixed(1)},${(y - 10).toFixed(1)} ` +
      `${(x - 6).toFixed(1)},${(y + 4).toFixed(1)} ` +
      `${(x + 6).toFixed(1)},${(y + 4).toFixed(1)}" fill="${config.color}"/>`
    )

    // Label: Name + elevation if available
    const label = p.ele > 0
      ? `${p.name} (${Math.round(p.ele)}m)`
      : p.name

    elements.push(
      `<text x="${(x + 12).toFixed(1)}" y="${(y - 3).toFixed(1)}" ` +
      `fill="${config.color}" font-size="${fontSize}" font-family="system-ui, sans-serif" ` +
      `dominant-baseline="middle">${label}</text>`
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

  const peaks = await fetchPeaks(paddedBounds)
  const svg = renderPeakSvg(peaks, projectionParams, config, viewWidth, viewHeight)

  peakSvgCache.set(cacheKey, svg)
  return svg
}
