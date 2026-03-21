<template>
  <div class="routemap-step">
    <!-- Main Content Area with centered preview -->
    <div class="routemap-main" :class="{ 'sidebar-collapsed': controlsCollapsed }">
      <!-- Centered Reel Preview -->
      <div class="preview-area">
        <div class="reel-preview">
          <div class="silhouette-container" ref="previewRef">
            <div
              class="silhouette-chart"
              v-html="animationSvg"
              @click="onPreviewClick"
              @mousedown="onPreviewMousedown"
            ></div>
            <div
              v-if="animationConfig.showStatsOverlay"
              class="stats-drag-handle"
              :style="dragHandleStyle"
              @mousedown.prevent="onStatsDragStart"
            />
            <div
              v-if="animationConfig.showWeatherOverlay"
              class="stats-drag-handle"
              :style="weatherDragHandleStyle"
              @mousedown.prevent="onWeatherDragStart"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Right Sidebar for Controls -->
    <RouteMapControlsSidebar
      v-model:collapsed="controlsCollapsed"
      :animation-config="animationConfig"
      :chart-title="chartTitle"
      :chart-data="chartData"
      :time-array="timeArray"
      :is-playing="isPlaying"
      :playback-speed="playbackSpeed"
      :formatted-time="formattedTime"
      :animation-progress="animationProgress"
      :slider-progress="sliderProgress"
      :video-export-supported="videoExport.isSupported.value"
      :video-exporting="videoExport.isExporting.value"
      :satellite-loading="satelliteLoading"
      :hillshade-loading="hillshadeLoading"
      :contour-loading="contourLoading"
      :river-loading="riverLoading"
      :detected-river-names="detectedRiverNames"
      :peak-loading="peakLoading"
      :place-boundary-loading="placeBoundaryLoading"
      :forest-loading="forestLoading"
      :vineyard-loading="vineyardLoading"
      :meadow-loading="meadowLoading"
      :water-loading="waterLoading"
      :land-cover-loading="landCoverLoading"
      :road-loading="roadLoading"
      :weather-loading="weatherLoading"
      :weather-hours-count="weatherHours?.length ?? 0"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @update:animation-config="$emit('update:animationConfig', $event)"
      @update:chart-title="$emit('update:chartTitle', $event)"
      @back="$emit('back')"
      @save="$emit('save')"
      @toggle-playback="togglePlayback"
      @reset-animation="resetAnimation"
      @set-speed="setSpeed"
      @slider-change="onSliderChange"
      @open-export-settings="openExportSettings"
      @undo="$emit('undo')"
      @redo="$emit('redo')"
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
  showMarkerPulse: boolean;
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
  showSpeedColoring: boolean;
  speedColorIntensity: number;
  // Geo context layers
  showBorders: boolean;
  showRivers: boolean;
  showCities: boolean;
  borderOpacity: number;
  riverOpacity: number;
  riverLabelOffsets?: Record<string, number>;
  cityOpacity: number;
  showPeaks: boolean;
  peakOpacity: number;
  showPlaceBoundaries: boolean;
  placeBoundaryOpacity: number;
  showForests: boolean;
  forestOpacity: number;
  forestColor?: string;
  showWater: boolean;
  waterOpacity: number;
  waterColor?: string;
  showGlaciers: boolean;
  glacierOpacity: number;
  glacierColor?: string;
  showUrban: boolean;
  urbanOpacity: number;
  urbanColor?: string;
  showVineyards: boolean;
  vineyardOpacity: number;
  vineyardColor?: string;
  showMeadows: boolean;
  meadowOpacity: number;
  meadowColor?: string;
  // Privacy
  anonymizeStart: boolean;
  anonymizeEnd: boolean;
  anonymizeRadiusM: number;
  // Satellite imagery
  showSatellite: boolean;
  satelliteOpacity: number;
  // Hillshade
  showHillshade: boolean;
  hillshadeOpacity: number;
  hillshadeStrength: number;
  // Contour lines
  showContours: boolean;
  contourColor: string;
  contourOpacity: number;
  contourInterval: number;
  contourMajorInterval: number;
  contourShowLabels: boolean;
  // Stats overlay
  showStatsOverlay: boolean;
  statsOverlayColor: string;
  statsX: number;   // 0-1 normalized horizontal position
  statsY: number;   // 0-1 normalized vertical position within map area
  // Annotations — text chips shown at specific progress points
  annotations?: import('../../utils/chartGenerators/elevationChart/types').Annotation[];
  // Roads
  showRoads: boolean;
  roadOpacity: number;
  // Map visual enhancements
  showNorthArrow: boolean;
  showScaleBar: boolean;
  showMapFade: boolean;
  // Intro / Outro duration + stats card
  introDurationSec: number;
  outroDurationSec: number;
  showOutroStats: boolean;  // show stats card on outro (or intro when swapped)
  swapIntroOutro: boolean;  // swap: stats first, title last
  // Weather overlay
  showWeatherOverlay: boolean;
  weatherTemp: string;        // e.g. "18°C"
  weatherCondition: string;   // e.g. "☀️ Sonnig"
  weatherOverlayColor: string;
  weatherX: number;           // 0-1 normalized horizontal position
  weatherY: number;           // 0-1 normalized vertical position
  // Route halo/outline
  routeHalo: boolean;
  routeHaloOpacity: number;
  // Per-km label drag offsets (dx/dy in SVG coords from route anchor)
  kmLabelOffsets?: Record<number, { dx: number; dy: number }>;
  // Per-annotation chip positions (absolute SVG x/y for chip center)
  annotationPositions?: Record<string, { x: number; y: number }>;
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
  showMarkerPulse: false,
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
  showSpeedColoring: false,
  speedColorIntensity: 5,
  // Geo context layers
  showBorders: false,
  showRivers: false,
  showCities: false,
  borderOpacity: 0.35,
  riverOpacity: 0.40,
  cityOpacity: 0.50,
  showPeaks: false,
  peakOpacity: 0.70,
  showPlaceBoundaries: false,
  placeBoundaryOpacity: 0.50,
  showForests: false,
  forestOpacity: 0.60,
  showWater: false,
  waterOpacity: 0.70,
  showGlaciers: false,
  glacierOpacity: 0.65,
  showUrban: false,
  urbanOpacity: 0.45,
  showVineyards: false,
  vineyardOpacity: 0.55,
  showMeadows: false,
  meadowOpacity: 0.50,
  // Privacy
  anonymizeStart: false,
  anonymizeEnd: false,
  anonymizeRadiusM: 300,
  // Satellite imagery
  showSatellite: false,
  satelliteOpacity: 0.85,
  // Hillshade
  showHillshade: false,
  hillshadeOpacity: 0.35,
  hillshadeStrength: 0.03,
  // Contour lines
  showContours: false,
  contourColor: '#8B7355',
  contourOpacity: 0.25,
  contourInterval: 100,
  contourMajorInterval: 500,
  contourShowLabels: false,
  // Stats overlay
  showStatsOverlay: false,
  statsOverlayColor: '#ffffff',
  statsX: 1.0,
  statsY: 1.0,
  annotations: [],
  // Roads
  showRoads: false,
  roadOpacity: 0.30,
  // Map visual enhancements
  showNorthArrow: true,
  showScaleBar: true,
  showMapFade: true,
  // Intro / Outro duration + stats card
  introDurationSec: 1,
  outroDurationSec: 1.5,
  showOutroStats: false,
  swapIntroOutro: false,
  // Weather overlay
  showWeatherOverlay: false,
  weatherTemp: '',
  weatherCondition: '',
  weatherOverlayColor: '#ffffff',
  weatherX: 0.0,
  weatherY: 0.5,
  // Route halo/outline
  routeHalo: false,
  routeHaloOpacity: 0.25,
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
import { generateCombinedFrame, getLastKmAnchorPositions, getLastAnnotationChipPositions } from '../../utils/chartGenerators/routeMap/combinedFrame'
import type { CombinedFrameOptions } from '../../utils/chartGenerators/routeMap/combinedFrame'
import { getTitleCardOpacity } from '../../utils/titleCardGenerator'
import { useWeatherLayer, getWeatherAtOffset } from '../../composables/useWeatherLayer'
import ExportSettingsDialog from './ExportSettingsDialog.vue'
import type { ExportSettings } from './ExportSettingsDialog.vue'
import VideoExportProgressDialog from './VideoExportProgressDialog.vue'
import RouteMapControlsSidebar from './RouteMapControlsSidebar.vue'
import { useContourLines } from '../../composables/useContourLines'
import { useRiverTiles } from '../../composables/useRiverTiles'
import { calculateRouteBounds, getProjectionParams } from '../../utils/chartGenerators/routeMap/projection'
import type { ContourConfig } from '../../utils/chartGenerators/routeMap/contourLines'
import type { RiverConfig } from '../../utils/chartGenerators/routeMap/riverTiles'
import { getLastRiverLabelCandidates } from '../../utils/chartGenerators/routeMap/riverTiles'
import { usePeakLayer } from '../../composables/usePeakLayer'
import { usePlaceBoundaries } from '../../composables/usePlaceBoundaries'
import type { PlaceBoundaryConfig } from '../../utils/chartGenerators/routeMap/placeBoundaries'
import { useForestLayer } from '../../composables/useForestLayer'
import type { ForestConfig } from '../../utils/chartGenerators/routeMap/forestLayer'
import { useWaterLayer } from '../../composables/useWaterLayer'
import type { WaterConfig } from '../../utils/chartGenerators/routeMap/waterLayer'
import { useLandCoverLayer } from '../../composables/useLandCoverLayer'
import type { LandCoverConfig } from '../../utils/chartGenerators/routeMap/landCoverLayer'
import type { PeakConfig } from '../../utils/chartGenerators/routeMap/peakLayer'
import { useRoadLayer } from '../../composables/useRoadLayer'
import type { RoadConfig } from '../../utils/chartGenerators/routeMap/roadLayer'
import { useVineyardLayer } from '../../composables/useVineyardLayer'
import type { VineyardConfig } from '../../utils/chartGenerators/routeMap/vineyardLayer'
import { useMeadowLayer } from '../../composables/useMeadowLayer'
import type { MeadowConfig } from '../../utils/chartGenerators/routeMap/meadowLayer'
import { useHillshadeLayer } from '../../composables/useHillshadeLayer'
import type { HillshadeConfig } from '../../utils/chartGenerators/routeMap/hillshadeLayer'
import { useSatelliteLayer } from '../../composables/useSatelliteLayer'
import type { SatelliteConfig } from '../../utils/chartGenerators/routeMap/satelliteLayer'

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
  gpxStartTime: {
    type: Number as PropType<number | null>,
    default: null,
  },
  canUndo: {
    type: Boolean,
    default: false,
  },
  canRedo: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  back: []
  save: []
  'update:chartTitle': [value: string]
  'update:animationConfig': [value: RouteMapAnimationConfig]
  'undo': []
  'redo': []
}>()

