<template>
  <v-layout class="gpx-generator-layout">
    <StepNavigation
      v-model:current-step="currentStep"
      v-model:collapsed="stepNavCollapsed"
      :steps="workflowSteps"
      :step-validations="stepValidations"
    />

    <v-main class="gpx-generator-content">
      <v-window v-model="currentStep">
        <!-- Step 1: Upload GPX -->
        <v-window-item :value="1" eager>
          <v-card flat>
            <v-card-text>
              <div class="text-h5 mb-4">GPX-Datei hochladen</div>

              <v-file-input
                v-model="uploadedFile"
                label="GPX-Datei auswaehlen"
                accept=".gpx"
                variant="outlined"
                prepend-icon="mdi-map-marker-path"
                show-size
                hint="Laden Sie eine GPX-Datei fuer Route + Hoehenprofil hoch"
                persistent-hint
                @update:model-value="handleFileUpload"
                class="mb-4"
              ></v-file-input>

              <!-- File Preview -->
              <v-card v-if="tableItems.length > 0" variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 card-header-bg">
                  <v-icon icon="mdi-eye" class="mr-2"></v-icon>
                  Vorschau (erste 5 Punkte)
                </v-card-title>
                <v-card-text class="pa-0">
                  <v-data-table
                    :headers="tableHeaders"
                    :items="tableItems.slice(0, 5)"
                    density="compact"
                    hide-default-footer
                    class="elevation-0"
                  ></v-data-table>
                </v-card-text>
                <v-card-text>
                  <v-alert type="info" variant="tonal" density="compact">
                    <div class="d-flex align-center justify-space-between flex-wrap ga-2">
                      <span>{{ tableItems.length }} Punkte geladen</span>
                      <div v-if="gpxStats" class="text-caption d-flex ga-3">
                        <span><v-icon size="small" class="mr-1">mdi-map-marker-distance</v-icon>{{ gpxStats.totalDistanceKm.toFixed(1) }} km</span>
                        <span><v-icon size="small" class="mr-1">mdi-arrow-up-bold</v-icon>{{ gpxStats.elevationGain }} m</span>
                        <span><v-icon size="small" class="mr-1">mdi-arrow-down-bold</v-icon>{{ gpxStats.elevationLoss }} m</span>
                      </div>
                    </div>
                  </v-alert>

                  <v-alert
                    v-if="routePoints.length > 0"
                    type="success"
                    variant="tonal"
                    density="compact"
                    class="mt-2"
                  >
                    <v-icon icon="mdi-map-marker-path" class="mr-1"></v-icon>
                    {{ routePoints.length }} Routenpunkte mit GPS-Koordinaten geladen
                  </v-alert>

                  <v-alert
                    v-if="downsamplingInfo"
                    type="success"
                    variant="tonal"
                    density="compact"
                    class="mt-2"
                  >
                    <v-icon icon="mdi-chart-timeline-variant-shimmer" class="mr-1"></v-icon>
                    Optimiert: {{ downsamplingInfo.original.toLocaleString() }} → {{ downsamplingInfo.reduced.toLocaleString() }} Punkte
                    <span class="text-caption ml-1">({{ downsamplingInfo.percentage }}% reduziert)</span>
                  </v-alert>

                  <v-alert
                    v-for="(warning, index) in gpxWarnings"
                    :key="index"
                    :type="getWarningSeverityColor(warning.severity)"
                    variant="tonal"
                    density="compact"
                    class="mt-2"
                  >
                    <template v-slot:prepend>
                      <v-icon :icon="getWarningIcon(warning.type)"></v-icon>
                    </template>
                    <div class="font-weight-medium">{{ warning.message }}</div>
                    <div class="text-caption">{{ warning.suggestion }}</div>
                  </v-alert>
                </v-card-text>
              </v-card>

              <!-- Empty State -->
              <v-card v-else variant="outlined" class="text-center pa-8">
                <v-icon icon="mdi-map-marker-path" size="64" color="grey"></v-icon>
                <div class="text-h6 mt-4 mb-2">Keine Datei ausgewaehlt</div>
                <div class="text-caption text-grey">Laden Sie eine GPX-Datei hoch, um Route + Hoehenprofil zu erstellen</div>
              </v-card>
            </v-card-text>

            <v-card-actions>
              <v-btn variant="text" @click="goBack">
                <v-icon start>mdi-chevron-left</v-icon>
                Zurueck
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                variant="flat"
                :disabled="tableItems.length === 0 || routePoints.length === 0"
                @click="currentStep = 2"
              >
                Weiter
                <v-icon end>mdi-chevron-right</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-window-item>

        <!-- Step 2: Visualization -->
        <v-window-item :value="2" eager>
          <div class="visualization-wrapper">
            <!-- Mode Toggle -->
            <div class="mode-toggle-container">
              <v-btn-toggle
                v-model="visualizationMode"
                mandatory
                density="compact"
                variant="outlined"
                divided
              >
                <v-btn value="route-map" size="small">
                  <v-icon start size="small">mdi-map-marker-path</v-icon>
                  2D Routenkarte
                </v-btn>
                <v-btn value="terrain" size="small">
                  <v-icon start size="small">mdi-mountain</v-icon>
                  3D Gelände
                </v-btn>
              </v-btn-toggle>
            </div>

            <RouteMapChartStep
              v-if="currentStep === 2 && visualizationMode === 'route-map'"
              v-model:chart-title="chartTitle"
              v-model:animation-config="routeMapConfig"
              :route-points="routePoints"
              :chart-data="chartDataForAnimation"
              :time-array="timeArray"
              @back="currentStep = 1"
              @save="saveChart"
            />

            <TerrainChartStep
              v-if="currentStep === 2 && visualizationMode === 'terrain'"
              v-model:chart-title="chartTitle"
              v-model:animation-config="terrainConfig"
              :route-points="routePoints"
              :chart-data="chartDataForAnimation"
              :time-array="timeArray"
              @back="currentStep = 1"
              @save="saveChart"
            />
          </div>
        </v-window-item>
      </v-window>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import StepNavigation from './StepNavigation.vue'
