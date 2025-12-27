<template>
  <div>
    <!-- Info Header -->
    <v-alert type="info" variant="tonal" class="mb-4">
      <v-icon icon="mdi-table-column" class="mr-2"></v-icon>
      Spaltenbasierte Ansicht - wählen Sie Bereinigungsoptionen pro Spalte
    </v-alert>

    <!-- Grid Layout -->
    <v-row dense>
      <v-col
        v-for="column in columnInfos"
        :key="column.key"
        cols="12"
        sm="4"
        md="3"
        lg="2"
      >
        <!-- Spalten-Karte -->
        <v-card variant="outlined" class="column-card">
          <!-- Header mit Spaltenname -->
          <v-card-title class="bg-grey-lighten-5 py-1 px-2">
            <div class="d-flex align-center justify-space-between">
              <div class="text-caption font-weight-bold text-truncate flex-grow-1">
                {{ column.title }}
              </div>
              <div class="d-flex align-center gap-1">
                <v-tooltip text="Als Label (X-Achse)" location="top">
                  <template v-slot:activator="{ props: tooltipProps }">
                    <v-btn
                      v-bind="tooltipProps"
                      :icon="selectedLabelColumn === column.key ? 'mdi-alpha-l-circle' : 'mdi-alpha-l-circle-outline'"
                      :color="selectedLabelColumn === column.key ? 'primary' : 'grey'"
                      size="small"
                      variant="text"
                      @click="toggleLabelColumn(column.key)"
                      density="compact"
                    ></v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip v-if="column.dataType === 'numeric'" text="Als Wert (Y-Achse)" location="top">
                  <template v-slot:activator="{ props: tooltipProps }">
                    <v-btn
                      v-bind="tooltipProps"
                      :icon="selectedValueColumns.includes(column.key) ? 'mdi-alpha-v-circle' : 'mdi-alpha-v-circle-outline'"
                      :color="selectedValueColumns.includes(column.key) ? 'success' : 'grey'"
                      size="small"
                      variant="text"
                      @click="toggleValueColumn(column.key)"
                      density="compact"
                    ></v-btn>
                  </template>
                </v-tooltip>
              </div>
            </div>
          </v-card-title>

          <!-- Datenqualität -->
          <v-card-text class="pa-2">
            <v-progress-linear
              :model-value="column.completeness"
              :color="getQualityColor(column.completeness)"
              height="4"
              class="mb-1"
            ></v-progress-linear>
            <div class="text-caption text-grey mb-1" style="font-size: 0.65rem;">
              {{ column.completeness.toFixed(0) }}% • {{ getDataTypeLabel(column.dataType) }}
            </div>

            <!-- Erkannte Probleme -->
            <div v-if="column.issues.length > 0" class="mb-1">
              <v-chip
                size="x-small"
                color="warning"
                variant="flat"
                style="font-size: 0.65rem; height: 16px;"
              >
                {{ column.issues.length }} Problem{{ column.issues.length > 1 ? 'e' : '' }}
              </v-chip>
            </div>

            <!-- Angewandte Operationen -->
            <div v-if="column.appliedOperations.length > 0">
              <v-chip
                color="success"
                size="x-small"
                variant="flat"
                style="font-size: 0.65rem; height: 16px;"
              >
                <v-icon icon="mdi-check" start style="font-size: 0.7rem;"></v-icon>
                {{ column.appliedOperations.length }}
              </v-chip>
            </div>
          </v-card-text>

          <!-- Aktions-Button -->
          <v-card-actions class="pa-2 pt-0">
            <v-btn
              color="primary"
              variant="tonal"
              size="x-small"
              block
              @click="openOperationsDialog(column)"
            >
              <v-icon icon="mdi-wrench" size="x-small"></v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Operations Dialog -->
    <v-dialog v-model="showOperationsDialog" max-width="600">
      <v-card v-if="selectedColumn">
        <v-card-title class="bg-primary text-white">
          <div class="d-flex align-center">
            <v-icon icon="mdi-table-column" class="mr-2"></v-icon>
            {{ selectedColumn.title }}
          </div>
        </v-card-title>

        <v-card-text class="pa-0">
          <v-expansion-panels>
            <!-- Gruppe 1: Fehlende Werte -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <template v-slot:default>
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-help-circle" class="mr-2"></v-icon>
                    <span>Fehlende Werte</span>
                    <v-chip
                      v-if="selectedColumn.emptyValues > 0"
                      size="x-small"
                      color="warning"
                      class="ml-2"
                    >
                      {{ selectedColumn.emptyValues }} leer
                    </v-chip>
                  </div>
                </template>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'removeEmptyRows', 'Zeilen mit leeren Werten entfernen')"
                  >
                    <v-list-item-title>Zeilen entfernen</v-list-item-title>
                    <v-list-item-subtitle>Entfernt Zeilen mit leeren Werten in dieser Spalte</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'fillMean', 'Mit Mittelwert füllen')"
                    :disabled="selectedColumn.dataType !== 'numeric'"
                  >
                    <v-list-item-title>Mit Mittelwert füllen</v-list-item-title>
                    <v-list-item-subtitle>Nur für numerische Spalten</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'fillMedian', 'Mit Median füllen')"
                    :disabled="selectedColumn.dataType !== 'numeric'"
                  >
                    <v-list-item-title>Mit Median füllen</v-list-item-title>
                    <v-list-item-subtitle>Nur für numerische Spalten</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'fillZero', 'Mit Null füllen')"
                  >
                    <v-list-item-title>Mit Null füllen</v-list-item-title>
                    <v-list-item-subtitle>Ersetzt leere Werte mit 0</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'fillForward', 'Vorwärts füllen')"
                  >
                    <v-list-item-title>Vorwärts füllen (Forward fill)</v-list-item-title>
                    <v-list-item-subtitle>Verwendet vorherigen Wert</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'fillBackward', 'Rückwärts füllen')"
                  >
                    <v-list-item-title>Rückwärts füllen (Backward fill)</v-list-item-title>
                    <v-list-item-subtitle>Verwendet nächsten Wert</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Gruppe 2: Negative Werte -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <template v-slot:default>
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-minus-circle" class="mr-2"></v-icon>
                    <span>Negative Werte</span>
                  </div>
                </template>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'removeNegatives', 'Zeilen mit Negativwerten entfernen')"
                    :disabled="selectedColumn.dataType !== 'numeric'"
                  >
                    <v-list-item-title>Zeilen entfernen</v-list-item-title>
                    <v-list-item-subtitle>Entfernt Zeilen mit negativen Werten</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'convertAbsolute', 'In Absolutwerte umwandeln')"
                    :disabled="selectedColumn.dataType !== 'numeric'"
                  >
                    <v-list-item-title>In Absolutwerte umwandeln</v-list-item-title>
                    <v-list-item-subtitle>-5 wird zu 5</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'replaceNegativesZero', 'Negative mit Null ersetzen')"
                    :disabled="selectedColumn.dataType !== 'numeric'"
                  >
                    <v-list-item-title>Mit Null ersetzen</v-list-item-title>
                    <v-list-item-subtitle>-5 wird zu 0</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Gruppe 3: Ausreißer -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <template v-slot:default>
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-chart-scatter-plot" class="mr-2"></v-icon>
                    <span>Ausreißer</span>
                  </div>
                </template>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'removeOutliersIQR', 'Ausreißer per IQR-Methode entfernen')"
                    :disabled="selectedColumn.dataType !== 'numeric'"
                  >
                    <v-list-item-title>IQR-Methode</v-list-item-title>
                    <v-list-item-subtitle>Interquartile Range Methode</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'removeOutliersZScore', 'Ausreißer per Z-Score entfernen')"
                    :disabled="selectedColumn.dataType !== 'numeric'"
                  >
                    <v-list-item-title>Z-Score Methode</v-list-item-title>
                    <v-list-item-subtitle>Entfernt Werte >3 Standardabweichungen</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Gruppe 4: Duplikate & Text -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <template v-slot:default>
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-format-text" class="mr-2"></v-icon>
                    <span>Text & Duplikate</span>
                  </div>
                </template>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'normalizeWhitespace', 'Whitespace normalisieren')"
                  >
                    <v-list-item-title>Whitespace normalisieren</v-list-item-title>
                    <v-list-item-subtitle>Entfernt überflüssige Leerzeichen</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'keepFirstOccurrence', 'Erste Vorkommen behalten')"
                    v-if="selectedColumn.key === 'col_0'"
                  >
                    <v-list-item-title>Duplikate entfernen</v-list-item-title>
                    <v-list-item-subtitle>Behält erste Vorkommen</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'addSuffixToDuplicates', 'Suffix zu Duplikaten hinzufügen')"
                    v-if="selectedColumn.key === 'col_0'"
                  >
                    <v-list-item-title>Suffix hinzufügen</v-list-item-title>
                    <v-list-item-subtitle>Label, Label (1), Label (2)</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'fillEmptyLabelsNumbers', 'Leere Labels mit Zahlen füllen')"
                    v-if="selectedColumn.key === 'col_0'"
                  >
                    <v-list-item-title>Mit Zahlen füllen</v-list-item-title>
                    <v-list-item-subtitle>Füllt leere Labels mit 1, 2, 3...</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="handleOperationClick(selectedColumn.key, 'fillEmptyLabelsText', 'Leere Labels mit Text füllen')"
                    v-if="selectedColumn.key === 'col_0'"
                  >
                    <v-list-item-title>Mit "Unnamed" füllen</v-list-item-title>
                    <v-list-item-subtitle>Füllt mit "Unnamed 1", "Unnamed 2"...</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="closeOperationsDialog"
          >
            Schließen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TableItem, TableHeader } from '../../composables/useCSVParser'
