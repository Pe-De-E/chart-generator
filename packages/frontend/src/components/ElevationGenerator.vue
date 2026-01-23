<template>
  <v-layout>
    <!-- Sidebar Navigation with 2 steps -->
    <StepNavigation
      v-model:current-step="currentStep"
      :steps="workflowSteps"
      :step-validations="stepValidations"
    />

    <!-- Main Content Area -->
    <v-main>
      <v-container fluid class="pa-6">
        <v-window v-model="currentStep">
          <!-- Step 1: Upload GPX -->
          <v-window-item :value="1">
            <v-card flat>
              <v-card-text>
                <div class="text-h5 mb-4">GPX-Datei hochladen</div>

                <v-file-input
                  v-model="uploadedFile"
                  label="GPX-Datei auswählen"
                  accept=".gpx"
                  variant="outlined"
                  prepend-icon="mdi-terrain"
                  show-size
                  hint="Laden Sie eine GPX-Datei für Ihr Höhenprofil hoch"
                  persistent-hint
                  @update:model-value="handleFileUpload"
                  class="mb-4"
                ></v-file-input>

                <!-- File Preview -->
                <v-card v-if="tableItems.length > 0" variant="outlined" class="mb-4">
                  <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
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
                      {{ tableItems.length }} Punkte geladen
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
                  </v-card-text>
                </v-card>

                <!-- Empty State -->
                <v-card v-else variant="outlined" class="text-center pa-8">
                  <v-icon icon="mdi-terrain" size="64" color="grey"></v-icon>
                  <div class="text-h6 mt-4 mb-2">Keine Datei ausgewählt</div>
                  <div class="text-caption text-grey">Laden Sie eine GPX-Datei hoch, um ein Höhenprofil zu erstellen</div>
                </v-card>
              </v-card-text>

              <v-card-actions>
                <v-btn variant="text" @click="goBack">
                  <v-icon start>mdi-chevron-left</v-icon>
                  Zurück
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn
                  color="primary"
                  variant="flat"
                  :disabled="tableItems.length === 0"
                  @click="handleUploadNext"
                >
                  Weiter
                  <v-icon end>mdi-chevron-right</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-window-item>

          <!-- Step 2: Create Chart -->
          <v-window-item :value="2">
            <ElevationChartStep
              v-model:chart-title="chartTitle"
              v-model:colors="colors"
              v-model:silhouette-mode="silhouetteMode"
              v-model:animation-config="animationConfig"
              :svg-content="svgContent"
              :series-config="selectedSeries"
              :style-overrides="styleOverrides"
              :chart-data="chartDataForAnimation"
              @update:styleOverrides="setStyleOverrides"
              @update-series-color="updateSeriesColor"
              @regenerate-colors="regenerateColors"
              @back="currentStep = 1"
              @reset="resetWizard"
              @download="downloadSVG"
              @save="saveChart"
              @show-fullscreen="showFullscreenPreview = true"
            />
          </v-window-item>
        </v-window>
      </v-container>
    </v-main>
  </v-layout>

  <!-- Fullscreen Preview Dialog -->
  <v-dialog v-model="showFullscreenPreview" fullscreen>
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>
          <v-icon icon="mdi-terrain" class="mr-2"></v-icon>
          {{ chartTitle }}
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-download"
          @click="downloadSVG"
        ></v-btn>
        <v-btn
          icon="mdi-close"
          @click="showFullscreenPreview = false"
        ></v-btn>
      </v-toolbar>
      <v-card-text class="pa-8 d-flex align-center justify-center" style="height: calc(100vh - 64px); background: #f5f5f5;">
        <div class="fullscreen-preview-container" v-html="svgContent"></div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import StepNavigation from './StepNavigation.vue'