import RouteMapChartStep, {
  type RouteMapAnimationConfig,
  DEFAULT_ROUTEMAP_ANIMATION_CONFIG,
} from './chartWorkflow/RouteMapChartStep.vue'
import TerrainChartStep, {
  DEFAULT_TERRAIN_ANIMATION_CONFIG,
} from './chartWorkflow/TerrainChartStep.vue'
import type { TerrainAnimationConfig } from './chartWorkflow/TerrainChartStep.vue'
import { useCSVParser, DEFAULT_DOWNSAMPLE_OPTIONS, type GPXWarning } from '../composables/useCSVParser'
import { getWarningSeverityColor, getWarningIcon } from '../utils/gpxValidation'
import { chartService } from '../services/chart.service'
import { extractNormalizedTimeArray, buildSmoothedTimeArray } from '../utils/timeMapping'
import type { GPXParseResult } from '../composables/useCSVParser'
import type { RoutePoint } from '@chart-generator/shared'

const router = useRouter()
const route = useRoute()

const workflowSteps = [
  {
    value: 1,
    title: 'Hochladen',
    description: 'GPX-Datei hochladen',
    icon: 'mdi-file-upload',
  },
  {
    value: 2,
    title: 'Visualisierung',
    description: 'Route visualisieren',
    icon: 'mdi-map-marker-path',
  },
]

// Stepper state
const currentStep = ref(1)
const stepNavCollapsed = ref(false)
const loadedChartId = ref<string | null>(null)

// Visualization mode
const visualizationMode = ref<'route-map' | 'terrain'>('route-map')

// File upload state
const uploadedFile = ref<File[]>([])
const lastGPXResult = ref<GPXParseResult | null>(null)
const routePoints = ref<RoutePoint[]>([])

// CSV Parser composable
const { tableHeaders, tableItems, parseGPX, resetData } = useCSVParser()

// Chart configs (preserved independently on mode switch)
const chartTitle = ref('Route Map')
const routeMapConfig = ref<RouteMapAnimationConfig>({ ...DEFAULT_ROUTEMAP_ANIMATION_CONFIG })
const terrainConfig = ref<TerrainAnimationConfig>({ ...DEFAULT_TERRAIN_ANIMATION_CONFIG })

// Chart data for animation (distance → elevation)
const chartDataForAnimation = computed(() => {
  if (tableItems.value.length === 0) return []
  return tableItems.value.map(item => ({
    label: String(item.col_0),
    value: Number(item.col_1) || 0,
  }))
})

// Smoothed time array
const timeArray = computed<number[] | undefined>(() => {
  if (lastGPXResult.value) {
    const points = lastGPXResult.value.downsampling.points
    const raw = extractNormalizedTimeArray(points)
    if (raw) return buildSmoothedTimeArray(raw)
  }

  if (tableItems.value.length > 0 && tableItems.value[0].col_2 != null) {
    const lastTime = Number(tableItems.value[tableItems.value.length - 1].col_2)
    if (lastTime > 0) {
      const raw = tableItems.value.map(item => Number(item.col_2) / lastTime)
      return buildSmoothedTimeArray(raw)
    }
  }

  return undefined
})

// Downsampling info
const downsamplingInfo = computed(() => {
  if (!lastGPXResult.value) return null
  const { downsampling } = lastGPXResult.value
  if (!downsampling.wasDownsampled) return null
  return {
    original: downsampling.originalCount,
    reduced: downsampling.downsampledCount,
    percentage: Math.round((1 - downsampling.downsampledCount / downsampling.originalCount) * 100),
  }
})

// GPX validation warnings
const gpxWarnings = computed((): GPXWarning[] => {
  if (!lastGPXResult.value) return []
  return lastGPXResult.value.validation.warnings
})

// GPX stats
const gpxStats = computed(() => {
  if (!lastGPXResult.value) return null
  return lastGPXResult.value.validation.stats
})

