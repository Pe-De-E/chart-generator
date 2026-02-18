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
const MIN_CITY_SPACING_PX = 100

function selectCities(
  cities: CityPoint[],
  routeBounds: RouteBounds,
  paddingDeg: number,
  params: ProjectionParams,
  viewWidth = 1080,
  viewHeight = 1152,
): CityPoint[] {
  // Route extent in degrees (max of lat/lon span)
  const latSpan = routeBounds.maxLat - routeBounds.minLat
  const lonSpan = routeBounds.maxLon - routeBounds.minLon
  const extent = Math.max(latSpan, lonSpan)

  // Scale-dependent population threshold:
  //   extent < 0.3°  → 5K    (tight route, show small towns)
  //   extent ~ 1°    → 15K
  //   extent ~ 3°    → 45K
  //   extent > 5°    → 75K+
  const minPop = Math.max(5000, Math.round(extent * 15000))

  // Filter by bounds + population, project, then keep only those
  // whose projected position is within (or near) the visible viewport.
  // This prevents far-away large cities from crowding out local towns.
  const margin = 50
  const projected: Array<CityPoint & { px: number; py: number }> = []

  for (const c of cities) {
    if (c.pop < minPop) continue
    if (c.lon < routeBounds.minLon - paddingDeg || c.lon > routeBounds.maxLon + paddingDeg) continue
    if (c.lat < routeBounds.minLat - paddingDeg || c.lat > routeBounds.maxLat + paddingDeg) continue
    const { x, y } = projectGeoCoord(c.lon, c.lat, params)
    // Only keep cities visible in the viewport (with small margin for labels)
    if (x >= -margin && x <= viewWidth + margin && y >= -margin && y <= viewHeight + margin) {
      projected.push({ ...c, px: x, py: y })
    }
  }

  // Sort largest first so they get priority in decluttering
  projected.sort((a, b) => b.pop - a.pop)

  // Declutter: keep cities that aren't too close to already-selected ones
  const selected: Array<CityPoint & { px: number; py: number }> = []

  for (const city of projected) {
    if (selected.length >= MAX_CITIES) break
    const tooClose = selected.some(s => {
      const dx = city.px - s.px
      const dy = city.py - s.py
      return dx * dx + dy * dy < MIN_CITY_SPACING_PX * MIN_CITY_SPACING_PX
    })
    if (!tooClose) {
      selected.push(city)
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
 * Compute the total pixel length of a projected polyline (sum of segment distances).
 */
function polylineLength(pts: Point2D[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return len
}

/**
 * Find the point and tangent angle at the midpoint of a polyline (by arc length).
 */
function midpointOnPolyline(pts: Point2D[]): { x: number; y: number; angle: number } {
  const totalLen = polylineLength(pts)
  const halfLen = totalLen / 2
  let accum = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    const segLen = Math.sqrt(dx * dx + dy * dy)
    if (accum + segLen >= halfLen) {
      // Interpolate within this segment
      const t = segLen > 0 ? (halfLen - accum) / segLen : 0
      const x = pts[i - 1].x + dx * t
      const y = pts[i - 1].y + dy * t
      let angle = Math.atan2(dy, dx) * (180 / Math.PI)
      // Keep text readable: flip if upside-down, clamp to ±60°
      if (angle > 90) angle -= 180
      if (angle < -90) angle += 180
      angle = Math.max(-60, Math.min(60, angle))
      return { x, y, angle }
    }
    accum += segLen
  }
  // Fallback: last segment direction
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2] || last
  let angle = Math.atan2(last.y - prev.y, last.x - prev.x) * (180 / Math.PI)
  if (angle > 90) angle -= 180
  if (angle < -90) angle += 180
  angle = Math.max(-60, Math.min(60, angle))
  return { x: last.x, y: last.y, angle }
}

/**
 * Clip a polyline to only the points within the viewport (with margin).
 * Returns the visible portion of the polyline.
 */
function clipPolylineToViewport(
  pts: Point2D[], viewWidth: number, viewHeight: number, margin = 30,
): Point2D[] {
  return pts.filter(p =>
    p.x >= -margin && p.x <= viewWidth + margin &&
    p.y >= -margin && p.y <= viewHeight + margin
  )
}

/**
 * Render rivers as smooth SVG paths with name labels at the midpoint.
 * Uses Catmull-Rom smoothing on original vertices for natural curves.
 * Each unique river name gets a label on its longest visible segment,
 * rotated to follow the river's direction.
 */
function renderRivers(
  features: GeoFeature[],
  params: ProjectionParams,
  color: string,
  opacity: number,
  geoBounds: RouteBounds,
  viewWidth = 1080,
  viewHeight = 1152,
): string {
  const paths: string[] = []
  const labels: string[] = []
  const viewBbox: [number, number, number, number] = [
    geoBounds.minLon, geoBounds.minLat, geoBounds.maxLon, geoBounds.maxLat,
  ]

  // Track the longest visible segment per river name for labelling
  const longestByName = new Map<string, { len: number; pts: Point2D[] }>()

  for (const f of features) {
    const geom = f.geometry
    const lines: number[][][] = geom.type === 'MultiLineString'
      ? geom.coordinates as number[][][]
      : [geom.coordinates as number[][]]
    const name = f.properties?.name || ''

    for (const line of lines) {
      if (line.length < 2) continue

      // Skip lines whose bbox doesn't overlap the geo viewport
      const lineBbox = computeFeatureBbox(line)
      if (!bboxIntersects(lineBbox, viewBbox)) continue

      const projected = projectRing(line, params)
      const d = smoothPathD(projected)
      if (!d) continue

      paths.push(
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`
      )

      // Track longest *visible* segment for this river name
      if (name) {
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
  }

  if (paths.length === 0) return ''

  // Generate labels for each named river at the midpoint of its longest visible segment
  const MIN_LABEL_LENGTH_PX = 80
  const RIVER_FONT_SIZE = 38
  for (const [name, { len, pts }] of longestByName) {
    const approxTextWidth = name.length * RIVER_FONT_SIZE * 0.55
    if (len < MIN_LABEL_LENGTH_PX || len < approxTextWidth * 1.3) continue

    const mid = midpointOnPolyline(pts)
    // Skip labels whose midpoint is outside the viewport
    if (mid.x < 0 || mid.x > viewWidth || mid.y < 0 || mid.y > viewHeight) continue

    labels.push(
      `<text x="${mid.x.toFixed(1)}" y="${(mid.y - 20).toFixed(1)}" ` +
      `fill="${color}" font-size="${RIVER_FONT_SIZE}" font-family="system-ui, sans-serif" ` +
      `font-style="italic" text-anchor="middle" ` +
      `transform="rotate(${mid.angle.toFixed(1)} ${mid.x.toFixed(1)} ${(mid.y - 20).toFixed(1)})">${name}</text>`
    )
  }

  return `<g opacity="${opacity.toFixed(2)}">${paths.join('\n')}${labels.length > 0 ? '\n' + labels.join('\n') : ''}</g>`
}

/**
 * Check if a text label bounding box overlaps with the route polyline.
 * Uses a fast point-in-box test against route points.
 */
function labelOverlapsRoute(
  labelX: number, labelY: number,
  labelWidth: number, labelHeight: number,
  routePoints: ReadonlyArray<{ x: number; y: number }>,
  margin = 6,
): boolean {
  const x1 = labelX - margin
  const y1 = labelY - labelHeight - margin
  const x2 = labelX + labelWidth + margin
  const y2 = labelY + margin
  for (const p of routePoints) {
    if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) return true
  }
  return false
}

/**
 * Check if a horizontal label would extend outside the visible viewport.
 */
function labelExceedsViewport(
  labelX: number, labelY: number,
  labelWidth: number, labelHeight: number,
  viewWidth: number, viewHeight: number,
): boolean {
  return labelX + labelWidth > viewWidth
    || labelY - labelHeight < 0
    || labelX < 0
    || labelY > viewHeight
}

/**
 * Pick the best label placement for a city.
 * Tries up to 4 strategies to avoid route overlap and viewport overflow:
 *   1. Horizontal right of dot (default)
 *   2. Rotated -45° right of dot (text goes up-right)
 *   3. Rotated +45° right of dot (text goes down-right)
 *   4. Horizontal left of dot (text-anchor: end)
 *
 * Returns { textX, textY, angle, anchor } for the first placement that fits,
 * or the best fallback if none is perfect.
 */
function pickLabelPlacement(
  x: number, y: number, r: number, fontSize: number,
  cityName: string,
  viewWidth: number, viewHeight: number,
  routePoints?: ReadonlyArray<{ x: number; y: number }>,
): { textX: number; textY: number; angle: number; anchor: string } {
  const approxWidth = cityName.length * fontSize * 0.6
  const gap = r + 5

  const candidates = [
    // 1. Horizontal right
    { textX: x + gap, textY: y + fontSize / 3, angle: 0, anchor: 'start' },
    // 2. Rotated -45° right (up-right diagonal)
    { textX: x + gap, textY: y + fontSize / 3, angle: -45, anchor: 'start' },
    // 3. Rotated +45° right (down-right diagonal)
    { textX: x + gap, textY: y + fontSize / 3, angle: 45, anchor: 'start' },
    // 4. Horizontal left
    { textX: x - gap, textY: y + fontSize / 3, angle: 0, anchor: 'end' },
  ]

  for (const c of candidates) {
    // Compute the effective bounding box of this placement
    let bx: number, by: number, bw: number, bh: number
    if (c.angle === 0 && c.anchor === 'start') {
      bx = c.textX; by = c.textY; bw = approxWidth; bh = fontSize
    } else if (c.angle === 0 && c.anchor === 'end') {
      bx = c.textX - approxWidth; by = c.textY; bw = approxWidth; bh = fontSize
    } else {
      // Rotated: the label extends diagonally — use a rough bbox
      // At ±45° the text occupies roughly width*0.7 in both x and y
      const diag = approxWidth * 0.71
      bx = c.textX
      if (c.angle < 0) {
        by = c.textY - diag; bw = diag; bh = diag
      } else {
        by = c.textY; bw = diag; bh = diag
      }
    }

    const hitsEdge = labelExceedsViewport(bx, by, bw, bh, viewWidth, viewHeight)
    const hitsRoute = routePoints && routePoints.length > 0
      && labelOverlapsRoute(bx, by, bw, bh, routePoints)

    if (!hitsEdge && !hitsRoute) return c
  }

  // Fallback: use the strategy that best fits the position
  // Top half → +45° (down), bottom half → -45° (up), right edge → left
  if (x + gap + approxWidth > viewWidth && x - gap - approxWidth >= 0) {
    return candidates[3] // horizontal left
  }
  if (y < viewHeight / 2) {
    return candidates[2] // +45° down-right
  }
  return candidates[1] // -45° up-right
}

/**
 * Render cities as SVG circles and text labels.
 * Sizes scale with population for visual hierarchy.
 * Labels are smartly placed to avoid overlapping the route or exceeding the viewport.
 */
function renderCities(
  cities: CityPoint[],
  params: ProjectionParams,
  color: string,
  opacity: number,
  routePoints?: ReadonlyArray<{ x: number; y: number }>,
  viewWidth = 1080,
  viewHeight = 1152,
): string {
  if (cities.length === 0) return ''
  const elements: string[] = []

  // Population range among visible cities for relative sizing
  const maxPop = Math.max(...cities.map(c => c.pop))

  for (const city of cities) {
    const { x, y } = projectGeoCoord(city.lon, city.lat, params)

    // Scale: largest city gets r=8/font=40, smallest gets r=5/font=30
    const t = maxPop > 0 ? Math.sqrt(city.pop / maxPop) : 0.5
    const r = 5 + t * 3
    const fontSize = Math.round(30 + t * 10)

    const placement = pickLabelPlacement(x, y, r, fontSize, city.name, viewWidth, viewHeight, routePoints)

    elements.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`,
    )

    const anchorAttr = placement.anchor === 'end' ? ' text-anchor="end"' : ''
    if (placement.angle !== 0) {
      const pivotX = (x + (placement.anchor === 'end' ? -(r + 3) : r + 3)).toFixed(1)
      elements.push(
        `<text x="${placement.textX.toFixed(1)}" y="${placement.textY.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" font-size="${fontSize}" font-family="system-ui, sans-serif"${anchorAttr} transform="rotate(${placement.angle} ${pivotX} ${y.toFixed(1)})">${city.name}</text>`,
      )
    } else {
      elements.push(
        `<text x="${placement.textX.toFixed(1)}" y="${placement.textY.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" font-size="${fontSize}" font-family="system-ui, sans-serif"${anchorAttr}>${city.name}</text>`,
      )
    }
  }

  return `<g>${elements.join('\n')}</g>`
}

// ── Memoization Cache ────────────────────────────────────────────────────────

let cachedSvg: string | null = null
let cachedKey: string | null = null

// Bump this when rendering logic changes to invalidate cached results
const CACHE_VERSION = 13

function buildCacheKey(bounds: RouteBounds, config: GeoLayerConfig, vw: number, vh: number): string {
  return `v${CACHE_VERSION},${bounds.minLat},${bounds.maxLat},${bounds.minLon},${bounds.maxLon},` +
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
  routePoints?: ReadonlyArray<{ x: number; y: number }>,
): string {
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
      const riverSvg = renderRivers(rivers, projectionParams, config.riverColor, config.riverOpacity, filterBounds, viewWidth, viewHeight)
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
      viewWidth,
      viewHeight,
    )
    if (cities.length > 0) {
      parts.push(renderCities(cities, projectionParams, config.cityColor, config.cityOpacity, routePoints, viewWidth, viewHeight))
    }
  }

  // Country name labels along borders (rendered last = on top of everything)
  // For each country, find the longest visible border segment, place the label
  // at its midpoint rotated to follow the border, offset toward the country interior
  // using the polygon's winding direction (signed area) for reliable side detection.
  {
    const countries = filterFeaturesByBounds(
      countriesData.features as unknown as GeoFeature[],
      routeBounds,
      FEATURE_PADDING_DEG,
    )
    const cViewBbox: [number, number, number, number] = [
      filterBounds.minLon, filterBounds.minLat, filterBounds.maxLon, filterBounds.maxLat,
    ]

    // For each country: longest visible border segment + polygon winding sign for offset direction
    const countryBest = new Map<string, { pts: Point2D[]; len: number; windingSign: number }>()

    for (const f of countries) {
      const name = f.properties?.name || ''
      if (!name) continue
      const geom = f.geometry
      const polygons: number[][][][] = geom.type === 'MultiPolygon'
        ? geom.coordinates as number[][][][]
        : [geom.coordinates as number[][][]]

      for (const polygon of polygons) {
        const ring = polygon[0]
        if (!ring || ring.length < 3) continue
        const ringBbox = computeFeatureBbox(ring)
        if (!bboxIntersects(ringBbox, cViewBbox)) continue

        const projected = projectRing(ring, projectionParams)

        // Signed area of projected ring determines winding direction in SVG pixel space.
        // CCW (positive) → interior to left of forward direction
        // CW  (negative) → interior to right of forward direction
        let signedArea2 = 0
        for (let i = 0; i < projected.length; i++) {
          const j = (i + 1) % projected.length
          signedArea2 += projected[i].x * projected[j].y - projected[j].x * projected[i].y
        }
        const wSign = signedArea2 >= 0 ? 1 : -1

        // Collect contiguous runs of edges visible in viewport
        let run: Point2D[] = []

        const flushRun = () => {
          if (run.length < 2) { run = []; return }
          const len = polylineLength(run)
          const prev = countryBest.get(name)
          if (!prev || len > prev.len) {
            countryBest.set(name, { pts: [...run], len, windingSign: wSign })
          }
          run = []
        }

        for (let i = 0; i < projected.length - 1; i++) {
          const p1 = projected[i]
          const p2 = projected[i + 1]
          const mx = (p1.x + p2.x) / 2
          const my = (p1.y + p2.y) / 2
          if (mx >= 0 && mx <= viewWidth && my >= 0 && my <= viewHeight) {
            if (run.length === 0) run.push(p1)
            run.push(p2)
          } else {
            flushRun()
          }
        }
        flushRun()
      }
    }

    const COUNTRY_FONT = 38
    const LABEL_OFFSET = 50
    const cMargin = 30
    const countryColor = config.borderColor || '#ffffff'
    const countryOpacity = config.borderOpacity || 0.50

    for (const [name, { pts, windingSign }] of countryBest) {
      // Find midpoint and raw tangent angle on the border segment
      const totalLen = polylineLength(pts)
      const halfLen = totalLen / 2
      let mx = pts[0].x, my = pts[0].y, rawAngle = 0
      let accum = 0
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x
        const dy = pts[i].y - pts[i - 1].y
        const segLen = Math.sqrt(dx * dx + dy * dy)
        if (accum + segLen >= halfLen) {
          const t = segLen > 0 ? (halfLen - accum) / segLen : 0
          mx = pts[i - 1].x + dx * t
          my = pts[i - 1].y + dy * t
          rawAngle = Math.atan2(dy, dx)
          break
        }
        accum += segLen
      }

      // Interior normal using winding direction:
      // Left of tangent (cos θ, sin θ) is (-sin θ, cos θ)
      // windingSign > 0 (CCW): interior = left  → normal = (-sin θ, cos θ)
      // windingSign < 0 (CW):  interior = right → normal = (sin θ, -cos θ)
      const nx = windingSign * (-Math.sin(rawAngle))
      const ny = windingSign * Math.cos(rawAngle)

      const lx = mx + nx * LABEL_OFFSET
      const ly = my + ny * LABEL_OFFSET

      if (lx < cMargin || lx > viewWidth - cMargin || ly < cMargin || ly > viewHeight - cMargin) continue

      // Display angle: clamped for readability
      let displayAngle = rawAngle * (180 / Math.PI)
      if (displayAngle > 90) displayAngle -= 180
      if (displayAngle < -90) displayAngle += 180
      displayAngle = Math.max(-60, Math.min(60, displayAngle))

      parts.push(
        `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${countryColor}" opacity="${countryOpacity.toFixed(2)}" ` +
        `font-size="${COUNTRY_FONT}" font-family="system-ui, sans-serif" font-style="italic" text-anchor="middle" ` +
        `transform="rotate(${displayAngle.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${name}</text>`
      )
    }
  }

  const svg = parts.length > 0
    ? `<g class="geo-context">${parts.join('\n')}</g>`
    : ''

  cachedSvg = svg
  cachedKey = key

  return svg
}
