<template>
  <div class="elevation-step">
    <!-- Main Content Area with centered preview -->
    <div class="elevation-main" :class="{ 'sidebar-collapsed': controlsCollapsed }">
      <!-- Centered Reel Preview -->
      <div class="preview-area">
        <div class="reel-preview">
          <div class="silhouette-container">
            <div
              class="silhouette-chart"
              v-html="silhouetteSvg"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Sidebar for Controls -->
    <ElevationControlsSidebar
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
// Background type options
export type BackgroundType = 'solid' | 'gradient' | 'mesh' | 'grid' | 'dots' | 'image';

// Re-export annotation types for use in parent components and sidebar
export type { Annotation, AnnotationType } from '../../utils/chartGenerators/elevationChart/types';
import type { Annotation } from '../../utils/chartGenerators/elevationChart/types';

// Animation config interface for persistence - exported for use in parent components
export interface ElevationAnimationConfig {
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
  // Image background options
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
  // Animation mode
  animationMode: 'uniform' | 'time-based' | 'gradient' | 'effort';
  gradientSensitivity: number;
  // Effort mode config
  effortConfig: {
    variableStroke: boolean;        // Line thickness varies with gradient
    variableStrokeIntensity: number; // 1-8
    colorGradient: boolean;         // Line color darkens with effort
    colorGradientIntensity: number; // 1-8
    glowAura: boolean;              // Glow around line and marker
    glowAuraIntensity: number;      // 1-8
  };
  // Pan-Zoom (Kamerafahrt) mode
  panZoomEnabled: boolean;
  panZoomZoomLevel: number;         // 1.5-5, default 3
  panZoomZoomOutStart: number;      // 0.5-0.95, default 0.75
  // Annotations — text labels shown at specific progress points
  annotations?: Annotation[];
  // Legacy support
  useGradientBackground?: boolean;
}

export const DEFAULT_ELEVATION_ANIMATION_CONFIG: ElevationAnimationConfig = {
  duration: 5,
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
  backgroundColor: '#000000',
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
  annotations: [],
};
</script>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { PropType } from "vue";
import type { ChartColors } from "../../composables/useChartConfig";
import type {
  SeriesConfig,
  ChartStyleOverrides,
} from "../../utils/chartGenerators/types";
import type { ChartOptions, AnimationOptions } from "@chart-generator/shared";
import { DEFAULT_ANIMATION_OPTIONS } from "@chart-generator/shared";
import { useChartAnimation, type PlaybackSpeed } from "../../composables/useChartAnimation";
import { useVideoExport } from "../../composables/useVideoExport";
import { generateElevationFrame } from "../../utils/chartGenerators/elevationChart/elevationChart";
import { getTitleCardOpacity, TITLE_CARD_DURATION_MS, TRANSITION_DURATION_MS } from "../../utils/titleCardGenerator";
import { findHookPoint } from "../../utils/chartGenerators/elevationChart/hookDetection";
import ExportSettingsDialog from "./ExportSettingsDialog.vue";
import type { ExportSettings } from "./ExportSettingsDialog.vue";
import VideoExportProgressDialog from "./VideoExportProgressDialog.vue";
import ElevationControlsSidebar from "./ElevationControlsSidebar.vue";

// Layout mode (kept for compatibility, always silhouette now)
const layoutMode = ref<'silhouette' | 'free'>('silhouette');

// Slider progress state
const sliderProgress = ref(0);

// Video export dialogs
const showExportDialog = ref(false);
const showExportSettingsDialog = ref(false);

// Controls sidebar collapsed state
const controlsCollapsed = ref(false);

const props = defineProps({
  chartTitle: {
    type: String,
    required: true,
  },
  colors: {
    type: Object as PropType<ChartColors>,
    required: true,
  },
  svgContent: {
    type: String,
    required: true,
  },
  seriesConfig: {
    type: Array as PropType<SeriesConfig[]>,
    default: () => [],
  },
  silhouetteMode: {
    type: Boolean,
    default: false,
  },
  styleOverrides: {
    type: Object as PropType<ChartStyleOverrides>,
    default: () => ({}),
  },
  chartData: {
    type: Array as PropType<Array<{ label: string; value: number }>>,
    default: () => [],
  },
  animationConfig: {
    type: Object as PropType<ElevationAnimationConfig>,
    default: () => ({ ...DEFAULT_ELEVATION_ANIMATION_CONFIG }),
  },
  timeArray: {
    type: Array as PropType<number[]>,
    default: undefined,
  },
});

const emit = defineEmits<{
  back: [];
  reset: [];
  download: [];
  save: [];
  "show-fullscreen": [];
  "update:chartTitle": [value: string];
  "update:colors": [value: ChartColors];
  "update:silhouetteMode": [value: boolean];
  "update:styleOverrides": [value: ChartStyleOverrides];
  "update:animationConfig": [value: ElevationAnimationConfig];
  updateSeriesColor: [index: number, color: string];
  regenerateColors: [];
}>();

