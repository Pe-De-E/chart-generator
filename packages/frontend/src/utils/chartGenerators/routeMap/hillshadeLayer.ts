/**
 * Hillshade Layer
 *
 * Computes a hillshade (Schummerung) from AWS Terrarium elevation tiles.
 * Uses the same tile fetching as the contour line layer (shared cache,
 * no duplicate network requests).
 *
 * Algorithm:
 *   1. Fetch elevation grid via shared terrainTiles.ts
 *   2. For each pixel, compute surface normal using central differences
 *   3. Dot the normal with a fixed light vector (NW, 45° altitude)
 *   4. Draw result as greyscale onto an OffscreenCanvas
 *   5. Export as JPEG data URL and embed in an SVG <image> element,
 *      projected to align exactly with the route map viewport
 *
 * The projection is equirectangular (linear lon→x, lat→y), so the raster
 * image can be placed with a simple x/y/width/height — no warping needed.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import { projectGeoCoord } from './geoFeatures'
import { fetchElevationGrid, chooseZoom, type ElevationGrid } from './terrainTiles'

// ── Config ────────────────────────────────────────────────────────────────────

export interface HillshadeConfig {
  opacity: number    // overall layer opacity (default 0.35)
  strength: number   // vertical exaggeration / z-factor (default 0.03)
}

export const DEFAULT_HILLSHADE_CONFIG: HillshadeConfig = {
  opacity: 0.35,
  strength: 0.03,
}

// ── Hillshade Computation ─────────────────────────────────────────────────────

/**
 * Compute hillshade pixel values from an elevation grid.
 *
 * Light direction: azimuth 315° (NW), altitude 45°.
 * Normalized light vector in image coords (X=East, Y=South, Z=Up):
 *   lx = cos(45°)*cos(135°) = -0.5,  ly = cos(45°)*sin(135°)·(-1) = -0.5,  lz = sin(45°) = 0.707
 *   → normalized(-1, -1, 1) = (-0.577, -0.577, 0.577)
 */
async function computeHillshade(grid: ElevationGrid, strength: number): Promise<string> {
  const { data, width, height } = grid

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  const imgData = ctx.createImageData(width, height)
  const pixels = imgData.data

  // Normalized light vector (NW sun, 45° altitude)
  const lx = -0.5773502692
  const ly = -0.5773502692
  const lz =  0.5773502692

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Central differences: elevation of 4 neighbours
      const e = data[y * width + (x + 1)]
      const w = data[y * width + (x - 1)]
      const s = data[(y + 1) * width + x]
      const n = data[(y - 1) * width + x]

      // Surface gradient scaled by strength (z-factor)
      const dzdx = (e - w) * strength
      const dzdy = (s - n) * strength   // south − north (image Y increases downward)

      // Surface normal pointing upward from the terrain
      const len = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1)
      const nx = -dzdx / len
      const ny = -dzdy / len
      const nz = 1 / len

      // Lambertian illumination clamped to [0, 1]
      const shade = Math.max(0, nx * lx + ny * ly + nz * lz)
      const v = Math.round(shade * 255)

      const i = (y * width + x) * 4
      pixels[i] = v
      pixels[i + 1] = v
      pixels[i + 2] = v
      pixels[i + 3] = 255
    }
  }

  ctx.putImageData(imgData, 0, 0)

  // Export as JPEG (greyscale compresses very well, ~10× smaller than PNG)
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })

  // Convert Blob → base64 data URL in chunks to avoid call-stack overflow
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const chunkSize = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)))
  }
  return `data:image/jpeg;base64,${btoa(binary)}`
}

// ── SVG Rendering ─────────────────────────────────────────────────────────────

/**
 * Project the elevation grid's geographic corners to SVG pixel coords and
 * return an SVG <image> element that overlays the hillshade raster exactly
 * on top of the route map.
 */
function buildSvgImage(
  dataUrl: string,
  grid: ElevationGrid,
  projParams: ProjectionParams,
  opacity: number,
): string {
  const topLeft     = projectGeoCoord(grid.bounds.minLon, grid.bounds.maxLat, projParams)
  const bottomRight = projectGeoCoord(grid.bounds.maxLon, grid.bounds.minLat, projParams)

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

const hillshadeCache = new Map<string, string>()

function buildCacheKey(bounds: RouteBounds, strength: number, vw: number, vh: number): string {
  return `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},` +
    `${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)},${strength},${vw},${vh}`
}

/**
 * Generate a hillshade SVG layer for the given route bounds.
 *
 * Fetches terrain tiles (shared cache with contour layer), computes
 * hillshade on an OffscreenCanvas, and returns an SVG string containing
 * a positioned <image> element with the greyscale shading.
 */
export async function generateHillshadeLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: HillshadeConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  const cacheKey = buildCacheKey(routeBounds, config.strength, viewWidth, viewHeight)
  const cached = hillshadeCache.get(cacheKey)
  if (cached !== undefined) {
    // Swap opacity without re-computing
    return cached.replace(/opacity="[\d.]+"/, `opacity="${config.opacity.toFixed(2)}"`)
  }

  const zoom = chooseZoom(routeBounds)

  const paddedBounds: RouteBounds = {
    minLat: routeBounds.minLat - 0.3,
    maxLat: routeBounds.maxLat + 0.3,
    minLon: routeBounds.minLon - 0.3,
    maxLon: routeBounds.maxLon + 0.3,
    centerLat: routeBounds.centerLat,
    centerLon: routeBounds.centerLon,
  }

  const grid = await fetchElevationGrid(paddedBounds, zoom)
  const dataUrl = await computeHillshade(grid, config.strength)
  const svg = buildSvgImage(dataUrl, grid, projectionParams, config.opacity)

  hillshadeCache.set(cacheKey, svg)
  return svg
}
