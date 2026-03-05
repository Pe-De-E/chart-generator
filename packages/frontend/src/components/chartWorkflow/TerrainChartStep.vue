<template>
  <div class="terrain-step">
    <!-- Preview Area -->
    <div class="terrain-main" :class="{ 'sidebar-collapsed': controlsCollapsed }">
      <div class="preview-area">
        <div class="reel-preview">
          <div class="silhouette-container">
            <!-- Three.js canvas (top portion) -->
            <div
              class="terrain-canvas-wrapper"
              :style="{ height: `${terrainRatio * 100}%` }"
            >
              <canvas ref="threeCanvas" class="terrain-canvas" />
              <div v-if="animationConfig.terrainRenderStyle === 'flat-map'" class="camera-info-overlay">
                <span class="camera-info-chip">{{ cameraInfo.compassDir }} · {{ cameraInfo.elevationDeg }}°</span>
              </div>
              <div v-if="isLoading" class="terrain-loading">
                <v-progress-circular indeterminate color="primary" size="48" />
                <div class="text-caption text-white mt-2">Geländedaten werden geladen…</div>
              </div>
            </div>

            <!-- Elevation chart SVG (bottom portion) -->
            <div
              v-if="animationConfig.showElevationChart && chartData.length > 0"
              class="elevation-section"
              :style="{ height: `${(1 - terrainRatio) * 100}%` }"
              v-html="elevationSvg"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Right Sidebar -->
    <TerrainControlsSidebar
      v-model:collapsed="controlsCollapsed"
      :animation-config="animationConfig"
      :chart-title="chartTitle"
      :chart-data="chartData"
      :is-playing="isPlaying"
      :playback-speed="playbackSpeed"
      :formatted-time="formattedTime"
      :animation-progress="animationProgress"
      :slider-progress="sliderProgress"
      :video-export-supported="videoExport.isSupported.value"
      :video-exporting="videoExport.isExporting.value"
      @update:animation-config="onConfigUpdate"
      @update:chart-title="$emit('update:chartTitle', $event)"
      @back="$emit('back')"
      @save="$emit('save')"
      @toggle-playback="togglePlayback"
      @reset-animation="resetAnimation"
      @reset-camera="onResetCamera"
      @set-speed="setSpeed"
      @slider-change="onSliderChange"
    />

    <!-- Video Export Dialogs (reuse existing) -->
    <ExportSettingsDialog
      v-model="showExportSettingsDialog"
      :animation-duration="animationConfig.duration"
      :chart-title="chartTitle"
      @start-export="startVideoExport"
    />
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
export type { TerrainAnimationConfig } from '../../utils/chartGenerators/terrain3d/types'
export { DEFAULT_TERRAIN_ANIMATION_CONFIG } from '../../utils/chartGenerators/terrain3d/types'
</script>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { PropType } from 'vue'
import type { RoutePoint } from '@chart-generator/shared'
import type { AnimationOptions } from '@chart-generator/shared'
import { DEFAULT_ANIMATION_OPTIONS } from '@chart-generator/shared'
import { useChartAnimation, type PlaybackSpeed } from '../../composables/useChartAnimation'
import { useVideoExport } from '../../composables/useVideoExport'
import { TerrainScene } from '../../utils/chartGenerators/terrain3d/terrainScene'
import { DEFAULT_TERRAIN_ANIMATION_CONFIG } from '../../utils/chartGenerators/terrain3d/types'
import type { TerrainAnimationConfig } from '../../utils/chartGenerators/terrain3d/types'
import { generateCombinedFrame } from '../../utils/chartGenerators/routeMap/combinedFrame'
import { TITLE_CARD_DURATION_MS, OUTRO_DURATION_MS } from '../../utils/titleCardGenerator'
import TerrainControlsSidebar from './TerrainControlsSidebar.vue'
import ExportSettingsDialog from './ExportSettingsDialog.vue'
import type { ExportSettings } from './ExportSettingsDialog.vue'
import VideoExportProgressDialog from './VideoExportProgressDialog.vue'

// ── Props & Emits ──────────────────────────────────────────────────────────────

const props = defineProps({
  chartTitle: { type: String, required: true },
  routePoints: { type: Array as PropType<RoutePoint[]>, default: () => [] },
  chartData: {
    type: Array as PropType<Array<{ label: string; value: number }>>,
    default: () => [],
  },
  animationConfig: {
    type: Object as PropType<TerrainAnimationConfig>,
    default: () => ({ ...DEFAULT_TERRAIN_ANIMATION_CONFIG }),
  },
  timeArray: { type: Array as PropType<number[]>, default: undefined },
})

const emit = defineEmits<{
  back: []
  save: []
  'update:chartTitle': [value: string]
  'update:animationConfig': [value: TerrainAnimationConfig]
}>()

// ── State ──────────────────────────────────────────────────────────────────────

const controlsCollapsed = ref(false)
const sliderProgress = ref(0)
const isLoading = ref(false)
const cameraInfo = ref({ elevationDeg: 65, azimuthDeg: 180, compassDir: 'S' })
const showExportDialog = ref(false)
const showExportSettingsDialog = ref(false)