// Title card: include title + transition in total duration when title exists
const hasTitleCard = computed(() => !!props.chartTitle.trim());
const chartDurationMs = computed(() => props.animationConfig.duration * 1000);
const introDurationMs = computed(() =>
  hasTitleCard.value ? TITLE_CARD_DURATION_MS + TRANSITION_DURATION_MS : 0
);
const totalDurationMs = computed(() =>
  chartDurationMs.value + introDurationMs.value
);
// Phase boundaries as ratios of total duration (0-1)
const titleEnd = computed(() =>
  hasTitleCard.value ? TITLE_CARD_DURATION_MS / totalDurationMs.value : 0
);
const transitionEnd = computed(() =>
  hasTitleCard.value ? introDurationMs.value / totalDurationMs.value : 0
);
// Keep titleRatio for backward compatibility with tests
const titleRatio = titleEnd;

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
}));

// Chart options for silhouette mode (defined before useChartAnimation)
const chartOptions = computed<ChartOptions>(() => ({
  data: props.chartData.map(d => ({
    label: d.label,
    value: d.value
  })),
  colors: {
    primary: layoutMode.value === 'silhouette'
      ? props.animationConfig.curveColor
      : props.colors.primary || '#4CAF50',
    background: props.animationConfig.backgroundColor
  },
  title: props.chartTitle,
  silhouetteMode: layoutMode.value === 'silhouette',
  animation: animationSettings.value,
  styleOverrides: props.styleOverrides,
}));

// Auto-detect the most visually interesting point for the title hook
const hookProgress = computed(() => findHookPoint(props.chartData));

// Use the animation composable
const animation = useChartAnimation(chartOptions, animationSettings);
const {
  progress: animationProgress,
  isPlaying,
  playbackSpeed,
  formattedTime,
  toggle: togglePlayback,
  reset: resetAnimation,
} = animation;

// Shared FrameOptions for the intro phases (title + transition)
function buildIntroFrameOptions(overrides: Record<string, unknown> = {}) {
  return {
    progress: 1 as number, // Full curve visible (static terrain backdrop)
    showMarker: false,
    markerSize: props.animationConfig.markerSize,
    markerColor: '#ffffff',
    curveEndpoint: props.animationConfig.curveEndpoint,
    showAreaFill: props.animationConfig.showAreaFill ?? true,
    showElevationLabels: false,
    showDistanceLabels: false,
    backgroundType: props.animationConfig.backgroundType,
    gradientColor: props.animationConfig.gradientColor,
    meshColor1: props.animationConfig.meshColor1,
    meshColor2: props.animationConfig.meshColor2,
    meshColor3: props.animationConfig.meshColor3,
    patternColor: props.animationConfig.patternColor,
    patternOpacity: props.animationConfig.patternOpacity,
    imageOptions: props.animationConfig.imageOptions,
    panZoomEnabled: true, // Always zoom during intro
    panZoomConfig: {
      zoomLevel: props.animationConfig.panZoomZoomLevel || 3,
      zoomOutStart: 1, // Never zoom out during intro
    },
    ...overrides,
  };
}

// Camera pan window: one continuous motion spanning title fade-out + transition
// Starts at 80% through the title phase, ends at the end of the transition
const panStart = computed(() => titleEnd.value * 0.8);
const panEnd = computed(() => transitionEnd.value);

