/**
 * TerrainScene
 *
 * Manages a Three.js scene that renders a 3D terrain mesh from AWS Terrarium
 * elevation tiles, with the GPS route animated as a glowing line on the surface.
 *
 * Usage:
 *   const scene = new TerrainScene(canvasEl, 1080, 1248)
 *   await scene.load(routePoints, config)
 *   scene.setProgress(0.5)
 *   scene.render()
 *   // on unmount:
 *   scene.dispose()
 */

import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { contours as d3Contours } from 'd3-contour'
import type { RoutePoint } from '@chart-generator/shared'
import type { TerrainAnimationConfig, TerrainCameraMode } from './types'
import citiesData from '../../../data/geo/cities.json'

// ── Constants ────────────────────────────────────────────────────────────────

const TERRAIN_SIZE = 1000     // world units for terrain square
const TERRAIN_PADDING = 0.25  // geographic padding — show surrounding landscape for orientation
const TILE_URL = '/terrain-tiles'

// ── Elevation Tile Data ───────────────────────────────────────────────────────

interface ElevationGrid {
  data: Float32Array
  width: number
  height: number
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number }
}

interface TileCoord { z: number; x: number; y: number }

const tileCache = new Map<string, Float32Array>()

function lonLatToTile(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom
  const x = Math.floor(((lon + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) }
}

function tileBounds(tile: TileCoord): { minLon: number; maxLon: number; minLat: number; maxLat: number } {
  const n = 2 ** tile.z
  const minLon = (tile.x / n) * 360 - 180
  const maxLon = ((tile.x + 1) / n) * 360 - 180
  const maxLat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * tile.y) / n))) * 180) / Math.PI
  const minLat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (tile.y + 1)) / n))) * 180) / Math.PI
  return { minLon, maxLon, minLat, maxLat }
}

function getTilesForBounds(
  minLon: number, maxLon: number, minLat: number, maxLat: number,
  zoom: number,
): TileCoord[] {
  const tl = lonLatToTile(minLon, maxLat, zoom)
  const br = lonLatToTile(maxLon, minLat, zoom)
  const tiles: TileCoord[] = []
  for (let x = tl.x; x <= br.x; x++)
    for (let y = tl.y; y <= br.y; y++)
      tiles.push({ z: zoom, x, y })
  return tiles
}

function chooseZoom(latSpan: number, lonSpan: number): number {
  const extent = Math.max(latSpan, lonSpan)
  if (extent < 0.15) return 13  // < ~15km: 20m/pixel
  if (extent < 0.5)  return 12  // < ~50km: 40m/pixel
  if (extent < 1.5)  return 11  // < ~150km: 80m/pixel
  return 10
}

async function fetchAndDecodeTile(tile: TileCoord): Promise<{ data: Float32Array; width: number; height: number }> {
  const key = `${tile.z}/${tile.x}/${tile.y}`
  const cached = tileCache.get(key)
  if (cached) return { data: cached, width: 256, height: 256 }

  const response = await fetch(`${TILE_URL}/${key}.png`)
  if (!response.ok) throw new Error(`Tile fetch failed: ${response.status}`)

  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)
  const tileW = bitmap.width
  const tileH = bitmap.height
  const canvas = new OffscreenCanvas(tileW, tileH)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const pixels = ctx.getImageData(0, 0, tileW, tileH).data

  const elevations = new Float32Array(tileW * tileH)
  for (let i = 0; i < elevations.length; i++) {
    elevations[i] = pixels[i * 4] * 256 + pixels[i * 4 + 1] + pixels[i * 4 + 2] / 256 - 32768
  }

  tileCache.set(key, elevations)
  return { data: elevations, width: tileW, height: tileH }
}

async function fetchElevationGrid(
  minLon: number, maxLon: number, minLat: number, maxLat: number,
): Promise<ElevationGrid> {
  const latSpan = maxLat - minLat
  const lonSpan = maxLon - minLon
  const zoom = chooseZoom(latSpan, lonSpan)
  const tiles = getTilesForBounds(minLon, maxLon, minLat, maxLat, zoom)
  if (tiles.length === 0) throw new Error('No tiles for bounds')

  const results = await Promise.all(tiles.map(async t => ({ tile: t, decoded: await fetchAndDecodeTile(t) })))

  const minTX = Math.min(...tiles.map(t => t.x))
  const maxTX = Math.max(...tiles.map(t => t.x))
  const minTY = Math.min(...tiles.map(t => t.y))
  const maxTY = Math.max(...tiles.map(t => t.y))
  const tileSize = 256
  const gridW = (maxTX - minTX + 1) * tileSize
  const gridH = (maxTY - minTY + 1) * tileSize

  const grid = new Float32Array(gridW * gridH)
  for (const { tile, decoded } of results) {
    const ox = (tile.x - minTX) * tileSize
    const oy = (tile.y - minTY) * tileSize
    for (let row = 0; row < tileSize; row++) {
      grid.set(decoded.data.subarray(row * tileSize, (row + 1) * tileSize), (oy + row) * gridW + ox)
    }
  }

  const tl = tileBounds({ z: zoom, x: minTX, y: minTY })
  const br = tileBounds({ z: zoom, x: maxTX, y: maxTY })

  return {
    data: grid,
    width: gridW,
    height: gridH,
    bounds: { minLon: tl.minLon, maxLon: br.maxLon, minLat: br.minLat, maxLat: tl.maxLat },
  }
}

interface SatelliteGrid {
  canvas: OffscreenCanvas
  bounds: ElevationGrid['bounds']
}

async function fetchSatelliteGrid(
  minLon: number, maxLon: number, minLat: number, maxLat: number,
): Promise<SatelliteGrid | null> {
  const latSpan = maxLat - minLat
  const lonSpan = maxLon - minLon
  const zoom  = chooseZoom(latSpan, lonSpan)
  const tiles = getTilesForBounds(minLon, maxLon, minLat, maxLat, zoom)
  if (tiles.length === 0) return null

  const tileSize = 256
  const minTX = Math.min(...tiles.map(t => t.x))
  const maxTX = Math.max(...tiles.map(t => t.x))
  const minTY = Math.min(...tiles.map(t => t.y))
  const maxTY = Math.max(...tiles.map(t => t.y))
  const gridW  = (maxTX - minTX + 1) * tileSize
  const gridH  = (maxTY - minTY + 1) * tileSize

  const canvas = new OffscreenCanvas(gridW, gridH)
  const ctx    = canvas.getContext('2d')!

  // Esri World Imagery URL format: {z}/{row}/{col} = {z}/{y}/{x}
  await Promise.all(tiles.map(async t => {
    try {
      const res = await fetch(`/satellite-tiles/${t.z}/${t.y}/${t.x}`)
      if (!res.ok) return
      const blob   = await res.blob()
      const bitmap = await createImageBitmap(blob)
      const ox = (t.x - minTX) * tileSize
      const oy = (t.y - minTY) * tileSize
      ctx.drawImage(bitmap, ox, oy)
      bitmap.close()
    } catch { /* skip failed tiles */ }
  }))

  const tl = tileBounds({ z: zoom, x: minTX, y: minTY })
  const br = tileBounds({ z: zoom, x: maxTX, y: maxTY })
  return {
    canvas,
    bounds: { minLon: tl.minLon, maxLon: br.maxLon, minLat: br.minLat, maxLat: tl.maxLat },
  }
}

function sampleElevation(lon: number, lat: number, grid: ElevationGrid): number {
  const { data, width, height, bounds } = grid
  const nx = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)
  const ny = 1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)
  const px = Math.max(0, Math.min(nx, 1)) * (width - 1)
  const py = Math.max(0, Math.min(ny, 1)) * (height - 1)
  const x0 = Math.floor(px), x1 = Math.min(x0 + 1, width - 1)
  const y0 = Math.floor(py), y1 = Math.min(y0 + 1, height - 1)
  const fx = px - x0, fy = py - y0
  return (
    data[y0 * width + x0] * (1 - fx) * (1 - fy) +
    data[y0 * width + x1] * fx * (1 - fy) +
    data[y1 * width + x0] * (1 - fx) * fy +
    data[y1 * width + x1] * fx * fy
  )
}

/**
 * Sample the minimum elevation in a radius-px neighbourhood around (lon, lat).
 * Rivers always flow at the lowest nearby point (valley floor), so taking the
 * minimum rather than the bilinearly-interpolated value prevents them from
 * appearing on cliff faces or flowing uphill across terrain steps.
 */
