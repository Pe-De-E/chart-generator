/**
 * Composable for Route Map configuration state.
 * Extends useElevationConfig with map-specific computed getter/setter pairs.
 */

import { computed } from 'vue'
import type { RouteMapAnimationConfig } from '../components/chartWorkflow/RouteMapChartStep.vue'
import { useElevationConfig } from './useElevationConfig'

export function useRouteMapConfig(
  getConfig: () => RouteMapAnimationConfig,
  updateConfig: (partial: Partial<RouteMapAnimationConfig>) => void
) {
  // Reuse all shared elevation config fields
  const elevationConfig = useElevationConfig(getConfig, updateConfig)

  // --- Map Camera ---

  const mapCameraMode = computed({
    get: () => getConfig().mapCameraMode ?? 'overview',
    set: (value: 'overview' | 'chase') => updateConfig({ mapCameraMode: value }),
  })

  const mapChaseZoomLevel = computed({
    get: () => getConfig().mapChaseZoomLevel ?? 3,
    set: (value: number) => updateConfig({ mapChaseZoomLevel: value }),
  })

  const mapChaseZoomOutStart = computed({
    get: () => getConfig().mapChaseZoomOutStart ?? 0.85,
    set: (value: number) => updateConfig({ mapChaseZoomOutStart: value }),
  })

  const mapChaseRotateWithRoute = computed({
    get: () => getConfig().mapChaseRotateWithRoute ?? false,
    set: (value: boolean) => updateConfig({ mapChaseRotateWithRoute: value }),
  })

  // --- Route Styling ---

  const routeColor = computed({
    get: () => getConfig().routeColor ?? '#ffffff',
    set: (value: string) => updateConfig({ routeColor: value }),
  })

  const routeWidth = computed({
    get: () => getConfig().routeWidth ?? 4,
    set: (value: number) => updateConfig({ routeWidth: value }),
  })

  const routeGlow = computed({
    get: () => getConfig().routeGlow ?? true,
    set: (value: boolean) => updateConfig({ routeGlow: value }),
  })

  const routeGlowColor = computed({
    get: () => getConfig().routeGlowColor ?? '#ffffff',
    set: (value: string) => updateConfig({ routeGlowColor: value }),
  })

  const routeGlowIntensity = computed({
    get: () => getConfig().routeGlowIntensity ?? 4,
    set: (value: number) => updateConfig({ routeGlowIntensity: value }),
  })

  const routeTrailDash = computed({
    get: () => getConfig().routeTrailDash ?? '8 12',
    set: (value: string) => updateConfig({ routeTrailDash: value }),
  })

  const routeTrailOpacity = computed({
    get: () => getConfig().routeTrailOpacity ?? 0.2,
    set: (value: number) => updateConfig({ routeTrailOpacity: value }),
  })

  // --- Map Marker ---

  const showMapMarker = computed({
    get: () => getConfig().showMapMarker ?? true,
    set: (value: boolean) => updateConfig({ showMapMarker: value }),
  })

  const mapMarkerSize = computed({
    get: () => getConfig().mapMarkerSize ?? 8,
    set: (value: number) => updateConfig({ mapMarkerSize: value }),
  })

  const mapMarkerColor = computed({
    get: () => getConfig().mapMarkerColor ?? '#ffffff',
    set: (value: string) => updateConfig({ mapMarkerColor: value }),
  })

  // --- Map Labels & Markers ---

  const showDirection = computed({
    get: () => getConfig().showDirection ?? true,
    set: (value: boolean) => updateConfig({ showDirection: value }),
  })

  const showDistanceMarkers = computed({
    get: () => getConfig().showDistanceMarkers ?? false,
    set: (value: boolean) => updateConfig({ showDistanceMarkers: value }),
  })

  const distanceMarkerInterval = computed({
    get: () => getConfig().distanceMarkerInterval ?? 5,
    set: (value: number) => updateConfig({ distanceMarkerInterval: value }),
  })

  const showStartEndLabels = computed({
    get: () => getConfig().showStartEndLabels ?? false,
    set: (value: boolean) => updateConfig({ showStartEndLabels: value }),
  })

  // --- Layout ---

  const mapHeightRatio = computed({
    get: () => getConfig().mapHeightRatio ?? 0.6,
    set: (value: number) => updateConfig({ mapHeightRatio: value }),
  })

  const showDivider = computed({
    get: () => getConfig().showDivider ?? false,
    set: (value: boolean) => updateConfig({ showDivider: value }),
  })

  const dividerColor = computed({
    get: () => getConfig().dividerColor ?? '#ffffff33',
    set: (value: string) => updateConfig({ dividerColor: value }),
  })

  // --- Elevation Coloring ---

  const showElevationColoring = computed({
    get: () => getConfig().showElevationColoring ?? false,
    set: (value: boolean) => updateConfig({ showElevationColoring: value }),
  })

  const elevationColorIntensity = computed({
    get: () => getConfig().elevationColorIntensity ?? 5,
    set: (value: number) => updateConfig({ elevationColorIntensity: value }),
  })

  return {
    // All shared elevation fields
    ...elevationConfig,
    // Map Camera
    mapCameraMode,
    mapChaseZoomLevel,
    mapChaseZoomOutStart,
    mapChaseRotateWithRoute,
    // Route Styling
    routeColor,
    routeWidth,
    routeGlow,
    routeGlowColor,
    routeGlowIntensity,
    routeTrailDash,
    routeTrailOpacity,
    // Map Marker
    showMapMarker,
    mapMarkerSize,
    mapMarkerColor,
    // Map Labels & Markers
    showDirection,
    showDistanceMarkers,
    distanceMarkerInterval,
    showStartEndLabels,
    // Layout
    mapHeightRatio,
    showDivider,
    dividerColor,
    // Elevation Coloring
    showElevationColoring,
    elevationColorIntensity,
  }
}