// Generate animation SVG using the elevation chart generator
const animationSvg = computed(() => {
  if (props.chartData.length === 0) return '';

  const progress = animationProgress.value;

  // Phase 1: Title card — terrain zoomed to hook point with title overlay
  if (hasTitleCard.value && progress <= titleEnd.value) {
    const titleProgress = titleEnd.value > 0 ? progress / titleEnd.value : 1;
    // Camera starts moving during title fade-out (last 20%)
    let cameraProg = hookProgress.value;
    if (progress > panStart.value && panEnd.value > panStart.value) {
      const panT = (progress - panStart.value) / (panEnd.value - panStart.value);
      cameraProg = hookProgress.value * (1 - panT);
    }
    return generateElevationFrame(chartOptions.value, buildIntroFrameOptions({
      cameraOverrideProgress: cameraProg,
      titleOverlay: {
        text: props.chartTitle,
        opacity: getTitleCardOpacity(titleProgress),
        color: props.animationConfig.titleColor || '#ffffff',
      },
    }));
  }

  // Phase 2: Transition — camera continues panning (constant speed), curve fades
  if (hasTitleCard.value && progress <= transitionEnd.value) {
    // Camera pan: continuous linear motion (no easing — fades provide softness)
    const panT = panEnd.value > panStart.value
      ? (progress - panStart.value) / (panEnd.value - panStart.value)
      : 1;
    const cameraProg = hookProgress.value * (1 - panT);
    // Curve fades out over last 60% of transition
    const t = (progress - titleEnd.value) / (transitionEnd.value - titleEnd.value);
    const fadeT = Math.max(0, (t - 0.4) / 0.6);
    const opacity = 1 - fadeT * fadeT;
    return generateElevationFrame(chartOptions.value, buildIntroFrameOptions({
      cameraOverrideProgress: cameraProg,
      curveOpacity: opacity,
    }));
  }

  // Phase 3: Chart animation
  const chartProgress = transitionEnd.value < 1
    ? (progress - transitionEnd.value) / (1 - transitionEnd.value)
    : progress;

  // Fade-in at the start of the animation (first 10%)
  const fadeInDuration = 0.10;
  const fadeInT = Math.min(1, chartProgress / fadeInDuration);
  const fadeIn = fadeInT * fadeInT; // ease-in quadratic for smooth onset

  return generateElevationFrame(chartOptions.value, {
    progress: chartProgress,
    showMarker: props.animationConfig.showMarker,
    markerSize: props.animationConfig.markerSize,
    markerColor: '#ffffff',
    curveEndpoint: props.animationConfig.curveEndpoint,
    showAreaFill: props.animationConfig.showAreaFill ?? true,
    showElevationLabels: props.animationConfig.showElevationLabels,
    elevationLabelColor: props.animationConfig.elevationLabelColor,
    showDistanceLabels: props.animationConfig.showDistanceLabels,
    distanceLabelColor: props.animationConfig.distanceLabelColor,
    backgroundType: props.animationConfig.backgroundType,
    gradientColor: props.animationConfig.gradientColor,
    meshColor1: props.animationConfig.meshColor1,
    meshColor2: props.animationConfig.meshColor2,
    meshColor3: props.animationConfig.meshColor3,
    patternColor: props.animationConfig.patternColor,
    patternOpacity: props.animationConfig.patternOpacity,
    imageOptions: props.animationConfig.imageOptions,
    timeArray: props.timeArray,
    animationMode: props.animationConfig.animationMode,
    gradientSensitivity: props.animationConfig.gradientSensitivity,
    effortConfig: props.animationConfig.effortConfig,
    panZoomEnabled: props.animationConfig.panZoomEnabled,
    panZoomConfig: props.animationConfig.panZoomEnabled ? {
      zoomLevel: props.animationConfig.panZoomZoomLevel,
      zoomOutStart: props.animationConfig.panZoomZoomOutStart,
    } : undefined,
    curveOpacity: hasTitleCard.value ? fadeIn : undefined,
    annotations: props.animationConfig.annotations ?? [],
  });
});

// Silhouette SVG - uses the same Reel format for both preview and export
const silhouetteSvg = computed(() => {
  return animationSvg.value || '';
});

// Sync slider with animation progress
watch(animationProgress, (newVal) => {
  if (!isPlaying.value) return;
  sliderProgress.value = newVal * 100;
});

function onSliderChange(value: number) {
  animation.seekTo(value / 100);
}

function setSpeed(speed: PlaybackSpeed) {
  animation.setSpeed(speed);
}

// Video export
const videoExport = useVideoExport();

// Open export settings dialog
function openExportSettings() {
  showExportSettingsDialog.value = true;
}