// ── Stats overlay drag ──
const STATS_BOX_WIDTH_SVG = 270
const STATS_ROW_HEIGHT = 48
const STATS_PADDING_Y = 32

const previewRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const statsBoxHeightSvg = computed(() => {
  const rows = 3 + (props.timeArray && props.timeArray.length > 0 ? 1 : 0)
  return rows * STATS_ROW_HEIGHT + STATS_PADDING_Y
})

const effectiveMapHeightSvg = computed(() =>
  props.animationConfig.showElevationChart
    ? 1920 * (props.animationConfig.mapHeightRatio ?? 0.6)
    : 1920
)

const dragHandleStyle = computed(() => {
  if (!previewRef.value) return {}
  const rect = previewRef.value.getBoundingClientRect()
  const scale = rect.width / 1080
  const maxX = (1080 - STATS_BOX_WIDTH_SVG) * scale
  const maxY = (effectiveMapHeightSvg.value - statsBoxHeightSvg.value) * scale
  const boxX = (props.animationConfig.statsX ?? 1.0) * maxX
  const boxY = (props.animationConfig.statsY ?? 1.0) * maxY
  return {
    left: `${boxX}px`,
    top: `${boxY}px`,
    width: `${STATS_BOX_WIDTH_SVG * scale}px`,
    height: `${statsBoxHeightSvg.value * scale}px`,
    cursor: isDragging.value ? 'grabbing' : 'grab',
  }
})