import ElevationChartStep, {
  type ElevationAnimationConfig,
  DEFAULT_ELEVATION_ANIMATION_CONFIG
} from './chartWorkflow/ElevationChartStep.vue'
import { useCSVParser, DEFAULT_DOWNSAMPLE_OPTIONS } from '../composables/useCSVParser'
import { useSeriesSelection } from '../composables/useSeriesSelection'
import { useChartConfig } from '../composables/useChartConfig'
import { useDataGrouping } from '../composables/useDataGrouping'
import { chartService } from '../services/chart.service'
import type { GPXParseResult } from '../composables/useCSVParser'

const router = useRouter()
const route = useRoute()

// Workflow steps for elevation generator (only 2 steps)
const workflowSteps = [
  {
    value: 1,
    title: 'Hochladen',
    description: 'GPX-Datei hochladen',
    icon: 'mdi-file-upload'
  },
  {
    value: 2,
    title: 'Chart erstellen',
    description: 'Höhenprofil generieren',
    icon: 'mdi-terrain'
  }
]

// Stepper state
const currentStep = ref(1)
const loadedChartId = ref<string | null>(null)

// Dialogs
const showFullscreenPreview = ref(false)

// File upload state
const uploadedFile = ref<File[]>([])
const lastGPXResult = ref<GPXParseResult | null>(null)

// CSV Parser composable
const {
  tableHeaders,
  tableItems,
  numericColumnOptions,
  parseGPX,
  resetData
} = useCSVParser()

// Column selection (fixed for GPX: col_0 = distance, col_1 = elevation)
const selectedLabelColumn = ref('col_0')

// Series Selection composable
const {
  selectedSeries,
  addSeries,
  updateSeriesColor,
  regenerateColors,
  resetSeries
} = useSeriesSelection(numericColumnOptions)

// Data Grouping composable
const {
  seriesData,
  resetGrouping
} = useDataGrouping(tableItems, selectedLabelColumn, selectedSeries)

// Chart Config composable - fixed to 'elevation' type
const {
  chartType,
  chartTitle,
  colors,
  silhouetteMode,
  svgContent,
  downloadSVG,
  resetConfig,
  styleOverrides,
  setStyleOverrides
} = useChartConfig(seriesData, selectedSeries)

// Set chart type to 'elevation' immediately
chartType.value = 'elevation'

// Animation config for elevation chart (persisted)
const animationConfig = ref<ElevationAnimationConfig>({ ...DEFAULT_ELEVATION_ANIMATION_CONFIG })

// Chart data for animation
const chartDataForAnimation = computed(() => {
  if (seriesData.value.length === 0 || selectedSeries.value.length === 0) {
    return []
  }
  const firstSeriesName = selectedSeries.value[0]?.name
  if (!firstSeriesName) return []

  return seriesData.value.map(d => ({
    label: d.label,
    value: d.values[firstSeriesName] ?? 0
  }))
})

// Downsampling info
const downsamplingInfo = computed(() => {
  if (!lastGPXResult.value) return null
  const { downsampling } = lastGPXResult.value
  if (!downsampling.wasDownsampled) return null
  return {
    original: downsampling.originalCount,
    reduced: downsampling.downsampledCount,
    percentage: Math.round((1 - downsampling.downsampledCount / downsampling.originalCount) * 100)
  }
})

// Step validations
const validateStep1 = computed(() => {
  const missingTodos: string[] = []
  if (tableItems.value.length === 0) {
    missingTodos.push('GPX-Datei hochladen')
  }
  return {
    isValid: missingTodos.length === 0,
    missingTodos
  }
})

const validateStep2 = computed(() => {
  const missingTodos: string[] = []
  if (!chartTitle.value || chartTitle.value.trim() === '') {
    missingTodos.push('Chart-Titel eingeben')
  }
  if (!svgContent.value) {
    missingTodos.push('Chart muss generiert werden')
  }
  return {
    isValid: missingTodos.length === 0,
    missingTodos
  }
})

const stepValidations = computed(() => ({
  1: validateStep1.value,
  2: validateStep2.value
}))

