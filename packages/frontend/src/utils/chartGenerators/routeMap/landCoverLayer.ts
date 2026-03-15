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
import { projectGeoCoord, smoothPathD } from './geoFeatures'
import {
  type OverpassElement,
  extractRings,
  polygonArea,
  fetchOverpassElements,
} from './overpassPolygonLayer'

// ── Types ────────────────────────────────────────────────────────────────────

export interface LandCoverConfig {
  showGlaciers: boolean
  glacierOpacity: number
  glacierColor?: string
  showUrban: boolean
  urbanOpacity: number
  urbanColor?: string
}

export const DEFAULT_LAND_COVER_CONFIG: LandCoverConfig = {
  showGlaciers: false,
  glacierOpacity: 0.65,
  showUrban: false,
  urbanOpacity: 0.45,
}

type LandCoverType = 'glacier' | 'urban'

// ── Overpass API ──────────────────────────────────────────────────────────────

const LAND_COVER_FILTERS = [
  'way[natural=glacier]',
  'relation[natural=glacier]',
  'way[landuse~"^(residential|commercial|industrial|retail)$"]',
  'relation[landuse~"^(residential|commercial|industrial|retail)$"]',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

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
        const gc = config.glacierColor ?? GLACIER_COLOR
        glacierPaths.push(
          `<path d="${d} Z" fill="${gc}" fill-opacity="0.70" stroke="${gc}" stroke-width="1" stroke-opacity="0.50"/>`
        )
      } else {
        const uc = config.urbanColor ?? URBAN_COLOR
        urbanPaths.push(
          `<path d="${d} Z" fill="${uc}" fill-opacity="0.45" stroke="${uc}" stroke-width="0.5" stroke-opacity="0.30"/>`
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
      minLat: routeBounds.minLat - 0.3,
      maxLat: routeBounds.maxLat + 0.3,
      minLon: routeBounds.minLon - 0.3,
      maxLon: routeBounds.maxLon + 0.3,
      centerLat: routeBounds.centerLat,
      centerLon: routeBounds.centerLon,
    }
    elements = await fetchOverpassElements(LAND_COVER_FILTERS, paddedBounds)
    landCoverCache.set(cacheKey, elements)
  }

  return renderLandCoverSvg(elements, projectionParams, config, viewWidth, viewHeight)
}
