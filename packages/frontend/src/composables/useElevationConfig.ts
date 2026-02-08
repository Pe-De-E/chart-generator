/**
 * Composable for Elevation Chart configuration state.
 * Extracts computed getter/setter pairs from ElevationChartStep.vue
 * to keep the component focused on template and logic.
 */

import { computed } from 'vue'
import type { ElevationAnimationConfig, BackgroundType } from '../components/chartWorkflow/ElevationChartStep.vue'

const defaultEffortConfig = {
  variableStroke: true, variableStrokeIntensity: 5,
  colorGradient: true, colorGradientIntensity: 5,
  glowAura: true, glowAuraIntensity: 5
}

export function useElevationConfig(
  getConfig: () => ElevationAnimationConfig,
  updateConfig: (partial: Partial<ElevationAnimationConfig>) => void
) {
  // --- Animation ---

  const animationDuration = computed({
    get: () => getConfig().duration,
    set: (value: number) => updateConfig({ duration: value }),
  })

  const animationEasing = computed({
    get: () => getConfig().easing,
    set: (value: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out') => updateConfig({ easing: value }),
  })

  const animationShowMarker = computed({
    get: () => getConfig().showMarker,
    set: (value: boolean) => updateConfig({ showMarker: value }),
  })

  const animationMarkerSize = computed({
    get: () => getConfig().markerSize,
    set: (value: number) => updateConfig({ markerSize: value }),
  })

  const curveEndpoint = computed({
    get: () => getConfig().curveEndpoint,
    set: (value: number) => updateConfig({ curveEndpoint: value }),
  })

  const animationMode = computed({
    get: () => getConfig().animationMode ?? 'uniform',
    set: (value: 'uniform' | 'time-based' | 'gradient' | 'effort') => updateConfig({ animationMode: value }),
  })

  const gradientSensitivity = computed({
    get: () => getConfig().gradientSensitivity ?? 3,
    set: (value: number) => updateConfig({ gradientSensitivity: value }),
  })

  // --- Effort mode ---

  const effortVariableStroke = computed({
    get: () => getConfig().effortConfig?.variableStroke ?? true,
    set: (value: boolean) => updateConfig({
      effortConfig: { ...defaultEffortConfig, ...getConfig().effortConfig, variableStroke: value }
    }),
  })

  const effortVariableStrokeIntensity = computed({
    get: () => getConfig().effortConfig?.variableStrokeIntensity ?? 5,
    set: (value: number) => updateConfig({
      effortConfig: { ...defaultEffortConfig, ...getConfig().effortConfig, variableStrokeIntensity: value }
    }),
  })

  const effortColorGradient = computed({
    get: () => getConfig().effortConfig?.colorGradient ?? true,
    set: (value: boolean) => updateConfig({
      effortConfig: { ...defaultEffortConfig, ...getConfig().effortConfig, colorGradient: value }
    }),
  })

  const effortColorGradientIntensity = computed({
    get: () => getConfig().effortConfig?.colorGradientIntensity ?? 5,
    set: (value: number) => updateConfig({
      effortConfig: { ...defaultEffortConfig, ...getConfig().effortConfig, colorGradientIntensity: value }
    }),
  })

  const effortGlowAura = computed({
    get: () => getConfig().effortConfig?.glowAura ?? true,
    set: (value: boolean) => updateConfig({
      effortConfig: { ...defaultEffortConfig, ...getConfig().effortConfig, glowAura: value }
    }),
  })

  const effortGlowAuraIntensity = computed({
    get: () => getConfig().effortConfig?.glowAuraIntensity ?? 5,
    set: (value: number) => updateConfig({
      effortConfig: { ...defaultEffortConfig, ...getConfig().effortConfig, glowAuraIntensity: value }
    }),
  })

  // --- Pan-Zoom (Kamerafahrt) ---

  const panZoomEnabled = computed({
    get: () => getConfig().panZoomEnabled ?? false,
    set: (value: boolean) => updateConfig({ panZoomEnabled: value }),
  })

  const panZoomZoomLevel = computed({
    get: () => getConfig().panZoomZoomLevel ?? 3,
    set: (value: number) => updateConfig({ panZoomZoomLevel: value }),
  })

  const panZoomZoomOutStart = computed({
    get: () => getConfig().panZoomZoomOutStart ?? 0.75,
    set: (value: number) => updateConfig({ panZoomZoomOutStart: value }),
  })

  // --- Colors ---

  const silhouetteCurveColor = computed({
    get: () => getConfig().curveColor,
    set: (value: string) => updateConfig({ curveColor: value }),
  })

  const titleColor = computed({
    get: () => getConfig().titleColor || '#ffffff',
    set: (value: string) => updateConfig({ titleColor: value }),
  })

  const showAreaFill = computed({
    get: () => getConfig().showAreaFill ?? true,
    set: (value: boolean) => updateConfig({ showAreaFill: value }),
  })

  // --- Labels ---

  const showElevationLabels = computed({
    get: () => getConfig().showElevationLabels,
    set: (value: boolean) => updateConfig({ showElevationLabels: value }),
  })

  const elevationLabelColor = computed({
    get: () => getConfig().elevationLabelColor,
    set: (value: string) => updateConfig({ elevationLabelColor: value }),
  })

  const showDistanceLabels = computed({
    get: () => getConfig().showDistanceLabels,
    set: (value: boolean) => updateConfig({ showDistanceLabels: value }),
  })

  const distanceLabelColor = computed({
    get: () => getConfig().distanceLabelColor,
    set: (value: string) => updateConfig({ distanceLabelColor: value }),
  })

  // --- Background ---

  const backgroundColor = computed({
    get: () => getConfig().backgroundColor || '#000000',
    set: (value: string) => updateConfig({ backgroundColor: value }),
  })

  const backgroundType = computed({
    get: () => getConfig().backgroundType || 'solid',
    set: (value: BackgroundType) => updateConfig({ backgroundType: value }),
  })

  const useGradientBackground = computed({
    get: () => getConfig().backgroundType === 'gradient',
    set: (value: boolean) => updateConfig({ backgroundType: value ? 'gradient' : 'solid' }),
  })

  const gradientColor = computed({
    get: () => getConfig().gradientColor || '#302b63',
    set: (value: string) => updateConfig({ gradientColor: value }),
  })

  const meshColor1 = computed({
    get: () => getConfig().meshColor1 || '#667eea',
    set: (value: string) => updateConfig({ meshColor1: value }),
  })

  const meshColor2 = computed({
    get: () => getConfig().meshColor2 || '#764ba2',
    set: (value: string) => updateConfig({ meshColor2: value }),
  })

  const meshColor3 = computed({
    get: () => getConfig().meshColor3 || '#f093fb',
    set: (value: string) => updateConfig({ meshColor3: value }),
  })

  const patternColor = computed({
    get: () => getConfig().patternColor || '#ffffff',
    set: (value: string) => updateConfig({ patternColor: value }),
  })

  const patternOpacity = computed({
    get: () => getConfig().patternOpacity ?? 0.1,
    set: (value: number) => updateConfig({ patternOpacity: value }),
  })

  // --- Image background ---

  const imageOptions = computed(() => getConfig().imageOptions)

  const imagePosition = computed({
    get: () => getConfig().imageOptions?.position || 'cover',
    set: (value: 'cover' | 'contain' | 'center' | 'stretch') => {
      if (getConfig().imageOptions) {
        updateConfig({ imageOptions: { ...getConfig().imageOptions!, position: value } })
      }
    },
  })

  const imageBlur = computed({
    get: () => getConfig().imageOptions?.blur ?? 0,
    set: (value: number) => {
      if (getConfig().imageOptions) {
        updateConfig({ imageOptions: { ...getConfig().imageOptions!, blur: value } })
      }
    },
  })

  const imageBrightness = computed({
    get: () => getConfig().imageOptions?.brightness ?? 1,
    set: (value: number) => {
      if (getConfig().imageOptions) {
        updateConfig({ imageOptions: { ...getConfig().imageOptions!, brightness: value } })
      }
    },
  })

  const imageContrast = computed({
    get: () => getConfig().imageOptions?.contrast ?? 1,
    set: (value: number) => {
      if (getConfig().imageOptions) {
        updateConfig({ imageOptions: { ...getConfig().imageOptions!, contrast: value } })
      }
    },
  })

  const imageOverlayColor = computed({
    get: () => getConfig().imageOptions?.overlayColor || '#000000',
    set: (value: string) => {
      if (getConfig().imageOptions) {
        updateConfig({ imageOptions: { ...getConfig().imageOptions!, overlayColor: value } })
      }
    },
  })

  const imageOverlayOpacity = computed({
    get: () => getConfig().imageOptions?.overlayOpacity ?? 0.3,
    set: (value: number) => {
      if (getConfig().imageOptions) {
        updateConfig({ imageOptions: { ...getConfig().imageOptions!, overlayOpacity: value } })
      }
    },
  })

  return {
    // Animation
    animationDuration,
    animationEasing,
    animationShowMarker,
    animationMarkerSize,
    curveEndpoint,
    animationMode,
    gradientSensitivity,
    // Effort
    effortVariableStroke,
    effortVariableStrokeIntensity,
    effortColorGradient,
    effortColorGradientIntensity,
    effortGlowAura,
    effortGlowAuraIntensity,
    // Pan-Zoom
    panZoomEnabled,
    panZoomZoomLevel,
    panZoomZoomOutStart,
    // Colors
    silhouetteCurveColor,
    titleColor,
    showAreaFill,
    // Labels
    showElevationLabels,
    elevationLabelColor,
    showDistanceLabels,
    distanceLabelColor,
    // Background
    backgroundColor,
    backgroundType,
    useGradientBackground,
    gradientColor,
    meshColor1,
    meshColor2,
    meshColor3,
    patternColor,
    patternOpacity,
    // Image
    imageOptions,
    imagePosition,
    imageBlur,
    imageBrightness,
    imageContrast,
    imageOverlayColor,
    imageOverlayOpacity,
  }
}