function sampleElevationMin(lon: number, lat: number, grid: ElevationGrid, radiusPx = 3): number {
  const { data, width, height, bounds } = grid
  const nx = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)
  const ny = 1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)
  const cx = Math.max(0, Math.min(nx, 1)) * (width - 1)
  const cy = Math.max(0, Math.min(ny, 1)) * (height - 1)
  let min = Infinity
  for (let dy = -radiusPx; dy <= radiusPx; dy++) {
    for (let dx = -radiusPx; dx <= radiusPx; dx++) {
      const px = Math.max(0, Math.min(width - 1, Math.round(cx + dx)))
      const py = Math.max(0, Math.min(height - 1, Math.round(cy + dy)))
      const e = data[py * width + px]
      if (e < min) min = e
    }
  }
  return isFinite(min) ? min : sampleElevation(lon, lat, grid)
}

// ── Elevation Smoothing ───────────────────────────────────────────────────────

/**
 * Snap every elevation value to the nearest multiple of `interval` (floor).
 *
 * This is the key noise-removal step: any DSM artefact shorter than `interval`
 * (a tree at +8 m, a building at +6 m, a road embankment at +3 m) collapses
 * into the surrounding base contour level and simply disappears.
 * Features taller than `interval` still show up — correctly — as one step higher.
 *
 * The adaptive interval is chosen so the total number of levels stays ~15–25
 * regardless of the terrain's absolute relief, which keeps the Gaussian blur
 * step well-scaled at every zoom level.
 */
function contourQuantize(grid: ElevationGrid, interval: number): ElevationGrid {
  const q = new Float32Array(grid.data.length)
  for (let i = 0; i < grid.data.length; i++) {
    q[i] = Math.floor(grid.data[i] / interval) * interval
  }
  return { data: q, width: grid.width, height: grid.height, bounds: grid.bounds }
}

function adaptiveQuantizeInterval(elevRange: number): number {
  if (elevRange <  150) return  5
  if (elevRange <  400) return 10
  if (elevRange < 1000) return 25
  if (elevRange < 2000) return 50
  return 100
}

/**
 * Separable Gaussian blur on the elevation grid.
 *
 * Applied AFTER contour-quantization: the quantized grid has clean, level
 * plateau regions separated by sharp vertical steps. The Gaussian blur
 * converts those sharp steps into smooth, curved transitions — exactly what
 * the user described as "die Linien dazwischen abrunden".
 *
 * sigma is in grid pixels. sigma=2 spreads a step over ~5 pixels, which at
 * zoom 13 (20 m/px) corresponds to ~100 m of horizontal smoothing — enough
 * to give gently rolling hills without smearing large-scale features.
 */
function gaussianBlurGrid(grid: ElevationGrid, sigma: number): ElevationGrid {
  const { width, height, bounds } = grid
  const radius = Math.ceil(2.5 * sigma)
  const kSize  = 2 * radius + 1

  // Build normalised 1-D Gaussian kernel
  const kernel = new Float32Array(kSize)
  let ksum = 0
  for (let i = 0; i < kSize; i++) {
    const d = i - radius
    kernel[i] = Math.exp(-(d * d) / (2 * sigma * sigma))
    ksum += kernel[i]
  }
  for (let i = 0; i < kSize; i++) kernel[i] /= ksum

  // Horizontal pass  (src → tmp)
  const tmp = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0
      for (let k = 0; k < kSize; k++) {
        const xi = Math.max(0, Math.min(width - 1, x + k - radius))
        v += grid.data[y * width + xi] * kernel[k]
      }
      tmp[y * width + x] = v
    }
  }

  // Vertical pass  (tmp → result)
  const result = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0
      for (let k = 0; k < kSize; k++) {
        const yi = Math.max(0, Math.min(height - 1, y + k - radius))
        v += tmp[yi * width + x] * kernel[k]
      }
      result[y * width + x] = v
    }
  }

  return { data: result, width, height, bounds }
}

// ── Terrain Color Normalization ───────────────────────────────────────────────

/**
 * Maps an elevation value to a 0–1 color-ramp position that is appropriate
 * for the terrain's actual elevation range.
 *
 * Problem with the old 40%abs + 60%rel blend:
 *   A 70 m hilltop gets relT=1.0, pushing it into the rock/snow zone of an
 *   alpine ramp — even though 70 m terrain is purely lowland.
 *
 * Fix — "anchored window" approach:
 *   1. Find where the terrain's floor and ceiling sit in the global ramp
 *      (floorT and ceilT, both referenced against 3500 m).
 *   2. Map the local relative elevation into [floorT, floorT + spread].
 *   3. The spread is the real relief (ceilT−floorT), amplified slightly for
 *      visual depth on flat terrain, but never exceeding the actual ramp range.
 *
 * This means:
 *   - A 0–100 m lowland uses only the "dark-green valley → meadow" portion.
 *   - A 1000–2500 m alpine route uses the "rock → snow" portion.
 *   - A 0–3500 m transect uses the full ramp.
 */
const ELEV_COLOR_REF = 3500

function computeTerrainColorT(elev: number, gridMin: number, gridMax: number): number {
  const floorT = Math.max(0, Math.min(1, gridMin / ELEV_COLOR_REF))
  const ceilT  = Math.max(0, Math.min(1, gridMax  / ELEV_COLOR_REF))
  // Stretch local relief for visual depth, but never overshoot the ramp ceiling.
  // Minimum spread of 0.15 keeps flat terrain from looking like a single flat colour.
  const relief = ceilT - floorT
  const spread = Math.max(relief * 1.5, Math.min(0.15, floorT + 0.15))
  const relT   = gridMax > gridMin ? (elev - gridMin) / (gridMax - gridMin) : 0
  return Math.max(0, Math.min(1, floorT + Math.max(0, Math.min(1, relT)) * spread))
}

// ── Terrain Style Colors ──────────────────────────────────────────────────────

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  )
}

function getTerrainColor(normalizedHeight: number, style: string): THREE.Color {
  const t = Math.max(0, Math.min(1, normalizedHeight))

  switch (style) {
    case 'alpine': {
      // 5-stop ramp anchored to absolute elevation via the incoming t value.
      //
      // Lowland terrain (< ~400 m) uses a muted olive-green that reads as
      // "countryside" rather than "alpine valley".  Neighbouring stops are
      // close enough in brightness that small elevation variations (the
      // 5–20 m noise typical in DSM tiles) produce only subtle colour shifts
      // rather than the high-contrast farmland ↔ dark-forest flickering that
      // occurs when the palette has a large luminosity jump at a low threshold.
      const lowland = new THREE.Color('#4e7a20')  // muted olive-green — lowland / Mittelgebirge
      const forest  = new THREE.Color('#2e5c12')  // mixed forest (400–900 m)
      const alpine  = new THREE.Color('#3a6e1e')  // subalpine meadow (900–1600 m)
      const rock    = new THREE.Color('#5a5348')  // bare rock (1600–2800 m)
      const snow    = new THREE.Color('#dde4ea')  // snow cap (> 2800 m)
      if (t < 0.15) return lerpColor(lowland, forest, t / 0.15)
      if (t < 0.30) return lerpColor(forest,  alpine, (t - 0.15) / 0.15)
      if (t < 0.60) return lerpColor(alpine,  rock,   (t - 0.30) / 0.30)
      return lerpColor(rock, snow, (t - 0.60) / 0.40)
    }
    case 'desert': {
      const low = new THREE.Color('#5a3e1b')
      const mid = new THREE.Color('#a07840')
      const high = new THREE.Color('#c8a878')
      if (t < 0.5) return lerpColor(low, mid, t * 2)
      return lerpColor(mid, high, (t - 0.5) * 2)
    }
    case 'topo': {
      const green = new THREE.Color('#2d6a2d')
      const yellow = new THREE.Color('#c8b400')
      const brown = new THREE.Color('#8b4513')
      const white = new THREE.Color('#f0f0f0')
      if (t < 0.33) return lerpColor(green, yellow, t / 0.33)
      if (t < 0.66) return lerpColor(yellow, brown, (t - 0.33) / 0.33)
      return lerpColor(brown, white, (t - 0.66) / 0.34)
    }
    default: { // 'dark'
      const valley = new THREE.Color('#1c2e4a')
      const slope = new THREE.Color('#2e4a6e')
      const ridge = new THREE.Color('#4a6a96')
      const peak = new THREE.Color('#8aaac8')
      if (t < 0.4) return lerpColor(valley, slope, t / 0.4)
      if (t < 0.75) return lerpColor(slope, ridge, (t - 0.4) / 0.35)
      return lerpColor(ridge, peak, (t - 0.75) / 0.25)
    }
  }
}

// ── Color Helpers ─────────────────────────────────────────────────────────────

/**
 * Strip alpha from 8-char HEXA strings (#RRGGBBAA → #RRGGBB).
 * Vuetify's color picker emits HEXA, but Three.js Color misparses the alpha
 * byte as part of the blue channel, producing wrong hues (e.g. orange→magenta).
 */