function onStatsDragStart(e: MouseEvent) {
  if (!previewRef.value) return
  isDragging.value = true
  const rect = previewRef.value.getBoundingClientRect()
  const scale = rect.width / 1080
  const maxX = (1080 - STATS_BOX_WIDTH_SVG) * scale
  const maxY = (effectiveMapHeightSvg.value - statsBoxHeightSvg.value) * scale
  const currentLeftPx = (props.animationConfig.statsX ?? 1.0) * maxX
  const currentTopPx = (props.animationConfig.statsY ?? 1.0) * maxY
  dragOffset.value = {
    x: e.clientX - rect.left - currentLeftPx,
    y: e.clientY - rect.top - currentTopPx,
  }
  document.addEventListener('mousemove', onStatsDragMove)
  document.addEventListener('mouseup', onStatsDragEnd)
}

function onStatsDragMove(e: MouseEvent) {
  if (!isDragging.value || !previewRef.value) return
  const rect = previewRef.value.getBoundingClientRect()
  const scale = rect.width / 1080
  const maxX = (1080 - STATS_BOX_WIDTH_SVG) * scale
  const maxY = (effectiveMapHeightSvg.value - statsBoxHeightSvg.value) * scale
  const newLeftPx = e.clientX - rect.left - dragOffset.value.x
  const newTopPx = e.clientY - rect.top - dragOffset.value.y
  const newStatsX = Math.max(0, Math.min(1, newLeftPx / maxX))
  const newStatsY = Math.max(0, Math.min(1, newTopPx / maxY))
  emit('update:animationConfig', { ...props.animationConfig, statsX: newStatsX, statsY: newStatsY })
}

function onStatsDragEnd() {
  isDragging.value = false
  document.removeEventListener('mousemove', onStatsDragMove)
  document.removeEventListener('mouseup', onStatsDragEnd)
}

// ── Weather chip drag ──
// Chip SVG dimensions — height is fixed; width is a generous estimate
// (actual chip auto-fits text, but drag handle uses a fixed approximation)
const WEATHER_CHIP_W_SVG = Math.round(1080 * 0.38)   // ~410 — fits most weather strings
const WEATHER_CHIP_H_SVG = Math.round(1080 * 0.044 + 1080 * 0.02 * 2)  // ~91

const weatherDragHandleStyle = computed(() => {
  if (!previewRef.value) return {}
  const rect  = previewRef.value.getBoundingClientRect()
  const scale = rect.width / 1080
  const maxX  = (1080 - WEATHER_CHIP_W_SVG) * scale
  const maxY  = (1920 - WEATHER_CHIP_H_SVG) * scale
  const boxX  = (props.animationConfig.weatherX ?? 0.0) * maxX
  const boxY  = (props.animationConfig.weatherY ?? 0.5) * maxY
  return {
    left:   `${boxX}px`,
    top:    `${boxY}px`,
    width:  `${WEATHER_CHIP_W_SVG * scale}px`,
    height: `${WEATHER_CHIP_H_SVG * scale}px`,
    cursor: isDragging.value ? 'grabbing' : 'grab',
  }
})

