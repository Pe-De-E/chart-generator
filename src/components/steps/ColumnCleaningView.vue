<template>
  <div>
    <!-- Info Header -->
    <v-alert type="info" variant="tonal" class="mb-4">
      <v-icon icon="mdi-table-column" class="mr-2"></v-icon>
      Spaltenbasierte Ansicht - wählen Sie Bereinigungsoptionen pro Spalte
    </v-alert>

    <!-- Grid Layout -->
    <v-row>
      <v-col
        v-for="column in columnInfos"
        :key="column.key"
        cols="12"
        md="6"
        lg="4"
      >
        <!-- Spalten-Karte -->
        <v-card variant="outlined" class="column-card h-100">
          <!-- Header mit Spaltenname -->
          <v-card-title class="bg-grey-lighten-5">
            <v-icon icon="mdi-table-column" class="mr-2"></v-icon>
            {{ column.title }}
          </v-card-title>

          <!-- Datenqualität -->
          <v-card-text>
            <div class="mb-3">
              <div class="text-subtitle-2 mb-2">Datenqualität</div>
              <v-progress-linear
                :model-value="column.completeness"
                :color="getQualityColor(column.completeness)"
                height="8"
                class="mb-1"
              ></v-progress-linear>
              <div class="text-caption text-grey">
                {{ column.filledValues }}/{{ column.totalValues }} Werte
                ({{ column.completeness.toFixed(1) }}%)
              </div>
              <v-chip size="x-small" class="mt-1" color="primary" variant="outlined">
                {{ getDataTypeLabel(column.dataType) }}
              </v-chip>
            </div>

            <!-- Erkannte Probleme -->
            <div v-if="column.issues.length > 0" class="mb-3">
              <div class="text-subtitle-2 mb-2">Erkannte Probleme</div>
              <v-chip
                v-for="issue in column.issues"
                :key="issue.type"
                :color="getSeverityColor(issue.severity)"
                size="small"
                class="mr-1 mb-1"
              >
                {{ issue.title }} ({{ issue.affectedCount }})
              </v-chip>
            </div>

            <!-- Datenvorschau -->
            <div class="mb-3">
              <div class="text-subtitle-2 mb-2">Vorschau</div>
              <div class="preview-box pa-2 bg-grey-lighten-4 rounded">
                <div
                  v-for="(value, idx) in column.previewValues"
                  :key="idx"
                  class="text-caption text-grey-darken-1"
                >
                  {{ formatValue(value) }}
                </div>
                <div v-if="column.previewValues.length === 0" class="text-caption text-grey">
                  (Keine Daten)
                </div>
              </div>
            </div>

            <!-- Angewandte Operationen -->
            <div v-if="column.appliedOperations.length > 0" class="mb-3">
              <div class="text-subtitle-2 mb-2">Angewendet</div>
              <v-chip
                v-for="(op, idx) in column.appliedOperations"
                :key="idx"
                color="success"
                size="small"
                variant="outlined"
                class="mb-1 d-block text-wrap"
                style="height: auto; white-space: normal;"
              >
                <v-icon icon="mdi-check" start size="small"></v-icon>
                {{ op.title }}
              </v-chip>
            </div>
          </v-card-text>

          <!-- Bereinigungsoptionen -->
          <v-expansion-panels class="ma-3">
            <!-- Gruppe 1: Fehlende Werte -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <template v-slot:default>
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-help-circle" class="mr-2"></v-icon>
                    <span>Fehlende Werte</span>
                    <v-chip
                      v-if="column.emptyValues > 0"
                      size="x-small"
                      color="warning"
                      class="ml-2"
                    >
                      {{ column.emptyValues }} leer
                    </v-chip>
                  </div>
                </template>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item
                    @click="applyOperation(column.key, 'removeEmptyRows', 'Zeilen mit leeren Werten entfernen')"
                  >
                    <v-list-item-title>Zeilen entfernen</v-list-item-title>
                    <v-list-item-subtitle>Entfernt Zeilen mit leeren Werten in dieser Spalte</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'fillMean', 'Mit Mittelwert füllen')"
                    :disabled="column.dataType !== 'numeric'"
                  >
                    <v-list-item-title>Mit Mittelwert füllen</v-list-item-title>
                    <v-list-item-subtitle>Nur für numerische Spalten</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'fillMedian', 'Mit Median füllen')"
                    :disabled="column.dataType !== 'numeric'"
                  >
                    <v-list-item-title>Mit Median füllen</v-list-item-title>
                    <v-list-item-subtitle>Nur für numerische Spalten</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'fillZero', 'Mit Null füllen')"
                  >
                    <v-list-item-title>Mit Null füllen</v-list-item-title>
                    <v-list-item-subtitle>Ersetzt leere Werte mit 0</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'fillForward', 'Vorwärts füllen')"
                  >
                    <v-list-item-title>Vorwärts füllen (Forward fill)</v-list-item-title>
                    <v-list-item-subtitle>Verwendet vorherigen Wert</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'fillBackward', 'Rückwärts füllen')"
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
                    @click="applyOperation(column.key, 'removeNegatives', 'Zeilen mit Negativwerten entfernen')"
                    :disabled="column.dataType !== 'numeric'"
                  >
                    <v-list-item-title>Zeilen entfernen</v-list-item-title>
                    <v-list-item-subtitle>Entfernt Zeilen mit negativen Werten</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'convertAbsolute', 'In Absolutwerte umwandeln')"
                    :disabled="column.dataType !== 'numeric'"
                  >
                    <v-list-item-title>In Absolutwerte umwandeln</v-list-item-title>
                    <v-list-item-subtitle>-5 wird zu 5</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'replaceNegativesZero', 'Negative mit Null ersetzen')"
                    :disabled="column.dataType !== 'numeric'"
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
                    @click="applyOperation(column.key, 'removeOutliersIQR', 'Ausreißer per IQR-Methode entfernen')"
                    :disabled="column.dataType !== 'numeric'"
                  >
                    <v-list-item-title>IQR-Methode</v-list-item-title>
                    <v-list-item-subtitle>Interquartile Range Methode</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'removeOutliersZScore', 'Ausreißer per Z-Score entfernen')"
                    :disabled="column.dataType !== 'numeric'"
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
                    @click="applyOperation(column.key, 'normalizeWhitespace', 'Whitespace normalisieren')"
                  >
                    <v-list-item-title>Whitespace normalisieren</v-list-item-title>
                    <v-list-item-subtitle>Entfernt überflüssige Leerzeichen</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'keepFirstOccurrence', 'Erste Vorkommen behalten')"
                    v-if="column.key === 'col_0'"
                  >
                    <v-list-item-title>Duplikate entfernen</v-list-item-title>
                    <v-list-item-subtitle>Behält erste Vorkommen</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'addSuffixToDuplicates', 'Suffix zu Duplikaten hinzufügen')"
                    v-if="column.key === 'col_0'"
                  >
                    <v-list-item-title>Suffix hinzufügen</v-list-item-title>
                    <v-list-item-subtitle>Label, Label (1), Label (2)</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'fillEmptyLabelsNumbers', 'Leere Labels mit Zahlen füllen')"
                    v-if="column.key === 'col_0'"
                  >
                    <v-list-item-title>Mit Zahlen füllen</v-list-item-title>
                    <v-list-item-subtitle>Füllt leere Labels mit 1, 2, 3...</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item
                    @click="applyOperation(column.key, 'fillEmptyLabelsText', 'Leere Labels mit Text füllen')"
                    v-if="column.key === 'col_0'"
                  >
                    <v-list-item-title>Mit "Unnamed" füllen</v-list-item-title>
                    <v-list-item-subtitle>Füllt mit "Unnamed 1", "Unnamed 2"...</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableItem, TableHeader } from '../../composables/useCSVParser'