function toThreeColor(color: string): number {
  const hex = color.startsWith('#') && color.length === 9 ? color.slice(0, 7) : color
  return new THREE.Color(hex).getHex()
}

// ── Coordinate Mapping ────────────────────────────────────────────────────────

interface SceneBounds {
  minLon: number; maxLon: number; minLat: number; maxLat: number
  centerLat: number; centerLon: number
  lonRange: number; latRange: number
}

function geoToWorld(lon: number, lat: number, elev: number, bounds: SceneBounds, exaggeration: number, elevScale: number, baseElev: number = 0): THREE.Vector3 {
  const x = ((lon - bounds.minLon) / bounds.lonRange - 0.5) * TERRAIN_SIZE
  const z = -((lat - bounds.minLat) / bounds.latRange - 0.5) * TERRAIN_SIZE
  const y = (elev - baseElev) * exaggeration * elevScale
  return new THREE.Vector3(x, y, z)
}

/** Flat XZ world position with given Y — used for the flat-map render mode. */
function geoToFlat(lon: number, lat: number, flatY: number, bounds: SceneBounds): THREE.Vector3 {
  const x = ((lon - bounds.minLon) / bounds.lonRange - 0.5) * TERRAIN_SIZE
  const z = -((lat - bounds.minLat) / bounds.latRange - 0.5) * TERRAIN_SIZE
  return new THREE.Vector3(x, flatY, z)
}

/** Convert an elevation value to a world-Y height for flat-map mode. */
function elevToFlatY(elev: number, baseElev: number, exaggeration: number, elevScale: number): number {
  return (elev - baseElev) * exaggeration * elevScale
}

// ── Contour Layer Helpers ─────────────────────────────────────────────────────

/** Map a d3-contour grid pixel [col, row] to Three.js world XZ coordinates */
function gridPixelToWorld(px: number, py: number, gw: number, gh: number): [number, number] {
  return [
    (px / (gw - 1) - 0.5) * TERRAIN_SIZE,
    (py / (gh - 1) - 0.5) * TERRAIN_SIZE,
  ]
}

/**
 * Choose a round contour interval for the contour-layers (Rayshader) mode.
 * Targets ~30 layers — many layers = clear topo-model stack look.
 */
function niceContourInterval(range: number): number {
  const approx = range / 30
  const nice = [2, 5, 10, 20, 25, 50, 100, 150, 200, 250, 500, 1000]
  return nice.find(v => v >= approx) ?? 1000
}

/**
 * Choose a round contour interval for the realistic overlay lines.
 * Targets ~15 lines and enforces a 10 m minimum so lines stay readable
 * even on blurred flat terrain where the effective range is compressed.
 */
function niceContourOverlayInterval(range: number): number {
  const approx = range / 15
  const nice = [10, 20, 25, 50, 100, 150, 200, 250, 500, 1000]
  return nice.find(v => v >= approx) ?? 1000
}

/**
 * Chaikin corner-cutting smoothing for polygon rings.
 * Each pass replaces every edge AB with two points at 25% and 75%.
 * Caps at maxPts to prevent memory explosion on large boundary polygons.
 */
function chaikinSmooth(pts: [number, number][], passes: number, maxPts = 800): [number, number][] {
  // Downsample first if ring is already very large
  let r = pts
  if (r.length > maxPts) {
    const step = Math.ceil(r.length / maxPts)
    r = r.filter((_, i) => i % step === 0)
  }
  for (let p = 0; p < passes; p++) {
    const s: [number, number][] = []
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length]
      s.push([a[0] + 0.25 * (b[0] - a[0]), a[1] + 0.25 * (b[1] - a[1])])
      s.push([a[0] + 0.75 * (b[0] - a[0]), a[1] + 0.75 * (b[1] - a[1])])
    }
    r = s
  }
  return r
}

// ── Geo Overlay: Rivers + Places ─────────────────────────────────────────────

interface OverpassWay {
  geometry: Array<{ lat: number; lon: number }>
  tags?: Record<string, string>
}

interface CityPoint {
  name: string
  lat: number
  lon: number
  pop: number
}

const riverCache = new Map<string, OverpassWay[]>()

async function fetchTerrainRivers(
  minLon: number, maxLon: number, minLat: number, maxLat: number,
): Promise<OverpassWay[]> {
  const key = `${minLat.toFixed(4)},${minLon.toFixed(4)},${maxLat.toFixed(4)},${maxLon.toFixed(4)}`
  if (riverCache.has(key)) return riverCache.get(key)!

  const query =
    `[out:json][bbox:${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}][timeout:20];\n` +
    `way[waterway~"^(river|canal)$"];\n` +
    `out geom;`

  try {
    const res = await fetch('/overpass/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    if (!res.ok) throw new Error(`Overpass ${res.status}`)
    const data = await res.json()
    const ways = (data.elements ?? []).filter(
      (e: any) => e.type === 'way' && e.geometry?.length >= 2,
    ) as OverpassWay[]
    riverCache.set(key, ways)
    return ways
  } catch {
    return []
  }
}

/**
 * Billboard text sprite rendered via OffscreenCanvas.
 * Always faces the camera (THREE.Sprite default behaviour).
 */
function makeTextSprite(text: string, fontSize = 30): THREE.Sprite {
  const padding = 8
  // Measure first, then allocate correctly sized canvas
  const tmp = new OffscreenCanvas(1, 1)
  const tmpCtx = tmp.getContext('2d')!
  tmpCtx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
  const textW = Math.ceil(tmpCtx.measureText(text).width)

  const canvasW = textW + padding * 2
  const canvasH = fontSize + padding * 2
  const canvas = new OffscreenCanvas(canvasW, canvasH)
  const ctx = canvas.getContext('2d')!

  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(0,0,0,0.95)'
  ctx.shadowBlur = 5
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, padding, padding)

  const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement)
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(mat)

  // Scale: 200 world units ≈ a "normal" label width reference
  const worldWidth = Math.max(60, (canvasW / 256) * 200)
  const worldHeight = (canvasH / 256) * 200
  sprite.scale.set(worldWidth, worldHeight, 1)
  return sprite
}

// ── TerrainScene ──────────────────────────────────────────────────────────────

export class TerrainScene {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private perspCamera: THREE.PerspectiveCamera
  private orthoCamera: THREE.OrthographicCamera
  private activeCamera: THREE.Camera

  private terrainMesh: THREE.Mesh | null = null
  private rawElevGrid: ElevationGrid | null = null  // unblurred — used for river/route surface snapping
  private trailLine: Line2 | null = null
  private revealedLine: Line2 | null = null
  private revealedGlowLine: Line2 | null = null
  private markerMesh: THREE.Mesh | null = null

  private allRoute3D: THREE.Vector3[] = []
  private elevGrid: ElevationGrid | null = null
  private sceneBounds: SceneBounds | null = null
  private elevScale = 1
  private baseElev = 0      // min elevation in terrain grid → terrain base sits at Y=0
  private terrainMidY = 0   // world-space Y of terrain mid-point (for camera lookAt)
  private contourInterval = 0  // elevation interval used in contour-layers mode
  private gridElevMax = 0      // actual max elevation in terrain grid (for colour mapping)

  // Dynamic camera orientation — computed from actual route direction
  private routeDir      = new THREE.Vector3(0, 0, -1) // start → end direction (unit vector)
  private routeCentroid = new THREE.Vector2(0, 0)      // XZ centroid of route
  private routeMedianY  = 0                            // median world-space Y of route points

  private width: number
  private height: number
  private controls: OrbitControls
  private onControlsChange: (() => void) | null = null
  private currentConfig: TerrainAnimationConfig | null = null

  // Smoothed chase camera state — lerped each frame to avoid snapping
  private chasePos        = new THREE.Vector3()
  private chaseTarget     = new THREE.Vector3()
  private chaseReady      = false   // false = snap on first frame, then lerp

  // Post-processing
  private composer: EffectComposer
  private renderPass: RenderPass
  private gtaoPass: GTAOPass

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.width = width
    this.height = height

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setSize(width, height, false)
    this.renderer.setPixelRatio(1)
    this.renderer.shadowMap.enabled = false

    this.scene = new THREE.Scene()

    this.perspCamera = new THREE.PerspectiveCamera(60, width / height, 1, 20000)
    this.orthoCamera = new THREE.OrthographicCamera(-TERRAIN_SIZE * 0.8, TERRAIN_SIZE * 0.8, TERRAIN_SIZE * 0.8 * (height / width), -TERRAIN_SIZE * 0.8 * (height / width), 1, 20000)
    this.activeCamera = this.perspCamera