const threeCanvas = ref<HTMLCanvasElement | null>(null)
let terrainScene: TerrainScene | null = null

const CANVAS_WIDTH = 1080
const terrainRatio = computed(() => props.animationConfig.terrainHeightRatio ?? 0.65)
const elevHeight = computed(() => Math.round(1920 * (1 - terrainRatio.value)))

// ── Animation ─────────────────────────────────────────────────────────────────

const hasTitleCard = computed(() => !!props.chartTitle.trim())
const chartDurationMs = computed(() => props.animationConfig.duration * 1000)
const introDurationMs = computed(() => hasTitleCard.value ? TITLE_CARD_DURATION_MS : 0)
const totalDurationMs = computed(() => chartDurationMs.value + introDurationMs.value + OUTRO_DURATION_MS)
const titleEnd = computed(() => hasTitleCard.value ? introDurationMs.value / totalDurationMs.value : 0)
const animEnd = computed(() => (introDurationMs.value + chartDurationMs.value) / totalDurationMs.value)

const animationSettings = computed<AnimationOptions>(() => ({
  ...DEFAULT_ANIMATION_OPTIONS,
  enabled: true,
  durationMs: totalDurationMs.value,
  fps: 30,
  easing: props.animationConfig.easing,
  showMarker: true,
  markerSize: props.animationConfig.markerSize,
  markerColor: props.animationConfig.markerColor,
  curveEndpoint: 100,
}))

const chartOptions = computed(() => ({
  data: props.chartData.map(d => ({ label: d.label, value: d.value })),
  colors: { primary: props.animationConfig.curveColor, background: props.animationConfig.backgroundColor },
  title: props.chartTitle,
  silhouetteMode: true,
  animation: animationSettings.value,
}))

const animation = useChartAnimation(chartOptions, animationSettings)
const {
  progress: animationProgress,
  isPlaying,
  playbackSpeed,
  formattedTime,
  toggle: togglePlayback,
  reset: resetAnimation,
} = animation

// ── Elevation SVG (bottom section) ────────────────────────────────────────────

/**
 * Generate the elevation chart as a standalone SVG for the bottom section.
 * We reuse generateCombinedFrame with mapHeightRatio=0 to get just the elevation part,
 * but that doesn't work cleanly. Instead we generate with the proper dimensions and
 * let the SVG viewBox handle positioning.
 */
const elevationSvg = computed(() => {
  if (props.chartData.length === 0) return ''

  const rawProgress = animationProgress.value
  let chartProgress = 0

  if (rawProgress > titleEnd.value && rawProgress <= animEnd.value) {
    chartProgress = (rawProgress - titleEnd.value) / (animEnd.value - titleEnd.value)
  } else if (rawProgress > animEnd.value) {
    chartProgress = 1
  }

  // Reuse combinedFrame just for the elevation section:
  // We generate a full 1080×elevHeight SVG but set mapHeightRatio to near-zero
  // so the map section is invisible and only the elevation chart shows.
  const elevW = CANVAS_WIDTH
  const elevH = elevHeight.value

  // Build a minimal frame with no map content, only elevation
  return generateCombinedFrame({
    routePoints: props.routePoints,
    chartData: props.chartData,
    progress: chartProgress,
    width: elevW,
    height: elevH,
    mapHeightRatio: 0.001,  // near-zero map, full frame is elevation
    backgroundColor: props.animationConfig.backgroundColor,
    backgroundType: 'solid',
    mapCameraMode: 'overview',
    mapCameraConfig: { zoomLevel: 1, zoomOutStart: 0.85, rotateWithRoute: false, lookaheadFraction: 0.35 },
    routeStyle: { color: props.animationConfig.routeColor, width: 2, opacity: 0, glow: false, glowColor: '#000', glowIntensity: 1 },
    showMapMarker: false,
    mapMarkerSize: 0,
    mapMarkerColor: '#ffffff',
    showDirection: false,
    curveColor: props.animationConfig.curveColor,
    showElevationMarker: true,
    elevationMarkerSize: props.animationConfig.markerSize,
    elevationMarkerColor: props.animationConfig.markerColor,
    showAreaFill: props.animationConfig.showAreaFill,
    showNorthArrow: false,
    showScaleBar: false,
    showMapFade: false,
  })
})

// ── Three.js scene management ─────────────────────────────────────────────────

async function initScene(): Promise<void> {
  console.log('[initScene] canvas:', !!threeCanvas.value, 'routePoints:', props.routePoints.length)
  if (!threeCanvas.value || props.routePoints.length < 2) return

  const canvasW = CANVAS_WIDTH
  const canvasH = Math.round(1920 * terrainRatio.value)
  console.log('[initScene] canvas size:', canvasW, 'x', canvasH)

  if (!terrainScene) {
    terrainScene = new TerrainScene(threeCanvas.value, canvasW, canvasH)
    console.log('[initScene] TerrainScene created')
  }

  isLoading.value = true
  try {
    await terrainScene.load(props.routePoints, props.animationConfig)
  } catch (err) {
    console.error('[initScene] TerrainScene load error:', err)
  } finally {
    isLoading.value = false
  }

  // Render on camera drag even when animation is paused; update camera info overlay
  terrainScene.setControlsChangeCallback(() => {
    cameraInfo.value = terrainScene!.getCameraInfo()
    if (!isPlaying.value) terrainScene!.render()
  })

  terrainScene.setProgress(0)
  terrainScene.render()
  console.log('[initScene] render() called')
}