import type { CleaningSuggestion } from '../../utils/dataCleaningSuggestions'
import type { AppliedOperation } from '../../composables/useDataCleaning'
import { analyzeAllColumns } from '../../utils/columnAnalysis'
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
}>()

const emit = defineEmits<{
  (e: 'applyColumnOperation', columnKey: string, operation: (data: TableItem[]) => TableItem[], operationName: string): void
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

function getQualityColor(completeness: number): string {
  if (completeness >= 90) return 'success'
  if (completeness >= 70) return 'warning'
  return 'error'
}

function getSeverityColor(severity: 'high' | 'medium' | 'low'): string {
  switch (severity) {
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    case 'low':
      return 'info'
  }
}

function getDataTypeLabel(dataType: 'numeric' | 'text' | 'mixed' | 'date'): string {
  switch (dataType) {
    case 'numeric':
      return 'Numerisch'
    case 'text':
      return 'Text'
    case 'mixed':
      return 'Gemischt'
    case 'date':
      return 'Datum'
  }
}

function formatValue(value: string | number): string {
  if (value === '' || value === null || value === undefined) {
    return '(leer)'
  }
  return String(value)
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
}

.column-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-box {
  max-height: 150px;
  overflow-y: auto;
}

.h-100 {
  height: 100%;
}
</style>
