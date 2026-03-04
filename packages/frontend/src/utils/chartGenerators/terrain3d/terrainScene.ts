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
import type { RoutePoint } from '@chart-generator/shared'
import type { TerrainAnimationConfig, TerrainCameraMode } from './types'

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

// ── Elevation Smoothing ───────────────────────────────────────────────────────

/**
 * Separable Gaussian blur on the elevation grid.
 *
 * Why Gaussian instead of repeated box-blur:
 * Multiple passes of 3×3 box-blur create equal-height round domes from every
 * noise spike ("virus surface" look). A single Gaussian pass weights the
 * neighbourhood by distance, preserving large-scale features (ridgelines,
 * valleys) while averaging away sub-scale noise (vegetation canopy, buildings).
 *
 * sigma is in grid pixels. Rule of thumb: sigma ≈ 1.5–2 pixels smooths
 * individual-pixel noise while keeping features wider than ~4px intact.
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
      // 4-stop ramp: deep valley (dark forest) → meadow → bare rock → snow cap
      // More stops = clearer distinction between elevation bands
      const deepValley = new THREE.Color('#1a3a0a')  // dark forest floor
      const meadow    = new THREE.Color('#3a6e1e')   // alpine meadow
      const rock      = new THREE.Color('#5a5348')   // bare rock
      const snow      = new THREE.Color('#dde4ea')   // snow cap
      if (t < 0.28) return lerpColor(deepValley, meadow, t / 0.28)
      if (t < 0.58) return lerpColor(meadow, rock, (t - 0.28) / 0.30)
      return lerpColor(rock, snow, (t - 0.58) / 0.42)
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

// ── TerrainScene ──────────────────────────────────────────────────────────────

export class TerrainScene {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private perspCamera: THREE.PerspectiveCamera
  private orthoCamera: THREE.OrthographicCamera
  private activeCamera: THREE.Camera

  private terrainMesh: THREE.Mesh | null = null
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

  // Dynamic camera orientation — computed from actual route direction
  private routeDir      = new THREE.Vector3(0, 0, -1) // start → end direction (unit vector)
  private routeCentroid = new THREE.Vector2(0, 0)      // XZ centroid of route
  private routeMedianY  = 0                            // median world-space Y of route points

  private width: number
  private height: number
  private controls: OrbitControls
  private onControlsChange: (() => void) | null = null
  private currentConfig: TerrainAnimationConfig | null = null

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

    // ── Fetch elevation grid ──
    console.log('[Terrain] fetching elevation grid for bounds:', { minLon, maxLon, minLat, maxLat })
    this.elevGrid = await fetchElevationGrid(minLon, maxLon, minLat, maxLat)
    console.log('[Terrain] elevation grid fetched, size:', this.elevGrid.width, 'x', this.elevGrid.height)

    // Gaussian blur to remove per-pixel noise (vegetation canopy, building edges).
    // sigma=1.0 pixel smooths sub-20m noise while keeping real terrain features intact.
    this.elevGrid = gaussianBlurGrid(this.elevGrid, 1.0)
    console.log('[Terrain] gaussian blur applied (sigma=1.5), grid:', this.elevGrid.width, '×', this.elevGrid.height)

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
    this.baseElev = Math.max(0, gridMinElev)
    // Scale terrain so its relief spans ~22% of TERRAIN_SIZE at the reference range.
    // We use Math.max(gridElevRange, 400) so flat terrain (small elevation range)
    // doesn't get over-amplified into fake mountains — 400m is the minimum assumed range.
    this.elevScale = (TERRAIN_SIZE * 0.22) / Math.max(gridElevRange, 400)

    // terrainMidY: world Y of the route's mid-elevation (camera looks at this height)
    const routeElevMid = (minElev + maxElev) / 2
    this.terrainMidY = (routeElevMid - this.baseElev) * config.terrainExaggeration * this.elevScale
    console.log('[Terrain] baseElev:', this.baseElev, 'gridElevRange:', gridElevRange, 'terrainMidY:', this.terrainMidY, 'elevScale:', this.elevScale)

    // ── Build terrain mesh ──
    this.buildTerrainMesh(config)

    // ── Build route lines ──
    this.buildRouteLines(routePoints, config)

    // ── Build marker ──
    this.buildMarker(config)

    // ── Compute route orientation for dynamic camera ──
    this.computeRouteOrientation()

    // ── Position camera ──
    this.positionCamera(config)
    this.syncControlsTarget()

    // ── Clip plane: hides the far terrain edge behind the route end ──
    // Camera is behind route start. The far edge (at +routeDir extreme) can look
    // like a cliff wall framing the horizon. Clip it away cleanly.
    const half = TERRAIN_SIZE * 0.5
    const clipNormal = this.routeDir.clone().negate()
    this.renderer.clippingPlanes = [new THREE.Plane(clipNormal, half - 30)]

    // Set scene background + atmosphere fog
    const bgHex = config.backgroundColor.startsWith('#') && config.backgroundColor.length === 9
      ? config.backgroundColor.slice(0, 7) : config.backgroundColor
    const bgColor = new THREE.Color(bgHex)
    this.scene.background = bgColor
    this.scene.fog = new THREE.FogExp2(bgColor, 0.0008)
    console.log('[Terrain] load() complete, scene objects:', this.scene.children.length)
  }

  private buildTerrainMesh(config: TerrainAnimationConfig): void {
    if (!this.elevGrid || !this.sceneBounds) return

    const segments = config.terrainSegments
    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments)
    geometry.rotateX(-Math.PI / 2)

    const positions = geometry.attributes.position
    const colors: number[] = []
    let minY = Infinity, maxY = -Infinity

    // First pass: set y positions
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      // Map x,z back to lon,lat
      const lon = (x / TERRAIN_SIZE + 0.5) * this.sceneBounds!.lonRange + this.sceneBounds!.minLon
      const lat = (-z / TERRAIN_SIZE + 0.5) * this.sceneBounds!.latRange + this.sceneBounds!.minLat
      const elev = sampleElevation(lon, lat, this.elevGrid!)
      const y = (elev - this.baseElev) * config.terrainExaggeration * this.elevScale
      positions.setY(i, y)
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }

    // Second pass: assign colors using a blend of absolute and relative elevation.
    //
    // - Absolute component (40%): maps real altitude against a 3500m reference so
    //   flat low-elevation terrain stays green and snow only appears near 2000m+.
    // - Relative component (60%): maps each vertex against the local mesh min/max,
    //   giving full-range color contrast so valleys vs ridgelines are visually
    //   distinct even on a 70m flat route — essential for landscape recognition.
    const worldScale = config.terrainExaggeration * this.elevScale
    const ELEV_COLOR_REF = 3500
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i)
      const elev = worldScale > 0 ? y / worldScale + this.baseElev : this.baseElev
      const absT = Math.max(0, Math.min(1, elev / ELEV_COLOR_REF))
      const relT = maxY > minY ? (y - minY) / (maxY - minY) : 0
      const normalizedH = absT * 0.4 + relT * 0.6
      const color = getTerrainColor(normalizedH, config.terrainStyle)
      colors.push(color.r, color.g, color.b)
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.computeVertexNormals()

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.FrontSide,
    })

    this.terrainMesh = new THREE.Mesh(geometry, material)
    this.scene.add(this.terrainMesh)
  }

  private buildRouteLines(routePoints: RoutePoint[], config: TerrainAnimationConfig): void {
    if (!this.elevGrid || !this.sceneBounds) return

    // Sample elevation at each route point from the terrain grid
    this.allRoute3D = routePoints.map(p => {
      const terrainElev = sampleElevation(p.lon, p.lat, this.elevGrid!)
      // Lift route well above terrain surface to prevent z-fighting with mesh faces.
      // The segment size at 128 divisions is ~7.8 world units; offset must exceed that.
      const elev = Math.max(terrainElev, p.elevation) + 30
      return geoToWorld(p.lon, p.lat, elev, this.sceneBounds!, config.terrainExaggeration, this.elevScale, this.baseElev)
    })

    // Full route trail — visible even before animation starts (progress=0)
    this.trailLine = this.makeLine2(this.allRoute3D, config.routeColor, config.routeWidth * 1.0, 0.55)
    this.scene.add(this.trailLine)

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

    if (config.cameraMode === 'overview-iso') {
      this.activeCamera = this.orthoCamera
      this.orthoCamera.position.set(camX, camY, camZ)
      this.orthoCamera.lookAt(lookAt)
      this.orthoCamera.updateProjectionMatrix()
      this.controls.enabled = true
    } else if (config.cameraMode === 'chase') {
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
   * Positions the camera behind and above the current route point,
   * looking forward toward the next segment.
   */
  private updateChaseCamera(idx: number): void {
    const pts = this.allRoute3D
    const config = this.currentConfig
    if (pts.length < 2 || !config) return

    const current = pts[idx]

    // Look ahead 6% of route (min 3 points) to compute travel direction
    const lookahead = Math.max(3, Math.round(pts.length * 0.06))
    const aheadIdx  = Math.min(pts.length - 1, idx + lookahead)
    const ahead     = pts[aheadIdx]

    // Horizontal travel direction (XZ plane)
    const dx  = ahead.x - current.x
    const dz  = ahead.z - current.z
    const len = Math.sqrt(dx * dx + dz * dz)
    if (len < 0.5) return   // barely moving — keep last camera

    const dirX = dx / len
    const dirZ = dz / len

    // Camera: behind current point, elevated
    const camBack   = 120 * config.cameraDistance
    const camHeight = 60 + (config.cameraElevationAngle - 45) * 2

    const camX = current.x - dirX * camBack
    const camY = current.y + camHeight
    const camZ = current.z - dirZ * camBack

    // Look slightly above the ahead point so the route horizon is visible
    this.perspCamera.position.set(camX, camY, camZ)
    this.perspCamera.lookAt(ahead.x, ahead.y + 20, ahead.z)
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

  /** Render one frame */
  render(): void {
    this.renderer.render(this.scene, this.activeCamera)
  }

  /** Get the underlying canvas element */
  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement
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
    this.renderer.dispose()
  }
}
