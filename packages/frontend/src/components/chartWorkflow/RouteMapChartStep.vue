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
              v-if="routeMapStore.routeMapConfig.showStatsOverlay"
              class="stats-drag-handle"
              :style="dragHandleStyle"
              @mousedown.prevent="onStatsDragStart"
            />
            <div
              v-if="routeMapStore.routeMapConfig.showWeatherOverlay"
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
      :video-export-supported="videoExport.isSupported.value"
      :video-exporting="videoExport.isExporting.value"
      :image-exporting="imageExport.isExporting.value"
      @back="$emit('back')"
      @save="$emit('save')"
      @open-export-settings="openExportSettings"
      @export-frame="exportCurrentFrame"
    />

    <!-- Export Settings Dialog -->
    <ExportSettingsDialog
      v-model="showExportSettingsDialog"
      :animation-duration="routeMapStore.routeMapConfig.duration"
      :chart-title="routeMapStore.chartTitle"
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
// Re-export from canonical types file so existing imports keep working
export type { BackgroundType, RouteMapAnimationConfig } from '../../types/routeMapConfig'
export { DEFAULT_ROUTEMAP_ANIMATION_CONFIG } from '../../types/routeMapConfig'
</script>

<script setup lang="ts">
import { ref, computed, watch, watchEffect, onUnmounted } from 'vue'
import type { AnimationOptions } from '@chart-generator/shared'
import { DEFAULT_ANIMATION_OPTIONS } from '@chart-generator/shared'
import { useChartAnimation } from '../../composables/useChartAnimation'
import { useRouteMapStore } from '../../stores/useRouteMapStore'
import { useVideoExport } from '../../composables/useVideoExport'
import { useImageExport } from '../../composables/useImageExport'
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
import { useAnimationStore } from '../../stores/useAnimationStore'

const routeMapStore = useRouteMapStore()

// Video export dialogs
const showExportDialog = ref(false)
const showExportSettingsDialog = ref(false)

// Controls sidebar collapsed state
const controlsCollapsed = ref(false)

const emit = defineEmits<{
  back: []
  save: []
}>()

// ── Stats overlay drag ──
const STATS_BOX_WIDTH_SVG = 270
const STATS_ROW_HEIGHT = 48
const STATS_PADDING_Y = 32

const previewRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const statsBoxHeightSvg = computed(() => {
  const rows = 3 + (routeMapStore.timeArray && routeMapStore.timeArray.length > 0 ? 1 : 0)
  return rows * STATS_ROW_HEIGHT + STATS_PADDING_Y
})

const effectiveMapHeightSvg = computed(() => {
  const cfg = routeMapStore.routeMapConfig
  if (!(cfg.showMapSection ?? true)) return 0
  return (cfg.showElevationChart ?? true)
    ? 1920 * (cfg.mapHeightRatio ?? 0.6)
    : 1920
})