function onWeatherDragStart(e: MouseEvent) {
  if (!previewRef.value) return
  isDragging.value = true
  const rect  = previewRef.value.getBoundingClientRect()
  const scale = rect.width / 1080
  const maxX  = (1080 - WEATHER_CHIP_W_SVG) * scale
  const maxY  = (1920 - WEATHER_CHIP_H_SVG) * scale
  const curX  = (props.animationConfig.weatherX ?? 0.0) * maxX
  const curY  = (props.animationConfig.weatherY ?? 0.5) * maxY
  dragOffset.value = { x: e.clientX - rect.left - curX, y: e.clientY - rect.top - curY }
  document.addEventListener('mousemove', onWeatherDragMove)
  document.addEventListener('mouseup', onWeatherDragEnd)
}

function onWeatherDragMove(e: MouseEvent) {
  if (!isDragging.value || !previewRef.value) return
  const rect  = previewRef.value.getBoundingClientRect()
  const scale = rect.width / 1080
  const maxX  = (1080 - WEATHER_CHIP_W_SVG) * scale
  const maxY  = (1920 - WEATHER_CHIP_H_SVG) * scale
  const newX  = Math.max(0, Math.min(1, (e.clientX - rect.left - dragOffset.value.x) / maxX))
  const newY  = Math.max(0, Math.min(1, (e.clientY - rect.top  - dragOffset.value.y) / maxY))
  emit('update:animationConfig', { ...props.animationConfig, weatherX: newX, weatherY: newY })
}

function onWeatherDragEnd() {
  isDragging.value = false
  document.removeEventListener('mousemove', onWeatherDragMove)
  document.removeEventListener('mouseup', onWeatherDragEnd)
}

