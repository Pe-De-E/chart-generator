<template>
  <div class="terrain-generator-layout">
    <StepNavigation
      v-model:current-step="currentStep"
      v-model:collapsed="stepNavCollapsed"
      :steps="workflowSteps"
      :step-validations="stepValidations"
    />

    <div class="terrain-generator-content" :class="{ 'nav-collapsed': stepNavCollapsed }">
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
                prepend-icon="mdi-terrain"
                show-size
                hint="Laden Sie eine GPX-Datei mit Elevation-Daten hoch"
                persistent-hint
                @update:model-value="handleFileUpload"
                class="mb-4"
              />

              <!-- File Preview -->
              <v-card v-if="tableItems.length > 0" variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 card-header-bg">
                  <v-icon icon="mdi-eye" class="mr-2" />
                  Vorschau (erste 5 Punkte)
                </v-card-title>
                <v-card-text class="pa-0">
                  <v-data-table
                    :headers="tableHeaders"
                    :items="tableItems.slice(0, 5)"
                    density="compact"
                    hide-default-footer
                    class="elevation-0"
                  />
                </v-card-text>
                <v-card-text>
                  <v-alert type="info" variant="tonal" density="compact">
                    <div class="d-flex align-center justify-space-between flex-wrap ga-2">
                      <span>{{ tableItems.length }} Punkte geladen</span>
                      <div v-if="gpxStats" class="text-caption d-flex ga-3">
                        <span><v-icon size="small" class="mr-1">mdi-map-marker-distance</v-icon>{{ gpxStats.totalDistanceKm.toFixed(1) }} km</span>
                        <span><v-icon size="small" class="mr-1">mdi-arrow-up-bold</v-icon>{{ gpxStats.elevationGain }} m</span>
                      </div>
                    </div>
                  </v-alert>

                  <v-alert v-if="routePoints.length > 0" type="success" variant="tonal" density="compact" class="mt-2">
                    <v-icon icon="mdi-terrain" class="mr-1" />
                    {{ routePoints.length }} Routenpunkte mit GPS + Höhe geladen
                  </v-alert>

                  <v-alert v-if="downsamplingInfo" type="success" variant="tonal" density="compact" class="mt-2">
                    Optimiert: {{ downsamplingInfo.original.toLocaleString() }} → {{ downsamplingInfo.reduced.toLocaleString() }} Punkte
                  </v-alert>

                  <v-alert
                    v-for="(warning, i) in gpxWarnings" :key="i"
                    :type="getWarningSeverityColor(warning.severity)"
                    variant="tonal" density="compact" class="mt-2"
                  >
                    <template #prepend><v-icon :icon="getWarningIcon(warning.type)" /></template>
                    <div class="font-weight-medium">{{ warning.message }}</div>
                    <div class="text-caption">{{ warning.suggestion }}</div>
                  </v-alert>
                </v-card-text>
              </v-card>

              <v-card v-else variant="outlined" class="text-center pa-8">
                <v-icon icon="mdi-terrain" size="64" color="grey" />
                <div class="text-h6 mt-4 mb-2">Keine Datei ausgewählt</div>
                <div class="text-caption text-grey">GPX mit Höhenprofil für 3D-Gelände</div>
              </v-card>
            </v-card-text>

            <v-card-actions>
              <v-btn variant="text" @click="goBack">
                <v-icon start>mdi-chevron-left</v-icon>Zurück
              </v-btn>
              <v-spacer />
              <v-btn
                color="primary" variant="flat"
                :disabled="tableItems.length === 0 || routePoints.length === 0"
                @click="currentStep = 2"
              >
                Weiter<v-icon end>mdi-chevron-right</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-window-item>

        <!-- Step 2: 3D Terrain -->
        <v-window-item :value="2" eager>
          <TerrainChartStep
            v-model:chart-title="chartTitle"
            v-model:animation-config="animationConfig"
            :route-points="routePoints"
            :chart-data="chartDataForAnimation"
            :time-array="timeArray"
            @back="currentStep = 1"
            @save="saveChart"
          />
        </v-window-item>

      </v-window>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import StepNavigation from './StepNavigation.vue'
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
  { value: 1, title: 'Hochladen', description: 'GPX-Datei hochladen', icon: 'mdi-file-upload' },
  { value: 2, title: '3D Gelände', description: '3D-Terrain generieren', icon: 'mdi-terrain' },
]

