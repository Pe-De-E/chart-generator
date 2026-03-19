/**
 * Satellite Layer
 *
 * Fetches Esri World Imagery tiles via /satellite-tiles/{z}/{y}/{x},
 * stitches them into a single OffscreenCanvas, exports as JPEG data URL,
 * and embeds the result as an SVG <image> element aligned exactly to
 * the route map viewport.
 *
 * URL format note: Esri uses {z}/{row}/{col} = {z}/{y}/{x} (y before x).
 *
 * Coverage: tiles are fetched for the full visible viewport geo extent
 * (not just the tight route bounds) by inverting the projection params.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord } from './geoFeatures'
import { getTilesForBounds, tileBounds, chooseZoom } from './terrainTiles'

// ── Config ────────────────────────────────────────────────────────────────────

export interface SatelliteConfig {
  opacity: number
}

export const DEFAULT_SATELLITE_CONFIG: SatelliteConfig = {
  opacity: 0.85,
}

// ── Viewport bounds ───────────────────────────────────────────────────────────

/**
 * Invert the projection to find what geo area is visible in the SVG viewport.
 *
 * Projection forward:  x = offsetX + (lon - minLon) * cosLat * scale
 *                      y = offsetY + (maxLat - lat) * scale
 * Projection inverse:  lon = minLon + (x - offsetX) / (cosLat * scale)
 *                      lat = maxLat - (y - offsetY) / scale
 */
function viewportGeoBounds(
  proj: ProjectionParams,
  viewWidth: number,
  viewHeight: number,
): RouteBounds {
  const { minLon, maxLat, cosLat, scale, offsetX, offsetY } = proj

  const vMinLon = minLon + (0 - offsetX) / (cosLat * scale)
  const vMaxLon = minLon + (viewWidth - offsetX) / (cosLat * scale)
  const vMaxLat = maxLat - (0 - offsetY) / scale
  const vMinLat = maxLat - (viewHeight - offsetY) / scale

  return {
    minLon: vMinLon,
    maxLon: vMaxLon,
    minLat: vMinLat,
    maxLat: vMaxLat,
    centerLat: (vMinLat + vMaxLat) / 2,
    centerLon: (vMinLon + vMaxLon) / 2,
  }
}

// ── Tile Fetching & Stitching ─────────────────────────────────────────────────

const TILE_SIZE = 256

async function fetchAndStitchTiles(
  fetchBounds: RouteBounds,
): Promise<{ dataUrl: string; bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number } } | null> {
  const zoom = chooseZoom(fetchBounds)
  const tiles = getTilesForBounds(fetchBounds, zoom)
  if (tiles.length === 0) return null

  const minTX = Math.min(...tiles.map(t => t.x))
  const maxTX = Math.max(...tiles.map(t => t.x))
  const minTY = Math.min(...tiles.map(t => t.y))
  const maxTY = Math.max(...tiles.map(t => t.y))
  const gridW = (maxTX - minTX + 1) * TILE_SIZE
  const gridH = (maxTY - minTY + 1) * TILE_SIZE

  const canvas = new OffscreenCanvas(gridW, gridH)
  const ctx = canvas.getContext('2d')!

  // Esri World Imagery URL format: {z}/{y}/{x}  (y = row, x = col)
  let loaded = 0
  await Promise.all(tiles.map(async t => {
    try {
      const res = await fetch(`/satellite-tiles/${t.z}/${t.y}/${t.x}`)
      if (!res.ok) return
      const blob = await res.blob()
      const bitmap = await createImageBitmap(blob)
      ctx.drawImage(bitmap, (t.x - minTX) * TILE_SIZE, (t.y - minTY) * TILE_SIZE)
      bitmap.close()
      loaded++
    } catch { /* skip failed tiles */ }
  }))

  if (loaded === 0) {
    console.warn('[Satellite] no tiles loaded')
    return null
  }

  const tl = tileBounds({ z: zoom, x: minTX, y: minTY })
  const br = tileBounds({ z: zoom, x: maxTX, y: maxTY })

  // Export as JPEG; chunk the binary to avoid call-stack overflow
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const chunkSize = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)))
  }

  return {
    dataUrl: `data:image/jpeg;base64,${btoa(binary)}`,
    bounds: { minLon: tl.minLon, maxLon: br.maxLon, minLat: br.minLat, maxLat: tl.maxLat },
  }
}

// ── SVG Rendering ─────────────────────────────────────────────────────────────

function buildSvgImage(
  dataUrl: string,
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  projParams: ProjectionParams,
  opacity: number,
): string {
  const topLeft = projectGeoCoord(bounds.minLon, bounds.maxLat, projParams)
  const bottomRight = projectGeoCoord(bounds.maxLon, bounds.minLat, projParams)

  const x = topLeft.x.toFixed(1)
  const y = topLeft.y.toFixed(1)
  const w = (bottomRight.x - topLeft.x).toFixed(1)
  const h = (bottomRight.y - topLeft.y).toFixed(1)

  return (
    `<g opacity="${opacity.toFixed(2)}">` +
    `<image href="${dataUrl}" x="${x}" y="${y}" width="${w}" height="${h}" ` +
    `preserveAspectRatio="none"/>` +
    `</g>`
  )
}

// ── Cache & Export ────────────────────────────────────────────────────────────

const satelliteCache = new Map<string, string>()

function buildCacheKey(routeBounds: RouteBounds, viewWidth: number, viewHeight: number): string {
  return `${routeBounds.minLat.toFixed(4)},${routeBounds.maxLat.toFixed(4)},` +
    `${routeBounds.minLon.toFixed(4)},${routeBounds.maxLon.toFixed(4)},${viewWidth},${viewHeight}`
}

/**
 * Generate a satellite imagery SVG layer for the given route map viewport.
 *
 * Tiles are fetched for the full visible geo extent (derived by inverting the
 * projection params) so the image covers every pixel of the map area.
 * Opacity can be swapped without re-fetching (regex replace on cache hit).
 */
export async function generateSatelliteLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: SatelliteConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  const cacheKey = buildCacheKey(routeBounds, viewWidth, viewHeight)
  const cached = satelliteCache.get(cacheKey)
  if (cached !== undefined) {
    return cached.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
  }

  // Compute what geo area is actually visible in the SVG viewport
  const fetchBounds = viewportGeoBounds(projectionParams, viewWidth, viewHeight)

  const result = await fetchAndStitchTiles(fetchBounds)
  if (!result) return ''

  const svg = buildSvgImage(result.dataUrl, result.bounds, projectionParams, config.opacity)
  satelliteCache.set(cacheKey, svg)
  return svg
}
