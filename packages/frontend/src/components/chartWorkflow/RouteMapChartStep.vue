<template>
  <div class="routemap-step">
    <!-- Main Content Area with centered preview -->
    <div class="routemap-main" :class="{ 'sidebar-collapsed': controlsCollapsed }">
      <!-- Centered Reel Preview -->
      <div class="preview-area">
        <div class="reel-preview">
          <div class="silhouette-container">
            <div
              class="silhouette-chart"
              v-html="animationSvg"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Sidebar for Controls -->
    <RouteMapControlsSidebar
      v-model:collapsed="controlsCollapsed"
      :animation-config="animationConfig"
      :chart-title="chartTitle"
      :time-array="timeArray"
      :is-playing="isPlaying"
      :playback-speed="playbackSpeed"
      :formatted-time="formattedTime"
      :animation-progress="animationProgress"
      :slider-progress="sliderProgress"
      :video-export-supported="videoExport.isSupported.value"
      :video-exporting="videoExport.isExporting.value"
      :contour-loading="contourLoading"
      :river-loading="riverLoading"
      :peak-loading="peakLoading"
      @update:animation-config="$emit('update:animationConfig', $event)"
      @update:chart-title="$emit('update:chartTitle', $event)"
      @back="$emit('back')"
      @save="$emit('save')"
      @toggle-playback="togglePlayback"
      @reset-animation="resetAnimation"
      @set-speed="setSpeed"
      @slider-change="onSliderChange"
      @open-export-settings="openExportSettings"
    />

    <!-- Export Settings Dialog -->
    <ExportSettingsDialog
      v-model="showExportSettingsDialog"
      :animation-duration="animationConfig.duration"
      :chart-title="chartTitle"
      @start-export="startVideoExport"
    />

    <!-- Video Export Progress Dialog -->
    <VideoExportProgressDialog
      v-model="showExportDialog"
      :progress="videoExport.progress.value"
      :error="videoExport.error.value"
      :is-supported="videoExport.isSupported.value"
      :is-exporting="videoExport.isExporting.value"
      @close="closeExportDialog"
    />
  </div>
</template>

<script lang="ts">
// Background type re-export
export type BackgroundType = 'solid' | 'gradient' | 'mesh' | 'grid' | 'dots' | 'image';

// RouteMap animation config — extends elevation config with map-specific fields
export interface RouteMapAnimationConfig {
  // Shared with elevation
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  showMarker: boolean;
  markerSize: number;
  curveEndpoint: number;
  curveColor: string;
  titleColor: string;
  showAreaFill: boolean;
  backgroundColor: string;
  backgroundType: BackgroundType;
  gradientColor: string;
  meshColor1: string;
  meshColor2: string;
  meshColor3: string;
  patternColor: string;
  patternOpacity: number;
  showElevationLabels: boolean;
  elevationLabelColor: string;
  showDistanceLabels: boolean;
  distanceLabelColor: string;
  imageOptions?: {
    imageId: string;
    imageUrl: string;
    position: 'cover' | 'contain' | 'center' | 'stretch';
    blur: number;
    brightness: number;
    contrast: number;
    overlayColor: string;
    overlayOpacity: number;
  };
  animationMode: 'uniform' | 'time-based' | 'gradient' | 'effort';
  gradientSensitivity: number;
  effortConfig: {
    variableStroke: boolean;
    variableStrokeIntensity: number;
    colorGradient: boolean;
    colorGradientIntensity: number;
    glowAura: boolean;
    glowAuraIntensity: number;
  };
  panZoomEnabled: boolean;
  panZoomZoomLevel: number;
  panZoomZoomOutStart: number;
  // Map-specific
  mapCameraMode: 'overview' | 'chase';
  mapChaseZoomLevel: number;
  mapChaseZoomOutStart: number;
  mapChaseRotateWithRoute: boolean;
  routeColor: string;
  routeWidth: number;
  routeGlow: boolean;
  routeGlowColor: string;
  routeGlowIntensity: number;
  routeTrailDash: string;
  routeTrailOpacity: number;
  showMapMarker: boolean;
  mapMarkerSize: number;
  mapMarkerColor: string;
  showDirection: boolean;
  showDistanceMarkers: boolean;
  distanceMarkerInterval: number;
  showStartEndLabels: boolean;
  mapHeightRatio: number;
  showDivider: boolean;
  dividerColor: string;
  showElevationColoring: boolean;
  elevationColorIntensity: number;
  showElevationCurveColoring: boolean;
  // Geo context layers
  showBorders: boolean;
  showRivers: boolean;
  showCities: boolean;
  borderOpacity: number;
  riverOpacity: number;
  cityOpacity: number;
  showPeaks: boolean;
  peakOpacity: number;
  // Contour lines
  showContours: boolean;
  contourColor: string;
  contourOpacity: number;
  contourInterval: number;
  contourMajorInterval: number;
  contourShowLabels: boolean;
}

