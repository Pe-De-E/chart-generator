/**
 * Geographic Context Renderer
 *
 * Renders Natural Earth 50m data (country borders, rivers, cities)
 * as low-opacity SVG layers behind the route line. Features are filtered
 * by the route's bounding box and projected using the same equirectangular
 * projection as the route. Borders use Catmull-Rom smoothing for a
 * natural cartographic look.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import countriesData from '../../../data/geo/countries.json'
import riversData from '../../../data/geo/rivers.json'
import citiesData from '../../../data/geo/cities.json'

// ── Types ────────────────────────────────────────────────────────────────────

/** Configuration for geographic context layers */
export interface GeoLayerConfig {
  showBorders: boolean
  showRivers: boolean
  showCities: boolean
  borderColor: string
  borderOpacity: number
  riverColor: string
  riverOpacity: number
  cityColor: string
  cityOpacity: number
}

export const DEFAULT_GEO_LAYER_CONFIG: GeoLayerConfig = {
  showBorders: false,
  showRivers: false,
  showCities: false,
  borderColor: '#ffffff',
  borderOpacity: 0.35,
  riverColor: '#4a90d9',
  riverOpacity: 0.40,
  cityColor: '#ffffff',
  cityOpacity: 0.50,
}

/** GeoJSON feature (simplified, matching our stripped data) */
interface GeoFeature {
  type: 'Feature'
  properties: { name: string }
  geometry: {
    type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString'
    coordinates: number[] | number[][] | number[][][] | number[][][][]
  }
}

/** City point (flat format from cities.json) */
interface CityPoint {
  name: string
  lat: number
  lon: number
  pop: number
}

// ── Bounding Box Filter ──────────────────────────────────────────────────────

/**
 * Compute the bounding box of a GeoJSON geometry's coordinates.
 */
function computeFeatureBbox(coords: any): [number, number, number, number] {
  let minLon = Infinity, minLat = Infinity
  let maxLon = -Infinity, maxLat = -Infinity

  function walk(c: any) {
    if (typeof c[0] === 'number' && typeof c[1] === 'number' && (c.length === 2 || c.length === 3)) {
      if (c[0] < minLon) minLon = c[0]
      if (c[0] > maxLon) maxLon = c[0]
      if (c[1] < minLat) minLat = c[1]
      if (c[1] > maxLat) maxLat = c[1]
    } else {
      for (const child of c) walk(child)
    }
  }
  walk(coords)
  return [minLon, minLat, maxLon, maxLat]
}

/**
 * Check if two bounding boxes intersect.
 */
function bboxIntersects(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3])
}

/**
 * Filter GeoJSON features to those intersecting the padded route bounds.
 */
export function filterFeaturesByBounds(
  features: GeoFeature[],
  routeBounds: RouteBounds,
  paddingDeg: number,
): GeoFeature[] {
  const viewBbox: [number, number, number, number] = [
    routeBounds.minLon - paddingDeg,
    routeBounds.minLat - paddingDeg,
    routeBounds.maxLon + paddingDeg,
    routeBounds.maxLat + paddingDeg,
  ]

  return features.filter(f => {
    const fBbox = computeFeatureBbox(f.geometry.coordinates)
    return bboxIntersects(fBbox, viewBbox)
  })
}

/**
 * Dynamically select cities based on route zoom level.
 *
 * 1. Compute a population threshold from the route's geographic extent —
 *    wider routes show only major cities, tight routes show smaller ones.
 * 2. Filter by padded bounds + threshold.
 * 3. Sort by population (largest first).
 * 4. Declutter: skip any city whose projected position is too close to
 *    an already-selected city (larger cities win).
 * 5. Cap at MAX_CITIES to avoid visual clutter.
 */
const MAX_CITIES = 8
const MIN_CITY_SPACING_PX = 80

