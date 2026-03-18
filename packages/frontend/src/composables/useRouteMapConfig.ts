/**
 * Composable for Route Map configuration state.
 * Extends useElevationConfig with map-specific computed getter/setter pairs.
 */

import { computed } from 'vue'
import type { RouteMapAnimationConfig } from '../components/chartWorkflow/RouteMapChartStep.vue'
import { useElevationConfig } from './useElevationConfig'
import type { Annotation, AnnotationType } from '../utils/chartGenerators/elevationChart/types'
import { generateAnnotationId } from '../utils/chartGenerators/elevationChart/annotationDetection'

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

  const showMarkerPulse = computed({
    get: () => getConfig().showMarkerPulse ?? false,
    set: (value: boolean) => updateConfig({ showMarkerPulse: value }),
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

  const showElevationChart = computed({
    get: () => getConfig().showElevationChart ?? true,
    set: (value: boolean) => updateConfig({ showElevationChart: value }),
  })

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

  const showElevationCurveColoring = computed({
    get: () => getConfig().showElevationCurveColoring ?? false,
    set: (value: boolean) => updateConfig({ showElevationCurveColoring: value }),
  })

  const showSpeedColoring = computed({
    get: () => getConfig().showSpeedColoring ?? false,
    set: (value: boolean) => updateConfig({ showSpeedColoring: value }),
  })

  const speedColorIntensity = computed({
    get: () => getConfig().speedColorIntensity ?? 5,
    set: (value: number) => updateConfig({ speedColorIntensity: value }),
  })

  // --- Geo Context Layers ---

  const showBorders = computed({
    get: () => getConfig().showBorders ?? false,
    set: (value: boolean) => updateConfig({ showBorders: value }),
  })

  const showRivers = computed({
    get: () => getConfig().showRivers ?? false,
    set: (value: boolean) => updateConfig({ showRivers: value }),
  })

  const showCities = computed({
    get: () => getConfig().showCities ?? false,
    set: (value: boolean) => updateConfig({ showCities: value }),
  })

  const borderOpacity = computed({
    get: () => getConfig().borderOpacity ?? 0.35,
    set: (value: number) => updateConfig({ borderOpacity: value }),
  })

  const riverOpacity = computed({
    get: () => getConfig().riverOpacity ?? 0.40,
    set: (value: number) => updateConfig({ riverOpacity: value }),
  })

  const riverLabelOffsets = computed({
    get: () => getConfig().riverLabelOffsets ?? {} as Record<string, number>,
    set: (value: Record<string, number>) => updateConfig({ riverLabelOffsets: value }),
  })

  function setRiverLabelOffset(name: string, t: number) {
    updateConfig({ riverLabelOffsets: { ...riverLabelOffsets.value, [name]: t } })
  }

  const kmLabelOffsets = computed({
    get: () => getConfig().kmLabelOffsets ?? {} as Record<number, { dx: number; dy: number }>,
    set: (value: Record<number, { dx: number; dy: number }>) => updateConfig({ kmLabelOffsets: value }),
  })

  function setKmLabelOffset(km: number, offset: { dx: number; dy: number }) {
    updateConfig({ kmLabelOffsets: { ...kmLabelOffsets.value, [km]: offset } })
  }

  const cityOpacity = computed({
    get: () => getConfig().cityOpacity ?? 0.50,
    set: (value: number) => updateConfig({ cityOpacity: value }),
  })

  const showPlaceBoundaries = computed({
    get: () => getConfig().showPlaceBoundaries ?? false,
    set: (value: boolean) => updateConfig({ showPlaceBoundaries: value }),
  })

  const placeBoundaryOpacity = computed({
    get: () => getConfig().placeBoundaryOpacity ?? 0.50,
    set: (value: number) => updateConfig({ placeBoundaryOpacity: value }),
  })

  const showForests = computed({
    get: () => getConfig().showForests ?? false,
    set: (value: boolean) => updateConfig({ showForests: value }),
  })

  const forestOpacity = computed({
    get: () => getConfig().forestOpacity ?? 0.60,
    set: (value: number) => updateConfig({ forestOpacity: value }),
  })

  const showWater = computed({
    get: () => getConfig().showWater ?? false,
    set: (value: boolean) => updateConfig({ showWater: value }),
  })

  const waterOpacity = computed({
    get: () => getConfig().waterOpacity ?? 0.70,
    set: (value: number) => updateConfig({ waterOpacity: value }),
  })

  const showGlaciers = computed({
    get: () => getConfig().showGlaciers ?? false,
    set: (value: boolean) => updateConfig({ showGlaciers: value }),
  })

  const glacierOpacity = computed({
    get: () => getConfig().glacierOpacity ?? 0.65,
    set: (value: number) => updateConfig({ glacierOpacity: value }),
  })

  const showUrban = computed({
    get: () => getConfig().showUrban ?? false,
    set: (value: boolean) => updateConfig({ showUrban: value }),
  })

  const urbanOpacity = computed({
    get: () => getConfig().urbanOpacity ?? 0.45,
    set: (value: number) => updateConfig({ urbanOpacity: value }),
  })

  const showVineyards = computed({
    get: () => getConfig().showVineyards ?? false,
    set: (value: boolean) => updateConfig({ showVineyards: value }),
  })

  const vineyardOpacity = computed({
    get: () => getConfig().vineyardOpacity ?? 0.55,
    set: (value: number) => updateConfig({ vineyardOpacity: value }),
  })

  const showMeadows = computed({
    get: () => getConfig().showMeadows ?? false,
    set: (value: boolean) => updateConfig({ showMeadows: value }),
  })

  const meadowOpacity = computed({
    get: () => getConfig().meadowOpacity ?? 0.50,
    set: (value: number) => updateConfig({ meadowOpacity: value }),
  })

  // --- Privacy ---

  const anonymizeStart = computed({
    get: () => getConfig().anonymizeStart ?? false,
    set: (value: boolean) => updateConfig({ anonymizeStart: value }),
  })

  const anonymizeEnd = computed({
    get: () => getConfig().anonymizeEnd ?? false,
    set: (value: boolean) => updateConfig({ anonymizeEnd: value }),
  })

  const anonymizeRadiusM = computed({
    get: () => getConfig().anonymizeRadiusM ?? 300,
    set: (value: number) => updateConfig({ anonymizeRadiusM: value }),
  })

  // --- Hillshade ---

  const showHillshade = computed({
    get: () => getConfig().showHillshade ?? false,
    set: (value: boolean) => updateConfig({ showHillshade: value }),
  })

  const hillshadeOpacity = computed({
    get: () => getConfig().hillshadeOpacity ?? 0.35,
    set: (value: number) => updateConfig({ hillshadeOpacity: value }),
  })

  const hillshadeStrength = computed({
    get: () => getConfig().hillshadeStrength ?? 0.03,
    set: (value: number) => updateConfig({ hillshadeStrength: value }),
  })

  // --- Contour Lines ---

  const showContours = computed({
    get: () => getConfig().showContours ?? false,
    set: (value: boolean) => updateConfig({ showContours: value }),
  })

  const contourColor = computed({
    get: () => getConfig().contourColor ?? '#8B7355',
    set: (value: string) => updateConfig({ contourColor: value }),
  })

  const contourOpacity = computed({
    get: () => getConfig().contourOpacity ?? 0.25,
    set: (value: number) => updateConfig({ contourOpacity: value }),
  })

  const contourInterval = computed({
    get: () => getConfig().contourInterval ?? 100,
    set: (value: number) => updateConfig({ contourInterval: value }),
  })

  const contourMajorInterval = computed({
    get: () => getConfig().contourMajorInterval ?? 500,
    set: (value: number) => updateConfig({ contourMajorInterval: value }),
  })

  const contourShowLabels = computed({
    get: () => getConfig().contourShowLabels ?? false,
    set: (value: boolean) => updateConfig({ contourShowLabels: value }),
  })

  // --- Peaks ---

  const showPeaks = computed({
    get: () => getConfig().showPeaks ?? false,
    set: (value: boolean) => updateConfig({ showPeaks: value }),
  })

  const peakOpacity = computed({
    get: () => getConfig().peakOpacity ?? 0.70,
    set: (value: number) => updateConfig({ peakOpacity: value }),
  })

  // --- Annotations ---

  const annotations = computed({
    get: () => getConfig().annotations ?? [],
    set: (value: Annotation[]) => updateConfig({ annotations: value }),
  })

  function toggleAnnotation(id: string) {
    const current = getConfig().annotations ?? []
    updateConfig({ annotations: current.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a) })
  }

  function updateAnnotationText(id: string, text: string) {
    const current = getConfig().annotations ?? []
    updateConfig({ annotations: current.map(a => a.id === id ? { ...a, text } : a) })
  }

  function deleteAnnotation(id: string) {
    updateConfig({ annotations: (getConfig().annotations ?? []).filter(a => a.id !== id) })
  }

  function addCustomAnnotation(progress: number, text: string) {
    const current = getConfig().annotations ?? []
    const newAnnotation: Annotation = {
      id: generateAnnotationId('custom' as AnnotationType),
      progress: Math.max(0.01, Math.min(0.99, progress)),
      text,
      enabled: true,
      type: 'custom',
      isAutoGenerated: false,
    }
    updateConfig({ annotations: [...current, newAnnotation] })
  }

  // --- Stats Overlay ---

  const showStatsOverlay = computed({
    get: () => getConfig().showStatsOverlay ?? false,
    set: (value: boolean) => updateConfig({ showStatsOverlay: value }),
  })

  const statsOverlayColor = computed({
    get: () => getConfig().statsOverlayColor ?? '#ffffff',
    set: (value: string) => updateConfig({ statsOverlayColor: value }),
  })

  const statsX = computed({
    get: () => getConfig().statsX ?? 1.0,
    set: (value: number) => updateConfig({ statsX: value }),
  })

  const statsY = computed({
    get: () => getConfig().statsY ?? 1.0,
    set: (value: number) => updateConfig({ statsY: value }),
  })

  // --- Map Visual Enhancements ---

  // --- Roads ---

  const showRoads = computed({
    get: () => getConfig().showRoads ?? false,
    set: (value: boolean) => updateConfig({ showRoads: value }),
  })

  const roadOpacity = computed({
    get: () => getConfig().roadOpacity ?? 0.30,
    set: (value: number) => updateConfig({ roadOpacity: value }),
  })

  const showNorthArrow = computed({
    get: () => getConfig().showNorthArrow ?? true,
    set: (value: boolean) => updateConfig({ showNorthArrow: value }),
  })

  const showScaleBar = computed({
    get: () => getConfig().showScaleBar ?? true,
    set: (value: boolean) => updateConfig({ showScaleBar: value }),
  })

  const showMapFade = computed({
    get: () => getConfig().showMapFade ?? true,
    set: (value: boolean) => updateConfig({ showMapFade: value }),
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
    showMarkerPulse,
    // Map Labels & Markers
    showDirection,
    showDistanceMarkers,
    distanceMarkerInterval,
    showStartEndLabels,
    // Layout
    showElevationChart,
    mapHeightRatio,
    showDivider,
    dividerColor,
    // Elevation Coloring
    showElevationColoring,
    elevationColorIntensity,
    showElevationCurveColoring,
    showSpeedColoring,
    speedColorIntensity,
    // Geo Context Layers
    showBorders,
    showRivers,
    riverLabelOffsets,
    setRiverLabelOffset,
    kmLabelOffsets,
    setKmLabelOffset,
    showCities,
    borderOpacity,
    riverOpacity,
    cityOpacity,
    showPlaceBoundaries,
    placeBoundaryOpacity,
    showForests,
    forestOpacity,
    showWater,
    waterOpacity,
    showGlaciers,
    glacierOpacity,
    showUrban,
    urbanOpacity,
    showVineyards,
    vineyardOpacity,
    showMeadows,
    meadowOpacity,
    // Privacy
    anonymizeStart,
    anonymizeEnd,
    anonymizeRadiusM,
    // Hillshade
    showHillshade,
    hillshadeOpacity,
    hillshadeStrength,
    // Peaks
    showPeaks,
    peakOpacity,
    // Contour Lines
    showContours,
    contourColor,
    contourOpacity,
    contourInterval,
    contourMajorInterval,
    contourShowLabels,
    // Stats Overlay
    showStatsOverlay,
    statsOverlayColor,
    statsX,
    statsY,
    // Roads
    showRoads,
    roadOpacity,
    // Map Visual Enhancements
    showNorthArrow,
    showScaleBar,
    showMapFade,
    // Annotations
    annotations,
    toggleAnnotation,
    updateAnnotationText,
    deleteAnnotation,
    addCustomAnnotation,
  }
}
