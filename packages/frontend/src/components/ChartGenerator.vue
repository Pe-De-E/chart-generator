<template>
  <v-layout>
    <!-- Sidebar Navigation -->
    <StepNavigation
      v-model:current-step="currentStep"
      :completed-steps="completedStepsList"
      :step-validations="stepValidations"
    />

    <!-- Main Content Area -->
    <v-main>
      <v-container fluid class="pa-6">
        <v-window v-model="currentStep">
          <!-- Step 1: Upload CSV -->
          <v-window-item :value="1">
            <FileUploadStep
              :table-headers="tableHeaders"
              :table-items="tableItems"
              :parse-c-s-v="parseCSV"
              :parse-g-p-x="parseGPX"
              @next="handleUploadNext"
              @gpx-loaded="handleGPXLoaded"
            />
          </v-window-item>

          <!-- Step 2: Configure & Clean -->
          <v-window-item :value="2">
            <DataCleaningStep
              :table-headers="tableHeaders"
              :table-items="tableItems"
              :cleaned-table-items="cleanedTableItems"
              :cleaning-suggestions="cleaningSuggestions"
              :applied-operations="appliedOperations"
              :operation-history="[]"
              :selected-options="selectedOptions"
              :is-processing="isProcessing"
              :error-message="errorMessage"
              :has-changes="hasChanges"
              :cleaning-summary="cleaningSummary"
              v-model:selected-label-column="selectedLabelColumn"
              v-model:selected-value-columns="selectedValueColumnKeys"
              @back="currentStep = 1"
              @next="handleConfigureNext"
              @skip="handleSkipCleaning"
              @apply="applyOperation"
              @reset="resetToOriginal"
              @undo="undoLastOperation"
            />
          </v-window-item>

          <!-- Step 3: Create Chart -->
          <v-window-item :value="3">
            <ChartCreationStep
              v-model:chart-title="chartTitle"
              v-model:chart-type="chartType"
              v-model:colors="colors"
              v-model:statistical-overlays="statisticalOverlays"
              v-model:silhouette-mode="silhouetteMode"
              :data-extent="dataExtent"
              :svg-content="svgContent"
              :series-config="selectedSeries"
              @update-series-color="updateSeriesColor"
              @regenerate-colors="regenerateColors"
              @back="handleChartStepBack"
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

  <!-- Data Quality Dialog -->
  <v-dialog v-model="showQualityDialog" max-width="800" scrollable>
    <v-card>
      <v-card-title class="bg-grey-lighten-4 d-flex align-items-center justify-space-between">
        <div>
          <v-icon icon="mdi-clipboard-check-outline" class="mr-2"></v-icon>
          Datenqualitätsanalyse
        </div>
        <v-chip
          :color="getQualityColor(dataQuality.qualityScore)"
          variant="flat"
        >
          {{ getQualityLabel(dataQuality.qualityScore) }}
        </v-chip>
      </v-card-title>

      <v-card-text class="pt-4">
        <!-- Overall Quality Score -->
        <v-card class="mb-4" variant="outlined">
          <v-card-text>
            <div class="text-h6 mb-3">Gesamtbewertung</div>
            <v-row>
              <v-col cols="12" md="6">
                <div class="text-center">
                  <div class="text-h2 font-weight-bold" :style="{ color: getQualityColorHex(dataQuality.qualityScore) }">
                    {{ dataQuality.completenessPercentage }}%
                  </div>
                  <div class="text-caption text-grey">Vollständigkeit</div>
                  <v-progress-linear
                    :model-value="dataQuality.completenessPercentage"
                    :color="getQualityColor(dataQuality.qualityScore)"
                    height="20"
                    class="mt-2"
                  >
                    <template v-slot:default="{ value }">
                      <strong>{{ Math.ceil(value) }}%</strong>
                    </template>
                  </v-progress-linear>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title class="text-caption">Gesamtzeilen</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 font-weight-bold">
                      {{ dataQuality.totalRows }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="text-caption">Gesamtfelder</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 font-weight-bold">
                      {{ dataQuality.totalFields }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="text-caption">Gefüllte Felder</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 font-weight-bold text-success">
                      {{ dataQuality.filledFields }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="text-caption">Leere Felder</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 font-weight-bold text-error">
                      {{ dataQuality.emptyFields }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Column Statistics -->
        <v-card variant="outlined" v-if="Object.keys(dataQuality.missingValuesByColumn).length > 0">
          <v-card-text>
            <div class="text-h6 mb-3">Spaltenstatistiken</div>
            <v-expansion-panels variant="accordion">
              <v-expansion-panel v-for="[columnName, missingCount] in Object.entries(dataQuality.missingValuesByColumn)" :key="columnName">
                <v-expansion-panel-title>
                  <div class="d-flex justify-space-between align-center w-100 pr-4">
                    <span class="font-weight-medium">{{ getColumnTitle(columnName) }}</span>
                    <v-chip :color="missingCount === 0 ? 'success' : 'warning'" size="small">
                      {{ dataQuality.totalRows - missingCount }}/{{ dataQuality.totalRows }} gefüllt
                    </v-chip>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list density="compact">
                    <v-list-item>
                      <v-list-item-title class="text-caption">Vollständigkeit</v-list-item-title>
                      <v-list-item-subtitle>
                        <v-progress-linear
                          :model-value="((dataQuality.totalRows - missingCount) / dataQuality.totalRows) * 100"
                          :color="missingCount === 0 ? 'success' : 'warning'"
                          height="16"
                          class="mt-1"
                        >
                          <template v-slot:default="{ value }">
                            <small>{{ Math.ceil(value) }}%</small>
                          </template>
                        </v-progress-linear>
                      </v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-title class="text-caption">Gefüllte Zeilen</v-list-item-title>
                      <v-list-item-subtitle class="text-success">{{ dataQuality.totalRows - missingCount }}</v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-title class="text-caption">Leere Zeilen</v-list-item-title>
                      <v-list-item-subtitle class="text-error">{{ missingCount }}</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>

        <!-- Issues List -->
        <v-card variant="outlined" class="mt-4" v-if="dataQuality.issues.length > 0">
          <v-card-text>
            <div class="text-h6 mb-3">
              <v-icon icon="mdi-alert-circle-outline" color="warning" class="mr-2"></v-icon>
              Gefundene Probleme
            </div>
            <v-list>
              <v-list-item v-for="(issue, index) in dataQuality.issues" :key="index">
                <template v-slot:prepend>
                  <v-icon color="warning">mdi-alert</v-icon>
                </template>
                <v-list-item-title>{{ issue }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- No Issues -->
        <v-card variant="outlined" class="mt-4 text-center py-8" v-else>
          <v-card-text>
            <v-icon icon="mdi-check-circle" color="success" size="64"></v-icon>
            <div class="text-h6 mt-2">Keine Probleme gefunden!</div>
            <div class="text-caption text-grey">Ihre Daten sind in ausgezeichnetem Zustand.</div>
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-card-actions class="bg-grey-lighten-4">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="flat"
          @click="showQualityDialog = false"
        >
          Schließen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Fullscreen Preview Dialog -->
  <v-dialog v-model="showFullscreenPreview" fullscreen>
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>
          <v-icon icon="mdi-chart-bar" class="mr-2"></v-icon>
          {{ chartTitle }} ({{ chartType.toUpperCase() }})
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import StepNavigation from './StepNavigation.vue'
import FileUploadStep from './chartWorkflow/FileUploadStep.vue'
import DataCleaningStep from './chartWorkflow/DataCleaningStep.vue'
import ChartCreationStep from './chartWorkflow/ChartCreationStep/ChartCreationStep.vue'
import { useCSVParser } from '../composables/useCSVParser'
import { useSeriesSelection } from '../composables/useSeriesSelection'
import { useChartConfig } from '../composables/useChartConfig'
import { useDataGrouping } from '../composables/useDataGrouping'
import { useDataCleaning } from '../composables/useDataCleaning'
import {
  analyzeDataQuality,
  getQualityColor,
  getQualityLabel
} from '../utils/dataQuality'
import { chartService } from '../services/chart.service'

const router = useRouter()
const route = useRoute()

// Stepper state
const currentStep = ref(1)
const loadedChartId = ref<string | null>(null)

// Step validation interface
interface StepValidation {
  isValid: boolean
  missingTodos: string[]
}

// Validate Step 1: File Upload
const validateStep1 = computed((): StepValidation => {
  const missingTodos: string[] = []

  if (tableItems.value.length === 0) {
    missingTodos.push('CSV-Datei hochladen')
  }
  if (tableHeaders.value.length === 0) {
    missingTodos.push('Daten müssen erfolgreich geparst werden')
  }

  return {
    isValid: missingTodos.length === 0,
    missingTodos
  }
})

// Validate Step 2: Configuration
const validateStep2 = computed((): StepValidation => {
  const missingTodos: string[] = []

  if (!selectedLabelColumn.value) {
    missingTodos.push('Label-Spalte auswählen')
  }
  if (selectedSeries.value.length === 0) {
    missingTodos.push('Mindestens eine Werte-Spalte auswählen')
  }

  return {
    isValid: missingTodos.length === 0,
    missingTodos
  }
})

// Validate Step 3: Chart Creation
const validateStep3 = computed((): StepValidation => {
  const missingTodos: string[] = []

  if (!chartType.value) {
    missingTodos.push('Chart-Typ auswählen')
  }
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

// Step validations map
const stepValidations = computed(() => ({
  1: validateStep1.value,
  2: validateStep2.value,
  3: validateStep3.value
}))

// Completed steps tracking for sidebar navigation
const completedStepsList = computed(() => {
  const completed: number[] = []
  // All steps before current step are considered completed
  for (let i = 1; i < currentStep.value; i++) {
    completed.push(i)
  }
  return completed
})

// Load chart if ID is in query
onMounted(async () => {
  const chartId = route.query.id as string
  if (chartId) {
    await loadChartData(chartId)
  }
})

// Dialogs
const showQualityDialog = ref(false)
const showFullscreenPreview = ref(false)

// CSV Parser composable
const {
  tableHeaders,
  tableItems,
  numericColumnOptions,
  parseCSV,
  parseGPX,
  resetData
} = useCSVParser()

// Column selection
const selectedLabelColumn = ref('col_0')

// Series Selection composable
const {
  selectedSeries,
  addSeries,
  removeSeries,
  updateSeriesColor,
  regenerateColors,
  resetSeries
} = useSeriesSelection(numericColumnOptions)

// Computed: Extract column keys from selected series
const selectedValueColumnKeys = computed({
  get: () => selectedSeries.value.map(s => s.columnKey),
  set: (keys: string[]) => {
    // Wenn Keys sich ändern, update selectedSeries
    // Entferne Spalten, die nicht mehr in keys sind
    const currentKeys = selectedSeries.value.map(s => s.columnKey)
    const toRemove = currentKeys.filter(k => !keys.includes(k))
    toRemove.forEach(key => {
      const index = selectedSeries.value.findIndex(s => s.columnKey === key)
      if (index > -1) removeSeries(index)
    })

    // Füge neue Spalten hinzu
    const toAdd = keys.filter(k => !currentKeys.includes(k))
    toAdd.forEach(key => addSeries(key))
  }
})

// Data quality computation (moved before useDataCleaning)
const dataQuality = computed(() => {
  if (tableItems.value.length === 0) {
    return analyzeDataQuality([])
  }

  const fullData = tableItems.value.map(row => {
    const dataPoint: any = {}
    Object.keys(row).forEach(key => {
      dataPoint[key] = row[key]
    })
    return dataPoint
  })

  return analyzeDataQuality(fullData)
})

// Data Cleaning composable (NEW)
const {
  cleanedTableItems,
  cleaningSuggestions,
  appliedOperations,
  selectedOptions,
  isProcessing,
  errorMessage,
  hasChanges,
  cleaningSummary,
  initializeCleaningStep,
  applyOperation,
  undoLastOperation,
  resetToOriginal,
  skipCleaning,
  finalizeChanges
} = useDataCleaning(tableItems, tableHeaders, dataQuality, selectedLabelColumn)

// Effective table items (cleaned or original)
const effectiveTableItems = computed(() =>
  cleanedTableItems.value.length > 0 ? cleanedTableItems.value : tableItems.value
)

// Data Grouping composable (with multi-series support) - now uses effectiveTableItems
const {
  seriesData,
  resetGrouping
} = useDataGrouping(effectiveTableItems, selectedLabelColumn, selectedSeries)

// Chart Config composable (with multi-series support)
const {
  chartType,
  chartTitle,
  colors,
  statisticalOverlays,
  silhouetteMode,
  dataExtent,
  svgContent,
  downloadSVG,
  resetConfig
} = useChartConfig(seriesData, selectedSeries)

// Helper functions
const getQualityColorHex = (score: 'excellent' | 'good' | 'fair' | 'poor'): string => {
  switch (score) {
    case 'excellent':
      return '#4CAF50'
    case 'good':
      return '#2196F3'
    case 'fair':
      return '#FF9800'
    case 'poor':
      return '#F44336'
  }
}

const getColumnTitle = (columnKey: string): string => {
  const header = tableHeaders.value.find(h => h.key === columnKey)
  return header ? header.title : columnKey
}

// Navigation handlers
const handleUploadNext = () => {
  // Initialize cleaning step when CSV is uploaded
  initializeCleaningStep()
  currentStep.value = 2
}

const handleGPXLoaded = () => {
  // Auto-configure for elevation profile
  // GPX parser sets col_0 = Entfernung (km), col_1 = Höhe (m)
  selectedLabelColumn.value = 'col_0'

  // Reset series and add elevation column
  resetSeries()
  addSeries('col_1')

  // Set chart type to elevation and title
  chartType.value = 'elevation'
  chartTitle.value = 'Höhenprofil'

  // Skip to chart creation step (skip cleaning for GPX)
  skipCleaning()
  currentStep.value = 3
}

const handleConfigureNext = () => {
  // Finalize any cleaning changes and move to chart creation
  if (hasChanges.value) {
    finalizeChanges()
  }
  currentStep.value = 3
}

const handleSkipCleaning = () => {
  // Skip cleaning and go directly to chart creation
  skipCleaning()
  currentStep.value = 3
}

const handleChartStepBack = () => {
  currentStep.value = 2 // Back to configure step
}

const resetWizard = () => {
  currentStep.value = 1
  selectedLabelColumn.value = 'col_0'
  resetSeries()
  resetData()
  resetGrouping()
  resetConfig()
  skipCleaning() // Reset cleaning state
}

const saveChart = async () => {
  try {
    if (loadedChartId.value) {
      // Update existing chart
      await chartService.updateChart(loadedChartId.value, {
        title: chartTitle.value,
        type: chartType.value,
        data: {
          seriesData: seriesData.value,
          tableItems: effectiveTableItems.value,
        },
        config: {
          seriesConfig: selectedSeries.value,
          colors: colors.value,
          statisticalOverlays: statisticalOverlays.value,
          selectedLabelColumn: selectedLabelColumn.value,
          selectedValueColumns: selectedValueColumnKeys.value,
        },
        svgContent: svgContent.value,
      })
      alert('Chart erfolgreich aktualisiert!')
    } else {
      // Create new chart
      const chart = await chartService.createChart({
        title: chartTitle.value,
        type: chartType.value,
        data: {
          seriesData: seriesData.value,
          tableItems: effectiveTableItems.value,
        },
        config: {
          seriesConfig: selectedSeries.value,
          colors: colors.value,
          statisticalOverlays: statisticalOverlays.value,
          selectedLabelColumn: selectedLabelColumn.value,
          selectedValueColumns: selectedValueColumnKeys.value,
        },
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

const loadChartData = async (chartId: string) => {
  try {
    const chart = await chartService.getChartById(chartId)
    loadedChartId.value = chart.id

    // Set chart configuration
    chartTitle.value = chart.title
    chartType.value = chart.type as any

    // Load data from saved chart
    const savedData = chart.data as any
    const savedConfig = chart.config as any

    if (savedData.tableItems && Array.isArray(savedData.tableItems)) {
      // Reconstruct table headers from first item
      const firstItem = savedData.tableItems[0]
      if (firstItem) {
        const headers = Object.keys(firstItem).map((key, index) => ({
          title: key,
          key,
          sortable: true,
        }))
        tableHeaders.value = headers
      }
      tableItems.value = savedData.tableItems
    }

    // Restore configuration
    if (savedConfig.selectedLabelColumn) {
      selectedLabelColumn.value = savedConfig.selectedLabelColumn
    }
    if (savedConfig.selectedValueColumns) {
      selectedValueColumnKeys.value = savedConfig.selectedValueColumns
    }
    if (savedConfig.seriesConfig && Array.isArray(savedConfig.seriesConfig)) {
      // Restore series selection
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
    if (savedConfig.statisticalOverlays) {
      statisticalOverlays.value = {
        ...statisticalOverlays.value,
        ...savedConfig.statisticalOverlays
      }
    }

    // Skip to chart creation step
    currentStep.value = 3
  } catch (error) {
    console.error('Error loading chart:', error)
    alert('Fehler beim Laden des Charts')
    router.push('/')
  }
}
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