function selectCities(
  cities: CityPoint[],
  routeBounds: RouteBounds,
  paddingDeg: number,
  params: ProjectionParams,
): CityPoint[] {
  // Route extent in degrees (max of lat/lon span)
  const latSpan = routeBounds.maxLat - routeBounds.minLat
  const lonSpan = routeBounds.maxLon - routeBounds.minLon
  const extent = Math.max(latSpan, lonSpan)

  // Scale-dependent population threshold:
  //   extent < 0.3°  → 30K   (very tight, ~25km route)
  //   extent ~ 1°    → 100K
  //   extent ~ 3°    → 300K
  //   extent > 5°    → 500K+
  const minPop = Math.max(30000, Math.round(extent * 100000))

  // Filter by bounds + population
  const candidates = cities.filter(c =>
    c.pop >= minPop &&
    c.lon >= routeBounds.minLon - paddingDeg &&
    c.lon <= routeBounds.maxLon + paddingDeg &&
    c.lat >= routeBounds.minLat - paddingDeg &&
    c.lat <= routeBounds.maxLat + paddingDeg
  )

  // Sort largest first so they get priority in decluttering
  candidates.sort((a, b) => b.pop - a.pop)

  // Declutter: keep cities that aren't too close to already-selected ones
  const selected: Array<CityPoint & { px: number; py: number }> = []

  for (const city of candidates) {
    if (selected.length >= MAX_CITIES) break
    const { x, y } = projectGeoCoord(city.lon, city.lat, params)
    const tooClose = selected.some(s => {
      const dx = x - s.px
      const dy = y - s.py
      return dx * dx + dy * dy < MIN_CITY_SPACING_PX * MIN_CITY_SPACING_PX
    })
    if (!tooClose) {
      selected.push({ ...city, px: x, py: y })
    }
  }

  return selected
}

// ── Projection ───────────────────────────────────────────────────────────────

/**
 * Project a single [lon, lat] to SVG pixel coordinates.
 */
export function projectGeoCoord(
  lon: number,
  lat: number,
  params: ProjectionParams,
): { x: number; y: number } {
  return {
    x: params.offsetX + (lon - params.minLon) * params.cosLat * params.scale,
    y: params.offsetY + (params.maxLat - lat) * params.scale,
  }
}

// ── 2D Line Simplification (Douglas-Peucker) ────────────────────────────────

/**
 * Perpendicular distance from point to line segment (2D).
 */
function perpDist2D(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2)
  return Math.abs(dx * (py - ay) - dy * (px - ax)) / Math.sqrt(lenSq)
}

/**
 * Douglas-Peucker simplification for 2D SVG coordinates.
 * Removes points that deviate less than epsilon pixels from the line.
 */
export function simplifyLine2D(
  points: Array<{ x: number; y: number }>,
  epsilon: number,
): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points

  let maxDist = 0
  let maxIdx = 0
  const first = points[0]
  const last = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist2D(points[i].x, points[i].y, first.x, first.y, last.x, last.y)
    if (d > maxDist) {
      maxDist = d
      maxIdx = i
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyLine2D(points.slice(0, maxIdx + 1), epsilon)
    const right = simplifyLine2D(points.slice(maxIdx), epsilon)
    return [...left.slice(0, -1), ...right]
  }
  return [first, last]
}

// ── Coordinate Densification ─────────────────────────────────────────────────

type Point2D = { x: number; y: number }

/**
 * Insert intermediate points along sparse geographic coordinate rings.
 * Used for rivers where linear interpolation between vertices is needed.
 */
function densifyRing(ring: number[][], maxGapDeg: number): number[][] {
  if (ring.length < 2) return ring
  const result: number[][] = [ring[0]]
  for (let i = 1; i < ring.length; i++) {
    const [lon0, lat0] = ring[i - 1]
    const [lon1, lat1] = ring[i]
    const dLon = Math.abs(lon1 - lon0)
    const dLat = Math.abs(lat1 - lat0)
    const maxD = Math.max(dLon, dLat)
    if (maxD > maxGapDeg) {
      const steps = Math.ceil(maxD / maxGapDeg)
      for (let s = 1; s < steps; s++) {
        const t = s / steps
        result.push([lon0 + t * (lon1 - lon0), lat0 + t * (lat1 - lat0)])
      }
    }
    result.push(ring[i])
  }
  return result
}

/** Max gap in degrees between consecutive vertices after densification */
const DENSIFY_MAX_GAP = 0.05

// ── SVG Rendering ────────────────────────────────────────────────────────────

/**
 * Project a coordinate ring (array of [lon, lat] pairs) to SVG pixels.
 */
function projectRing(
  ring: number[][],
  params: ProjectionParams,
): Point2D[] {
  return ring.map(([lon, lat]) => projectGeoCoord(lon, lat, params))
}

/**
 * Convert projected points to SVG path d-attribute commands.
 */
function pointsToPathD(points: Point2D[], close: boolean): string {
  if (points.length === 0) return ''
  const parts = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
  )
  if (close) parts.push('Z')
  return parts.join(' ')
}