// Step validations
const stepValidations = computed(() => ({
  1: {
    isValid: tableItems.value.length > 0 && routePoints.value.length > 0,
    missingTodos: [
      ...(tableItems.value.length === 0 ? ['GPX-Datei hochladen'] : []),
      ...(routePoints.value.length === 0 ? ['GPX muss GPS-Koordinaten enthalten'] : []),
      ...(gpxWarnings.value.some(w => w.severity === 'error') ? ['GPX-Fehler beheben'] : []),
    ],
  },
  2: {
    isValid: !!chartTitle.value.trim(),
    missingTodos: !chartTitle.value.trim() ? ['Chart-Titel eingeben'] : [],
  },
}))

function handleFileUpload(files: File | File[] | null) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  lastGPXResult.value = null
  routePoints.value = []

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (!text) return

    const result = parseGPX(text, DEFAULT_DOWNSAMPLE_OPTIONS)
    lastGPXResult.value = result
    routePoints.value = result.routePoints
  }
  reader.readAsText(file)
}

function goBack() {
  router.push('/dashboard')
}

function resetWizard() {
  currentStep.value = 1
  loadedChartId.value = null
  uploadedFile.value = []
  lastGPXResult.value = null
  routePoints.value = []
  resetData()
  visualizationMode.value = 'route-map'
  routeMapConfig.value = { ...DEFAULT_ROUTEMAP_ANIMATION_CONFIG }
  terrainConfig.value = { ...DEFAULT_TERRAIN_ANIMATION_CONFIG }
  chartTitle.value = 'Route Map'
}

async function saveChart() {
  try {
    const type = visualizationMode.value === 'route-map' ? 'route-map' : 'terrain-3d'
    const animationConfig = visualizationMode.value === 'route-map' ? routeMapConfig.value : terrainConfig.value
    const chartConfig = {
      animationConfig,
      routePoints: routePoints.value,
    }

    if (loadedChartId.value) {
      await chartService.updateChart(loadedChartId.value, {
        title: chartTitle.value,
        type,
        data: { tableItems: tableItems.value, routePoints: routePoints.value },
        config: chartConfig,
        svgContent: '',
      })
      alert('Chart erfolgreich aktualisiert!')
    } else {
      const chart = await chartService.createChart({
        title: chartTitle.value,
        type,
        data: { tableItems: tableItems.value, routePoints: routePoints.value },
        config: chartConfig,
        svgContent: '',
      })
      loadedChartId.value = chart.id
      alert('Chart erfolgreich gespeichert!')
    }
    router.push('/dashboard')
  } catch (error) {
    console.error('Error saving chart:', error)
    alert('Fehler beim Speichern des Charts')
  }
}

onMounted(async () => {
  // Apply mode from query param
  const modeParam = route.query.mode as string
  if (modeParam === 'terrain') {
    visualizationMode.value = 'terrain'
  } else {
    visualizationMode.value = 'route-map'
  }

  const chartId = route.query.id as string
  if (chartId) {
    await loadChartData(chartId)
  }
})

// When the user navigates from an existing chart (/gpx?id=x) to creating a
// new one (/gpx?mode=route-map), the component is NOT remounted by Vue Router.
// Detect this and reset to the upload step.
watch(
  () => route.query.id,
  (newId, oldId) => {
    if (oldId && !newId) {
      resetWizard()
    }
  },
)

async function loadChartData(chartId: string) {
  try {
    const chart = await chartService.getChartById(chartId)
    loadedChartId.value = chart.id
    chartTitle.value = chart.title

    // Set mode based on saved chart type
    if (chart.type === 'terrain-3d') {
      visualizationMode.value = 'terrain'
    } else {
      visualizationMode.value = 'route-map'
    }

    const savedData = chart.data as any
    const savedConfig = chart.config as any

    if (savedData.tableItems && Array.isArray(savedData.tableItems)) {
      const firstItem = savedData.tableItems[0]
      if (firstItem) {
        tableHeaders.value = Object.keys(firstItem).map((key) => ({
          title: key,
          key,
          sortable: true,
        }))
      }
      tableItems.value = savedData.tableItems
    }

    if (savedData.routePoints && Array.isArray(savedData.routePoints)) {
      routePoints.value = savedData.routePoints
    }

    if (savedConfig.animationConfig) {
      if (chart.type === 'terrain-3d') {
        terrainConfig.value = { ...DEFAULT_TERRAIN_ANIMATION_CONFIG, ...savedConfig.animationConfig }
      } else {
        routeMapConfig.value = { ...DEFAULT_ROUTEMAP_ANIMATION_CONFIG, ...savedConfig.animationConfig }
      }
    }

    currentStep.value = 2
  } catch (error) {
    console.error('Error loading chart:', error)
    alert('Fehler beim Laden des Charts')
    router.push('/dashboard')
  }
}

window.addEventListener('chart:new', resetWizard)
onUnmounted(() => window.removeEventListener('chart:new', resetWizard))
</script>

<style scoped>
.gpx-generator-content :deep(.v-card) {
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(45, 42, 38, 0.06));
}

.card-header-bg {
  background: var(--color-surface-variant, #f5f5f5);
}

.visualization-wrapper {
  position: relative;
  height: calc(100vh - 100px);
}

.mode-toggle-container {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}
</style>