const dragHandleStyle = computed(() => {
  if (!previewRef.value) return {}
  const rect = previewRef.value.getBoundingClientRect()
  const scale = rect.width / 1080
  const maxX = (1080 - STATS_BOX_WIDTH_SVG) * scale
  const maxY = (effectiveMapHeightSvg.value - statsBoxHeightSvg.value) * scale
  const boxX = (routeMapStore.routeMapConfig.statsX ?? 1.0) * maxX
  const boxY = (routeMapStore.routeMapConfig.statsY ?? 1.0) * maxY
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
  const currentLeftPx = (routeMapStore.routeMapConfig.statsX ?? 1.0) * maxX
  const currentTopPx = (routeMapStore.routeMapConfig.statsY ?? 1.0) * maxY
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
  routeMapStore.updateConfig({ statsX: newStatsX, statsY: newStatsY })
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
  const boxX  = (routeMapStore.routeMapConfig.weatherX ?? 0.0) * maxX
  const boxY  = (routeMapStore.routeMapConfig.weatherY ?? 0.5) * maxY
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
  const curX  = (routeMapStore.routeMapConfig.weatherX ?? 0.0) * maxX
  const curY  = (routeMapStore.routeMapConfig.weatherY ?? 0.5) * maxY
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
  routeMapStore.updateConfig({ weatherX: newX, weatherY: newY })
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
      routeMapStore.updateConfig({ kmLabelOffsets: { ...routeMapStore.routeMapConfig.kmLabelOffsets, [km]: { dx, dy } } })
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
      routeMapStore.updateConfig({ annotationPositions: { ...routeMapStore.routeMapConfig.annotationPositions, [annotationId]: { x: newX, y: newY } } })
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

  const offsets = routeMapStore.routeMapConfig.riverLabelOffsets ?? {}
  const currentT = offsets[name] ?? candidates[0]
  const currentIdx = candidates.findIndex(t => Math.abs(t - currentT) < 0.01)
  const nextIdx = ((currentIdx < 0 ? 0 : currentIdx) + 1) % candidates.length
  routeMapStore.updateConfig({ riverLabelOffsets: { ...offsets, [name]: candidates[nextIdx] } })
}

// ── Contour lines (async terrain tile fetch + d3-contour) ──
const contourRouteBounds = computed(() => {
  if (routeMapStore.routePoints.length < 2) return null
  return calculateRouteBounds(routeMapStore.routePoints)
})
const contourMapHeight = computed(() => {
  const cfg = routeMapStore.routeMapConfig
  if (!(cfg.showMapSection ?? true)) return 0
  return (cfg.showElevationChart ?? true)
    ? Math.round(1920 * cfg.mapHeightRatio)
    : 1920
})
const contourProjParams = computed(() => {
  if (!contourRouteBounds.value) return null
  return getProjectionParams(contourRouteBounds.value, {
    width: 1080, height: contourMapHeight.value,
    padding: { top: 50, right: 50, bottom: 50, left: 50 },
  })
})

// ── Satellite layer (async tile fetch + OffscreenCanvas) ──
const satelliteConfig = computed<SatelliteConfig | null>(() => {
  const cfg = routeMapStore.routeMapConfig
  if (!cfg.showSatellite) return null
  return { opacity: cfg.satelliteOpacity }
})
const { satelliteSvg, isLoading: satelliteLoading, error: satelliteError } = useSatelliteLayer(
  contourRouteBounds,
  contourProjParams,
  satelliteConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── Hillshade layer (async terrain tile fetch + OffscreenCanvas) ──
const hillshadeConfig = computed<HillshadeConfig | null>(() => {
  const cfg = routeMapStore.routeMapConfig
  if (!cfg.showHillshade) return null
  return {
    opacity: cfg.hillshadeOpacity,
    strength: cfg.hillshadeStrength,
  }
})
const { hillshadeSvg, isLoading: hillshadeLoading, error: hillshadeError } = useHillshadeLayer(
  contourRouteBounds,
  contourProjParams,
  hillshadeConfig,
  computed(() => 1080),
  contourMapHeight,
)
const contourConfig = computed<ContourConfig | null>(() => {
  const cfg = routeMapStore.routeMapConfig
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
const { contourSvg, isLoading: contourLoading, error: contourError } = useContourLines(
  contourRouteBounds,
  contourProjParams,
  contourConfig,
  computed(() => 1080),
  contourMapHeight,
)

// ── River vector tiles (async fetch from OpenFreeMap) ──
const riverConfig = computed<RiverConfig | null>(() => {
  const cfg = routeMapStore.routeMapConfig
  if (!cfg.showRivers) return null
  return {
    color: '#4a90d9',
    opacity: cfg.riverOpacity,
    showLabels: true,
    riverLabelOffsets: cfg.riverLabelOffsets,
  }
})
const { riverSvg, detectedNames: detectedRiverNames, isLoading: riverLoading, error: riverError } = useRiverTiles(
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
  if (!routeMapStore.routeMapConfig.showPeaks) return null
  return {
    color: '#ffffff',
    opacity: routeMapStore.routeMapConfig.peakOpacity,
  }
})
const { peakSvg, isLoading: peakLoading, error: peakError } = usePeakLayer(
  contourRouteBounds,
  contourProjParams,
  peakConfig,
  computed(() => 1080),
  contourMapHeight,
  computed(() => routeMapStore.routePoints),
)

// ── Place boundary polygons (async fetch from Overpass API) ──
const placeBoundaryConfig = computed<PlaceBoundaryConfig>(() => ({
  color: '#ffffff', opacity: routeMapStore.routeMapConfig.placeBoundaryOpacity,
}))
const { placeBoundarySvg, isLoading: placeBoundaryLoading, error: placeBoundaryError } = usePlaceBoundaries(
  contourRouteBounds,
  contourProjParams,
  placeBoundaryConfig,
  computed(() => routeMapStore.routeMapConfig.showPlaceBoundaries),
  computed(() => 1080),
  contourMapHeight,
)

// ── Forest layer (async fetch from Overpass API) ──
const forestConfig = computed<ForestConfig>(() => {
  const cfg = routeMapStore.routeMapConfig
  return { color: cfg.forestColor ?? '#4a8c3f', opacity: cfg.forestOpacity }
})
const { forestSvg, isLoading: forestLoading, error: forestError } = useForestLayer(
  contourRouteBounds, contourProjParams, forestConfig,
  computed(() => routeMapStore.routeMapConfig.showForests),
  computed(() => 1080), contourMapHeight,
)

// ── Water bodies (async fetch from Overpass API) ──
const waterConfig = computed<WaterConfig>(() => {
  const cfg = routeMapStore.routeMapConfig
  return { color: cfg.waterColor ?? '#4a90d9', opacity: cfg.waterOpacity }
})
const { waterSvg, isLoading: waterLoading, error: waterError } = useWaterLayer(
  contourRouteBounds, contourProjParams, waterConfig,
  computed(() => routeMapStore.routeMapConfig.showWater),
  computed(() => 1080), contourMapHeight,
)

// ── Land cover layer: glaciers + urban areas (async, Overpass API) ──
const landCoverConfig = computed<LandCoverConfig>(() => {
  const cfg = routeMapStore.routeMapConfig
  return {
    showGlaciers: cfg.showGlaciers, glacierOpacity: cfg.glacierOpacity, glacierColor: cfg.glacierColor,
    showUrban: cfg.showUrban, urbanOpacity: cfg.urbanOpacity, urbanColor: cfg.urbanColor,
  }
})
const { landCoverSvg, isLoading: landCoverLoading, error: landCoverError } = useLandCoverLayer(
  contourRouteBounds, contourProjParams, landCoverConfig,
  computed(() => routeMapStore.routeMapConfig.showGlaciers || routeMapStore.routeMapConfig.showUrban),
  computed(() => 1080), contourMapHeight,
)

// ── Vineyard & orchard layer (async fetch from Overpass API) ──
const vineyardConfig = computed<VineyardConfig>(() => {
  const cfg = routeMapStore.routeMapConfig
  return { color: cfg.vineyardColor ?? '#c8a04a', opacity: cfg.vineyardOpacity }
})
const { vineyardSvg, isLoading: vineyardLoading, error: vineyardError } = useVineyardLayer(
  contourRouteBounds, contourProjParams, vineyardConfig,
  computed(() => routeMapStore.routeMapConfig.showVineyards),
  computed(() => 1080), contourMapHeight,
)

// ── Meadow & farmland layer (async fetch from Overpass API) ──
const meadowConfig = computed<MeadowConfig>(() => {
  const cfg = routeMapStore.routeMapConfig
  return { color: cfg.meadowColor ?? '#b5c97a', opacity: cfg.meadowOpacity }
})
const { meadowSvg, isLoading: meadowLoading, error: meadowError } = useMeadowLayer(
  contourRouteBounds, contourProjParams, meadowConfig,
  computed(() => routeMapStore.routeMapConfig.showMeadows),
  computed(() => 1080), contourMapHeight,
)

// ── Road layer (async fetch from Overpass API) ──
const roadConfig = computed<RoadConfig>(() => {
  const cfg = routeMapStore.routeMapConfig
  return { color: '#ffffff', opacity: cfg.roadOpacity }
})
const { roadSvg, isLoading: roadLoading, error: roadError } = useRoadLayer(
  contourRouteBounds, contourProjParams, roadConfig,
  computed(() => routeMapStore.routeMapConfig.showRoads),
  computed(() => 1080), contourMapHeight,
)

// Animation phases: Intro (optional) → Chart animation → Outro (full image)
const hasTitleCard = computed(() => !!routeMapStore.chartTitle.trim())
const showOutroStats = computed(() => routeMapStore.routeMapConfig.showOutroStats ?? false)
const swapIntroOutro = computed(() => routeMapStore.routeMapConfig.swapIntroOutro ?? false)

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
  if (routeMapStore.routePoints.length < 2 || routeMapStore.chartData.length < 2) {
    return { distance: 0, elevGain: 0, elevLoss: 0, totalTimeMs: null as number | null }
  }
  const totalDistance = routeMapStore.routePoints[routeMapStore.routePoints.length - 1].distance
  let elevGain = 0, elevLoss = 0
  for (let i = 1; i < routeMapStore.chartData.length; i++) {
    const diff = routeMapStore.chartData[i].value - routeMapStore.chartData[i - 1].value
    if (diff > 0) elevGain += diff
    else elevLoss += diff
  }
  const lastTime = routeMapStore.routePoints[routeMapStore.routePoints.length - 1].time
  return { distance: totalDistance, elevGain, elevLoss, totalTimeMs: lastTime ?? null }
})

const chartDurationMs = computed(() => routeMapStore.routeMapConfig.duration * 1000)
const introDurationMs = computed(() =>
  hasIntroContent.value ? (routeMapStore.routeMapConfig.introDurationSec ?? 1) * 1000 : 0
)
const outroDurationMs = computed(() => (routeMapStore.routeMapConfig.outroDurationSec ?? 1.5) * 1000)
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
    title: routeMapStore.chartTitle || undefined,
    totalDistance: totalRouteStats.value.distance,
    totalElevGain: totalRouteStats.value.elevGain,
    totalElevLoss: totalRouteStats.value.elevLoss,
    totalTimeMs: totalRouteStats.value.totalTimeMs,
    opacity,
    color: routeMapStore.routeMapConfig.titleColor || '#ffffff',
  }
}