// File upload handler
function handleFileUpload(files: File | File[] | null) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  lastGPXResult.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (!text) return

    const result = parseGPX(text, DEFAULT_DOWNSAMPLE_OPTIONS)
    lastGPXResult.value = result

    // Auto-configure for elevation profile
    selectedLabelColumn.value = 'col_0'
    resetSeries()
    addSeries('col_1')
    chartTitle.value = 'Höhenprofil'
  }
  reader.readAsText(file)
}

// Navigation handlers
function handleUploadNext() {
  currentStep.value = 2
}

function goBack() {
  router.push('/')
}

function resetWizard() {
  currentStep.value = 1
  loadedChartId.value = null
  uploadedFile.value = []
  lastGPXResult.value = null
  resetSeries()
  resetData()
  resetGrouping()
  resetConfig()
  animationConfig.value = { ...DEFAULT_ELEVATION_ANIMATION_CONFIG }
}

// Save chart
async function saveChart() {
  try {
    const chartConfig = {
      seriesConfig: selectedSeries.value,
      colors: colors.value,
      selectedLabelColumn: selectedLabelColumn.value,
      selectedValueColumns: ['col_1'],
      silhouetteMode: silhouetteMode.value,
      animationConfig: animationConfig.value,
    }

    if (loadedChartId.value) {
      await chartService.updateChart(loadedChartId.value, {
        title: chartTitle.value,
        type: 'elevation',
        data: {
          seriesData: seriesData.value,
          tableItems: tableItems.value,
        },
        config: chartConfig,
        svgContent: svgContent.value,
      })
      alert('Chart erfolgreich aktualisiert!')
    } else {
      const chart = await chartService.createChart({
        title: chartTitle.value,
        type: 'elevation',
        data: {
          seriesData: seriesData.value,
          tableItems: tableItems.value,
        },
        config: chartConfig,
        svgContent: svgContent.value,
      })
      loadedChartId.value = chart.id
      alert('Chart erfolgreich gespeichert!')
    }
    router.push('/')
  } catch (error) {
    console.error('Error saving chart:', error)
    alert('Fehler beim Speichern des Charts')
  }
}

// Load chart if ID is in query
onMounted(async () => {
  const chartId = route.query.id as string
  if (chartId) {
    await loadChartData(chartId)
  }
})

async function loadChartData(chartId: string) {
  try {
    const chart = await chartService.getChartById(chartId)
    loadedChartId.value = chart.id
    chartTitle.value = chart.title

    const savedData = chart.data as any
    const savedConfig = chart.config as any

    if (savedData.tableItems && Array.isArray(savedData.tableItems)) {
      const firstItem = savedData.tableItems[0]
      if (firstItem) {
        const headers = Object.keys(firstItem).map((key) => ({
          title: key,
          key,
          sortable: true,
        }))
        tableHeaders.value = headers
      }
      tableItems.value = savedData.tableItems
    }

    if (savedConfig.selectedLabelColumn) {
      selectedLabelColumn.value = savedConfig.selectedLabelColumn
    }
    if (savedConfig.seriesConfig && Array.isArray(savedConfig.seriesConfig)) {
      savedConfig.seriesConfig.forEach((series: any) => {
        selectedSeries.value.push({
          name: series.name,
          columnKey: series.columnKey,
          color: series.color,
        })
      })
    }
    if (savedConfig.colors) {
      colors.value = savedConfig.colors
    }
    if (savedConfig.silhouetteMode !== undefined) {
      silhouetteMode.value = savedConfig.silhouetteMode
    }
    if (savedConfig.animationConfig) {
      animationConfig.value = {
        ...DEFAULT_ELEVATION_ANIMATION_CONFIG,
        ...savedConfig.animationConfig,
      }
    }

    currentStep.value = 2
  } catch (error) {
    console.error('Error loading chart:', error)
    alert('Fehler beim Laden des Charts')
    router.push('/')
  }
}

// Listen for "New Chart" event
window.addEventListener('chart:new', resetWizard)
onUnmounted(() => {
  window.removeEventListener('chart:new', resetWizard)
})
</script>

<style scoped>
.fullscreen-preview-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>