const currentStep = ref(1)
const stepNavCollapsed = ref(false)
const loadedChartId = ref<string | null>(null)
const uploadedFile = ref<File[]>([])
const lastGPXResult = ref<GPXParseResult | null>(null)
const routePoints = ref<RoutePoint[]>([])
const chartTitle = ref('3D Gelände')
const animationConfig = ref<TerrainAnimationConfig>({ ...DEFAULT_TERRAIN_ANIMATION_CONFIG })

const { tableHeaders, tableItems, parseGPX, resetData } = useCSVParser()

const chartDataForAnimation = computed(() => {
  if (tableItems.value.length === 0) return []
  return tableItems.value.map(item => ({
    label: String(item.col_0),
    value: Number(item.col_1) || 0,
  }))
})

const timeArray = computed<number[] | undefined>(() => {
  if (lastGPXResult.value) {
    const pts = lastGPXResult.value.downsampling.points
    const raw = extractNormalizedTimeArray(pts)
    if (raw) return buildSmoothedTimeArray(raw)
  }
  return undefined
})

const downsamplingInfo = computed(() => {
  if (!lastGPXResult.value?.downsampling.wasDownsampled) return null
  const { downsampling } = lastGPXResult.value
  return {
    original: downsampling.originalCount,
    reduced: downsampling.downsampledCount,
  }
})

const gpxWarnings = computed((): GPXWarning[] => lastGPXResult.value?.validation.warnings ?? [])
const gpxStats = computed(() => lastGPXResult.value?.validation.stats ?? null)

const stepValidations = computed(() => ({
  1: {
    isValid: tableItems.value.length > 0 && routePoints.value.length > 0,
    missingTodos: [
      ...(tableItems.value.length === 0 ? ['GPX-Datei hochladen'] : []),
      ...(routePoints.value.length === 0 ? ['GPX muss GPS-Koordinaten enthalten'] : []),
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
    chartTitle.value = '3D Gelände'
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
  animationConfig.value = { ...DEFAULT_TERRAIN_ANIMATION_CONFIG }
  chartTitle.value = '3D Gelände'
}

async function saveChart() {
  try {
    const chartConfig = { animationConfig: animationConfig.value, routePoints: routePoints.value }
    if (loadedChartId.value) {
      await chartService.updateChart(loadedChartId.value, {
        title: chartTitle.value, type: 'terrain-3d',
        data: { tableItems: tableItems.value, routePoints: routePoints.value },
        config: chartConfig, svgContent: '',
      })
      alert('Chart erfolgreich aktualisiert!')
    } else {
      const chart = await chartService.createChart({
        title: chartTitle.value, type: 'terrain-3d',
        data: { tableItems: tableItems.value, routePoints: routePoints.value },
        config: chartConfig, svgContent: '',
      })
      loadedChartId.value = chart.id
      alert('Chart erfolgreich gespeichert!')
    }
    router.push('/dashboard')
  } catch (err) {
    console.error('Error saving chart:', err)
    alert('Fehler beim Speichern')
  }
}

onMounted(async () => {
  const chartId = route.query.id as string
  if (chartId) {
    try {
      const chart = await chartService.getChartById(chartId)
      loadedChartId.value = chart.id
      chartTitle.value = chart.title
      const savedData = chart.data as any
      const savedConfig = chart.config as any
      if (savedData.tableItems) {
        const headers = Object.keys(savedData.tableItems[0] ?? {}).map(k => ({ title: k, key: k, sortable: true }))
        tableHeaders.value = headers
        tableItems.value = savedData.tableItems
      }
      if (savedData.routePoints) routePoints.value = savedData.routePoints
      if (savedConfig.animationConfig) {
        animationConfig.value = { ...DEFAULT_TERRAIN_ANIMATION_CONFIG, ...savedConfig.animationConfig }
      }
      currentStep.value = 2
    } catch {
      router.push('/dashboard')
    }
  }
})

window.addEventListener('chart:new', resetWizard)
onUnmounted(() => window.removeEventListener('chart:new', resetWizard))
</script>

<style scoped>
.terrain-generator-layout {
  position: relative;
  height: calc(100vh - 48px);
  margin: -24px;
  overflow: hidden;
}

.terrain-generator-content {
  margin-left: 280px;
  height: 100%;
  padding: 16px;
  background: rgb(var(--v-theme-background));
  overflow: hidden;
  transition: margin-left 0.2s ease;
}

.terrain-generator-content.nav-collapsed { margin-left: 72px; }

.terrain-generator-content :deep(.v-window),
.terrain-generator-content :deep(.v-window__container),
.terrain-generator-content :deep(.v-window-item) { height: 100%; }

.terrain-generator-content :deep(.v-card) {
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(45, 42, 38, 0.06));
}

.card-header-bg { background: var(--color-surface-variant, #f5f5f5); }
</style>