// ── Weather auto-detection ──
const weatherStartLat  = computed(() => routeMapStore.routePoints[0]?.lat  ?? null)
const weatherStartLon  = computed(() => routeMapStore.routePoints[0]?.lon  ?? null)
const weatherStartTime = computed(() => routeMapStore.gpxStartTime ?? null)
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
  const points = routeMapStore.routePoints
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
  easing: routeMapStore.routeMapConfig.easing,
  showMarker: routeMapStore.routeMapConfig.showMarker,
  markerSize: routeMapStore.routeMapConfig.markerSize,
  markerColor: '#ffffff',
  curveEndpoint: routeMapStore.routeMapConfig.curveEndpoint,
}))

// Minimal chart options for useChartAnimation (it needs ChartOptions shape)
const chartOptions = computed(() => ({
  data: routeMapStore.chartData.map(d => ({ label: d.label, value: d.value })),
  colors: {
    primary: routeMapStore.routeMapConfig.curveColor,
    background: routeMapStore.routeMapConfig.backgroundColor,
  },
  title: routeMapStore.chartTitle,
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

// Animation store — registers controls and syncs state
const animationStore = useAnimationStore()
animationStore.registerControls({
  toggle: togglePlayback,
  seekTo: p => animation.seekTo(p),
  setSpeed: s => animation.setSpeed(s),
  reset: resetAnimation,
})
onUnmounted(() => animationStore.unregisterControls())

watch(animationProgress, (newVal) => {
  animationStore.progress = newVal
  if (isPlaying.value) animationStore.sliderProgress = newVal * 100
})
watch(isPlaying, (v) => { animationStore.isPlaying = v })
watch(playbackSpeed, (s) => { animationStore.playbackSpeed = s })
watch(formattedTime, (t) => { animationStore.formattedTime = t })

/**
 * Build CombinedFrameOptions from the current config + progress.
 */
function buildFrameOptions(progress: number, overrides: Partial<CombinedFrameOptions> = {}): CombinedFrameOptions {
  const cfg = routeMapStore.routeMapConfig
  return {
    routePoints: routeMapStore.routePoints,
    chartData: routeMapStore.chartData,
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
      elevationColoring: cfg.showElevationColoring && !cfg.showSpeedColoring && !cfg.showHrColoring,
      elevationColorIntensity: cfg.elevationColorIntensity,
      speedColoring: cfg.showSpeedColoring && !cfg.showHrColoring,
      speedColorIntensity: cfg.speedColorIntensity,
      hrColoring: cfg.showHrColoring,
      hrColorIntensity: cfg.hrColorIntensity,
      hfmax: cfg.hfmax,
      routeHalo: cfg.routeHalo,
      routeHaloOpacity: cfg.routeHaloOpacity,
    },
    showMapMarker: cfg.showMapMarker,
    mapMarkerSize: cfg.mapMarkerSize,
    mapMarkerColor: cfg.mapMarkerColor,
    showMarkerPulse: cfg.showMarkerPulse ?? false,
    markerIcon: cfg.markerIcon ?? 'dot',
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
    timeArray: routeMapStore.timeArray,
    gradientSensitivity: cfg.gradientSensitivity,
    effortConfig: cfg.effortConfig,
    // Pan-zoom for elevation section
    elevationPanZoomEnabled: cfg.panZoomEnabled,
    elevationPanZoomConfig: { zoomLevel: cfg.panZoomZoomLevel, zoomOutStart: cfg.panZoomZoomOutStart },
    // Elevation visibility
    showElevationChart: cfg.showElevationChart ?? true,
    showMapSection: cfg.showMapSection ?? true,
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
    statsShowDistance: cfg.statsShowDistance ?? true,
    statsShowElevGain: cfg.statsShowElevGain ?? true,
    statsShowCurrentElev: cfg.statsShowCurrentElev ?? true,
    statsShowTime: cfg.statsShowTime ?? true,
    statsShowSpeed: cfg.statsShowSpeed ?? false,
    statsShowHr: cfg.statsShowHr ?? false,
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
  if (routeMapStore.chartData.length === 0 && routeMapStore.routePoints.length === 0) return ''

  const progress = animationProgress.value

  const swap = swapIntroOutro.value
  const titleColor = routeMapStore.routeMapConfig.titleColor || '#ffffff'

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
        titleOverlay: { text: routeMapStore.chartTitle, opacity: cardOpacity, color: titleColor },
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
      titleOverlay: { text: routeMapStore.chartTitle, opacity: getTitleCardOpacity(outroProgress), color: titleColor },
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


// Video export
const videoExport = useVideoExport()

// Image (PNG) export
const imageExport = useImageExport()

async function exportCurrentFrame() {
  const title = routeMapStore.chartTitle.trim() || 'frame'
  await imageExport.exportFrame(animationSvg.value, 1080, 1920, title)
}

function openExportSettings() {
  showExportSettingsDialog.value = true
}

async function startVideoExport(settings: ExportSettings) {
  showExportDialog.value = true

  const [width, height] = settings.resolution.split('x').map(Number)

  const hasTitle = !!routeMapStore.chartTitle.trim()
  const exportShowOutroStats = routeMapStore.routeMapConfig.showOutroStats ?? false
  const exportSwap = routeMapStore.routeMapConfig.swapIntroOutro ?? false
  const exportHasIntroContent = exportSwap ? exportShowOutroStats : hasTitle
  const exportTitleMs = exportHasIntroContent ? (routeMapStore.routeMapConfig.introDurationSec ?? 1) * 1000 : 0
  const chartMs = routeMapStore.routeMapConfig.duration * 1000
  const outroMs = (routeMapStore.routeMapConfig.outroDurationSec ?? 1.5) * 1000
  const totalMs = exportTitleMs + chartMs + outroMs
  const exportTitleEnd = exportTitleMs / totalMs
  const exportAnimEnd = (exportTitleMs + chartMs) / totalMs
  const exportTitleColor = routeMapStore.routeMapConfig.titleColor || '#ffffff'

  const exportStats = totalRouteStats.value
  function exportOutroOverlay(opacity: number): CombinedFrameOptions['outroOverlay'] {
    if (!exportShowOutroStats) return undefined
    return {
      title: routeMapStore.chartTitle || undefined,
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
    filename: `${routeMapStore.chartTitle || 'route-map'}-reel.mp4`,
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
            titleOverlay: { text: routeMapStore.chartTitle, opacity: cardOpacity, color: exportTitleColor },
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
          titleOverlay: { text: routeMapStore.chartTitle, opacity: getTitleCardOpacity(outroProgress), color: exportTitleColor },
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

// Sync geo loading states + errors → store so sidebar reads from store directly
watchEffect(() => {
  routeMapStore.satelliteLoading = satelliteLoading.value
  routeMapStore.hillshadeLoading = hillshadeLoading.value
  routeMapStore.contourLoading = contourLoading.value
  routeMapStore.riverLoading = riverLoading.value
  routeMapStore.detectedRiverNames = detectedRiverNames.value
  routeMapStore.peakLoading = peakLoading.value
  routeMapStore.placeBoundaryLoading = placeBoundaryLoading.value
  routeMapStore.forestLoading = forestLoading.value
  routeMapStore.vineyardLoading = vineyardLoading.value
  routeMapStore.meadowLoading = meadowLoading.value
  routeMapStore.waterLoading = waterLoading.value
  routeMapStore.landCoverLoading = landCoverLoading.value
  routeMapStore.roadLoading = roadLoading.value
  routeMapStore.weatherLoading = weatherLoading.value
  routeMapStore.weatherHoursCount = weatherHours.value?.length ?? 0
  routeMapStore.geoLayerError = satelliteError.value ?? hillshadeError.value ?? contourError.value
    ?? riverError.value ?? peakError.value ?? placeBoundaryError.value ?? forestError.value
    ?? waterError.value ?? landCoverError.value ?? vineyardError.value ?? meadowError.value
    ?? roadError.value ?? null
})
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