// Start the actual export with selected settings
async function startVideoExport(settings: ExportSettings) {
  showExportDialog.value = true;

  // Parse resolution
  const [width, height] = settings.resolution.split('x').map(Number);

  // Phase durations for export
  const hasTitle = !!props.chartTitle.trim();
  const titleMs = hasTitle ? TITLE_CARD_DURATION_MS : 0;
  const transitionMs = hasTitle ? TRANSITION_DURATION_MS : 0;
  const chartMs = props.animationConfig.duration * 1000;
  const totalMs = titleMs + transitionMs + chartMs;
  const exportTitleEnd = titleMs / totalMs;
  const exportTransitionEnd = (titleMs + transitionMs) / totalMs;

  // Continuous camera pan window for export (same as preview)
  const exportPanStart = exportTitleEnd * 0.8;
  const exportPanEnd = exportTransitionEnd;

  await videoExport.exportVideo({
    width,
    height,
    fps: settings.fps,
    quality: settings.quality,
    durationMs: totalMs,
    filename: `${props.chartTitle || 'elevation'}-reel.mp4`,
    renderFrame: (progress: number) => {
      // Phase 1: Title — terrain zoomed to hook point with title overlay
      if (hasTitle && progress <= exportTitleEnd) {
        const titleProgress = exportTitleEnd > 0 ? progress / exportTitleEnd : 1;
        // Camera starts moving during title fade-out (last 20%)
        let cameraProg = hookProgress.value;
        if (progress > exportPanStart && exportPanEnd > exportPanStart) {
          const panT = (progress - exportPanStart) / (exportPanEnd - exportPanStart);
          cameraProg = hookProgress.value * (1 - panT);
        }
        return generateElevationFrame(chartOptions.value, {
          ...buildIntroFrameOptions({
            exportWidth: width,
            exportHeight: height,
            cameraOverrideProgress: cameraProg,
            titleOverlay: {
              text: props.chartTitle,
              opacity: getTitleCardOpacity(titleProgress),
              color: props.animationConfig.titleColor || '#ffffff',
            },
          }),
        });
      }

      // Phase 2: Transition — camera continues panning (constant speed), curve fades
      if (hasTitle && progress <= exportTransitionEnd) {
        // Camera pan: continuous linear motion (no easing — fades provide softness)
        const panT = exportPanEnd > exportPanStart
          ? (progress - exportPanStart) / (exportPanEnd - exportPanStart)
          : 1;
        const cameraProg = hookProgress.value * (1 - panT);
        // Curve fades out over last 60% of transition
        const t = (progress - exportTitleEnd) / (exportTransitionEnd - exportTitleEnd);
        const fadeT = Math.max(0, (t - 0.4) / 0.6);
        const opacity = 1 - fadeT * fadeT;
        return generateElevationFrame(chartOptions.value, {
          ...buildIntroFrameOptions({
            exportWidth: width,
            exportHeight: height,
            cameraOverrideProgress: cameraProg,
            curveOpacity: opacity,
          }),
        });
      }

      // Phase 3: Chart animation
      const chartProgress = exportTransitionEnd < 1
        ? (progress - exportTransitionEnd) / (1 - exportTransitionEnd)
        : progress;

      const fadeInDuration = 0.10;
      const fadeInT = Math.min(1, chartProgress / fadeInDuration);
      const fadeIn = fadeInT * fadeInT;

      return generateElevationFrame(chartOptions.value, {
        progress: chartProgress,
        showMarker: props.animationConfig.showMarker,
        markerSize: props.animationConfig.markerSize,
        markerColor: '#ffffff',
        curveEndpoint: props.animationConfig.curveEndpoint,
        showAreaFill: props.animationConfig.showAreaFill ?? true,
        showElevationLabels: props.animationConfig.showElevationLabels,
        elevationLabelColor: props.animationConfig.elevationLabelColor,
        showDistanceLabels: props.animationConfig.showDistanceLabels,
        distanceLabelColor: props.animationConfig.distanceLabelColor,
        backgroundType: props.animationConfig.backgroundType,
        gradientColor: props.animationConfig.gradientColor,
        meshColor1: props.animationConfig.meshColor1,
        meshColor2: props.animationConfig.meshColor2,
        meshColor3: props.animationConfig.meshColor3,
        patternColor: props.animationConfig.patternColor,
        patternOpacity: props.animationConfig.patternOpacity,
        imageOptions: props.animationConfig.imageOptions,
        exportWidth: width,
        exportHeight: height,
        timeArray: props.timeArray,
        animationMode: props.animationConfig.animationMode,
        gradientSensitivity: props.animationConfig.gradientSensitivity,
        effortConfig: props.animationConfig.effortConfig,
        panZoomEnabled: props.animationConfig.panZoomEnabled,
        panZoomConfig: props.animationConfig.panZoomEnabled ? {
          zoomLevel: props.animationConfig.panZoomZoomLevel,
          zoomOutStart: props.animationConfig.panZoomZoomOutStart,
        } : undefined,
        curveOpacity: hasTitle ? fadeIn : undefined,
        annotations: props.animationConfig.annotations ?? [],
      });
    }
  });
}

function closeExportDialog() {
  if (videoExport.isExporting.value && videoExport.progress.value.stage !== 'error') {
    videoExport.cancelExport();
  }
  showExportDialog.value = false;
}
</script>

<style scoped>
.elevation-step {
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* Main content area */
.elevation-main {
  height: 100%;
  margin-right: 320px;
  transition: margin-right 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.elevation-main.sidebar-collapsed {
  margin-right: 56px;
}

/* Preview area - centered content */
.preview-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px;
  max-height: 100%;
}

/* Reel Preview - responsive height with 9:16 aspect ratio */
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

/* Dialogs */
.elevation-step :deep(.v-dialog > .v-overlay__content > .v-card) {
  border-radius: var(--radius-xl, 24px) !important;
}

.elevation-step :deep(.v-card-title) {
  padding: 20px 24px 16px;
  font-weight: 600;
}

.elevation-step :deep(.v-card-text) {
  padding: 0 24px 16px;
}

.elevation-step :deep(.v-card-actions) {
  padding: 12px 24px 20px;
}

/* Support section in export dialog */
.support-section {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: var(--radius-md, 12px);
  padding: 20px;
}
</style>