export const DEFAULT_ROUTEMAP_ANIMATION_CONFIG: RouteMapAnimationConfig = {
  // Shared defaults
  duration: 8,
  easing: 'ease-in-out',
  showMarker: true,
  markerSize: 6,
  curveEndpoint: 30,
  showAreaFill: true,
  showElevationLabels: false,
  elevationLabelColor: '#ffffffb3',
  showDistanceLabels: false,
  distanceLabelColor: '#ffffffb3',
  curveColor: '#ffffff',
  titleColor: '#ffffff',
  backgroundColor: '#1a1a2e',
  backgroundType: 'solid',
  gradientColor: '#302b63',
  meshColor1: '#667eea',
  meshColor2: '#764ba2',
  meshColor3: '#f093fb',
  patternColor: '#ffffff',
  patternOpacity: 0.1,
  animationMode: 'uniform',
  gradientSensitivity: 3,
  effortConfig: {
    variableStroke: true,
    variableStrokeIntensity: 5,
    colorGradient: true,
    colorGradientIntensity: 5,
    glowAura: true,
    glowAuraIntensity: 5,
  },
  panZoomEnabled: false,
  panZoomZoomLevel: 3,
  panZoomZoomOutStart: 0.75,
  // Map-specific defaults
  mapCameraMode: 'overview',
  mapChaseZoomLevel: 3,
  mapChaseZoomOutStart: 0.85,
  mapChaseRotateWithRoute: false,
  routeColor: '#ffffff',
  routeWidth: 4,
  routeGlow: true,
  routeGlowColor: '#ffffff',
  routeGlowIntensity: 4,
  routeTrailDash: '8 12',
  routeTrailOpacity: 0.2,
  showMapMarker: true,
  mapMarkerSize: 8,
  mapMarkerColor: '#ffffff',
  showDirection: true,
  showDistanceMarkers: false,
  distanceMarkerInterval: 5,
  showStartEndLabels: false,
  mapHeightRatio: 0.6,
  showDivider: false,
  dividerColor: '#ffffff33',
  showElevationColoring: false,
  elevationColorIntensity: 5,
  showElevationCurveColoring: false,
  // Geo context layers
  showBorders: false,
  showRivers: false,
  showCities: false,
  borderOpacity: 0.35,
  riverOpacity: 0.40,
  cityOpacity: 0.50,
  showPeaks: false,
  peakOpacity: 0.70,
  // Contour lines
  showContours: false,
  contourColor: '#8B7355',
  contourOpacity: 0.25,
  contourInterval: 100,
  contourMajorInterval: 500,
  contourShowLabels: false,
};
</script>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PropType } from 'vue'
import type { RoutePoint } from '@chart-generator/shared'
import type { AnimationOptions } from '@chart-generator/shared'
import { DEFAULT_ANIMATION_OPTIONS } from '@chart-generator/shared'
import { useChartAnimation, type PlaybackSpeed } from '../../composables/useChartAnimation'
import { useVideoExport } from '../../composables/useVideoExport'
import { generateCombinedFrame } from '../../utils/chartGenerators/routeMap/combinedFrame'
import type { CombinedFrameOptions } from '../../utils/chartGenerators/routeMap/combinedFrame'
import { getTitleCardOpacity, TITLE_CARD_DURATION_MS, TRANSITION_DURATION_MS } from '../../utils/titleCardGenerator'
import { findHookPoint } from '../../utils/chartGenerators/elevationChart/hookDetection'
import ExportSettingsDialog from './ExportSettingsDialog.vue'
import type { ExportSettings } from './ExportSettingsDialog.vue'
import VideoExportProgressDialog from './VideoExportProgressDialog.vue'
import RouteMapControlsSidebar from './RouteMapControlsSidebar.vue'
import { useContourLines } from '../../composables/useContourLines'
import { useRiverTiles } from '../../composables/useRiverTiles'
import { calculateRouteBounds, getProjectionParams } from '../../utils/chartGenerators/routeMap/projection'
import type { ContourConfig } from '../../utils/chartGenerators/routeMap/contourLines'
import type { RiverConfig } from '../../utils/chartGenerators/routeMap/riverTiles'
import { usePeakLayer } from '../../composables/usePeakLayer'
import type { PeakConfig } from '../../utils/chartGenerators/routeMap/peakLayer'