// ── Km label drag ──
function onPreviewMousedown(e: MouseEvent) {
  const target = e.target as SVGElement | null
  if (!previewRef.value) return

  const rect = previewRef.value.getBoundingClientRect()
  const scale = rect.width / 1080

  // --- Km label ---
  const kmStr = target?.getAttribute?.('data-km-value')
  if (kmStr) {
    const km = Number(kmStr)
    const anchor = getLastKmAnchorPositions()[km]
    if (!anchor) return

    let hasMoved = false
    const startClientX = e.clientX
    const startClientY = e.clientY

    const onMove = (ev: MouseEvent) => {
      if (!hasMoved && Math.abs(ev.clientX - startClientX) < 3 && Math.abs(ev.clientY - startClientY) < 3) return
      hasMoved = true
      const dx = (ev.clientX - rect.left) / scale - anchor.x
      const dy = (ev.clientY - rect.top) / scale - anchor.y
      emit('update:animationConfig', {
        ...props.animationConfig,
        kmLabelOffsets: { ...props.animationConfig.kmLabelOffsets, [km]: { dx, dy } },
      })
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    e.preventDefault()
    return
  }

  // --- Annotation chip ---
  const annotationId = target?.getAttribute?.('data-annotation-id')
  if (annotationId) {
    const chipPos = getLastAnnotationChipPositions()[annotationId]
    if (!chipPos) return

    const startClientX = e.clientX
    const startClientY = e.clientY
    const startChipX = chipPos.x
    const startChipY = chipPos.y
    let hasMoved = false

    const onMove = (ev: MouseEvent) => {
      if (!hasMoved && Math.abs(ev.clientX - startClientX) < 3 && Math.abs(ev.clientY - startClientY) < 3) return
      hasMoved = true
      const newX = startChipX + (ev.clientX - startClientX) / scale
      const newY = startChipY + (ev.clientY - startClientY) / scale
      emit('update:animationConfig', {
        ...props.animationConfig,
        annotationPositions: { ...props.animationConfig.annotationPositions, [annotationId]: { x: newX, y: newY } },
      })
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    e.preventDefault()
  }
}

// ── River label click cycling ──
function onPreviewClick(e: MouseEvent) {
  const target = e.target as SVGElement | null
  const name = target?.getAttribute?.('data-river-name')
  if (!name) return

  const candidates = getLastRiverLabelCandidates()[name]
  if (!candidates || candidates.length < 2) return

  const offsets = props.animationConfig.riverLabelOffsets ?? {}
  const currentT = offsets[name] ?? candidates[0]
  const currentIdx = candidates.findIndex(t => Math.abs(t - currentT) < 0.01)
  const nextIdx = ((currentIdx < 0 ? 0 : currentIdx) + 1) % candidates.length
  emit('update:animationConfig', {
    ...props.animationConfig,
    riverLabelOffsets: { ...offsets, [name]: candidates[nextIdx] },
  })
}

// ── Contour lines (async terrain tile fetch + d3-contour) ──
const contourRouteBounds = computed(() => {
  if (props.routePoints.length < 2) return null
  return calculateRouteBounds(props.routePoints)
})
const contourMapHeight = computed(() =>
  props.animationConfig.showElevationChart
    ? Math.round(1920 * props.animationConfig.mapHeightRatio)
    : 1920
)
const contourProjParams = computed(() => {
  if (!contourRouteBounds.value) return null
  return getProjectionParams(contourRouteBounds.value, {
    width: 1080, height: contourMapHeight.value,
    padding: { top: 50, right: 50, bottom: 50, left: 50 },
  })
})

// ── Satellite layer (async tile fetch + OffscreenCanvas) ──
const satelliteConfig = computed<SatelliteConfig | null>(() => {
  const cfg = props.animationConfig
  if (!cfg.showSatellite) return null
  return { opacity: cfg.satelliteOpacity }
})
const { satelliteSvg, isLoading: satelliteLoading } = useSatelliteLayer(
  contourRouteBounds,
  contourProjParams,
  satelliteConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── Hillshade layer (async terrain tile fetch + OffscreenCanvas) ──
const hillshadeConfig = computed<HillshadeConfig | null>(() => {
  const cfg = props.animationConfig
  if (!cfg.showHillshade) return null
  return {
    opacity: cfg.hillshadeOpacity,
    strength: cfg.hillshadeStrength,
  }
})
const { hillshadeSvg, isLoading: hillshadeLoading } = useHillshadeLayer(
  contourRouteBounds,
  contourProjParams,
  hillshadeConfig,
  computed(() => 1080),
  contourMapHeight,
)
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
    riverLabelOffsets: cfg.riverLabelOffsets,
  }
})
const { riverSvg, detectedNames: detectedRiverNames, isLoading: riverLoading } = useRiverTiles(
  contourRouteBounds,
  contourProjParams,
  riverConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── Peak layer (async fetch from Overpass API) ──
// Returns null when disabled so useGeoLayer clears layerSvg immediately.
// Re-enabling hits the module-level peakSvgCache so the fetch is instant.
const peakConfig = computed<PeakConfig | null>(() => {
  if (!props.animationConfig.showPeaks) return null
  return {
    color: '#ffffff',
    opacity: props.animationConfig.peakOpacity,
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

// ── Place boundary polygons (async fetch from Overpass API) ──
const placeBoundaryConfig = computed<PlaceBoundaryConfig>(() => ({
  color: '#ffffff',
  opacity: props.animationConfig.placeBoundaryOpacity,
}))
const { placeBoundarySvg, isLoading: placeBoundaryLoading } = usePlaceBoundaries(
  contourRouteBounds,
  contourProjParams,
  placeBoundaryConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── Forest layer (async fetch from Overpass API) ──
// Always compute (never null) so the SVG is preloaded; visibility gated in buildFrameOptions.
const forestConfig = computed<ForestConfig>(() => ({
  color: props.animationConfig.forestColor ?? '#4a8c3f',
  opacity: props.animationConfig.forestOpacity,
}))
const { forestSvg, isLoading: forestLoading } = useForestLayer(
  contourRouteBounds,
  contourProjParams,
  forestConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── Water bodies (async fetch from Overpass API) ──
const waterConfig = computed<WaterConfig>(() => ({
  color: props.animationConfig.waterColor ?? '#4a90d9',
  opacity: props.animationConfig.waterOpacity,
}))
const { waterSvg, isLoading: waterLoading } = useWaterLayer(
  contourRouteBounds,
  contourProjParams,
  waterConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── Land cover layer: glaciers + urban areas (async, Overpass API) ──
const landCoverConfig = computed<LandCoverConfig>(() => ({
  showGlaciers: props.animationConfig.showGlaciers,
  glacierOpacity: props.animationConfig.glacierOpacity,
  glacierColor: props.animationConfig.glacierColor,
  showUrban: props.animationConfig.showUrban,
  urbanOpacity: props.animationConfig.urbanOpacity,
  urbanColor: props.animationConfig.urbanColor,
}))
const { landCoverSvg, isLoading: landCoverLoading } = useLandCoverLayer(
  contourRouteBounds,
  contourProjParams,
  landCoverConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── Vineyard & orchard layer (async fetch from Overpass API) ──
const vineyardConfig = computed<VineyardConfig>(() => ({
  color: props.animationConfig.vineyardColor ?? '#c8a04a',
  opacity: props.animationConfig.vineyardOpacity,
}))
const { vineyardSvg, isLoading: vineyardLoading } = useVineyardLayer(
  contourRouteBounds,
  contourProjParams,
  vineyardConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── Meadow & farmland layer (async fetch from Overpass API) ──
const meadowConfig = computed<MeadowConfig>(() => ({
  color: props.animationConfig.meadowColor ?? '#b5c97a',
  opacity: props.animationConfig.meadowOpacity,
}))
const { meadowSvg, isLoading: meadowLoading } = useMeadowLayer(
  contourRouteBounds,
  contourProjParams,
  meadowConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── Road layer (async fetch from Overpass API) ──
const roadConfig = computed<RoadConfig>(() => ({
  color: '#ffffff',
  opacity: props.animationConfig.roadOpacity,
}))
const { roadSvg, isLoading: roadLoading } = useRoadLayer(
  contourRouteBounds,
  contourProjParams,
  roadConfig,
  computed(() => 1080),
  contourMapHeight,
)

// Animation phases: Intro (optional) → Chart animation → Outro (full image)
const hasTitleCard = computed(() => !!props.chartTitle.trim())
const showOutroStats = computed(() => props.animationConfig.showOutroStats ?? false)
const swapIntroOutro = computed(() => props.animationConfig.swapIntroOutro ?? false)

// What content appears in each phase (depends on swap toggle)
// Normal: intro = title card, outro = stats card
// Swapped: intro = stats card, outro = title card
const hasIntroContent = computed(() =>
  swapIntroOutro.value ? showOutroStats.value : hasTitleCard.value
)
const hasOutroContent = computed(() =>
  swapIntroOutro.value ? hasTitleCard.value : showOutroStats.value
)

// Total route stats (computed once for outro stats card)
const totalRouteStats = computed(() => {
  if (props.routePoints.length < 2 || props.chartData.length < 2) {
    return { distance: 0, elevGain: 0, elevLoss: 0, totalTimeMs: null as number | null }
  }
  const totalDistance = props.routePoints[props.routePoints.length - 1].distance
  let elevGain = 0, elevLoss = 0
  for (let i = 1; i < props.chartData.length; i++) {
    const diff = props.chartData[i].value - props.chartData[i - 1].value
    if (diff > 0) elevGain += diff
    else elevLoss += diff
  }
  const lastTime = props.routePoints[props.routePoints.length - 1].time
  return { distance: totalDistance, elevGain, elevLoss, totalTimeMs: lastTime ?? null }
})

const chartDurationMs = computed(() => props.animationConfig.duration * 1000)
const introDurationMs = computed(() =>
  hasIntroContent.value ? (props.animationConfig.introDurationSec ?? 1) * 1000 : 0
)
const outroDurationMs = computed(() => (props.animationConfig.outroDurationSec ?? 1.5) * 1000)
const totalDurationMs = computed(() =>
  chartDurationMs.value + introDurationMs.value + outroDurationMs.value
)
// introEnd: fraction at which intro phase ends (0 if no intro content)
const titleEnd = computed(() =>
  hasIntroContent.value ? introDurationMs.value / totalDurationMs.value : 0
)
// animEnd: fraction at which the animation phase ends (outro starts here)
const animEnd = computed(() =>
  (introDurationMs.value + chartDurationMs.value) / totalDurationMs.value
)

// Build the outroOverlay options (for stats card)
function buildOutroOverlayOptions(opacity: number): CombinedFrameOptions['outroOverlay'] {
  if (!showOutroStats.value) return undefined
  return {
    title: props.chartTitle || undefined,
    totalDistance: totalRouteStats.value.distance,
    totalElevGain: totalRouteStats.value.elevGain,
    totalElevLoss: totalRouteStats.value.elevLoss,
    totalTimeMs: totalRouteStats.value.totalTimeMs,
    opacity,
    color: props.animationConfig.titleColor || '#ffffff',
  }
}

// ── Weather auto-detection ──
const weatherStartLat  = computed(() => props.routePoints[0]?.lat  ?? null)
const weatherStartLon  = computed(() => props.routePoints[0]?.lon  ?? null)
const weatherStartTime = computed(() => props.gpxStartTime ?? null)
const weatherDurationMs = computed(() => totalRouteStats.value.totalTimeMs ?? 0)

const { weatherHours, isLoading: weatherLoading } = useWeatherLayer(
  weatherStartLat,
  weatherStartLon,
  weatherStartTime,
  weatherDurationMs,
)

// Returns the elapsed ms into the activity for a given chart animation progress (0-1).
// Uses actual GPS time data when available, falls back to linear interpolation.
function getElapsedMsAtProgress(progress: number): number {
  const points = props.routePoints
  if (points.length === 0) return 0
  const idx = Math.round(progress * (points.length - 1))
  const pt  = points[Math.min(idx, points.length - 1)]
  if (pt.time != null) return pt.time
  // Fallback: linear through total duration
  return progress * (totalRouteStats.value.totalTimeMs ?? 0)
}

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
      elevationColoring: cfg.showElevationColoring && !cfg.showSpeedColoring,
      elevationColorIntensity: cfg.elevationColorIntensity,
      speedColoring: cfg.showSpeedColoring,
      speedColorIntensity: cfg.speedColorIntensity,
      routeHalo: cfg.routeHalo,
      routeHaloOpacity: cfg.routeHaloOpacity,
    },
    showMapMarker: cfg.showMapMarker,
    mapMarkerSize: cfg.mapMarkerSize,
    mapMarkerColor: cfg.mapMarkerColor,
    showMarkerPulse: cfg.showMarkerPulse ?? false,
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
    effortConfig: cfg.effortConfig,
    // Pan-zoom for elevation section
    elevationPanZoomEnabled: cfg.panZoomEnabled,
    elevationPanZoomConfig: { zoomLevel: cfg.panZoomZoomLevel, zoomOutStart: cfg.panZoomZoomOutStart },
    // Elevation visibility
    showElevationChart: cfg.showElevationChart ?? true,
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
    // Pre-rendered geo layers — always precomputed, gated here by the show-flag
    satelliteLayerSvg:     satelliteSvg.value,
    hillshadeLayerSvg:     hillshadeSvg.value,
    contourLayerSvg:       contourSvg.value,
    riverLayerSvg:         riverSvg.value,
    peakLayerSvg:          cfg.showPeaks          ? peakSvg.value          : '',
    placeBoundaryLayerSvg: cfg.showPlaceBoundaries ? placeBoundarySvg.value : '',
    forestLayerSvg:        cfg.showForests         ? forestSvg.value        : '',
    vineyardLayerSvg:      cfg.showVineyards       ? vineyardSvg.value      : '',
    meadowLayerSvg:        cfg.showMeadows         ? meadowSvg.value        : '',
    waterLayerSvg:         cfg.showWater           ? waterSvg.value         : '',
    landCoverLayerSvg:     (cfg.showGlaciers || cfg.showUrban) ? landCoverSvg.value : '',
    roadLayerSvg:          cfg.showRoads           ? roadSvg.value          : '',
    // Privacy
    anonymizeStart: cfg.anonymizeStart,
    anonymizeEnd: cfg.anonymizeEnd,
    anonymizeRadiusM: cfg.anonymizeRadiusM,
    // Stats overlay
    showStatsOverlay: cfg.showStatsOverlay,
    statsOverlayColor: cfg.statsOverlayColor,
    statsX: cfg.statsX ?? 1.0,
    statsY: cfg.statsY ?? 1.0,
    annotations: cfg.annotations ?? [],
    // Map visual enhancements
    showNorthArrow: cfg.showNorthArrow ?? true,
    showScaleBar: cfg.showScaleBar ?? true,
    showMapFade: cfg.showMapFade ?? true,
    // Km label drag offsets
    kmLabelOffsets: cfg.kmLabelOffsets,
    // Annotation chip drag positions
    annotationPositions: cfg.annotationPositions,
    // Live preview always shows all enabled annotations regardless of progress,
    // so every chip is visible and draggable from the first frame.
    // Export renderFrame overrides this to false for the progressive reveal.
    showAllAnnotations: true,
    // Weather overlay chip — animated via hourly data, falls back to manual fields
    weatherOverlay: (() => {
      if (!cfg.showWeatherOverlay) return undefined
      if (weatherHours.value && weatherHours.value.length > 0) {
        const elapsedMs = getElapsedMsAtProgress(progress)
        const entry = getWeatherAtOffset(weatherHours.value, elapsedMs)
        return {
          temp:      `${entry.tempC}°C`,
          condition: entry.condition,
          color:     cfg.weatherOverlayColor || '#ffffff',
          opacity:   1,
          x:         cfg.weatherX ?? 0.0,
          y:         cfg.weatherY ?? 0.5,
        }
      }
      // Manual fallback
      if (cfg.weatherTemp || cfg.weatherCondition) {
        return {
          temp:      cfg.weatherTemp,
          condition: cfg.weatherCondition,
          color:     cfg.weatherOverlayColor || '#ffffff',
          opacity:   1,
          x:         cfg.weatherX ?? 0.0,
          y:         cfg.weatherY ?? 0.5,
        }
      }
      return undefined
    })(),
    // Overrides
    ...overrides,
  }
}

// Generate animation SVG
const animationSvg = computed(() => {
  if (props.chartData.length === 0 && props.routePoints.length === 0) return ''

  const progress = animationProgress.value

  const swap = swapIntroOutro.value
  const titleColor = props.animationConfig.titleColor || '#ffffff'

  // Phase 1: Intro card — title (normal) or stats (swapped)
  if (hasIntroContent.value && progress <= titleEnd.value) {
    const introProgress = titleEnd.value > 0 ? progress / titleEnd.value : 1
    const cardOpacity = getTitleCardOpacity(introProgress)
    if (swap) {
      // Stats card on clean background
      return generateCombinedFrame(buildFrameOptions(0, {
        sceneOpacity: 1,
        outroOverlay: buildOutroOverlayOptions(cardOpacity),
        showElevationMarker: false,
        showMapMarker: false,
        showElevationLabels: false,
        showDistanceLabels: false,
      }))
    } else {
      // Title card on clean background
      return generateCombinedFrame(buildFrameOptions(0, {
        sceneOpacity: 1,
        titleOverlay: { text: props.chartTitle, opacity: cardOpacity, color: titleColor },
        showElevationMarker: false,
        showMapMarker: false,
        showElevationLabels: false,
        showDistanceLabels: false,
      }))
    }
  }

  // Phase 2: Chart animation — route reveals from start to finish
  if (progress <= animEnd.value) {
    const chartProgress = animEnd.value > titleEnd.value
      ? (progress - titleEnd.value) / (animEnd.value - titleEnd.value)
      : progress

    // Fade-in at the start of the animation (first 10%)
    const fadeInT = Math.min(1, chartProgress / 0.10)
    const fadeIn = fadeInT * fadeInT

    return generateCombinedFrame(buildFrameOptions(chartProgress, {
      sceneOpacity: hasIntroContent.value ? fadeIn : undefined,
    }))
  }

  // Phase 3: Outro — full static image, fades in over first 30%
  const outroProgress = (progress - animEnd.value) / (1 - animEnd.value)
  const fadeIn = Math.min(1, outroProgress / 0.3)
  if (swap && hasTitleCard.value) {
    // Title card on completed route
    return generateCombinedFrame(buildFrameOptions(1, {
      showElevationMarker: false,
      showMapMarker: false,
      titleOverlay: { text: props.chartTitle, opacity: getTitleCardOpacity(outroProgress), color: titleColor },
    }))
  }
  // Stats card (or plain outro) on completed route
  return generateCombinedFrame(buildFrameOptions(1, {
    showElevationMarker: false,
    showMapMarker: false,
    sceneOpacity: fadeIn,
    outroOverlay: buildOutroOverlayOptions(fadeIn),
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
  const exportShowOutroStats = props.animationConfig.showOutroStats ?? false
  const exportSwap = props.animationConfig.swapIntroOutro ?? false
  const exportHasIntroContent = exportSwap ? exportShowOutroStats : hasTitle
  const exportTitleMs = exportHasIntroContent ? (props.animationConfig.introDurationSec ?? 1) * 1000 : 0
  const chartMs = props.animationConfig.duration * 1000
  const outroMs = (props.animationConfig.outroDurationSec ?? 1.5) * 1000
  const totalMs = exportTitleMs + chartMs + outroMs
  const exportTitleEnd = exportTitleMs / totalMs
  const exportAnimEnd = (exportTitleMs + chartMs) / totalMs
  const exportTitleColor = props.animationConfig.titleColor || '#ffffff'

  const exportStats = totalRouteStats.value
  function exportOutroOverlay(opacity: number): CombinedFrameOptions['outroOverlay'] {
    if (!exportShowOutroStats) return undefined
    return {
      title: props.chartTitle || undefined,
      totalDistance: exportStats.distance,
      totalElevGain: exportStats.elevGain,
      totalElevLoss: exportStats.elevLoss,
      totalTimeMs: exportStats.totalTimeMs,
      opacity,
      color: exportTitleColor,
    }
  }

  await videoExport.exportVideo({
    width,
    height,
    fps: settings.fps,
    quality: settings.quality,
    durationMs: totalMs,
    filename: `${props.chartTitle || 'route-map'}-reel.mp4`,
    renderFrame: (progress: number) => {
      // Phase 1: Intro card
      if (exportHasIntroContent && progress <= exportTitleEnd) {
        const introProgress = exportTitleEnd > 0 ? progress / exportTitleEnd : 1
        const cardOpacity = getTitleCardOpacity(introProgress)
        if (exportSwap) {
          return generateCombinedFrame(buildFrameOptions(0, {
            sceneOpacity: 1,
            outroOverlay: exportOutroOverlay(cardOpacity),
            showElevationMarker: false,
            showMapMarker: false,
            showElevationLabels: false,
            showDistanceLabels: false,
            showAllAnnotations: false,
          }))
        } else {
          return generateCombinedFrame(buildFrameOptions(0, {
            sceneOpacity: 1,
            titleOverlay: { text: props.chartTitle, opacity: cardOpacity, color: exportTitleColor },
            showElevationMarker: false,
            showMapMarker: false,
            showElevationLabels: false,
            showDistanceLabels: false,
            showAllAnnotations: false,
          }))
        }
      }

      // Phase 2: Chart animation — route reveals from start to finish
      if (progress <= exportAnimEnd) {
        const chartProgress = exportAnimEnd > exportTitleEnd
          ? (progress - exportTitleEnd) / (exportAnimEnd - exportTitleEnd)
          : progress

        const fadeInT = Math.min(1, chartProgress / 0.10)
        const fadeIn = fadeInT * fadeInT

        return generateCombinedFrame(buildFrameOptions(chartProgress, {
          sceneOpacity: exportHasIntroContent ? fadeIn : undefined,
          showAllAnnotations: false,
        }))
      }

      // Phase 3: Outro — full static image
      const outroProgress = (progress - exportAnimEnd) / (1 - exportAnimEnd)
      const fadeIn = Math.min(1, outroProgress / 0.3)
      if (exportSwap && hasTitle) {
        return generateCombinedFrame(buildFrameOptions(1, {
          showElevationMarker: false,
          showMapMarker: false,
          titleOverlay: { text: props.chartTitle, opacity: getTitleCardOpacity(outroProgress), color: exportTitleColor },
          showAllAnnotations: false,
        }))
      }
      return generateCombinedFrame(buildFrameOptions(1, {
        showElevationMarker: false,
        showMapMarker: false,
        sceneOpacity: fadeIn,
        outroOverlay: exportOutroOverlay(fadeIn),
        showAllAnnotations: false,
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

.stats-drag-handle {
  position: absolute;
  border: 2px dashed rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  pointer-events: auto;
  user-select: none;
  z-index: 10;
  transition: border-color 0.15s;
}
.stats-drag-handle:hover {
  border-color: rgba(255, 255, 255, 0.9);
}
</style>
