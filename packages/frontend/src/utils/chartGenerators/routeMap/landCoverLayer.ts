/**
 * Land Cover Layer — Overpass API
 *
 * Fetches glaciers (natural=glacier) and urban areas (landuse=residential/
 * commercial/industrial) from OpenStreetMap. Each type is rendered with its
 * own color and opacity, giving the map an immediate topographic map feel.
 *
 * Both types share one Overpass request and one composable to keep the
 * number of parallel API calls low.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord, smoothPathD, type Point2D } from './geoFeatures'

// ── Types ────────────────────────────────────────────────────────────────────

export interface LandCoverConfig {
  showGlaciers: boolean
  glacierOpacity: number
  showUrban: boolean
  urbanOpacity: number
}

export const DEFAULT_LAND_COVER_CONFIG: LandCoverConfig = {
  showGlaciers: false,
  glacierOpacity: 0.65,
  showUrban: false,
  urbanOpacity: 0.45,
}

type LandCoverType = 'glacier' | 'urban'

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

async function fetchLandCover(bounds: RouteBounds): Promise<OverpassElement[]> {
  const { minLat, maxLon, maxLat, minLon } = bounds

  const query =
    `[out:json][bbox:${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}][timeout:30];\n` +
    `(\n` +
    `  way[natural=glacier];\n` +
    `  relation[natural=glacier];\n` +
    `  way[landuse~"^(residential|commercial|industrial|retail)$"];\n` +
    `  relation[landuse~"^(residential|commercial|industrial|retail)$"];\n` +
    `);\n` +
    `out geom;`

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) throw new Error(`Overpass land cover fetch failed: ${response.status}`)

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

function classifyElement(el: OverpassElement): LandCoverType | null {
  const natural = el.tags?.natural
  const landuse = el.tags?.landuse
  if (natural === 'glacier') return 'glacier'
  if (landuse && ['residential', 'commercial', 'industrial', 'retail'].includes(landuse)) return 'urban'
  return null
}

// ── SVG Rendering ─────────────────────────────────────────────────────────────

const GLACIER_COLOR = '#cce8f4'  // icy light blue
const URBAN_COLOR   = '#c8b8a2'  // warm stone/beige
const MIN_AREA_PX   = 300
const MAX_POLYGONS  = 300

function renderLandCoverSvg(
  elements: OverpassElement[],
  projParams: ProjectionParams,
  config: LandCoverConfig,
  viewWidth: number,
  viewHeight: number,
): string {
  const glacierPaths: string[] = []
  const urbanPaths: string[] = []
  let count = 0

  for (const el of elements) {
    if (count >= MAX_POLYGONS) break

    const type = classifyElement(el)
    if (!type) continue
    if (type === 'glacier' && !config.showGlaciers) continue
    if (type === 'urban' && !config.showUrban) continue

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

      if (type === 'glacier') {
        glacierPaths.push(
          `<path d="${d} Z" fill="${GLACIER_COLOR}" fill-opacity="0.70" stroke="${GLACIER_COLOR}" stroke-width="1" stroke-opacity="0.50"/>`
        )
      } else {
        urbanPaths.push(
          `<path d="${d} Z" fill="${URBAN_COLOR}" fill-opacity="0.45" stroke="${URBAN_COLOR}" stroke-width="0.5" stroke-opacity="0.30"/>`
        )
      }
      count++
    }
  }

  const parts: string[] = []
  if (config.showGlaciers && glacierPaths.length > 0) {
    parts.push(`<g opacity="${config.glacierOpacity.toFixed(2)}">${glacierPaths.join('\n')}</g>`)
  }
  if (config.showUrban && urbanPaths.length > 0) {
    parts.push(`<g opacity="${config.urbanOpacity.toFixed(2)}">${urbanPaths.join('\n')}</g>`)
  }

  return parts.join('\n')
}

// ── Cache & Export ────────────────────────────────────────────────────────────

const landCoverCache = new Map<string, OverpassElement[]>()

function buildCacheKey(bounds: RouteBounds): string {
  return `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)}`
}

/**
 * Generate land cover SVG (glaciers + urban areas) for the given route bounds.
 * Raw elements are cached separately from the SVG so that toggling one type
 * does not require a new Overpass request.
 */
export async function generateLandCoverLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: LandCoverConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  const cacheKey = buildCacheKey(routeBounds)

  let elements = landCoverCache.get(cacheKey)
  if (!elements) {
    const paddedBounds: RouteBounds = {
      minLat: routeBounds.minLat - 0.05,
      maxLat: routeBounds.maxLat + 0.05,
      minLon: routeBounds.minLon - 0.05,
      maxLon: routeBounds.maxLon + 0.05,
      centerLat: routeBounds.centerLat,
      centerLon: routeBounds.centerLon,
    }
    elements = await fetchLandCover(paddedBounds)
    landCoverCache.set(cacheKey, elements)
  }

  return renderLandCoverSvg(elements, projectionParams, config, viewWidth, viewHeight)
}
