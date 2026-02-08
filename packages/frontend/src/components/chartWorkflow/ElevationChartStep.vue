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
import { generateTitleCardSvg, getTitleCardOpacity, TITLE_CARD_DURATION_MS } from "../../utils/titleCardGenerator";
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

// Title card: include in total duration when title exists
const hasTitleCard = computed(() => !!props.chartTitle.trim());
const chartDurationMs = computed(() => props.animationConfig.duration * 1000);
const totalDurationMs = computed(() =>
  chartDurationMs.value + (hasTitleCard.value ? TITLE_CARD_DURATION_MS : 0)
);
const titleRatio = computed(() =>
  hasTitleCard.value ? TITLE_CARD_DURATION_MS / totalDurationMs.value : 0
);

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

// Generate animation SVG using the elevation chart generator
const animationSvg = computed(() => {
  if (props.chartData.length === 0) return '';

  const progress = animationProgress.value;

  // Title card phase
  if (hasTitleCard.value && progress <= titleRatio.value) {
    const titleProgress = titleRatio.value > 0 ? progress / titleRatio.value : 1;
    return generateTitleCardSvg({
      title: props.chartTitle,
      width: 1080,
      height: 1920,
      opacity: getTitleCardOpacity(titleProgress),
      textColor: props.animationConfig.titleColor || '#ffffff',
      backgroundColor: props.animationConfig.backgroundColor || '#000000',
      backgroundType: props.animationConfig.backgroundType || 'solid',
      gradientColor: props.animationConfig.gradientColor || '#302b63',
      meshColor1: props.animationConfig.meshColor1 || '#667eea',
      meshColor2: props.animationConfig.meshColor2 || '#764ba2',
      meshColor3: props.animationConfig.meshColor3 || '#f093fb',
      patternColor: props.animationConfig.patternColor || '#ffffff',
      patternOpacity: props.animationConfig.patternOpacity ?? 0.1,
      imageOptions: props.animationConfig.imageOptions,
    });
  }

  // Chart animation phase
  const chartProgress = titleRatio.value < 1
    ? (progress - titleRatio.value) / (1 - titleRatio.value)
    : progress;

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

  // Title card phase: only if there's a title
  const hasTitleCard = !!props.chartTitle.trim();
  const titleDurationMs = hasTitleCard ? TITLE_CARD_DURATION_MS : 0;
  const chartDurationMs = props.animationConfig.duration * 1000;
  const totalDurationMs = titleDurationMs + chartDurationMs;
  const titleRatio = titleDurationMs / totalDurationMs;

  await videoExport.exportVideo({
    width,
    height,
    fps: settings.fps,
    quality: settings.quality,
    durationMs: totalDurationMs,
    filename: `${props.chartTitle || 'elevation'}-reel.mp4`,
    renderFrame: (progress: number) => {
      // Title card phase
      if (hasTitleCard && progress <= titleRatio) {
        const titleProgress = titleRatio > 0 ? progress / titleRatio : 1;
        return generateTitleCardSvg({
          title: props.chartTitle,
          width,
          height,
          opacity: getTitleCardOpacity(titleProgress),
          textColor: props.animationConfig.titleColor || '#ffffff',
          backgroundColor: props.animationConfig.backgroundColor || '#000000',
          backgroundType: props.animationConfig.backgroundType || 'solid',
          gradientColor: props.animationConfig.gradientColor || '#302b63',
          meshColor1: props.animationConfig.meshColor1 || '#667eea',
          meshColor2: props.animationConfig.meshColor2 || '#764ba2',
          meshColor3: props.animationConfig.meshColor3 || '#f093fb',
          patternColor: props.animationConfig.patternColor || '#ffffff',
          patternOpacity: props.animationConfig.patternOpacity ?? 0.1,
          imageOptions: props.animationConfig.imageOptions,
        });
      }

      // Chart animation phase
      const chartProgress = titleRatio < 1
        ? (progress - titleRatio) / (1 - titleRatio)
        : progress;

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