/**
 * Convert projected points to a smooth SVG path using Catmull-Rom → cubic Bézier.
 * Creates natural-looking curves through all control points, making coarse
 * 110m polygon edges look like proper cartographic borders.
 */
function smoothPathD(points: Point2D[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  if (points.length === 2) return pointsToPathD(points, false)

  const parts: string[] = [`M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`]

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, points.length - 1)]

    // Catmull-Rom to cubic Bézier control points
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    parts.push(`C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`)
  }

  return parts.join(' ')
}

/**
 * Render country borders as smooth SVG paths.
 * Uses original 50m vertices with Catmull-Rom smoothing to create
 * natural-looking cartographic border lines. Edge-level midpoint
 * filtering ensures only borders near the route are rendered.
 */
function renderBorders(
  features: GeoFeature[],
  params: ProjectionParams,
  color: string,
  opacity: number,
  geoBounds: RouteBounds,
): string {
  const paths: string[] = []
  const viewBbox: [number, number, number, number] = [
    geoBounds.minLon, geoBounds.minLat, geoBounds.maxLon, geoBounds.maxLat,
  ]

  for (const f of features) {
    const geom = f.geometry
    const polygons: number[][][][] = geom.type === 'MultiPolygon'
      ? geom.coordinates as number[][][][]
      : [geom.coordinates as number[][][]]

    for (const polygon of polygons) {
      const ring = polygon[0]
      if (!ring || ring.length < 3) continue

      // Skip rings whose bbox doesn't overlap the geo viewport
      const ringBbox = computeFeatureBbox(ring)
      if (!bboxIntersects(ringBbox, viewBbox)) continue

      // Collect original vertices of edges whose midpoint is within viewport.
      // Catmull-Rom smoothing creates natural curves between the 50m vertices.
      let currentVertices: number[][] = []

      for (let i = 0; i < ring.length - 1; i++) {
        const midLon = (ring[i][0] + ring[i + 1][0]) / 2
        const midLat = (ring[i][1] + ring[i + 1][1]) / 2

        if (midLon >= viewBbox[0] && midLon <= viewBbox[2] &&
            midLat >= viewBbox[1] && midLat <= viewBbox[3]) {
          if (currentVertices.length === 0) {
            currentVertices.push(ring[i])
          }
          currentVertices.push(ring[i + 1])
        } else if (currentVertices.length >= 2) {
          const projected = projectRing(currentVertices, params)
          paths.push(`<path d="${smoothPathD(projected)}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`)
          currentVertices = []
        }
      }
      if (currentVertices.length >= 2) {
        const projected = projectRing(currentVertices, params)
        paths.push(`<path d="${smoothPathD(projected)}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`)
      }
    }
  }

  if (paths.length === 0) return ''
  // Group-level opacity so shared borders (rendered from both countries)
  // don't stack — they composite together then get opacity applied once
  return `<g opacity="${opacity.toFixed(2)}">${paths.join('\n')}</g>`
}

/**
 * Render rivers as smooth SVG paths.
 * Uses Catmull-Rom smoothing on original vertices for natural curves.
 */
function renderRivers(
  features: GeoFeature[],
  params: ProjectionParams,
  color: string,
  opacity: number,
  geoBounds: RouteBounds,
): string {
  const paths: string[] = []
  const viewBbox: [number, number, number, number] = [
    geoBounds.minLon, geoBounds.minLat, geoBounds.maxLon, geoBounds.maxLat,
  ]

  for (const f of features) {
    const geom = f.geometry
    const lines: number[][][] = geom.type === 'MultiLineString'
      ? geom.coordinates as number[][][]
      : [geom.coordinates as number[][]]

    for (const line of lines) {
      if (line.length < 2) continue

      // Skip lines whose bbox doesn't overlap the geo viewport
      const lineBbox = computeFeatureBbox(line)
      if (!bboxIntersects(lineBbox, viewBbox)) continue

      const projected = projectRing(line, params)
      const d = smoothPathD(projected)
      if (d) {
        paths.push(
          `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`
        )
      }
    }
  }

  if (paths.length === 0) return ''
  return `<g opacity="${opacity.toFixed(2)}">${paths.join('\n')}</g>`
}

/**
 * Render cities as SVG circles and text labels.
 * Sizes scale with population for visual hierarchy.
 */