    // OrbitControls — user can freely rotate/zoom/pan the camera
    this.controls = new OrbitControls(this.perspCamera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.screenSpacePanning = false
    this.controls.minDistance = 50
    this.controls.maxDistance = 3000
    this.controls.maxPolarAngle = Math.PI * 0.85  // don't flip underground

    this.setupLighting()

    // ── Post-processing: GTAO (Ground Truth Ambient Occlusion) ──────────────
    // GTAO is the modern successor to SSAO. It darkens crevices and valleys
    // based on how much of the hemisphere above each surface point is occluded
    // by nearby geometry — giving the characteristic "soft, sculpted" look of
    // Rayshader output.
    this.composer  = new EffectComposer(this.renderer)
    this.renderPass = new RenderPass(this.scene, this.perspCamera)
    this.composer.addPass(this.renderPass)

    this.gtaoPass = new GTAOPass(this.scene, this.perspCamera, width, height)
    this.gtaoPass.updateGtaoMaterial({
      radius:           25,   // world-unit sampling radius — larger = more global valley shadowing
      distanceExponent: 2,    // quadratic falloff — natural, not too harsh
      thickness:        1,    // thin-ridge clamp — stops AO bleeding across sharp ridges
      distanceFallOff:  1,
    })
    this.gtaoPass.updatePdMaterial({
      radius:         6,      // Poisson denoise kernel radius (pixels)
      radiusExponent: 2,
    })
    this.gtaoPass.blendIntensity = 1.0
    this.composer.addPass(this.gtaoPass)

    // OutputPass converts the composer's internal linear colour buffer to sRGB
    // so colours match what renderer.render() would produce without post-processing.
    this.composer.addPass(new OutputPass())
  }

  /**
   * Register a callback that fires whenever the user moves the camera.
   * TerrainChartStep uses this to trigger a render when paused.
   */
  setControlsChangeCallback(cb: () => void): void {
    if (this.onControlsChange) {
      this.controls.removeEventListener('change', this.onControlsChange)
    }
    this.onControlsChange = cb
    this.controls.addEventListener('change', cb)
  }

  /** Call in the render loop to apply damping */
  updateControls(): void {
    this.controls.update()
  }

  /** Snap OrbitControls target to the route centroid so orbiting feels natural */
  private syncControlsTarget(): void {
    this.controls.target.set(
      this.routeCentroid.x,
      Math.max(0, this.routeMedianY),
      this.routeCentroid.y,
    )
    this.controls.update()
  }

  /** Reset camera to the auto-computed position (called from sidebar button) */
  resetCamera(config: TerrainAnimationConfig): void {
    this.positionCamera(config)
    this.syncControlsTarget()
  }

  private setupLighting(): void {
    // Low ambient — let the directional sun do the heavy lifting
    const ambient = new THREE.AmbientLight(0x223355, 0.3)
    this.scene.add(ambient)

    // Strong warm sun from upper-left-front — creates dramatic shadows on ridge faces
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.2)
    sun.position.set(-700, 1100, 500)
    this.scene.add(sun)

    // Cool blue fill from the right — fakes sky bounce light
    const fill = new THREE.DirectionalLight(0x4488bb, 0.45)
    fill.position.set(600, 200, -200)
    this.scene.add(fill)