// Slider progress state
const sliderProgress = ref(0)

// Video export dialogs
const showExportDialog = ref(false)
const showExportSettingsDialog = ref(false)

// Controls sidebar collapsed state
const controlsCollapsed = ref(false)

const props = defineProps({
  chartTitle: {
    type: String,
    required: true,
  },
  routePoints: {
    type: Array as PropType<RoutePoint[]>,
    default: () => [],
  },
  chartData: {
    type: Array as PropType<Array<{ label: string; value: number }>>,
    default: () => [],
  },
  animationConfig: {
    type: Object as PropType<RouteMapAnimationConfig>,
    default: () => ({ ...DEFAULT_ROUTEMAP_ANIMATION_CONFIG }),
  },
  timeArray: {
    type: Array as PropType<number[]>,
    default: undefined,
  },
})

const emit = defineEmits<{
  back: []
  save: []
  'update:chartTitle': [value: string]
  'update:animationConfig': [value: RouteMapAnimationConfig]
}>()

// ── Contour lines (async terrain tile fetch + d3-contour) ──
const contourRouteBounds = computed(() => {
  if (props.routePoints.length < 2) return null
  return calculateRouteBounds(props.routePoints)
})
const contourMapHeight = computed(() => Math.round(1920 * props.animationConfig.mapHeightRatio))
const contourProjParams = computed(() => {
  if (!contourRouteBounds.value) return null
  return getProjectionParams(contourRouteBounds.value, {
    width: 1080, height: contourMapHeight.value,
    padding: { top: 50, right: 50, bottom: 50, left: 50 },
  })
})
const contourConfig = computed<ContourConfig | null>(() => {
  const cfg = props.animationConfig
  if (!cfg.showContours) return null
  return {
    interval: cfg.contourInterval,
    majorInterval: cfg.contourMajorInterval,
    color: cfg.contourColor,
    opacity: cfg.contourOpacity,
    minorWidth: 0.6,
    majorWidth: 1.2,
    showLabels: cfg.contourShowLabels,
  }
})
const { contourSvg, isLoading: contourLoading } = useContourLines(
  contourRouteBounds,
  contourProjParams,
  contourConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── River vector tiles (async fetch from OpenFreeMap) ──
const riverConfig = computed<RiverConfig | null>(() => {
  const cfg = props.animationConfig
  if (!cfg.showRivers) return null
  return {
    color: '#4a90d9',
    opacity: cfg.riverOpacity,
    showLabels: true,
  }
})
const { riverSvg, isLoading: riverLoading } = useRiverTiles(
  contourRouteBounds,
  contourProjParams,
  riverConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── Peak layer (async fetch from Overpass API) ──
const peakConfig = computed<PeakConfig | null>(() => {
  const cfg = props.animationConfig
  if (!cfg.showPeaks) return null
  return {
    color: '#ffffff',
    opacity: cfg.peakOpacity,
  }
})
const { peakSvg, isLoading: peakLoading } = usePeakLayer(
  contourRouteBounds,
  contourProjParams,
  peakConfig,
  computed(() => 1080),
  contourMapHeight,
  computed(() => props.routePoints),
)

// Title card: include title + transition in total duration when title exists
const hasTitleCard = computed(() => !!props.chartTitle.trim())
const chartDurationMs = computed(() => props.animationConfig.duration * 1000)
const introDurationMs = computed(() =>
  hasTitleCard.value ? TITLE_CARD_DURATION_MS + TRANSITION_DURATION_MS : 0
)
const totalDurationMs = computed(() =>
  chartDurationMs.value + introDurationMs.value
)
const titleEnd = computed(() =>
  hasTitleCard.value ? TITLE_CARD_DURATION_MS / totalDurationMs.value : 0
)
const transitionEnd = computed(() =>
  hasTitleCard.value ? introDurationMs.value / totalDurationMs.value : 0
)

// Hook point for title card camera
const hookProgress = computed(() => findHookPoint(props.chartData))

// Pan window: camera pans from hook to start during late title + transition
const panStart = computed(() => titleEnd.value * 0.8)
const panEnd = computed(() => transitionEnd.value)

// Animation settings for the composable
const animationSettings = computed<AnimationOptions>(() => ({
  ...DEFAULT_ANIMATION_OPTIONS,
  enabled: true,
  durationMs: totalDurationMs.value,
  fps: 30,
  easing: props.animationConfig.easing,
  showMarker: props.animationConfig.showMarker,
  markerSize: props.animationConfig.markerSize,
  markerColor: '#ffffff',
  curveEndpoint: props.animationConfig.curveEndpoint,
}))

// Minimal chart options for useChartAnimation (it needs ChartOptions shape)
const chartOptions = computed(() => ({
  data: props.chartData.map(d => ({ label: d.label, value: d.value })),
  colors: {
    primary: props.animationConfig.curveColor,
    background: props.animationConfig.backgroundColor,
  },
  title: props.chartTitle,
  silhouetteMode: true,
  animation: animationSettings.value,
}))

// Use the animation composable
const animation = useChartAnimation(chartOptions, animationSettings)
const {
  progress: animationProgress,
  isPlaying,
  playbackSpeed,
  formattedTime,
  toggle: togglePlayback,
  reset: resetAnimation,
} = animation

/**
 * Build CombinedFrameOptions from the current config + progress.
 */
function buildFrameOptions(progress: number, overrides: Partial<CombinedFrameOptions> = {}): CombinedFrameOptions {
  const cfg = props.animationConfig
  return {
    routePoints: props.routePoints,
    chartData: props.chartData,
    progress,
    width: 1080,
    height: 1920,
    mapHeightRatio: cfg.mapHeightRatio,
    // Background
    backgroundColor: cfg.backgroundColor,
    backgroundType: cfg.backgroundType,
    gradientColor: cfg.gradientColor,
    meshColor1: cfg.meshColor1,
    meshColor2: cfg.meshColor2,
    meshColor3: cfg.meshColor3,
    patternColor: cfg.patternColor,
    patternOpacity: cfg.patternOpacity,
    imageOptions: cfg.imageOptions,
    // Map
    mapCameraMode: cfg.mapCameraMode,
    mapCameraConfig: {
      zoomLevel: cfg.mapChaseZoomLevel,
      zoomOutStart: cfg.mapChaseZoomOutStart,
      rotateWithRoute: cfg.mapChaseRotateWithRoute,
      lookaheadFraction: 0.35,
    },
    routeStyle: {
      color: cfg.routeColor,
      width: cfg.routeWidth,
      opacity: 1,
      glow: cfg.routeGlow,
      glowColor: cfg.routeGlowColor,
      glowIntensity: cfg.routeGlowIntensity,
      trailDash: cfg.routeTrailDash,
      trailOpacity: cfg.routeTrailOpacity,
      elevationColoring: cfg.showElevationColoring,
      elevationColorIntensity: cfg.elevationColorIntensity,
    },
    showMapMarker: cfg.showMapMarker,
    mapMarkerSize: cfg.mapMarkerSize,
    mapMarkerColor: cfg.mapMarkerColor,
    showDirection: cfg.showDirection,
    showDistanceMarkers: cfg.showDistanceMarkers,
    distanceMarkerInterval: cfg.distanceMarkerInterval,
    showStartEndLabels: cfg.showStartEndLabels,
    // Elevation
    curveColor: cfg.curveColor,
    elevationCurveColoring: cfg.showElevationCurveColoring,
    elevationColorIntensity: cfg.elevationColorIntensity,
    showElevationMarker: cfg.showMarker,
    elevationMarkerSize: cfg.markerSize,
    elevationMarkerColor: '#ffffff',
    showAreaFill: cfg.showAreaFill,
    showElevationLabels: cfg.showElevationLabels,
    elevationLabelColor: cfg.elevationLabelColor,
    showDistanceLabels: cfg.showDistanceLabels,
    distanceLabelColor: cfg.distanceLabelColor,
    // Animation
    animationMode: cfg.animationMode,
    timeArray: props.timeArray,
    gradientSensitivity: cfg.gradientSensitivity,
    // Divider
    showDivider: cfg.showDivider,
    dividerColor: cfg.dividerColor,
    // Geo context layers
    geoLayers: (cfg.showBorders || cfg.showCities) ? {
      showBorders: cfg.showBorders,
      showRivers: false,  // Rivers are now async via riverLayerSvg
      showCities: cfg.showCities,
      borderColor: '#ffffff',
      borderOpacity: cfg.borderOpacity,
      riverColor: '#4a90d9',
      riverOpacity: cfg.riverOpacity,
      cityColor: '#ffffff',
      cityOpacity: cfg.cityOpacity,
      showContours: false,
      contourColor: cfg.contourColor,
      contourOpacity: cfg.contourOpacity,
      contourInterval: cfg.contourInterval,
      contourMajorInterval: cfg.contourMajorInterval,
      contourShowLabels: cfg.contourShowLabels,
    } : undefined,
    // Pre-rendered contour lines (async, from terrain tiles)
    contourLayerSvg: contourSvg.value,
    // Pre-rendered river layer (async, from OpenFreeMap vector tiles)
    riverLayerSvg: riverSvg.value,
    peakLayerSvg: peakSvg.value,
    // Overrides
    ...overrides,
  }
}

// Generate animation SVG
const animationSvg = computed(() => {
  if (props.chartData.length === 0 && props.routePoints.length === 0) return ''

  const progress = animationProgress.value

  // Phase 1: Title card — terrain visible with title overlay + hook camera
  if (hasTitleCard.value && progress <= titleEnd.value) {
    const titleProgress = titleEnd.value > 0 ? progress / titleEnd.value : 1
    return generateCombinedFrame(buildFrameOptions(1, {
      sceneOpacity: 1,
      titleOverlay: {
        text: props.chartTitle,
        opacity: getTitleCardOpacity(titleProgress),
        color: props.animationConfig.titleColor || '#ffffff',
      },
      // Show full terrain as backdrop, no animation markers
      showElevationMarker: false,
      showMapMarker: false,
      showElevationLabels: false,
      showDistanceLabels: false,
    }))
  }

  // Phase 2: Transition — fade out terrain, prepare for animation
  if (hasTitleCard.value && progress <= transitionEnd.value) {
    const t = (progress - titleEnd.value) / (transitionEnd.value - titleEnd.value)
    // Terrain fades out over last 60% of transition
    const fadeT = Math.max(0, (t - 0.4) / 0.6)
    const curveOpacity = 1 - fadeT * fadeT
    return generateCombinedFrame(buildFrameOptions(0, {
      sceneOpacity: curveOpacity,
    }))
  }

  // Phase 3: Chart animation
  const chartProgress = transitionEnd.value < 1
    ? (progress - transitionEnd.value) / (1 - transitionEnd.value)
    : progress

  // Fade-in at the start of the animation (first 10%)
  const fadeInDuration = 0.10
  const fadeInT = Math.min(1, chartProgress / fadeInDuration)
  const fadeIn = fadeInT * fadeInT

  return generateCombinedFrame(buildFrameOptions(chartProgress, {
    sceneOpacity: hasTitleCard.value ? fadeIn : undefined,
  }))
})

// Sync slider with animation progress
watch(animationProgress, (newVal) => {
  if (!isPlaying.value) return
  sliderProgress.value = newVal * 100
})

function onSliderChange(value: number) {
  animation.seekTo(value / 100)
}

function setSpeed(speed: PlaybackSpeed) {
  animation.setSpeed(speed)
}

// Video export
const videoExport = useVideoExport()

function openExportSettings() {
  showExportSettingsDialog.value = true
}

async function startVideoExport(settings: ExportSettings) {
  showExportDialog.value = true

  const [width, height] = settings.resolution.split('x').map(Number)

  const hasTitle = !!props.chartTitle.trim()
  const titleMs = hasTitle ? TITLE_CARD_DURATION_MS : 0
  const transitionMs = hasTitle ? TRANSITION_DURATION_MS : 0
  const chartMs = props.animationConfig.duration * 1000
  const totalMs = titleMs + transitionMs + chartMs
  const exportTitleEnd = titleMs / totalMs
  const exportTransitionEnd = (titleMs + transitionMs) / totalMs

  await videoExport.exportVideo({
    width,
    height,
    fps: settings.fps,
    quality: settings.quality,
    durationMs: totalMs,
    filename: `${props.chartTitle || 'route-map'}-reel.mp4`,
    renderFrame: (progress: number) => {
      // Phase 1: Title — terrain visible + title overlay
      if (hasTitle && progress <= exportTitleEnd) {
        const titleProgress = exportTitleEnd > 0 ? progress / exportTitleEnd : 1
        return generateCombinedFrame(buildFrameOptions(1, {
          sceneOpacity: 1,
          titleOverlay: {
            text: props.chartTitle,
            opacity: getTitleCardOpacity(titleProgress),
            color: props.animationConfig.titleColor || '#ffffff',
          },
          showElevationMarker: false,
          showMapMarker: false,
          showElevationLabels: false,
          showDistanceLabels: false,
        }))
      }

      // Phase 2: Transition — terrain fades out
      if (hasTitle && progress <= exportTransitionEnd) {
        const t = (progress - exportTitleEnd) / (exportTransitionEnd - exportTitleEnd)
        const fadeT = Math.max(0, (t - 0.4) / 0.6)
        const curveOpacity = 1 - fadeT * fadeT
        return generateCombinedFrame(buildFrameOptions(0, {
          sceneOpacity: curveOpacity,
        }))
      }

      // Phase 3: Chart animation
      const chartProgress = exportTransitionEnd < 1
        ? (progress - exportTransitionEnd) / (1 - exportTransitionEnd)
        : progress

      const fadeInDuration = 0.10
      const fadeInT = Math.min(1, chartProgress / fadeInDuration)
      const fadeIn = fadeInT * fadeInT

      return generateCombinedFrame(buildFrameOptions(chartProgress, {
        sceneOpacity: hasTitle ? fadeIn : undefined,
      }))
    },
  })
}

function closeExportDialog() {
  if (videoExport.isExporting.value && videoExport.progress.value.stage !== 'error') {
    videoExport.cancelExport()
  }
  showExportDialog.value = false
}
</script>

<style scoped>
.routemap-step {
  height: 100%;
  position: relative;
  overflow: hidden;
}

.routemap-main {
  height: 100%;
  margin-right: 320px;
  transition: margin-right 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.routemap-main.sidebar-collapsed {
  margin-right: 56px;
}

.preview-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px;
  max-height: 100%;
}

.reel-preview {
  flex-shrink: 0;
  height: calc(100% - 120px);
  max-height: 70vh;
  aspect-ratio: 9 / 16;
  background: #000;
  border-radius: var(--radius-lg, 16px);
  overflow: hidden;
  box-shadow: var(--shadow-lg, 0 8px 30px rgba(45, 42, 38, 0.10));
}

.silhouette-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.silhouette-chart {
  width: 100%;
  height: 100%;
}

.silhouette-chart :deep(svg) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.routemap-step :deep(.v-dialog > .v-overlay__content > .v-card) {
  border-radius: var(--radius-xl, 24px) !important;
}
</style>