// Render loop — runs while playing, or on demand when paused
let rafId: number | null = null

function startRenderLoop(): void {
  if (rafId !== null) return
  function loop() {
    if (terrainScene) {
      const rawProgress = animationProgress.value
      let chartProgress = 0
      if (rawProgress > titleEnd.value && rawProgress <= animEnd.value) {
        chartProgress = (rawProgress - titleEnd.value) / (animEnd.value - titleEnd.value)
      } else if (rawProgress > animEnd.value) {
        chartProgress = 1
      }
      terrainScene.updateControls()
      terrainScene.setProgress(chartProgress)
      terrainScene.render()
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

function stopRenderLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// ── Watchers ───────────────────────────────────────────────────────────────────

watch(() => props.routePoints, async (pts) => {
  if (pts.length >= 2) {
    await initScene()
    startRenderLoop()
  }
}, { immediate: false })

watch(isPlaying, (playing) => {
  if (playing) {
    startRenderLoop()
  } else {
    stopRenderLoop()
    // Still render the current frame when paused
    if (terrainScene) {
      terrainScene.setProgress(animationProgress.value)
      terrainScene.render()
    }
  }
})

watch(animationProgress, (progress) => {
  if (!isPlaying.value && terrainScene) {
    const rawProgress = progress
    let chartProgress = 0
    if (rawProgress > titleEnd.value && rawProgress <= animEnd.value) {
      chartProgress = (rawProgress - titleEnd.value) / (animEnd.value - titleEnd.value)
    } else if (rawProgress > animEnd.value) {
      chartProgress = 1
    }
    terrainScene.setProgress(chartProgress)
    terrainScene.render()
  }
})

watch(() => props.animationConfig, async (newCfg, oldCfg) => {
  if (!terrainScene) return
  // Reload if style-changing properties changed
  const needsReload = (
    newCfg.terrainRenderStyle !== oldCfg.terrainRenderStyle ||
    newCfg.terrainStyle !== oldCfg.terrainStyle ||
    newCfg.terrainExaggeration !== oldCfg.terrainExaggeration ||
    newCfg.terrainSegments !== oldCfg.terrainSegments ||
    newCfg.routeColor !== oldCfg.routeColor ||
    newCfg.routeWidth !== oldCfg.routeWidth ||
    newCfg.routeGlow !== oldCfg.routeGlow ||
    newCfg.routeGlowIntensity !== oldCfg.routeGlowIntensity ||
    newCfg.backgroundColor !== oldCfg.backgroundColor ||
    newCfg.showRivers !== oldCfg.showRivers ||
    newCfg.showPlaces !== oldCfg.showPlaces
  )
  if (needsReload) {
    await initScene()
  } else if (newCfg.cameraMode !== oldCfg.cameraMode) {
    // Switch camera mode without full reload
    terrainScene.setCameraMode(newCfg.cameraMode, newCfg)
    terrainScene.render()
  }
}, { deep: false })

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (props.routePoints.length >= 2) {
    await initScene()
    startRenderLoop()
  }
})

onUnmounted(() => {
  stopRenderLoop()
  terrainScene?.dispose()
  terrainScene = null
})

// ── Config update ──────────────────────────────────────────────────────────────

function onConfigUpdate(cfg: TerrainAnimationConfig) {
  emit('update:animationConfig', cfg)
}

function onResetCamera() {
  terrainScene?.resetCamera(props.animationConfig)
}

// ── Slider ─────────────────────────────────────────────────────────────────────

watch(animationProgress, (val) => {
  if (!isPlaying.value) return
  sliderProgress.value = val * 100
})

function onSliderChange(value: number) {
  animation.seekTo(value / 100)
}

function setSpeed(speed: PlaybackSpeed) {
  animation.setSpeed(speed)
}

// ── Video Export ───────────────────────────────────────────────────────────────

const videoExport = useVideoExport()

async function startVideoExport(_settings: ExportSettings) {
  showExportDialog.value = true
  // TODO Phase 3: canvas-based export
  videoExport.error.value = 'Video-Export für 3D-Terrain kommt in Phase 3.'
}

function closeExportDialog() {
  showExportDialog.value = false
}
</script>

<style scoped>
.terrain-step {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.terrain-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: margin-right 0.2s ease;
  margin-right: 300px;
}

.terrain-main.sidebar-collapsed {
  margin-right: 48px;
}

.preview-area {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 8px;
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

.terrain-canvas-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  flex-shrink: 0;
}

.terrain-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.elevation-section {
  width: 100%;
  overflow: hidden;
  flex-shrink: 0;
}

.elevation-section :deep(svg) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.camera-info-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  pointer-events: none;
  z-index: 10;
}

.camera-info-chip {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px;
  font-family: monospace;
  letter-spacing: 0.04em;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.terrain-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}
</style>
