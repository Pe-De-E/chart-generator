/**
 * Route Map Projection
 *
 * Projects GPS coordinates (lat/lon) to SVG pixel space using
 * equirectangular projection with latitude correction.
 * Suitable for small-to-medium areas (single bike ride / hike).
 */

import type { RoutePoint } from '@chart-generator/shared'

/** A route point projected to SVG pixel coordinates */
export interface MapPoint {
  x: number           // SVG pixel x
  y: number           // SVG pixel y
  lat: number         // Original latitude
  lon: number         // Original longitude
  elevation: number   // Original elevation (m)
  distance: number    // Cumulative distance (km)
  time?: number       // ms since start
  hr?: number         // Heart rate (bpm), from GPX extensions
}

/** Configuration for the map SVG area */
export interface MapViewConfig {
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
}

/** Bounding box of the route in geographic coordinates */
export interface RouteBounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
  centerLat: number
  centerLon: number
}

/**
 * Calculate the geographic bounding box of a route.
 */
export function calculateRouteBounds(points: RoutePoint[]): RouteBounds {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0, centerLat: 0, centerLon: 0 }
  }

  let minLat = Infinity
  let maxLat = -Infinity
  let minLon = Infinity
  let maxLon = -Infinity

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lon < minLon) minLon = p.lon
    if (p.lon > maxLon) maxLon = p.lon
  }

  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    centerLat: (minLat + maxLat) / 2,
    centerLon: (minLon + maxLon) / 2,
  }
}

/** Projection parameters for converting geo coordinates to SVG pixels */
export interface ProjectionParams {
  cosLat: number
  scale: number
  offsetX: number
  offsetY: number
  minLon: number
  maxLat: number
}

/**
 * Calculate projection parameters for a route's geographic bounds.
 * These can be used to project any lon/lat to SVG coordinates
 * in the same coordinate space as the route.
 */
export function getProjectionParams(
  bounds: RouteBounds,
  config: MapViewConfig,
): ProjectionParams {
  const areaX = config.padding.left
  const areaY = config.padding.top
  const areaW = config.width - config.padding.left - config.padding.right
  const areaH = config.height - config.padding.top - config.padding.bottom

  if (areaW <= 0 || areaH <= 0) {
    return { cosLat: 1, scale: 1, offsetX: areaX, offsetY: areaY, minLon: bounds.minLon, maxLat: bounds.maxLat }
  }

  const cosLat = Math.cos((bounds.centerLat * Math.PI) / 180)

  let geoW = (bounds.maxLon - bounds.minLon) * cosLat
  let geoH = bounds.maxLat - bounds.minLat
  if (geoW < 1e-8) geoW = 1e-4
  if (geoH < 1e-8) geoH = 1e-4

  const scaleX = areaW / geoW
  const scaleY = areaH / geoH
  const scale = Math.min(scaleX, scaleY)

  const usedW = geoW * scale
  const usedH = geoH * scale
  const offsetX = areaX + (areaW - usedW) / 2
  const offsetY = areaY + (areaH - usedH) / 2

  return { cosLat, scale, offsetX, offsetY, minLon: bounds.minLon, maxLat: bounds.maxLat }
}

/**
 * Project route points to SVG pixel coordinates.
 *
 * Uses equirectangular projection with cos(latitude) correction
 * to preserve the visual aspect ratio of the route.
 * The route is centered and scaled to fit the available area
 * while maintaining its true geographic proportions.
 */
export function projectRouteToSvg(
  points: RoutePoint[],
  config: MapViewConfig,
): { mapPoints: MapPoint[]; bounds: RouteBounds; chartArea: { x: number; y: number; width: number; height: number } } {
  if (points.length === 0) {
    const bounds = calculateRouteBounds([])
    return {
      mapPoints: [],
      bounds,
      chartArea: { x: config.padding.left, y: config.padding.top, width: 0, height: 0 },
    }
  }

  const bounds = calculateRouteBounds(points)

  // Available drawing area after padding
  const areaX = config.padding.left
  const areaY = config.padding.top
  const areaW = config.width - config.padding.left - config.padding.right
  const areaH = config.height - config.padding.top - config.padding.bottom

  if (areaW <= 0 || areaH <= 0) {
    return {
      mapPoints: points.map(p => ({ x: 0, y: 0, lat: p.lat, lon: p.lon, elevation: p.elevation, distance: p.distance, time: p.time, hr: p.hr })),
      bounds,
      chartArea: { x: areaX, y: areaY, width: 0, height: 0 },
    }
  }

  // Latitude correction: longitude degrees are narrower near poles
  const cosLat = Math.cos((bounds.centerLat * Math.PI) / 180)

  // Geographic span (corrected)
  let geoW = (bounds.maxLon - bounds.minLon) * cosLat
  let geoH = bounds.maxLat - bounds.minLat

  // Handle degenerate cases (point or line route)
  if (geoW < 1e-8) geoW = 1e-4
  if (geoH < 1e-8) geoH = 1e-4

  // Scale to fit while preserving aspect ratio
  const scaleX = areaW / geoW
  const scaleY = areaH / geoH
  const scale = Math.min(scaleX, scaleY)

  // Actual used dimensions (may be smaller than available area)
  const usedW = geoW * scale
  const usedH = geoH * scale

  // Center the route in the available area
  const offsetX = areaX + (areaW - usedW) / 2
  const offsetY = areaY + (areaH - usedH) / 2

  const mapPoints: MapPoint[] = points.map(p => {
    // Longitude → x (left to right), with latitude correction
    const x = offsetX + (p.lon - bounds.minLon) * cosLat * scale
    // Latitude → y (north is up, SVG y-axis is inverted)
    const y = offsetY + (bounds.maxLat - p.lat) * scale

    return {
      x,
      y,
      lat: p.lat,
      lon: p.lon,
      elevation: p.elevation,
      distance: p.distance,
      time: p.time,
      hr: p.hr,
    }
  })

  return {
    mapPoints,
    bounds,
    chartArea: { x: offsetX, y: offsetY, width: usedW, height: usedH },
  }
}

/**
 * Interpolate a position along the route at a given progress (0-1).
 */
export function getRouteMarkerPosition(
  points: MapPoint[],
  progress: number,
): MapPoint | null {
  if (points.length === 0) return null
  if (progress <= 0) return points[0]
  if (progress >= 1) return points[points.length - 1]

  const exactIndex = progress * (points.length - 1)
  const i = Math.floor(exactIndex)
  const j = Math.min(i + 1, points.length - 1)
  const t = exactIndex - i

  const a = points[i]
  const b = points[j]

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
    elevation: a.elevation + (b.elevation - a.elevation) * t,
    distance: a.distance + (b.distance - a.distance) * t,
    time: a.time != null && b.time != null ? a.time + (b.time - a.time) * t : undefined,
    hr: a.hr != null && b.hr != null ? Math.round(a.hr + (b.hr - a.hr) * t) : (a.hr ?? b.hr),
  }
}

/**
 * Calculate the heading (angle in degrees) at a given progress along the route.
 * 0° = right, 90° = down (SVG coordinates), suitable for SVG rotate().
 */
export function getRouteHeading(
  points: MapPoint[],
  progress: number,
): number {
  if (points.length < 2) return 0

  const exactIndex = progress * (points.length - 1)
  const i = Math.min(Math.floor(exactIndex), points.length - 2)
  const j = i + 1

  const dx = points[j].x - points[i].x
  const dy = points[j].y - points[i].y

  // atan2 gives angle from positive x-axis, in radians
  return (Math.atan2(dy, dx) * 180) / Math.PI
}
