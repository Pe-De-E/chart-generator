<template>
  <v-navigation-drawer
    permanent
    location="right"
    :rail="collapsed"
    :width="300"
    rail-width="48"
    class="terrain-sidebar"
  >
    <!-- Header -->
    <div class="sidebar-header">
      <v-btn icon variant="text" size="small" @click="$emit('update:collapsed', !collapsed)">
        <v-icon>{{ collapsed ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
      </v-btn>
      <span v-if="!collapsed" class="text-subtitle-2 font-weight-medium ml-2">3D Gelände</span>
    </div>
    <v-divider />

    <!-- Collapsed: icon buttons -->
    <div v-if="collapsed" class="d-flex flex-column align-center pt-2 ga-1">
      <v-tooltip location="left" text="Spielen">
        <template #activator="{ props: tp }">
          <v-btn v-bind="tp" :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" variant="flat" color="primary" size="small" @click="$emit('toggle-playback')" />
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Gelände">
        <template #activator="{ props: tp }">
          <v-btn v-bind="tp" icon="mdi-terrain" variant="text" size="small" @click="$emit('update:collapsed', false)" />
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Kamera">
        <template #activator="{ props: tp }">
          <v-btn v-bind="tp" icon="mdi-video-outline" variant="text" size="small" @click="$emit('update:collapsed', false)" />
        </template>
      </v-tooltip>
    </div>

    <template v-if="!collapsed">
      <!-- Chart title -->
      <div class="px-3 pt-3">
        <v-text-field
          :model-value="chartTitle"
          label="Chart-Name"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="$emit('update:chartTitle', $event)"
        />
      </div>

      <v-divider class="my-2" />

      <!-- Tabs -->
      <v-tabs v-model="activeTab" density="compact" color="primary" grow>
        <v-tab :value="0"><v-icon size="18">mdi-terrain</v-icon><span class="tab-label ml-1">Gelände</span></v-tab>
        <v-tab :value="1"><v-icon size="18">mdi-video-outline</v-icon><span class="tab-label ml-1">Kamera</span></v-tab>
        <v-tab :value="2"><v-icon size="18">mdi-animation-play</v-icon><span class="tab-label ml-1">Anim.</span></v-tab>
      </v-tabs>
      <v-divider />

      <div class="tab-content px-3 py-2">

        <!-- ── Tab 0: Gelände ── -->
        <div v-show="activeTab === 0">
          <div class="section-label">Render-Modus</div>
          <v-btn-toggle :model-value="terrainRenderStyle" mandatory density="compact" variant="outlined" divided class="w-100 mb-3" color="primary"
            @update:model-value="update('terrainRenderStyle', $event)">
            <v-btn value="realistic" size="small" class="flex-grow-1">Realistisch</v-btn>
            <v-btn value="contour-layers" size="small" class="flex-grow-1">
              <v-icon size="14" class="mr-1">mdi-layers</v-icon>Rayshader
            </v-btn>
          </v-btn-toggle>

          <div class="section-label">Stil</div>
          <v-btn-toggle :model-value="terrainStyle" mandatory density="compact" variant="outlined" divided class="w-100 mb-2" color="primary"
            @update:model-value="update('terrainStyle', $event)">
            <v-btn value="dark" size="small" class="flex-grow-1">Dark</v-btn>
            <v-btn value="alpine" size="small" class="flex-grow-1">Alpin</v-btn>
            <v-btn value="desert" size="small" class="flex-grow-1">Desert</v-btn>
            <v-btn value="topo" size="small" class="flex-grow-1">Topo</v-btn>
          </v-btn-toggle>

          <div class="section-label mt-2">Höhenübertreibung: {{ terrainExaggeration.toFixed(1) }}×</div>
          <v-slider :model-value="terrainExaggeration" :min="1" :max="5" :step="0.5" density="compact" hide-details thumb-label color="primary"
            @update:model-value="update('terrainExaggeration', $event)" />

          <div class="section-label mt-2">Auflösung</div>
          <v-btn-toggle :model-value="terrainSegments" mandatory density="compact" variant="outlined" divided class="w-100 mb-2" color="primary"
            @update:model-value="update('terrainSegments', $event)">
            <v-btn :value="128" size="small" class="flex-grow-1">128</v-btn>
            <v-btn :value="256" size="small" class="flex-grow-1">256</v-btn>
            <v-btn :value="512" size="small" class="flex-grow-1">512</v-btn>
          </v-btn-toggle>

          <v-divider class="my-2" />
          <div class="section-label">Route</div>
          <v-menu :close-on-content-click="false">
            <template #activator="{ props: mp }">
              <v-btn v-bind="mp" variant="outlined" block size="small" class="mb-1">
                <div class="color-swatch mr-2" :style="{ backgroundColor: routeColor }"></div>
                Routenfarbe
              </v-btn>
            </template>
            <v-color-picker :model-value="routeColor" mode="hexa" hide-inputs @update:model-value="update('routeColor', $event)" />
          </v-menu>
          <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Breite: {{ routeWidth }}</label>
          <v-slider :model-value="routeWidth" :min="1" :max="10" :step="1" density="compact" hide-details thumb-label color="primary"
            @update:model-value="update('routeWidth', $event)" />
          <v-checkbox :model-value="routeGlow" label="Leuchten" density="compact" hide-details color="primary"
            @update:model-value="update('routeGlow', $event ?? false)" />
          <template v-if="routeGlow">
            <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Intensität: {{ routeGlowIntensity }}</label>
            <v-slider :model-value="routeGlowIntensity" :min="1" :max="8" :step="1" density="compact" hide-details thumb-label color="primary"
              @update:model-value="update('routeGlowIntensity', $event)" />
          </template>

          <template v-if="terrainRenderStyle === 'realistic'">
            <v-divider class="my-2" />
            <div class="section-label">Geo</div>
            <v-checkbox :model-value="showRivers" label="Flüsse" density="compact" hide-details color="primary"
              @update:model-value="update('showRivers', $event ?? false)" />
            <v-checkbox :model-value="showPlaces" label="Orte" density="compact" hide-details color="primary"
              @update:model-value="update('showPlaces', $event ?? false)" />
          </template>

          <v-divider class="my-2" />
          <div class="section-label">Layout</div>
          <label class="text-caption text-medium-emphasis d-block mb-1">Geländeanteil: {{ Math.round(terrainHeightRatio * 100) }}%</label>
          <v-slider :model-value="terrainHeightRatio" :min="0.5" :max="0.9" :step="0.05" density="compact" hide-details thumb-label color="primary"
            @update:model-value="update('terrainHeightRatio', $event)" />
          <v-checkbox :model-value="showElevationChart" label="Höhenprofil unten" density="compact" hide-details color="primary"
            @update:model-value="update('showElevationChart', $event ?? false)" />
        </div>

        <!-- ── Tab 1: Kamera ── -->
        <div v-show="activeTab === 1">
          <v-alert type="info" variant="tonal" density="compact" class="mb-3 text-caption">
            <strong>Drag</strong> zum Rotieren · <strong>Scroll</strong> zum Zoomen · <strong>Rechtsklick</strong> zum Verschieben
          </v-alert>

          <v-btn block variant="outlined" size="small" class="mb-3" prepend-icon="mdi-camera-flip-outline"
            @click="$emit('reset-camera')">
            Kamera zurücksetzen
          </v-btn>

          <div class="section-label">Modus</div>
          <v-btn-toggle :model-value="cameraMode" mandatory density="compact" variant="outlined" divided class="w-100 mb-3" color="primary"
            @update:model-value="update('cameraMode', $event)">
            <v-btn value="overview-perspective" size="small" class="flex-grow-1">Frei</v-btn>
            <v-btn value="overview-iso" size="small" class="flex-grow-1">Iso</v-btn>
            <v-btn value="chase" size="small" class="flex-grow-1">
              <v-icon size="16" class="mr-1">mdi-racing-helmet</v-icon>Chase
            </v-btn>
          </v-btn-toggle>

          <v-alert v-if="cameraMode === 'chase'" type="info" variant="tonal" density="compact" class="mb-2 text-caption">
            Kamera folgt der Route. Animation abspielen um den Effekt zu sehen.
          </v-alert>

          <div class="section-label">Startposition</div>
          <div class="section-label mt-2">Winkel: {{ cameraElevationAngle }}°</div>
          <v-slider :model-value="cameraElevationAngle" :min="15" :max="75" :step="5" density="compact" hide-details thumb-label color="primary"
            @update:model-value="update('cameraElevationAngle', $event)" />

          <div class="section-label mt-2">Abstand: {{ cameraDistance.toFixed(1) }}×</div>
          <v-slider :model-value="cameraDistance" :min="0.5" :max="2.5" :step="0.1" density="compact" hide-details thumb-label color="primary"
            @update:model-value="update('cameraDistance', $event)" />
        </div>

        <!-- ── Tab 2: Animation ── -->
        <div v-show="activeTab === 2">
          <div class="section-label">Dauer</div>
          <v-text-field :model-value="duration" label="Sekunden" type="number" :min="3" :max="60" variant="outlined" density="compact" hide-details
            @update:model-value="update('duration', Number($event))" />

          <div class="section-label mt-2">Easing</div>
          <v-select :model-value="easing"
            :items="[
              { title: 'Linear', value: 'linear' },
              { title: 'Ease In', value: 'ease-in' },
              { title: 'Ease Out', value: 'ease-out' },
              { title: 'Ease In-Out', value: 'ease-in-out' },
            ]"
            variant="outlined" density="compact" hide-details
            @update:model-value="update('easing', $event)"
          />

          <div class="section-label mt-3">Hintergrundfarbe</div>
          <v-menu :close-on-content-click="false">
            <template #activator="{ props: mp }">
              <v-btn v-bind="mp" variant="outlined" block size="small">
                <div class="color-swatch mr-2" :style="{ backgroundColor: backgroundColor }"></div>
                Hintergrund
              </v-btn>
            </template>
            <v-color-picker :model-value="backgroundColor" mode="hexa" hide-inputs @update:model-value="update('backgroundColor', $event)" />
          </v-menu>
        </div>

      </div>

      <v-spacer />
      <v-divider />

      <!-- Playback + Navigation -->
      <div class="playback-section px-3 pb-2 pt-2">
        <div class="d-flex align-center ga-1 mb-2">
          <v-btn icon="mdi-skip-previous" variant="text" size="small" @click="$emit('reset-animation')" />
          <v-btn :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" variant="flat" color="primary" size="small" class="flex-grow-0"
            @click="$emit('toggle-playback')" />
          <div class="text-caption text-medium-emphasis ml-1">{{ formattedTime }}</div>
          <v-spacer />
          <v-btn-toggle :model-value="playbackSpeed" density="compact" variant="outlined" divided color="primary" mandatory
            @update:model-value="$emit('set-speed', $event)">
            <v-btn :value="1" size="x-small">1×</v-btn>
            <v-btn :value="2" size="x-small">2×</v-btn>
          </v-btn-toggle>
        </div>
        <v-slider
          :model-value="sliderProgress"
          :min="0" :max="100" :step="0.1"
          density="compact" hide-details color="primary"
          thumb-size="12"
          @update:model-value="$emit('slider-change', $event)"
        />
        <v-divider class="my-2" />
        <div class="d-flex ga-2">
          <v-btn variant="text" size="small" @click="$emit('back')">
            <v-icon start size="small">mdi-chevron-left</v-icon>Zurück
          </v-btn>
          <v-spacer />
          <v-btn variant="flat" color="primary" size="small" @click="$emit('save')">
            <v-icon start size="small">mdi-content-save</v-icon>Speichern
          </v-btn>
        </div>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TerrainAnimationConfig } from '../../utils/chartGenerators/terrain3d/types'