function renderCities(
  cities: CityPoint[],
  params: ProjectionParams,
  color: string,
  opacity: number,
): string {
  if (cities.length === 0) return ''
  const elements: string[] = []

  // Population range among visible cities for relative sizing
  const maxPop = Math.max(...cities.map(c => c.pop))

  for (const city of cities) {
    const { x, y } = projectGeoCoord(city.lon, city.lat, params)

    // Scale: largest city gets r=4/font=16, smallest gets r=2/font=10
    const t = maxPop > 0 ? Math.sqrt(city.pop / maxPop) : 0.5
    const r = 2 + t * 2
    const fontSize = Math.round(10 + t * 6)

    elements.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`,
      `<text x="${(x + r + 4).toFixed(1)}" y="${(y + fontSize / 3).toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" font-size="${fontSize}" font-family="system-ui, sans-serif">${city.name}</text>`,
    )
  }

  return `<g>${elements.join('\n')}</g>`
}

// ── Memoization Cache ────────────────────────────────────────────────────────

let cachedSvg: string | null = null
let cachedKey: string | null = null

function buildCacheKey(bounds: RouteBounds, config: GeoLayerConfig, vw: number, vh: number): string {
  return `${bounds.minLat},${bounds.maxLat},${bounds.minLon},${bounds.maxLon},` +
    `${config.showBorders},${config.showRivers},${config.showCities},` +
    `${config.borderOpacity},${config.riverOpacity},${config.cityOpacity},` +
    `${vw},${vh}`
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Padding in degrees around route bounds for finding relevant features.
 * Generous so we find nearby borders/rivers/cities, but features that
 * project outside the viewport are clipped by the parent SVG overflow:hidden.
 */
const FEATURE_PADDING_DEG = 1.0

/**
 * Generate SVG elements for geographic context layers.
 *
 * Uses the SAME projection as the route (projectionParams) so that all
 * geo features are perfectly aligned with the route line. Features are
 * filtered generously (±1°) to find nearby borders/rivers/cities, then
 * projected with the route projection. Anything outside the viewport is
 * clipped by the parent SVG's overflow:hidden.
 *
 * Results are memoized per route bounds + config combination.
 */
export function generateGeoLayers(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: GeoLayerConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): string {
  // Check cache
  const key = buildCacheKey(routeBounds, config, viewWidth, viewHeight)
  if (key === cachedKey && cachedSvg !== null) return cachedSvg

  // Wide filter bounds for finding features — the route projection + SVG
  // overflow:hidden handles the actual viewport clipping
  const filterBounds: RouteBounds = {
    minLat: routeBounds.minLat - FEATURE_PADDING_DEG,
    maxLat: routeBounds.maxLat + FEATURE_PADDING_DEG,
    minLon: routeBounds.minLon - FEATURE_PADDING_DEG,
    maxLon: routeBounds.maxLon + FEATURE_PADDING_DEG,
    centerLat: routeBounds.centerLat,
    centerLon: routeBounds.centerLon,
  }

  const parts: string[] = []

  // Borders
  if (config.showBorders) {
    const countries = filterFeaturesByBounds(
      countriesData.features as unknown as GeoFeature[],
      routeBounds,
      FEATURE_PADDING_DEG,
    )
    if (countries.length > 0) {
      const borderSvg = renderBorders(countries, projectionParams, config.borderColor, config.borderOpacity, filterBounds)
      if (borderSvg) parts.push(borderSvg)
    }
  }

  // Rivers
  if (config.showRivers) {
    const rivers = filterFeaturesByBounds(
      riversData.features as unknown as GeoFeature[],
      routeBounds,
      FEATURE_PADDING_DEG,
    )
    if (rivers.length > 0) {
      const riverSvg = renderRivers(rivers, projectionParams, config.riverColor, config.riverOpacity, filterBounds)
      if (riverSvg) parts.push(riverSvg)
    }
  }

  // Cities
  if (config.showCities) {
    const cities = selectCities(
      citiesData as unknown as CityPoint[],
      routeBounds,
      FEATURE_PADDING_DEG,
      projectionParams,
    )
    if (cities.length > 0) {
      parts.push(renderCities(cities, projectionParams, config.cityColor, config.cityOpacity))
    }
  }

  const svg = parts.length > 0
    ? `<g class="geo-context">${parts.join('\n')}</g>`
    : ''

  // Cache
  cachedSvg = svg
  cachedKey = key

  return svg
}