    // Sky/ground hemisphere for subtle ambient colour gradient
    const hemi = new THREE.HemisphereLight(0x224466, 0x110d00, 0.5)
    this.scene.add(hemi)
  }

  /** Load terrain + route for the given GPX points and config */
  async load(routePoints: RoutePoint[], config: TerrainAnimationConfig): Promise<void> {
    this.currentConfig = config
    this.clearScene()
    console.log('[Terrain] load() start, routePoints:', routePoints.length)

    if (routePoints.length < 2) return

    // ── Compute padded bounds ──
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
    for (const p of routePoints) {
      minLat = Math.min(minLat, p.lat)
      maxLat = Math.max(maxLat, p.lat)
      minLon = Math.min(minLon, p.lon)
      maxLon = Math.max(maxLon, p.lon)
    }
    const padLat = (maxLat - minLat) * TERRAIN_PADDING
    const padLon = (maxLon - minLon) * TERRAIN_PADDING
    minLat -= padLat; maxLat += padLat
    minLon -= padLon; maxLon += padLon

    const sceneBounds: SceneBounds = {
      minLon, maxLon, minLat, maxLat,
      centerLat: (minLat + maxLat) / 2,
      centerLon: (minLon + maxLon) / 2,
      lonRange: maxLon - minLon,
      latRange: maxLat - minLat,
    }
    this.sceneBounds = sceneBounds

    // ── Fetch elevation + satellite tiles in parallel ──
    console.log('[Terrain] fetching elevation + satellite tiles for bounds:', { minLon, maxLon, minLat, maxLat })
    const fetchSat = config.terrainRenderStyle === 'realistic'
      ? fetchSatelliteGrid(minLon, maxLon, minLat, maxLat)
      : Promise.resolve(null)
    const [elevGrid, satGrid] = await Promise.all([
      fetchElevationGrid(minLon, maxLon, minLat, maxLat),
      fetchSat,
    ])
    this.elevGrid    = elevGrid
    this.rawElevGrid = elevGrid  // keep unblurred copy for river/route snapping
    console.log('[Terrain] elevation grid fetched, size:', this.elevGrid.width, 'x', this.elevGrid.height)

    // ── Calculate route elevation range (for terrainMidY) ──
    let minElev = Infinity, maxElev = -Infinity
    for (const p of routePoints) {
      minElev = Math.min(minElev, p.elevation)
      maxElev = Math.max(maxElev, p.elevation)
    }

    // ── Compute base elevation and scale from terrain GRID range ──
    // Using the grid's full elevation range (not the route range) ensures surrounding
    // mountains are never over-exaggerated relative to the terrain width.
    let gridMinElev = Infinity, gridMaxElev = -Infinity
    for (let i = 0; i < this.elevGrid.data.length; i++) {
      const e = this.elevGrid.data[i]
      if (e < gridMinElev) gridMinElev = e
      if (e > gridMaxElev) gridMaxElev = e
    }
    const gridElevRange = Math.max(gridMaxElev - gridMinElev, 100)
    this.baseElev    = Math.max(0, gridMinElev)
    this.gridElevMax = gridMaxElev

    // ── Terrain data processing (mode-dependent) ──
    //
    // Realistic mode: Gaussian blur only.
    //   Removes DSM noise (tree canopy, buildings, road embankments) while
    //   keeping the continuous natural terrain shape. sigma=4 px = ~80–160 m
    //   smoothing radius depending on zoom — enough to erase building-scale
    //   artefacts without blurring real ridges and valleys.
    //   No quantize step here: quantization introduces visible plateau banding
    //   that makes realistic terrain look artificial.
    //
    // Contour-layers mode: quantize only.
    //   Snaps every cell to the nearest lower contour level so that d3-contour
    //   produces clean, well-defined polygon rings. The Chaikin smoothing
    //   applied later handles any jagged marching-squares edges.
    //   No blur here: blurring after quantize smears the sharp contour boundaries
    //   and defeats the purpose of the stepped-layer aesthetic.
    if (config.terrainRenderStyle === 'contour-layers') {
      const quantizeInterval = adaptiveQuantizeInterval(gridElevRange)
      this.elevGrid = contourQuantize(this.elevGrid, quantizeInterval)
      console.log('[Terrain] contour-quantize (interval:', quantizeInterval, 'm) for contour-layers mode')
    } else {
      this.elevGrid = gaussianBlurGrid(this.elevGrid, 6.0)
      console.log('[Terrain] Gaussian blur (sigma=6.0) for realistic mode')
    }
    // Scale terrain so its relief spans ~5% of TERRAIN_SIZE at the reference range.
    // This keeps hills and valleys proportional to their real-world size —
    // the old 22% made even moderate terrain look like extreme alpine peaks.
    this.elevScale = (TERRAIN_SIZE * 0.05) / Math.max(gridElevRange, 400)

    // terrainMidY: world Y of the route's mid-elevation (camera looks at this height)
    const routeElevMid = (minElev + maxElev) / 2
    this.terrainMidY = (routeElevMid - this.baseElev) * config.terrainExaggeration * this.elevScale
    console.log('[Terrain] baseElev:', this.baseElev, 'gridElevRange:', gridElevRange, 'terrainMidY:', this.terrainMidY, 'elevScale:', this.elevScale)

    // ── Build terrain mesh ──
    this.buildTerrainMesh(config, satGrid)

    // ── Contour overlays (flat-map only) ──
    if (config.terrainRenderStyle === 'flat-map') {
      this.buildFlatContours(config)
    }

    // ── Build route lines ──
    this.buildRouteLines(routePoints, config)

    // ── Build marker ──
    this.buildMarker(config)

    // ── Geo overlays (realistic + flat-map) ──
    if (config.terrainRenderStyle === 'realistic' || config.terrainRenderStyle === 'flat-map') {
      if (config.showPlaces) this.buildPlaces(config)
      if (config.showRivers) {
        // Rivers are fetched async; trigger a render once they arrive
        fetchTerrainRivers(minLon, maxLon, minLat, maxLat)
          .then(ways => {
            if (ways.length > 0) {
              this.buildRivers(ways, config)
              this.render()
            }
          })
          .catch(() => { /* ignore river fetch errors */ })
      }
    }

    // ── Compute route orientation for dynamic camera ──
    this.computeRouteOrientation()

    // ── Position camera ──
    this.positionCamera(config)
    this.syncControlsTarget()

    // Set scene background
    const bgHex = config.backgroundColor.startsWith('#') && config.backgroundColor.length === 9
      ? config.backgroundColor.slice(0, 7) : config.backgroundColor
    const bgColor = new THREE.Color(bgHex)
    this.scene.background = bgColor

    if (config.terrainRenderStyle === 'flat-map') {
      // Flat map: no fog, no clip plane — show everything from above
      this.scene.fog = null
      this.renderer.clippingPlanes = []
    } else {
      // 3D modes: clip far terrain edge + atmosphere fog
      const half = TERRAIN_SIZE * 0.5
      const clipNormal = this.routeDir.clone().negate()
      this.renderer.clippingPlanes = [new THREE.Plane(clipNormal, half - 30)]
      this.scene.fog = new THREE.FogExp2(bgColor, 0.0008)
    }
    console.log('[Terrain] load() complete, scene objects:', this.scene.children.length)
  }

  private buildTerrainMesh(config: TerrainAnimationConfig, satGrid: SatelliteGrid | null = null): void {
    if (!this.elevGrid || !this.sceneBounds) return

    if (config.terrainRenderStyle === 'flat-map') return  // no mesh — flat map only
    if (config.terrainRenderStyle === 'contour-layers') {
      this.buildContourLayers(config)
      return
    }

    const segments = Math.min(
      config.terrainSegments,
      this.elevGrid.width - 1,
      this.elevGrid.height - 1,
    )
    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments)
    geometry.rotateX(-Math.PI / 2)

    const positions = geometry.attributes.position
    const useSatellite = satGrid !== null
    const colors: number[] = []
    const uvs: number[]    = []

    const sb = this.sceneBounds!
    const tb = satGrid?.bounds  // tile bounds (slightly larger than sceneBounds)

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)

      const lon = (x / TERRAIN_SIZE + 0.5) * sb.lonRange + sb.minLon
      const lat = (-z / TERRAIN_SIZE + 0.5) * sb.latRange + sb.minLat

      // Elevation
      const elev = sampleElevation(lon, lat, this.elevGrid!)
      positions.setY(i, (elev - this.baseElev) * config.terrainExaggeration * this.elevScale)

      if (useSatellite && tb) {
        // UV: map lon/lat into the satellite tile canvas (roughly equirectangular
        // over the small area of a single route — error < 0.5% at mid-latitudes)
        const u = (lon - tb.minLon) / (tb.maxLon - tb.minLon)
        const v = (tb.maxLat - lat) / (tb.maxLat - tb.minLat)
        uvs.push(u, v)
      } else {
        // Fallback: vertex colours
        const worldScale = config.terrainExaggeration * this.elevScale
        const e = worldScale > 0 ? positions.getY(i) / worldScale + this.baseElev : this.baseElev
        const color = getTerrainColor(computeTerrainColorT(e, this.baseElev, this.gridElevMax), config.terrainStyle)
        colors.push(color.r, color.g, color.b)
      }
    }

    geometry.computeVertexNormals()

    let material: THREE.MeshStandardMaterial
    if (useSatellite) {
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
      const texture = new THREE.CanvasTexture(satGrid!.canvas as unknown as HTMLCanvasElement)
      texture.colorSpace = THREE.SRGBColorSpace
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.92,
        metalness: 0.0,
        side: THREE.FrontSide,
      })
    } else {
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.0,
        side: THREE.FrontSide,
      })
    }

    this.terrainMesh = new THREE.Mesh(geometry, material)
    this.scene.add(this.terrainMesh)
  }

  /**
   * Rayshader-style contour layers: stacked extruded polygons, one per elevation band.
   * Each layer = all terrain above that threshold, extruded downward by one interval height.
   * Produces the "cardboard topo model" aesthetic — zero tile noise, purely data-driven.
   */
  private buildContourLayers(config: TerrainAnimationConfig): void {
    if (!this.elevGrid) return
    const { data, width, height } = this.elevGrid

    // ── Elevation range ──
    let gridMin = Infinity, gridMax = -Infinity
    for (let i = 0; i < data.length; i++) {
      if (data[i] < gridMin) gridMin = data[i]
      if (data[i] > gridMax) gridMax = data[i]
    }
    const gridRange = Math.max(gridMax - gridMin, 1)
    const interval  = niceContourInterval(gridRange)
    this.contourInterval = interval

    // Start at the first nice multiple above gridMin so all terrain is covered
    const thresholds: number[] = []
    let t0 = Math.floor(gridMin / interval) * interval
    if (t0 < gridMin) t0 += interval
    for (let t = t0; t <= gridMax; t += interval) thresholds.push(t)
    if (thresholds.length === 0) return

    // ── Contour polygons via d3-contour (marching squares) ──
    const gen = d3Contours().size([width, height]).thresholds(thresholds)
    const contourData = gen(Array.from(data))

    const worldScale   = config.terrainExaggeration * this.elevScale
    const layerDepth   = Math.max(interval * worldScale, 1)
    for (const contour of contourData) {
      const threshold = contour.value
      const layerY    = (threshold - this.baseElev) * worldScale

      const color = getTerrainColor(
        computeTerrainColorT(threshold, this.baseElev, this.gridElevMax),
        config.terrainStyle,
      )

      const mat = new THREE.MeshStandardMaterial({
        color: color.getHex(),
        roughness: 0.82,
        metalness: 0.0,
      })

      for (const polygon of contour.coordinates) {
        const outer = polygon[0]
        if (outer.length < 3) continue

        // Smooth the marching-squares staircase artifacts before building geometry.
        // 4 passes of Chaikin corner-cutting converts jagged pixel-steps into
        // smooth organic curves — essential for the Rayshader aesthetic.
        const smoothedOuter = chaikinSmooth(outer as [number, number][], 4)

        const shape = new THREE.Shape()
        const [x0, z0] = gridPixelToWorld(smoothedOuter[0][0], smoothedOuter[0][1], width, height)
        shape.moveTo(x0, z0)
        for (let i = 1; i < smoothedOuter.length; i++) {
          const [x, z] = gridPixelToWorld(smoothedOuter[i][0], smoothedOuter[i][1], width, height)
          shape.lineTo(x, z)
        }
        for (let h = 1; h < polygon.length; h++) {
          const smoothedHole = chaikinSmooth(polygon[h] as [number, number][], 4)
          const path = new THREE.Path()
          const [hx0, hz0] = gridPixelToWorld(smoothedHole[0][0], smoothedHole[0][1], width, height)
          path.moveTo(hx0, hz0)
          for (let i = 1; i < smoothedHole.length; i++) {
            const [hx, hz] = gridPixelToWorld(smoothedHole[i][0], smoothedHole[i][1], width, height)
            path.lineTo(hx, hz)
          }
          shape.holes.push(path)
        }

        // Extrude downward by one interval height — layers stack perfectly
        let geo: THREE.ExtrudeGeometry
        try {
          geo = new THREE.ExtrudeGeometry(shape, { depth: layerDepth, bevelEnabled: false })
        } catch {
          continue  // skip degenerate polygons without crashing
        }
        geo.rotateX(-Math.PI / 2)   // lay flat (XY shape → XZ plane)

        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.y = layerY   // top face sits exactly at threshold elevation
        this.scene.add(mesh)
      }
    }
  }

  /**
   * Draws contour lines as thin Line2 objects that hug the terrain surface.
   * Uses the same elevation grid and interval logic as buildContourLayers so
   * the lines align exactly with the terrain mesh geometry.
   */
  private buildContourOverlay(config: TerrainAnimationConfig): void {
    if (!this.elevGrid || !this.sceneBounds) return

    const { data, width, height } = this.elevGrid

    let gridMin = Infinity, gridMax = -Infinity
    for (let i = 0; i < data.length; i++) {
      if (data[i] < gridMin) gridMin = data[i]
      if (data[i] > gridMax) gridMax = data[i]
    }
    const gridRange = Math.max(gridMax - gridMin, 1)
    const interval  = niceContourOverlayInterval(gridRange)
    console.log('[Terrain] contour overlay interval:', interval, 'm for range:', Math.round(gridRange), 'm')

    const thresholds: number[] = []
    let t0 = Math.floor(gridMin / interval) * interval
    if (t0 < gridMin) t0 += interval
    for (let t = t0; t <= gridMax; t += interval) thresholds.push(t)
    if (thresholds.length === 0) return

    const gen = d3Contours().size([width, height]).thresholds(thresholds)
    const contourData = gen(Array.from(data))

    for (const contour of contourData) {
      for (const polygon of contour.coordinates) {
        // Only outer ring — holes would just add noise
        const ring = polygon[0]
        if (ring.length < 4) continue

        const smoothed = chaikinSmooth(ring as [number, number][], 3)

        const points: THREE.Vector3[] = smoothed.map(([px, py]) => {
          const [x, z] = gridPixelToWorld(px, py, width, height)
          // Sample the BLURRED terrain elevation at this XZ position so the
          // line sits exactly on the rendered terrain surface, not through it.
          const lon = (x / TERRAIN_SIZE + 0.5) * this.sceneBounds!.lonRange + this.sceneBounds!.minLon
          const lat = (-z / TERRAIN_SIZE + 0.5) * this.sceneBounds!.latRange + this.sceneBounds!.minLat
          const elev = sampleElevation(lon, lat, this.elevGrid!)
          const y = (elev - this.baseElev) * config.terrainExaggeration * this.elevScale + 1.5
          return new THREE.Vector3(x, y, z)
        })

        if (points.length < 2) continue
        const line = this.makeLine2(points, '#ffffff', 1, config.contourLineOpacity)
        this.scene.add(line)
      }
    }
  }

  /**
   * Flat-map mode: draws contour lines at a fixed 5 m interval on a flat XZ plane.
   * Uses the raw (pre-blur) elevation grid so small terrain features survive at 5 m detail.
   * All lines sit at Y = 1 (just above the flat background).
   */
  private buildFlatContours(config: TerrainAnimationConfig): void {
    const grid = this.rawElevGrid ?? this.elevGrid
    if (!grid || !this.sceneBounds) return

    const { data, width, height } = grid

    let gridMin = Infinity, gridMax = -Infinity
    for (let i = 0; i < data.length; i++) {
      if (data[i] < gridMin) gridMin = data[i]
      if (data[i] > gridMax) gridMax = data[i]
    }

    const interval = 5  // fixed 5 m as requested
    const thresholds: number[] = []
    let t0 = Math.ceil(gridMin / interval) * interval
    for (let t = t0; t <= gridMax; t += interval) thresholds.push(t)
    if (thresholds.length === 0) return
    console.log('[FlatMap] contour lines:', thresholds.length, 'at 5m interval, range:', Math.round(gridMax - gridMin), 'm')

    const gen = d3Contours().size([width, height]).thresholds(thresholds)
    const contourData = gen(Array.from(data))

    for (const contour of contourData) {
      // Index contours every 25 m are slightly brighter
      const isIndex = contour.value % 25 === 0
      const opacity = isIndex ? 0.7 : 0.35
      const linewidth = isIndex ? 1.2 : 0.7

      for (const polygon of contour.coordinates) {
        const ring = polygon[0]
        if (ring.length < 4) continue

        const smoothed = chaikinSmooth(ring as [number, number][], 2)

        // Convert grid-pixel coordinates to geographic coordinates using the
        // ACTUAL tile bounds, then to world XZ using sceneBounds.
        // gridPixelToWorld() assumes the grid fills exactly ±500 world units,
        // but tile boundaries extend slightly beyond sceneBounds — this causes
        // rivers (which use geoToFlat with sceneBounds) to be misaligned with
        // contour lines that used gridPixelToWorld. The two-step conversion
        // below fixes the alignment.
        const gb = grid.bounds
        const contourY = elevToFlatY(contour.value, this.baseElev, config.terrainExaggeration, this.elevScale)
        const points: THREE.Vector3[] = smoothed.map(([cx, cy]) => {
          const lon = gb.minLon + (cx / (width  - 1)) * (gb.maxLon - gb.minLon)
          const lat = gb.maxLat - (cy / (height - 1)) * (gb.maxLat - gb.minLat)
          return geoToFlat(lon, lat, contourY, this.sceneBounds!)
        })

        if (points.length < 2) continue
        this.scene.add(this.makeLine2(points, '#c8b98a', linewidth, opacity))
      }
    }
  }

  private buildRouteLines(routePoints: RoutePoint[], config: TerrainAnimationConfig): void {
    if (!this.elevGrid || !this.sceneBounds) return

    // Sample elevation at each route point and position on the terrain surface.
    // Contour-layers mode: snap to the top face of the correct layer (tiny +3 offset).
    // Realistic mode: lift +30 to clear the mesh polygon faces (z-fighting prevention).
    this.allRoute3D = routePoints.map(p => {
      if (config.terrainRenderStyle === 'flat-map') {
        const elev = sampleElevation(p.lon, p.lat, this.rawElevGrid ?? this.elevGrid!)
        const y = elevToFlatY(elev, this.baseElev, config.terrainExaggeration, this.elevScale)
        return geoToFlat(p.lon, p.lat, y + 2, this.sceneBounds!)
      }
      let elev: number
      if (config.terrainRenderStyle === 'contour-layers' && this.contourInterval > 0) {
        // Use terrain grid elevation (same source as contour layers) for snapping —
        // GPS elevation can be 20-50m off from tile data, causing route/layer mismatch.
        //
        // ExtrudeGeometry extrudes in +Z → after rotateX(-π/2) this becomes +Y.
        // So each layer's VISIBLE top face is at layerY + layerDepth, not layerY.
        // Adding contourInterval puts the route on the correct top face.
        const terrainElev = sampleElevation(p.lon, p.lat, this.elevGrid!)
        const snapped = Math.floor(terrainElev / this.contourInterval) * this.contourInterval
        const worldScale = config.terrainExaggeration * this.elevScale
        elev = snapped + this.contourInterval + 3 / worldScale
      } else {
        // Realistic mode: sit just above the sampled terrain surface.
        // Small offset prevents z-fighting without visible floating.
        const terrainElev = sampleElevation(p.lon, p.lat, this.elevGrid!)
        const worldScale = config.terrainExaggeration * this.elevScale
        elev = Math.max(terrainElev, p.elevation) + 1.5 / worldScale
      }
      return geoToWorld(p.lon, p.lat, elev, this.sceneBounds!, config.terrainExaggeration, this.elevScale, this.baseElev)
    })

    // Revealed route (bright, animated)
    this.revealedLine = this.makeLine2([], config.routeColor, config.routeWidth, 1.0)
    this.scene.add(this.revealedLine)

    // Glow layer (thicker, semi-transparent)
    if (config.routeGlow) {
      const glowWidth = config.routeWidth * (1.5 + config.routeGlowIntensity * 0.5)
      this.revealedGlowLine = this.makeLine2([], config.routeColor, glowWidth, 0.45)
      this.scene.add(this.revealedGlowLine)
    }
  }

  private makeLine2(points: THREE.Vector3[], color: string, linewidth: number, opacity: number): Line2 {
    const geo = new LineGeometry()
    if (points.length >= 2) {
      geo.setPositions(points.flatMap(p => [p.x, p.y, p.z]))
    }
    const mat = new LineMaterial({
      color: toThreeColor(color),
      linewidth,
      worldUnits: false,   // linewidth in screen pixels
      transparent: opacity < 1,
      opacity,
      resolution: new THREE.Vector2(this.width, this.height),
    })
    const line = new Line2(geo, mat)
    if (points.length >= 2) line.computeLineDistances()
    return line
  }

  /** Render river/canal ways as blue lines on the terrain surface. */
  private buildRivers(ways: OverpassWay[], config: TerrainAnimationConfig): void {
    if (!this.elevGrid || !this.sceneBounds) return
    const worldScale = config.terrainExaggeration * this.elevScale

    for (const way of ways) {
      const pts: THREE.Vector3[] = way.geometry
        .filter(n =>
          n.lon >= this.sceneBounds!.minLon && n.lon <= this.sceneBounds!.maxLon &&
          n.lat >= this.sceneBounds!.minLat && n.lat <= this.sceneBounds!.maxLat,
        )
        .map(n => {
          if (config.terrainRenderStyle === 'flat-map') {
            const elev = sampleElevationMin(n.lon, n.lat, this.rawElevGrid ?? this.elevGrid!)
            const y = elevToFlatY(elev, this.baseElev, config.terrainExaggeration, this.elevScale)
            return geoToFlat(n.lon, n.lat, y + 1, this.sceneBounds!)
          }
          const elev = sampleElevationMin(n.lon, n.lat, this.rawElevGrid ?? this.elevGrid!)
          const elevAdj = elev + 1.5 / worldScale
          return geoToWorld(n.lon, n.lat, elevAdj, this.sceneBounds!, config.terrainExaggeration, this.elevScale, this.baseElev)
        })

      if (pts.length < 2) continue
      const line = this.makeLine2(pts, '#4a90d9', 2, 0.75)
      this.scene.add(line)
    }
  }

  /** Render city/town/village markers and labels from Natural Earth static data. */
  private buildPlaces(config: TerrainAnimationConfig): void {
    if (!this.elevGrid || !this.sceneBounds) return
    const worldScale = config.terrainExaggeration * this.elevScale
    const sb = this.sceneBounds

    // Filter cities within terrain bounds
    const cities = (citiesData as unknown as CityPoint[]).filter(
      c => c.lon >= sb.minLon && c.lon <= sb.maxLon && c.lat >= sb.minLat && c.lat <= sb.maxLat,
    )
    if (cities.length === 0) return

    // Sort by population desc; keep top 15
    cities.sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0))
    const maxPop = cities[0]?.pop ?? 1

    // Declutter: min 80 world units between labels
    const MIN_SPACING = 80
    const selected: Array<CityPoint & { wx: number; wz: number }> = []

    const isFlat = config.terrainRenderStyle === 'flat-map'

    for (const city of cities) {
      if (selected.length >= 15) break
      const pos = isFlat
        ? (() => {
            const elev = sampleElevation(city.lon, city.lat, this.rawElevGrid ?? this.elevGrid!)
            const y = elevToFlatY(elev, this.baseElev, config.terrainExaggeration, this.elevScale)
            return geoToFlat(city.lon, city.lat, y + 3, sb)
          })()
        : geoToWorld(city.lon, city.lat, sampleElevation(city.lon, city.lat, this.elevGrid!), sb, config.terrainExaggeration, this.elevScale, this.baseElev)
      const tooClose = selected.some(s => {
        const dx = s.wx - pos.x, dz = s.wz - pos.z
        return Math.sqrt(dx * dx + dz * dz) < MIN_SPACING
      })
      if (!tooClose) selected.push({ ...city, wx: pos.x, wz: pos.z })
    }

    for (const city of selected) {
      const t = Math.sqrt((city.pop ?? 0) / maxPop)
      const dotRadius = 3 + t * 5

      const pos = isFlat
        ? (() => {
            const elev = sampleElevation(city.lon, city.lat, this.rawElevGrid ?? this.elevGrid!)
            const y = elevToFlatY(elev, this.baseElev, config.terrainExaggeration, this.elevScale)
            return geoToFlat(city.lon, city.lat, y + 3, sb)
          })()
        : (() => {
            const elev = sampleElevation(city.lon, city.lat, this.elevGrid!)
            return geoToWorld(city.lon, city.lat, elev + (dotRadius + 5) / worldScale, sb, config.terrainExaggeration, this.elevScale, this.baseElev)
          })()

      // Dot marker
      const geo = new THREE.SphereGeometry(dotRadius, 8, 6)
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: true })
      const sphere = new THREE.Mesh(geo, mat)
      sphere.position.copy(pos)
      this.scene.add(sphere)

      // Billboard label
      const fontSize = Math.round(22 + t * 12)
      const sprite = makeTextSprite(city.name, fontSize)
      sprite.position.set(pos.x, pos.y + dotRadius + 18, pos.z)
      this.scene.add(sprite)
    }
  }

  private buildMarker(config: TerrainAnimationConfig): void {
    const geo = new THREE.SphereGeometry(config.markerSize * 1.5, 16, 12)
    const mat = new THREE.MeshBasicMaterial({ color: toThreeColor(config.markerColor) })
    this.markerMesh = new THREE.Mesh(geo, mat)
    this.markerMesh.visible = config.showMarker && this.allRoute3D.length > 0
    if (this.allRoute3D.length > 0) {
      this.markerMesh.position.copy(this.allRoute3D[0])
    }
    this.scene.add(this.markerMesh)
  }

  /**
   * Compute the route's start→end direction, XZ centroid, and median elevation.
   * Used to place the camera dynamically behind the route start for any orientation.
   */
  private computeRouteOrientation(): void {
    const pts = this.allRoute3D
    if (pts.length < 2) {
      this.routeDir.set(0, 0, -1)
      this.routeCentroid.set(0, 0)
      this.routeMedianY = 0
      return
    }

    // XZ centroid
    let cx = 0, cz = 0
    for (const p of pts) { cx += p.x; cz += p.z }
    this.routeCentroid.set(cx / pts.length, cz / pts.length)

    // Route direction: 10th → 90th percentile avoids coinciding loop endpoints
    const p1 = pts[Math.floor(pts.length * 0.10)]
    const p2 = pts[Math.floor(pts.length * 0.90)]
    const dx = p2.x - p1.x
    const dz = p2.z - p1.z
    const len = Math.sqrt(dx * dx + dz * dz)

    if (len > 1) {
      this.routeDir.set(dx / len, 0, dz / len)
    } else {
      // Loop or stationary route: default forward direction
      this.routeDir.set(0, 0, -1)
    }

    // Median world-space Y of route points — camera aim height
    const ys = pts.map(p => p.y).sort((a, b) => a - b)
    this.routeMedianY = ys[Math.floor(ys.length / 2)]
  }

  private positionCamera(config: TerrainAnimationConfig): void {
    const half = TERRAIN_SIZE * 0.5
    const approxTerrainMaxY = TERRAIN_SIZE * 0.22 * config.terrainExaggeration

    const cx = this.routeCentroid.x
    const cz = this.routeCentroid.y  // THREE.Vector2 .y = world Z

    // ── Detect loop route: start and end within 15% of total route length ──
    const pts = this.allRoute3D
    const isLoop = pts.length >= 4 && (() => {
      const start = pts[0], end = pts[pts.length - 1]
      const dx = end.x - start.x, dz = end.z - start.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const routeSpan = Math.sqrt(
        (pts[Math.floor(pts.length * 0.9)].x - pts[Math.floor(pts.length * 0.1)].x) ** 2 +
        (pts[Math.floor(pts.length * 0.9)].z - pts[Math.floor(pts.length * 0.1)].z) ** 2
      )
      return dist < routeSpan * 0.25
    })()

    let camX: number, camZ: number

    if (isLoop) {
      // Loop route: side-angle overview — camera from +X+Z corner, looking at centroid
      const sideDist = half * 0.75 * config.cameraDistance
      camX = cx + sideDist * 0.7
      camZ = cz + sideDist * 0.7
    } else {
      // Linear route: behind-start camera
      const camDist = half * 0.45 * config.cameraDistance
      const startPt = pts.length > 5 ? pts[Math.floor(pts.length * 0.05)] : (pts[0] ?? new THREE.Vector3())
      const rawCamX = startPt.x - this.routeDir.x * camDist
      const rawCamZ = startPt.z - this.routeDir.z * camDist
      camX = Math.max(-half * 1.2, Math.min(half * 1.2, rawCamX))
      camZ = Math.max(-half * 1.2, Math.min(half * 1.2, rawCamZ))
    }

    // Camera height: above terrain, adjusted by elevation angle slider
    const angleOffset = (config.cameraElevationAngle - 45) * (approxTerrainMaxY * 0.02)
    const camY = approxTerrainMaxY * 0.9 + angleOffset

    // LookAt: centroid at route median elevation
    const lookAtY = Math.max(0, this.routeMedianY)
    const lookAt = new THREE.Vector3(cx, lookAtY, cz)

    console.log('[Camera] behind-start pos:', camX.toFixed(0), camY.toFixed(0), camZ.toFixed(0),
                'lookAt:', cx.toFixed(0), lookAtY.toFixed(0), cz.toFixed(0),
                'routeDir:', this.routeDir.x.toFixed(2), this.routeDir.z.toFixed(2))

    if (config.terrainRenderStyle === 'flat-map') {
      // Isometric map view — orthographic camera at 35° elevation, north roughly up.
      //
      // Elevation angle: 35° above the horizontal plane gives a classic ISO look
      // (less steep than 45° top-down, more readable than 20° oblique).
      //
      // OrbitControls is switched to the orthoCamera so mouse/touch interaction
      // actually moves the visible camera (not the unused perspCamera).
      const elevAngle  = 65 * Math.PI / 180
      const dist       = 2000
      const camY       = dist * Math.sin(elevAngle)   // vertical component
      const camHoriz   = dist * Math.cos(elevAngle)   // southward offset

      // Frustum: wide enough to frame the full terrain with a small margin
      const halfW = TERRAIN_SIZE * 0.52
      const halfH = halfW * (this.height / this.width)
      this.orthoCamera.left   = -halfW
      this.orthoCamera.right  =  halfW
      this.orthoCamera.top    =  halfH
      this.orthoCamera.bottom = -halfH

      this.activeCamera  = this.orthoCamera
      this.controls.object = this.orthoCamera  // hand control to the ortho cam

      // Camera sits south of the map centre, elevated at 35° — looks toward north.
      // Standard up (0,1,0) keeps north at the top of the screen naturally.
      this.orthoCamera.up.set(0, 1, 0)
      this.orthoCamera.position.set(cx, camY, cz + camHoriz)
      this.orthoCamera.lookAt(cx, 0, cz)
      this.orthoCamera.updateProjectionMatrix()

      // Tighten controls for map feel: less damping, screen-space panning
      this.controls.dampingFactor = 0.25
      this.controls.screenSpacePanning = true
      this.controls.rotateSpeed = 0.6
      this.controls.zoomSpeed = 1.2

      // Target at mid-elevation so orbiting feels centred on the terrain
      const midY = (this.gridElevMax > this.baseElev)
        ? elevToFlatY((this.baseElev + this.gridElevMax) / 2, this.baseElev, config.terrainExaggeration, this.elevScale)
        : 0
      this.controls.target.set(cx, midY, cz)
      this.controls.minPolarAngle = 0
      this.controls.maxPolarAngle = Math.PI
      this.controls.update()
      this.controls.enabled = true
      return
    } else {
      // Restore 3-D mode control settings
      this.controls.object = this.perspCamera
      this.controls.dampingFactor = 0.08
      this.controls.screenSpacePanning = false
      this.controls.rotateSpeed = 1.0
      this.controls.zoomSpeed = 1.0
    }

    if (config.cameraMode === 'overview-iso') {
      this.activeCamera = this.orthoCamera
      this.orthoCamera.position.set(camX, camY, camZ)
      this.orthoCamera.lookAt(lookAt)
      this.orthoCamera.updateProjectionMatrix()
      this.controls.enabled = true
    } else if (config.cameraMode === 'chase' && config.terrainRenderStyle !== 'flat-map') {
      // Chase mode: camera will be updated per-frame in setProgress()
      // Disable OrbitControls — the chase camera owns the transform
      this.activeCamera = this.perspCamera
      this.controls.enabled = false
    } else {
      // overview-perspective (default)
      this.activeCamera = this.perspCamera
      this.perspCamera.position.set(camX, camY, camZ)
      this.perspCamera.lookAt(lookAt)
      this.perspCamera.updateProjectionMatrix()
      this.controls.enabled = true
    }
  }

  /**
   * Chase camera — called every frame in setProgress() when mode === 'chase'.
   *
   * Desired position is computed behind + above the current point, then
   * smoothly interpolated (lerped) toward that target each frame. This removes
   * the jitter that occurs when route points are unevenly spaced, and gives
   * the cinematic "weight" of a real camera following a subject.
   *
   * Two separate lerp speeds:
   *   - Position: 0.07 — slightly lazy, gives the trailing feel
   *   - LookAt target: 0.12 — a bit snappier so the camera always faces ahead
   */
  private updateChaseCamera(idx: number): void {
    const pts    = this.allRoute3D
    const config = this.currentConfig
    if (pts.length < 2 || !config) return

    const current = pts[idx]

    // Look-ahead: 8% of route for direction (smooths sharp corners)
    const lookahead = Math.max(4, Math.round(pts.length * 0.08))
    const aheadIdx  = Math.min(pts.length - 1, idx + lookahead)
    const ahead     = pts[aheadIdx]

    const dx  = ahead.x - current.x
    const dz  = ahead.z - current.z
    const len = Math.sqrt(dx * dx + dz * dz)
    if (len < 0.5) return

    const dirX = dx / len
    const dirZ = dz / len

    // Desired camera position: behind and above current point
    const camBack   = 100 * config.cameraDistance
    const camHeight = 50 + (config.cameraElevationAngle - 45) * 1.5

    const desiredPos = new THREE.Vector3(
      current.x - dirX * camBack,
      current.y + camHeight,
      current.z - dirZ * camBack,
    )

    // Desired look-at: slightly above the ahead point for a natural horizon
    const desiredTarget = new THREE.Vector3(ahead.x, ahead.y + 15, ahead.z)

    if (!this.chaseReady) {
      // First frame: snap directly so there's no initial slide-in
      this.chasePos.copy(desiredPos)
      this.chaseTarget.copy(desiredTarget)
      this.chaseReady = true
    } else {
      // Subsequent frames: lerp toward desired
      this.chasePos.lerp(desiredPos, 0.07)
      this.chaseTarget.lerp(desiredTarget, 0.12)
    }

    this.perspCamera.position.copy(this.chasePos)
    this.perspCamera.lookAt(this.chaseTarget)
    this.perspCamera.updateProjectionMatrix()
  }

  /** Update the animated route reveal to the given progress (0–1) */
  setProgress(progress: number): void {
    if (this.allRoute3D.length < 2) return

    const endIdx = Math.max(1, Math.round(progress * (this.allRoute3D.length - 1)))
    const visiblePoints = this.allRoute3D.slice(0, endIdx + 1)

    this.updateLine2(this.revealedLine, visiblePoints)
    this.updateLine2(this.revealedGlowLine, visiblePoints)

    // Update marker position
    if (this.markerMesh && visiblePoints.length > 0) {
      this.markerMesh.position.copy(visiblePoints[visiblePoints.length - 1])
    }

    // Chase camera: update every frame
    if (this.currentConfig?.cameraMode === 'chase') {
      this.updateChaseCamera(endIdx)
    }
  }

  private updateLine2(line: Line2 | null, points: THREE.Vector3[]): void {
    if (!line) return
    if (points.length >= 2) {
      const geo = line.geometry as LineGeometry
      geo.setPositions(points.flatMap(p => [p.x, p.y, p.z]))
      line.computeLineDistances()
    }
  }

  /** Update camera mode at runtime */
  setCameraMode(mode: TerrainCameraMode, config: TerrainAnimationConfig): void {
    this.currentConfig = { ...config, cameraMode: mode }
    this.positionCamera(this.currentConfig)
  }

  /** Resize renderer and update camera aspect */
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)
    this.perspCamera.aspect = width / height
    this.perspCamera.updateProjectionMatrix()

    // Update line material resolutions
    this.updateLineResolution(this.trailLine, width, height)
    this.updateLineResolution(this.revealedLine, width, height)
    this.updateLineResolution(this.revealedGlowLine, width, height)
  }

  private updateLineResolution(line: Line2 | null, w: number, h: number): void {
    if (line) (line.material as LineMaterial).resolution.set(w, h)
  }

  /** Render one frame (via EffectComposer + GTAO post-processing) */
  render(): void {
    // Sync camera into both passes whenever the active camera changes
    this.renderPass.camera = this.activeCamera
    this.gtaoPass.camera   = this.activeCamera
    this.composer.render()
  }

  /** Get the underlying canvas element */
  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement
  }

  /** Returns the current camera elevation angle (0° = horizontal, 90° = top-down) and compass direction. */
  getCameraInfo(): { elevationDeg: number; azimuthDeg: number; compassDir: string } {
    const cam = this.activeCamera
    const target = this.controls.target

    const dx = target.x - cam.position.x
    const dy = target.y - cam.position.y
    const dz = target.z - cam.position.z

    const horizontal = Math.sqrt(dx * dx + dz * dz)
    const elevationDeg = Math.round(Math.atan2(-dy, horizontal) * 180 / Math.PI)

    // Azimuth: angle of look direction from north (−Z axis), clockwise
    const azimuthRad = Math.atan2(dx, -dz)
    const azimuthDeg = Math.round((azimuthRad * 180 / Math.PI + 360) % 360)

    const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']
    const compassDir = dirs[Math.round(azimuthDeg / 45) % 8]

    return { elevationDeg, azimuthDeg, compassDir }
  }

  private clearScene(): void {
    // Remove everything except lights
    const toRemove: THREE.Object3D[] = []
    this.scene.traverse(obj => {
      if (!(obj instanceof THREE.Light) && obj !== this.scene) toRemove.push(obj)
    })
    toRemove.forEach(obj => {
      this.scene.remove(obj)
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose()
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material
        if (Array.isArray(mat)) mat.forEach(m => m.dispose())
        else mat.dispose()
      }
    })
    this.terrainMesh = null
    this.rawElevGrid = null
    this.chaseReady  = false
    this.trailLine = null
    this.revealedLine = null
    this.revealedGlowLine = null
    this.markerMesh = null
    this.allRoute3D = []
    this.baseElev = 0
    this.terrainMidY = 0
    this.scene.fog = null
    this.renderer.clippingPlanes = []
  }

  dispose(): void {
    this.clearScene()
    this.controls.dispose()
    this.gtaoPass.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }
}