import type { PlaybackSpeed } from '../../composables/useChartAnimation'

const props = defineProps<{
  collapsed: boolean
  animationConfig: TerrainAnimationConfig
  chartTitle: string
  chartData: Array<{ label: string; value: number }>
  isPlaying: boolean
  playbackSpeed: PlaybackSpeed
  formattedTime: string
  animationProgress: number
  sliderProgress: number
  videoExportSupported: boolean
  videoExporting: boolean
}>()

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
  'update:animationConfig': [value: TerrainAnimationConfig]
  'update:chartTitle': [value: string]
  back: []
  save: []
  'toggle-playback': []
  'reset-animation': []
  'reset-camera': []
  'set-speed': [speed: PlaybackSpeed]
  'slider-change': [value: number]
  'open-export-settings': []
}>()

const activeTab = ref(0)

// Shorthand computed accessors
const cfg = computed(() => props.animationConfig)
const terrainRenderStyle = computed(() => cfg.value.terrainRenderStyle)
const terrainStyle = computed(() => cfg.value.terrainStyle)
const terrainExaggeration = computed(() => cfg.value.terrainExaggeration)
const terrainSegments = computed(() => cfg.value.terrainSegments)
const terrainHeightRatio = computed(() => cfg.value.terrainHeightRatio)
const showElevationChart = computed(() => cfg.value.showElevationChart)
const cameraMode = computed(() => cfg.value.cameraMode)
const cameraElevationAngle = computed(() => cfg.value.cameraElevationAngle)
const cameraDistance = computed(() => cfg.value.cameraDistance)
const routeColor = computed(() => cfg.value.routeColor)
const routeWidth = computed(() => cfg.value.routeWidth)
const routeGlow = computed(() => cfg.value.routeGlow)
const routeGlowIntensity = computed(() => cfg.value.routeGlowIntensity)
const duration = computed(() => cfg.value.duration)
const easing = computed(() => cfg.value.easing)
const backgroundColor = computed(() => cfg.value.backgroundColor)
const showRivers = computed(() => cfg.value.showRivers)
const showPlaces = computed(() => cfg.value.showPlaces)

function update<K extends keyof TerrainAnimationConfig>(key: K, value: TerrainAnimationConfig[K]) {
  emit('update:animationConfig', { ...props.animationConfig, [key]: value })
}
</script>

<style scoped>
.terrain-sidebar {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 8px 8px;
  min-height: 48px;
}

.tab-label {
  font-size: 11px;
  letter-spacing: 0.02em;
}

.tab-content {
  overflow-y: auto;
  max-height: calc(100vh - 280px);
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-bottom: 4px;
}

.color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  flex-shrink: 0;
}

.playback-section {
  background: rgba(var(--v-theme-surface-variant), 0.5);
}
</style>
