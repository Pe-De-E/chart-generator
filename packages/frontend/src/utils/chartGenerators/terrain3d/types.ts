/**
 * Types and defaults for the 3D Terrain mode.
 */

export type TerrainStyle = 'dark' | 'alpine' | 'desert' | 'topo'
export type TerrainCameraMode = 'overview-iso' | 'overview-perspective' | 'chase'
export type TerrainRenderStyle = 'realistic' | 'contour-layers'

export interface TerrainAnimationConfig {
  // Playback
  duration: number
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  animationMode: 'uniform' | 'time-based' | 'gradient'

  // Layout
  terrainHeightRatio: number       // 0.5–0.8, default 0.65
  showElevationChart: boolean      // show elevation chart below terrain

  // Camera
  cameraMode: TerrainCameraMode
  cameraElevationAngle: number     // 25–70°, default 45
  cameraDistance: number           // 0.5–2.0, multiplier on default distance

  // Terrain
  terrainRenderStyle: TerrainRenderStyle  // 'realistic' | 'contour-layers'
  terrainStyle: TerrainStyle
  terrainExaggeration: number      // vertical scale multiplier, 1–5, default 2.5
  terrainSegments: number          // mesh resolution: 128 | 256 | 512 (realistic mode only)

  // Route
  routeColor: string
  routeWidth: number               // 1–8
  routeGlow: boolean
  routeGlowIntensity: number       // 1–8

  // Elevation chart (bottom section)
  curveColor: string
  showAreaFill: boolean
  backgroundColor: string

  // Marker
  showMarker: boolean
  markerColor: string
  markerSize: number

  // Geo overlays (realistic mode only)
  showRivers: boolean
  showPlaces: boolean
}

export const DEFAULT_TERRAIN_ANIMATION_CONFIG: TerrainAnimationConfig = {
  duration: 10,
  easing: 'ease-in-out',
  animationMode: 'uniform',

  terrainHeightRatio: 0.65,
  showElevationChart: true,

  cameraMode: 'overview-perspective',
  cameraElevationAngle: 45,
  cameraDistance: 1.0,

  terrainRenderStyle: 'contour-layers',
  terrainStyle: 'alpine',
  terrainExaggeration: 2.5,
  terrainSegments: 256,

  routeColor: '#ff5500',
  routeWidth: 14,
  routeGlow: true,
  routeGlowIntensity: 5,

  curveColor: '#ff5500',
  showAreaFill: true,
  backgroundColor: '#0a0f1a',

  showMarker: true,
  markerColor: '#ffffff',
  markerSize: 8,

  showRivers: true,
  showPlaces: true,
}
