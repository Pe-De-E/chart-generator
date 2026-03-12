/**
 * Shared terrain tile fetching and elevation grid assembly.
 *
 * Used by both contourLines.ts and hillshadeLayer.ts. Keeping the tile
 * cache in a single module means contour and hillshade requests share
 * cached tile data — no duplicate network requests.
 *
 * Data source: AWS Terrarium tiles, proxied via Vite dev server at
 * /terrain-tiles/{z}/{x}/{y}.png to satisfy COEP requirements.
 * Encoding: elevation (m) = R*256 + G + B/256 - 32768
 */

import type { RouteBounds } from './projection'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ElevationGrid {
  data: Float32Array
  width: number
  height: number
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number }
}

export interface TileCoord {
  z: number
  x: number
  y: number
}

// ── Tile Math ─────────────────────────────────────────────────────────────────

const TILE_URL = '/terrain-tiles'

export function lonLatToTile(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom
  const x = Math.floor(((lon + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) }
}

export function tileBounds(tile: TileCoord): { minLon: number; maxLon: number; minLat: number; maxLat: number } {
  const n = 2 ** tile.z
  const minLon = (tile.x / n) * 360 - 180
  const maxLon = ((tile.x + 1) / n) * 360 - 180
  const maxLat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * tile.y) / n))) * 180) / Math.PI
  const minLat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (tile.y + 1)) / n))) * 180) / Math.PI
  return { minLon, maxLon, minLat, maxLat }
}

export function getTilesForBounds(bounds: RouteBounds, zoom: number): TileCoord[] {
  const tl = lonLatToTile(bounds.minLon, bounds.maxLat, zoom)
  const br = lonLatToTile(bounds.maxLon, bounds.minLat, zoom)
  const tiles: TileCoord[] = []
  for (let x = tl.x; x <= br.x; x++) {
    for (let y = tl.y; y <= br.y; y++) {
      tiles.push({ z: zoom, x, y })
    }
  }
  return tiles
}

/**
 * Choose zoom level based on route extent.
 * Smaller extent → higher zoom → finer resolution.
 */
export function chooseZoom(bounds: RouteBounds): number {
  const extent = Math.max(bounds.maxLat - bounds.minLat, bounds.maxLon - bounds.minLon)
  if (extent < 0.3) return 12   // ~30m/px
  if (extent < 1.0) return 11   // ~60m/px
  return 10                      // ~90m/px
}

// ── Tile Fetching & Decoding ──────────────────────────────────────────────────

/** Shared cache — contour lines and hillshade requests reuse decoded tile data. */
const tileCache = new Map<string, Float32Array>()

/**
 * Fetch a terrain tile PNG and decode Terrarium RGB → elevation (metres).
 * Results are cached per tile key to avoid re-downloading.
 */
export async function fetchAndDecodeTile(
  tile: TileCoord,
): Promise<{ data: Float32Array; width: number; height: number }> {
  const key = `${tile.z}/${tile.x}/${tile.y}`
  const cached = tileCache.get(key)
  if (cached) return { data: cached, width: 256, height: 256 }

  const response = await fetch(`${TILE_URL}/${key}.png`)
  if (!response.ok) throw new Error(`Terrain tile fetch failed: ${response.status} for ${key}`)

  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)
  const tileW = bitmap.width
  const tileH = bitmap.height

  const canvas = new OffscreenCanvas(tileW, tileH)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, tileW, tileH)
  bitmap.close()

  const pixels = imageData.data
  const elevations = new Float32Array(tileW * tileH)
  for (let i = 0; i < elevations.length; i++) {
    // Terrarium encoding: elevation = R*256 + G + B/256 - 32768
    elevations[i] = pixels[i * 4] * 256 + pixels[i * 4 + 1] + pixels[i * 4 + 2] / 256 - 32768
  }

  tileCache.set(key, elevations)
  return { data: elevations, width: tileW, height: tileH }
}

/**
 * Fetch all tiles covering the given bounds and stitch into one elevation grid.
 */
export async function fetchElevationGrid(bounds: RouteBounds, zoom: number): Promise<ElevationGrid> {
  const tiles = getTilesForBounds(bounds, zoom)
  if (tiles.length === 0) throw new Error('No tiles found for bounds')

  const tileResults = await Promise.all(
    tiles.map(async t => ({ tile: t, decoded: await fetchAndDecodeTile(t) }))
  )

  const minTileX = Math.min(...tiles.map(t => t.x))
  const maxTileX = Math.max(...tiles.map(t => t.x))
  const minTileY = Math.min(...tiles.map(t => t.y))
  const maxTileY = Math.max(...tiles.map(t => t.y))

  const tileSize = 256
  const gridW = (maxTileX - minTileX + 1) * tileSize
  const gridH = (maxTileY - minTileY + 1) * tileSize
  const grid = new Float32Array(gridW * gridH)

  for (const { tile, decoded } of tileResults) {
    const offsetX = (tile.x - minTileX) * tileSize
    const offsetY = (tile.y - minTileY) * tileSize
    for (let row = 0; row < tileSize; row++) {
      const srcStart = row * tileSize
      grid.set(decoded.data.subarray(srcStart, srcStart + tileSize), (offsetY + row) * gridW + offsetX)
    }
  }

  const tlBounds = tileBounds({ z: zoom, x: minTileX, y: minTileY })
  const brBounds = tileBounds({ z: zoom, x: maxTileX, y: maxTileY })

  return {
    data: grid,
    width: gridW,
    height: gridH,
    bounds: {
      minLon: tlBounds.minLon,
      maxLon: brBounds.maxLon,
      minLat: brBounds.minLat,
      maxLat: tlBounds.maxLat,
    },
  }
}