import type { CleaningSuggestion } from '../../utils/dataCleaningSuggestions'
import type { AppliedOperation } from '../../composables/useDataCleaning'
import { analyzeAllColumns, type ColumnInfo } from '../../utils/columnAnalysis'
import {
  removeRowsWithEmptyColumn,
  fillMissingValues,
  removeNegativeValues,
  convertToAbsolute,
  replaceNegativesWithZero,
  removeOutliersIQR,
  removeOutliersZScore,
  normalizeWhitespace,
  keepFirstOccurrence,
  addSuffixToDuplicates,
  fillEmptyLabelsWithNumbers,
  fillEmptyLabelsWithText
} from '../../utils/dataCleaningOperations'

const props = defineProps<{
  tableHeaders: TableHeader[]
  tableItems: TableItem[]
  cleanedTableItems: TableItem[]
  cleaningSuggestions: CleaningSuggestion[]
  appliedOperations: AppliedOperation[]
  selectedLabelColumn: string
  selectedValueColumns: string[]
}>()

const emit = defineEmits<{
  (e: 'applyColumnOperation', columnKey: string, operation: (data: TableItem[]) => TableItem[], operationName: string): void
  (e: 'update:selectedLabelColumn', value: string): void
  (e: 'update:selectedValueColumns', value: string[]): void
}>()

