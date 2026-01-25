<template>
  <div class="elevation-step">
    <!-- Main Layout: Preview + Slider + Controls -->
    <div class="elevation-layout">
      <!-- Reel Preview -->
      <div class="reel-preview">
        <div class="silhouette-container">
          <div
            class="silhouette-chart"
            v-html="silhouetteSvg"
          ></div>
        </div>
      </div>

      <!-- Curve Height Slider -->
      <div class="height-slider-container">
        <v-slider
          v-model="curveEndpoint"
          :min="15"
          :max="100"
          :step="1"
          direction="vertical"
          hide-details
          thumb-label
          class="height-slider"
        />
        <div class="text-caption text-center mt-1">{{ curveEndpoint }}%</div>
      </div>

      <!-- Controls -->
      <div class="controls-section">
        <!-- Playback Controls (always visible) -->
        <div class="playback-controls mb-3">
          <div class="d-flex align-center ga-2">
            <v-btn
              :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
              variant="flat"
              color="primary"
              size="large"
              @click="togglePlayback"
            />
            <v-btn
              icon="mdi-replay"
              variant="text"
              size="small"
              @click="resetAnimation"
              :disabled="animationProgress === 0"
            />
            <v-slider
              v-model="sliderProgress"
              :min="0"
              :max="100"
              :step="0.1"
              hide-details
              class="flex-grow-1"
              color="primary"
              track-color="grey-lighten-2"
              @update:model-value="onSliderChange"
            />
            <span class="text-caption" style="min-width: 50px; font-family: monospace;">
              {{ formattedTime }}
            </span>
            <v-menu>
              <template v-slot:activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="text" size="small">
                  {{ playbackSpeed }}x
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  v-for="speed in speedOptions"
                  :key="speed"
                  :active="playbackSpeed === speed"
                  @click="setSpeed(speed)"
                >
                  <v-list-item-title>{{ speed }}x</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>

        <!-- Collapsible Settings Panels -->
        <v-expansion-panels v-model="expandedPanels" multiple class="settings-panels mb-3">
          <!-- Animation Settings -->
          <v-expansion-panel value="animation">
            <v-expansion-panel-title>
              <v-icon start size="small">mdi-animation-play</v-icon>
              Animation
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="panel-grid">
                <v-text-field
                  v-model.number="animationDuration"
                  label="Dauer (Sek.)"
                  type="number"
                  :min="1"
                  :max="30"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
                <v-select
                  v-model="animationEasing"
                  label="Easing"
                  :items="easingOptions"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Colors Settings -->
          <v-expansion-panel value="colors">
            <v-expansion-panel-title>
              <v-icon start size="small">mdi-palette</v-icon>
              Farben
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="panel-stack">
                <!-- Curve Color -->
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" variant="outlined" block>
                      <div
                        class="color-swatch mr-2"
                        :style="{ backgroundColor: silhouetteCurveColor }"
                      ></div>
                      Kurve
                    </v-btn>
                  </template>
                  <v-color-picker
                    v-model="silhouetteCurveColor"
                    mode="hexa"
                    hide-inputs
                  />
                </v-menu>

                <!-- Background Type Selector -->
                <v-select
                  v-model="backgroundType"
                  :items="backgroundTypeOptions"
                  item-title="title"
                  item-value="value"
                  label="Hintergrund"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mt-2"
                >
                  <template v-slot:item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps">
                      <template v-slot:prepend>
                        <v-icon :icon="item.raw.icon" size="small" />
                      </template>
                    </v-list-item>
                  </template>
                </v-select>

                <!-- Solid Background Color -->
                <v-menu v-if="backgroundType === 'solid' || backgroundType === 'grid' || backgroundType === 'dots'" :close-on-content-click="false">
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                      <div
                        class="color-swatch mr-2"
                        :style="{ backgroundColor: backgroundColor }"
                      ></div>
                      Hintergrundfarbe
                    </v-btn>
                  </template>
                  <v-color-picker
                    v-model="backgroundColor"
                    mode="hexa"
                    hide-inputs
                  />
                </v-menu>

                <!-- Gradient Color -->
                <v-menu v-if="backgroundType === 'gradient'" :close-on-content-click="false">
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                      <div
                        class="color-swatch mr-2"
                        :style="{ backgroundColor: gradientColor }"
                      ></div>
                      Gradient-Farbe
                    </v-btn>
                  </template>
                  <v-color-picker
                    v-model="gradientColor"
                    mode="hexa"
                    hide-inputs
                  />
                </v-menu>

                <!-- Mesh Gradient Colors -->
                <template v-if="backgroundType === 'mesh'">
                  <div class="text-caption text-grey mt-2 mb-1">Mesh-Farben</div>
                  <div class="d-flex ga-2">
                    <v-menu :close-on-content-click="false">
                      <template v-slot:activator="{ props: menuProps }">
                        <v-btn v-bind="menuProps" variant="outlined" size="small" icon>
                          <div class="color-swatch-small" :style="{ backgroundColor: meshColor1 }"></div>
                        </v-btn>
                      </template>
                      <v-color-picker v-model="meshColor1" mode="hexa" hide-inputs />
                    </v-menu>
                    <v-menu :close-on-content-click="false">
                      <template v-slot:activator="{ props: menuProps }">
                        <v-btn v-bind="menuProps" variant="outlined" size="small" icon>
                          <div class="color-swatch-small" :style="{ backgroundColor: meshColor2 }"></div>
                        </v-btn>
                      </template>
                      <v-color-picker v-model="meshColor2" mode="hexa" hide-inputs />
                    </v-menu>
                    <v-menu :close-on-content-click="false">
                      <template v-slot:activator="{ props: menuProps }">
                        <v-btn v-bind="menuProps" variant="outlined" size="small" icon>
                          <div class="color-swatch-small" :style="{ backgroundColor: meshColor3 }"></div>
                        </v-btn>
                      </template>
                      <v-color-picker v-model="meshColor3" mode="hexa" hide-inputs />
                    </v-menu>
                  </div>
                </template>

                <!-- Pattern Color and Opacity (Grid/Dots) -->
                <template v-if="backgroundType === 'grid' || backgroundType === 'dots'">
                  <v-menu :close-on-content-click="false">
                    <template v-slot:activator="{ props: menuProps }">
                      <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                        <div
                          class="color-swatch mr-2"
                          :style="{ backgroundColor: patternColor }"
                        ></div>
                        Musterfarbe
                      </v-btn>
                    </template>
                    <v-color-picker
                      v-model="patternColor"
                      mode="hexa"
                      hide-inputs
                    />
                  </v-menu>
                  <v-slider
                    v-model="patternOpacity"
                    :min="0.05"
                    :max="0.5"
                    :step="0.05"
                    label="Deckkraft"
                    density="compact"
                    hide-details
                    thumb-label
                    class="mt-2"
                  />
                </template>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Marker & Labels -->
          <v-expansion-panel value="markers">
            <v-expansion-panel-title>
              <v-icon start size="small">mdi-map-marker</v-icon>
              Marker & Labels
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="panel-stack">
                <v-checkbox
                  v-model="animationShowMarker"
                  label="Marker anzeigen"
                  density="compact"
                  hide-details
                  color="primary"
                />
                <v-checkbox
                  v-model="showElevationLabels"
                  label="Höhenmeter anzeigen"
                  density="compact"
                  hide-details
                  color="primary"
                />
                <!-- Elevation Label Color -->
                <v-menu v-if="showElevationLabels" :close-on-content-click="false">
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                      <div
                        class="color-swatch mr-2"
                        :style="{ backgroundColor: elevationLabelColor }"
                      ></div>
                      Höhenmeter-Farbe
                    </v-btn>
                  </template>
                  <v-color-picker
                    v-model="elevationLabelColor"
                    mode="hexa"
                    show-swatches
                  />
                </v-menu>
                <v-checkbox
                  v-model="showDistanceLabels"
                  label="Kilometer anzeigen"
                  density="compact"
                  hide-details
                  color="primary"
                  class="mt-2"
                />
                <!-- Distance Label Color -->
                <v-menu v-if="showDistanceLabels" :close-on-content-click="false">
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                      <div
                        class="color-swatch mr-2"
                        :style="{ backgroundColor: distanceLabelColor }"
                      ></div>
                      Kilometer-Farbe
                    </v-btn>
                  </template>
                  <v-color-picker
                    v-model="distanceLabelColor"
                    mode="hexa"
                    show-swatches
                  />
                </v-menu>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <v-tooltip text="Zurück" location="top">
            <template v-slot:activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon="mdi-chevron-left"
                variant="text"
                @click="$emit('back')"
              />
            </template>
          </v-tooltip>
          <v-spacer></v-spacer>
          <v-tooltip text="Speichern" location="top">
            <template v-slot:activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon="mdi-content-save"
                color="success"
                variant="flat"
                @click="$emit('save')"
              />
            </template>
          </v-tooltip>
          <v-tooltip text="MP4 Export" location="top">
            <template v-slot:activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon="mdi-video-outline"
                color="deep-purple"
                variant="flat"
                @click="startVideoExport"
                :disabled="!videoExport.isSupported.value || videoExport.isExporting.value"
              />
            </template>
          </v-tooltip>
        </div>
      </div>
    </div>

    <!-- Video Export Progress Dialog -->
    <v-dialog v-model="showExportDialog" persistent max-width="450">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-video-outline</v-icon>
          Video Export
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="videoExport.progress.value.stage === 'error'"
            type="error"
            class="mb-4"
          >
            {{ videoExport.error.value }}
          </v-alert>

          <v-alert
            v-else-if="videoExport.progress.value.stage === 'done'"
            type="success"
            class="mb-4"
          >
            Export erfolgreich! Die Datei wird heruntergeladen.
          </v-alert>

          <template v-else>
            <div class="text-body-2 mb-2">
              {{ videoExport.progress.value.message }}
            </div>
            <v-progress-linear
              :model-value="videoExport.progress.value.percent"
              color="deep-purple"
              height="20"
              rounded
            >
              <template v-slot:default>
                <strong>{{ videoExport.progress.value.percent }}%</strong>
              </template>
            </v-progress-linear>

            <div class="text-caption text-grey mt-2" v-if="videoExport.progress.value.totalFrames > 0">
              Frame {{ videoExport.progress.value.currentFrame }} / {{ videoExport.progress.value.totalFrames }}
            </div>

            <v-chip
              size="small"
              class="mt-3"
              :color="getStageColor(videoExport.progress.value.stage)"
            >
              {{ getStageLabel(videoExport.progress.value.stage) }}
            </v-chip>
          </template>

          <v-alert
            v-if="!videoExport.isSupported.value"
            type="warning"
            class="mt-4"
            density="compact"
          >
            SharedArrayBuffer wird nicht unterstützt.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="closeExportDialog"
            :disabled="videoExport.isExporting.value && videoExport.progress.value.stage !== 'error'"
          >
            {{ videoExport.progress.value.stage === 'done' || videoExport.progress.value.stage === 'error' ? 'Schließen' : 'Abbrechen' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
// Background type options
export type BackgroundType = 'solid' | 'gradient' | 'mesh' | 'grid' | 'dots';

// Animation config interface for persistence - exported for use in parent components
export interface ElevationAnimationConfig {
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  showMarker: boolean;
  markerSize: number;
  curveEndpoint: number;
  curveColor: string;
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
  // Legacy support
  useGradientBackground?: boolean;
}

export const DEFAULT_ELEVATION_ANIMATION_CONFIG: ElevationAnimationConfig = {
  duration: 5,
  easing: 'ease-in-out',
  showMarker: true,
  markerSize: 6,
  curveEndpoint: 30,
  showElevationLabels: false,
  elevationLabelColor: '#ffffffb3',
  showDistanceLabels: false,
  distanceLabelColor: '#ffffffb3',
  curveColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundType: 'solid',
  gradientColor: '#302b63',
  meshColor1: '#667eea',
  meshColor2: '#764ba2',
  meshColor3: '#f093fb',
  patternColor: '#ffffff',
  patternOpacity: 0.1,
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

// View mode: 'animate' or 'static'
const viewMode = ref<'animate' | 'static'>('animate');

// Layout mode (kept for compatibility, always silhouette now)
const layoutMode = ref<'silhouette' | 'free'>('silhouette');

// Slider progress state
const sliderProgress = ref(0);

// Video export dialog
const showExportDialog = ref(false);

// Expanded panels state (all open by default)
const expandedPanels = ref(['animation', 'colors', 'markers']);

const easingOptions = [
  { title: 'Linear', value: 'linear' },
  { title: 'Ease In', value: 'ease-in' },
  { title: 'Ease Out', value: 'ease-out' },
  { title: 'Ease In-Out', value: 'ease-in-out' },
];

const speedOptions: PlaybackSpeed[] = [0.25, 0.5, 1, 1.5, 2];

const backgroundTypeOptions = [
  { title: 'Solid', value: 'solid', icon: 'mdi-square' },
  { title: 'Gradient', value: 'gradient', icon: 'mdi-gradient-vertical' },
  { title: 'Mesh', value: 'mesh', icon: 'mdi-blur' },
  { title: 'Grid', value: 'grid', icon: 'mdi-grid' },
  { title: 'Dots', value: 'dots', icon: 'mdi-dots-grid' },
];

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

// Helper to emit animation config updates
function updateAnimationConfig(partial: Partial<ElevationAnimationConfig>) {
  emit("update:animationConfig", { ...props.animationConfig, ...partial });
}

// Animation settings - computed with getters/setters for two-way binding with parent
const animationDuration = computed({
  get: () => props.animationConfig.duration,
  set: (value: number) => updateAnimationConfig({ duration: value }),
});

const animationEasing = computed({
  get: () => props.animationConfig.easing,
  set: (value: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out') => updateAnimationConfig({ easing: value }),
});

const animationShowMarker = computed({
  get: () => props.animationConfig.showMarker,
  set: (value: boolean) => updateAnimationConfig({ showMarker: value }),
});

const animationMarkerSize = computed({
  get: () => props.animationConfig.markerSize,
  set: (value: number) => updateAnimationConfig({ markerSize: value }),
});

const curveEndpoint = computed({
  get: () => props.animationConfig.curveEndpoint,
  set: (value: number) => updateAnimationConfig({ curveEndpoint: value }),
});

const silhouetteCurveColor = computed({
  get: () => props.animationConfig.curveColor,
  set: (value: string) => updateAnimationConfig({ curveColor: value }),
});

const showElevationLabels = computed({
  get: () => props.animationConfig.showElevationLabels,
  set: (value: boolean) => updateAnimationConfig({ showElevationLabels: value }),
});

const elevationLabelColor = computed({
  get: () => props.animationConfig.elevationLabelColor,
  set: (value: string) => updateAnimationConfig({ elevationLabelColor: value }),
});

const showDistanceLabels = computed({
  get: () => props.animationConfig.showDistanceLabels,
  set: (value: boolean) => updateAnimationConfig({ showDistanceLabels: value }),
});

const distanceLabelColor = computed({
  get: () => props.animationConfig.distanceLabelColor,
  set: (value: string) => updateAnimationConfig({ distanceLabelColor: value }),
});

const backgroundColor = computed({
  get: () => props.animationConfig.backgroundColor || '#000000',
  set: (value: string) => updateAnimationConfig({ backgroundColor: value }),
});

const backgroundType = computed({
  get: () => props.animationConfig.backgroundType || 'solid',
  set: (value: BackgroundType) => updateAnimationConfig({ backgroundType: value }),
});

// Legacy support - map to backgroundType
const useGradientBackground = computed({
  get: () => props.animationConfig.backgroundType === 'gradient',
  set: (value: boolean) => updateAnimationConfig({ backgroundType: value ? 'gradient' : 'solid' }),
});

const gradientColor = computed({
  get: () => props.animationConfig.gradientColor || '#302b63',
  set: (value: string) => updateAnimationConfig({ gradientColor: value }),
});

const meshColor1 = computed({
  get: () => props.animationConfig.meshColor1 || '#667eea',
  set: (value: string) => updateAnimationConfig({ meshColor1: value }),
});

const meshColor2 = computed({
  get: () => props.animationConfig.meshColor2 || '#764ba2',
  set: (value: string) => updateAnimationConfig({ meshColor2: value }),
});

const meshColor3 = computed({
  get: () => props.animationConfig.meshColor3 || '#f093fb',
  set: (value: string) => updateAnimationConfig({ meshColor3: value }),
});

const patternColor = computed({
  get: () => props.animationConfig.patternColor || '#ffffff',
  set: (value: string) => updateAnimationConfig({ patternColor: value }),
});

const patternOpacity = computed({
  get: () => props.animationConfig.patternOpacity ?? 0.1,
  set: (value: number) => updateAnimationConfig({ patternOpacity: value }),
});

// Animation settings for the composable
const animationSettings = computed<AnimationOptions>(() => ({
  ...DEFAULT_ANIMATION_OPTIONS,
  enabled: true,
  durationMs: animationDuration.value * 1000,
  fps: 30,
  easing: animationEasing.value,
  showMarker: animationShowMarker.value,
  markerSize: animationMarkerSize.value,
  markerColor: '#ffffff',
  curveEndpoint: curveEndpoint.value,
}));

// Chart options for silhouette mode (defined before useChartAnimation)
const chartOptions = computed<ChartOptions>(() => ({
  data: props.chartData.map(d => ({
    label: d.label,
    value: d.value
  })),
  colors: {
    primary: layoutMode.value === 'silhouette'
      ? silhouetteCurveColor.value
      : props.colors.primary || '#4CAF50',
    background: backgroundColor.value
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
  return generateElevationFrame(chartOptions.value, {
    progress: animationProgress.value,
    showMarker: props.animationConfig.showMarker,
    markerSize: props.animationConfig.markerSize,
    markerColor: '#ffffff',
    curveEndpoint: props.animationConfig.curveEndpoint,
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

async function startVideoExport() {
  showExportDialog.value = true;

  await videoExport.exportVideo({
    width: 1080,
    height: 1920,
    fps: 30,
    durationMs: animationDuration.value * 1000,
    filename: `${props.chartTitle || 'elevation'}-reel.mp4`,
    renderFrame: (progress: number) => {
      return generateElevationFrame(chartOptions.value, {
        progress,
        showMarker: props.animationConfig.showMarker,
        markerSize: props.animationConfig.markerSize,
        markerColor: '#ffffff',
        curveEndpoint: props.animationConfig.curveEndpoint,
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
        exportWidth: 1080,
        exportHeight: 1920,
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

function getStageColor(stage: string): string {
  switch (stage) {
    case 'loading-ffmpeg': return 'blue';
    case 'generating-frames': return 'orange';
    case 'converting-to-png': return 'orange';
    case 'encoding': return 'purple';
    case 'done': return 'green';
    case 'error': return 'red';
    default: return 'grey';
  }
}

function getStageLabel(stage: string): string {
  switch (stage) {
    case 'idle': return 'Bereit';
    case 'loading-ffmpeg': return 'FFmpeg laden...';
    case 'generating-frames': return 'Frames generieren...';
    case 'converting-to-png': return 'Frames rendern...';
    case 'encoding': return 'Video kodieren...';
    case 'done': return 'Fertig!';
    case 'error': return 'Fehler';
    default: return stage;
  }
}
</script>

<style scoped>
.elevation-step {
  height: 100%;
  padding: 12px;
  padding-left: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.elevation-layout {
  display: flex;
  gap: 12px;
  height: 100%;
  align-items: stretch;
}

/* Reel Preview - responsive height with 9:16 aspect ratio */
.reel-preview {
  flex-shrink: 0;
  height: 100%;
  aspect-ratio: 9 / 16;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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

/* Height Slider */
.height-slider-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.height-slider {
  height: 100%;
}

/* Controls Section */
.controls-section {
  flex: 1;
  min-width: 280px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  overflow-x: visible;
}

.playback-controls {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  padding: 12px;
  border-radius: 8px;
}

/* Expansion Panels */
.settings-panels {
  flex: 1;
  overflow-y: auto;
}

.settings-panels :deep(.v-expansion-panel-title) {
  min-height: 44px;
  padding: 8px 16px;
  font-size: 0.875rem;
}

.settings-panels :deep(.v-expansion-panel-text__wrapper) {
  padding: 8px 16px 16px;
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-full-width {
  grid-column: 1 / -1;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  flex-shrink: 0;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.color-swatch-small {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.2);
}
</style>
