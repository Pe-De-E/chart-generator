<template>
  <v-stepper v-model="currentStep" alt-labels>
    <v-stepper-header>
      <v-stepper-item
        :complete="currentStep > 1"
        :value="1"
        title="Hochladen"
        icon="mdi-file-upload"
      ></v-stepper-item>

      <v-divider></v-divider>

      <v-stepper-item
        :complete="currentStep > 2"
        :value="2"
        title="Inspizieren"
        icon="mdi-table-eye"
      ></v-stepper-item>

      <v-divider></v-divider>

      <template v-if="showCleaningStep">
        <v-stepper-item
          :complete="currentStep > 3"
          :value="3"
          title="Bereinigen"
          icon="mdi-broom"
        ></v-stepper-item>

        <v-divider></v-divider>
      </template>

      <v-stepper-item
        :value="showCleaningStep ? 4 : 3"
        title="Chart erstellen"
        icon="mdi-chart-bar"
      ></v-stepper-item>
    </v-stepper-header>

    <v-stepper-window>
      <!-- Step 1: Upload CSV -->
      <v-stepper-window-item :value="1">
        <FileUploadStep
          :table-headers="tableHeaders"
          :table-items="tableItems"
          :parse-c-s-v="parseCSV"
          @next="currentStep = 2"
        />
      </v-stepper-window-item>

      <!-- Step 2: Inspect & Configure -->
      <v-stepper-window-item :value="2">
        <DataInspectionStep
          :table-headers="tableHeaders"
          :table-items="tableItems"
          :column-options="columnOptions"
          :numeric-column-options="numericColumnOptions"
          v-model:selected-label-column="selectedLabelColumn"
          :selected-value-columns="selectedSeries"
          :data-quality="dataQuality"
          :grouping-suggestion="groupingSuggestion"
          v-model:enable-grouping="enableGrouping"
          v-model:grouping-period="groupingPeriod"
          v-model:aggregation-method="aggregationMethod"
          v-model:numeric-range-size="numericRangeSize"
          @add-series="addSeries"
          @remove-series="removeSeries"
          @back="currentStep = 1"
          @next="handleStep2Next"
          @show-quality-dialog="showQualityDialog = true"
        />
      </v-stepper-window-item>

      <!-- Step 2b: Data Cleaning (conditional) -->
      <v-stepper-window-item v-if="showCleaningStep" :value="3">
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
          @back="currentStep = 2"
          @next="handleCleaningNext"
          @skip="handleSkipCleaning"
          @apply="applyOperation"
          @reset="resetToOriginal"
          @undo="undoLastOperation"
        />
      </v-stepper-window-item>

      <!-- Step 3/4: Create Chart -->
      <v-stepper-window-item :value="showCleaningStep ? 4 : 3">
        <ChartCreationStep
          v-model:chart-title="chartTitle"
          v-model:chart-type="chartType"
          v-model:colors="colors"
          :svg-content="svgContent"
          :series-config="selectedSeries"
          @update-series-color="updateSeriesColor"
          @regenerate-colors="regenerateColors"
          @back="handleChartStepBack"
          @reset="resetWizard"
          @download="downloadSVG"
          @show-fullscreen="showFullscreenPreview = true"
        />
      </v-stepper-window-item>
    </v-stepper-window>
  </v-stepper>

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
import { ref, computed } from 'vue'
import FileUploadStep from './steps/FileUploadStep.vue'
import DataInspectionStep from './steps/DataInspectionStep.vue'
import DataCleaningStep from './steps/DataCleaningStep.vue'
import ChartCreationStep from './steps/ChartCreationStep.vue'
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

// Stepper state
const currentStep = ref(1)

// Dialogs
const showQualityDialog = ref(false)
const showFullscreenPreview = ref(false)

// CSV Parser composable
const {
  tableHeaders,
  tableItems,
  columnOptions,
  numericColumnOptions,
  parseCSV,
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
  showCleaningStep,
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
  enableGrouping,
  groupingPeriod,
  aggregationMethod,
  numericRangeSize,
  groupingSuggestion,
  seriesData,
  resetGrouping
} = useDataGrouping(effectiveTableItems, selectedLabelColumn, selectedSeries)

// Chart Config composable (with multi-series support)
const {
  chartType,
  chartTitle,
  colors,
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
const handleStep2Next = () => {
  // Check if there are fixable issues that warrant cleaning step
  if (dataQuality.value.structuredIssues.length > 0) {
    const fixableIssues = dataQuality.value.structuredIssues.filter(
      issue => issue.type !== 'too_few_rows'
    )
    if (fixableIssues.length > 0) {
      initializeCleaningStep()
      currentStep.value = 3 // Go to cleaning step
      return
    }
  }
  // No issues or no fixable issues → skip to chart creation
  currentStep.value = 3
}

const handleCleaningNext = () => {
  finalizeChanges()
  currentStep.value = showCleaningStep.value ? 4 : 3
}

const handleSkipCleaning = () => {
  skipCleaning()
  currentStep.value = 3 // Adjust step number after hiding cleaning step
}

const handleChartStepBack = () => {
  if (showCleaningStep.value) {
    currentStep.value = 3 // Back to cleaning step
  } else {
    currentStep.value = 2 // Back to inspection step
  }
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