const currentData = computed(() =>
  props.cleanedTableItems.length > 0 ? props.cleanedTableItems : props.tableItems
)

const columnInfos = computed(() =>
  analyzeAllColumns(
    currentData.value,
    props.tableHeaders,
    props.cleaningSuggestions,
    props.appliedOperations
  )
)

// Dialog state
const showOperationsDialog = ref(false)
const selectedColumn = ref<ColumnInfo | null>(null)

function openOperationsDialog(column: ColumnInfo) {
  selectedColumn.value = column
  showOperationsDialog.value = true
}

function closeOperationsDialog() {
  showOperationsDialog.value = false
  selectedColumn.value = null
}

function handleOperationClick(columnKey: string, operationType: string, operationName: string) {
  applyOperation(columnKey, operationType, operationName)
  closeOperationsDialog()
}

function toggleLabelColumn(columnKey: string) {
  if (props.selectedLabelColumn === columnKey) {
    // Deselect if already selected
    emit('update:selectedLabelColumn', '')
  } else {
    // Select new column
    emit('update:selectedLabelColumn', columnKey)
  }
}

function toggleValueColumn(columnKey: string) {
  const currentColumns = [...props.selectedValueColumns]
  const index = currentColumns.indexOf(columnKey)

  if (index > -1) {
    // Remove column
    currentColumns.splice(index, 1)
  } else {
    // Add column
    currentColumns.push(columnKey)
  }

  emit('update:selectedValueColumns', currentColumns)
}

function getQualityColor(completeness: number): string {
  if (completeness >= 90) return 'success'
  if (completeness >= 70) return 'warning'
  return 'error'
}

function getDataTypeLabel(dataType: 'numeric' | 'text' | 'mixed' | 'date'): string {
  switch (dataType) {
    case 'numeric':
      return 'Num'
    case 'text':
      return 'Text'
    case 'mixed':
      return 'Mix'
    case 'date':
      return 'Datum'
  }
}

function applyOperation(columnKey: string, operationType: string, operationName: string) {
  let operation: (data: TableItem[]) => TableItem[]

  switch (operationType) {
    case 'removeEmptyRows':
      operation = (data) => removeRowsWithEmptyColumn(data, columnKey)
      break
    case 'fillMean':
      operation = (data) => fillMissingValues(data, columnKey, 'mean')
      break
    case 'fillMedian':
      operation = (data) => fillMissingValues(data, columnKey, 'median')
      break
    case 'fillZero':
      operation = (data) => fillMissingValues(data, columnKey, 'zero')
      break
    case 'fillForward':
      operation = (data) => fillMissingValues(data, columnKey, 'forward')
      break
    case 'fillBackward':
      operation = (data) => fillMissingValues(data, columnKey, 'backward')
      break
    case 'removeNegatives':
      operation = (data) => removeNegativeValues(data, columnKey)
      break
    case 'convertAbsolute':
      operation = (data) => convertToAbsolute(data, columnKey)
      break
    case 'replaceNegativesZero':
      operation = (data) => replaceNegativesWithZero(data, columnKey)
      break
    case 'removeOutliersIQR':
      operation = (data) => removeOutliersIQR(data, columnKey)
      break
    case 'removeOutliersZScore':
      operation = (data) => removeOutliersZScore(data, columnKey)
      break
    case 'normalizeWhitespace':
      operation = normalizeWhitespace
      break
    case 'keepFirstOccurrence':
      operation = (data) => keepFirstOccurrence(data, columnKey)
      break
    case 'addSuffixToDuplicates':
      operation = (data) => addSuffixToDuplicates(data, columnKey)
      break
    case 'fillEmptyLabelsNumbers':
      operation = (data) => fillEmptyLabelsWithNumbers(data, columnKey)
      break
    case 'fillEmptyLabelsText':
      operation = (data) => fillEmptyLabelsWithText(data, columnKey)
      break
    default:
      console.error('Unknown operation:', operationType)
      return
  }

  emit('applyColumnOperation', columnKey, operation, operationName)
}
</script>

<style scoped>
.column-card {
  transition: all 0.2s;
  height: 100%;
}

.column-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.preview-box {
  max-height: 60px;
  overflow-y: auto;
  font-size: 0.75rem;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
