<template>
  <v-card flat>
    <v-card-text>
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <div class="text-h5">
            <v-icon icon="mdi-broom" class="mr-2"></v-icon>
            Daten bereinigen
          </div>
          <div class="text-caption text-grey mt-1">
            Schritt 2 von 3: Spalten auswählen und Daten bereinigen
          </div>
        </div>
      </div>

      <!-- Tabs für Ansichtswechsel -->
      <v-tabs v-model="currentTab" class="mb-4" color="primary">
        <v-tab value="problems">
          <v-icon icon="mdi-alert-circle" start></v-icon>
          Nach Problemen
        </v-tab>
        <v-tab value="columns">
          <v-icon icon="mdi-table-column" start></v-icon>
          Nach Spalten
        </v-tab>
      </v-tabs>

      <!-- Tab Content -->
      <v-window v-model="currentTab">
        <!-- Problem-basierte Ansicht -->
        <v-window-item value="problems">
          <!-- Info Alert -->
      <v-alert
        v-if="cleaningSuggestions.length > 0"
        type="warning"
        variant="tonal"
        class="mb-4"
      >
        <div class="d-flex align-center">
          <v-icon icon="mdi-alert-circle-outline" class="mr-2"></v-icon>
          <div>
            Wir haben <strong>{{ cleaningSuggestions.length }} Problem(e)</strong> gefunden.
            Wählen Sie unten Lösungsvorschläge aus oder überspringen Sie die Bereinigung.
          </div>
        </div>
      </v-alert>

      <!-- No Issues -->
      <v-alert
        v-else
        type="success"
        variant="tonal"
        class="mb-4"
      >
        <v-icon icon="mdi-check-circle" class="mr-2"></v-icon>
        Keine Datenqualitätsprobleme gefunden! Sie können direkt fortfahren.
      </v-alert>

      <!-- Error Message -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="errorMessage = null"
      >
        {{ errorMessage }}
      </v-alert>

      <!-- Issue Cards -->
      <div v-if="cleaningSuggestions.length > 0" class="mb-4">
        <v-card
          v-for="suggestion in cleaningSuggestions"
          :key="suggestion.id"
          class="mb-3"
          :variant="isSuggestionApplied(suggestion.id) ? 'tonal' : 'outlined'"
          :color="isSuggestionApplied(suggestion.id) ? 'success' : undefined"
        >
          <v-card-title class="d-flex align-center">
            <v-icon :icon="suggestion.icon" :color="suggestion.color" class="mr-2"></v-icon>
            <span>{{ suggestion.title }}</span>
            <v-spacer></v-spacer>
            <v-chip
              v-if="isSuggestionApplied(suggestion.id)"
              color="success"
              size="small"
              variant="flat"
            >
              <v-icon icon="mdi-check" start size="small"></v-icon>
              Angewendet
            </v-chip>
            <v-chip
              v-else
              :color="suggestion.color"
              size="small"
              variant="flat"
            >
              {{ suggestion.affectedCount }} betroffen
            </v-chip>
          </v-card-title>

          <v-card-text>
            <div class="mb-3 text-body-2">{{ suggestion.description }}</div>

            <!-- Options -->
            <v-radio-group
              :model-value="localSelectedOptions[suggestion.id]"
              @update:model-value="(val: number | null) => { if (val !== null) localSelectedOptions[suggestion.id] = val }"
              :disabled="isSuggestionApplied(suggestion.id)"
            >
              <v-radio
                v-for="(option, index) in suggestion.options"
                :key="index"
                :value="index"
                :disabled="isSuggestionApplied(suggestion.id)"
              >
                <template v-slot:label>
                  <div>
                    <div class="font-weight-medium">
                      {{ option.label }}
                      <v-chip
                        v-if="option.isDefault"
                        size="x-small"
                        color="primary"
                        class="ml-2"
                      >
                        Empfohlen
                      </v-chip>
                    </div>
                    <div class="text-caption text-grey">{{ option.description }}</div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              v-if="!isSuggestionApplied(suggestion.id)"
              color="primary"
              variant="flat"
              @click="handleApply(suggestion)"
              :disabled="localSelectedOptions[suggestion.id] === undefined || isProcessing"
              :loading="isProcessing"
            >
              <v-icon icon="mdi-check" start></v-icon>
              Anwenden
            </v-btn>
            <v-btn
              v-else
              color="grey"
              variant="text"
              disabled
            >
              Bereits angewendet
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>

      <!-- Summary Card -->
      <v-card v-if="hasChanges || cleanedTableItems.length > 0" variant="outlined" class="mb-4">
        <v-card-title class="bg-grey-lighten-4">
          <v-icon icon="mdi-information-outline" class="mr-2"></v-icon>
          Zusammenfassung der Änderungen
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="3">
              <div class="text-center">
                <div class="text-h4">{{ cleaningSummary.originalCount }}</div>
                <div class="text-caption text-grey">Ursprüngliche Zeilen</div>
              </div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-center">
                <div class="text-h4 text-success">{{ cleaningSummary.cleanedCount }}</div>
                <div class="text-caption text-grey">Nach Bereinigung</div>
              </div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-center">
                <div class="text-h4 text-error">{{ cleaningSummary.removed }}</div>
                <div class="text-caption text-grey">Entfernte Zeilen</div>
              </div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-center">
                <div class="text-h4 text-info">{{ cleaningSummary.appliedCount }}</div>
                <div class="text-caption text-grey">Operationen angewendet</div>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <!-- Applied Operations List -->
          <div v-if="appliedOperations.length > 0">
            <div class="text-subtitle-2 mb-2">Angewendete Operationen:</div>
            <v-chip
              v-for="(op, index) in appliedOperations"
              :key="index"
              class="mr-2 mb-2"
              size="small"
              color="success"
              variant="outlined"
            >
              <v-icon icon="mdi-check-circle" start size="small"></v-icon>
              {{ op.suggestionTitle }}: {{ op.optionLabel }}
              <span v-if="op.affectedRows !== 0" class="ml-1">
                ({{ op.affectedRows > 0 ? '+' : '' }}{{ op.affectedRows }})
              </span>
            </v-chip>
          </div>

          <!-- Reset Button -->
          <div class="mt-4">
            <v-btn
              color="warning"
              variant="outlined"
              @click="handleReset"
              :disabled="!hasChanges || isProcessing"
            >
              <v-icon icon="mdi-undo" start></v-icon>
              Alle Änderungen zurücksetzen
            </v-btn>
            <v-btn
              v-if="operationHistory.length > 0"
              color="grey"
              variant="text"
              @click="handleUndo"
              :disabled="isProcessing"
              class="ml-2"
            >
              <v-icon icon="mdi-undo-variant" start></v-icon>
              Letzte rückgängig
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- Data Preview Table -->
      <v-card variant="outlined">
        <v-card-title class="bg-grey-lighten-4">
          <v-icon icon="mdi-table-eye" class="mr-2"></v-icon>
          Datenvorschau
          <span class="text-caption text-grey ml-2">
            ({{ currentData.length }} Zeilen)
          </span>
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="tableHeaders"
            :items="currentData.slice(0, 20)"
            :items-per-page="10"
            density="comfortable"
            class="elevation-0"
          >
            <template v-slot:bottom>
              <div class="text-caption text-grey pa-2">
                Zeige erste 20 Zeilen von {{ currentData.length }}
              </div>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
        </v-window-item>

        <!-- Spalten-basierte Ansicht -->
        <v-window-item value="columns">
          <ColumnCleaningView
            :table-headers="tableHeaders"
            :table-items="tableItems"
            :cleaned-table-items="cleanedTableItems"
            :cleaning-suggestions="cleaningSuggestions"
            :applied-operations="appliedOperations"
            :selected-label-column="selectedLabelColumn"
            :selected-value-columns="selectedValueColumns"
            @apply-column-operation="handleColumnOperation"
            @update:selected-label-column="emit('update:selectedLabelColumn', $event)"
            @update:selected-value-columns="emit('update:selectedValueColumns', $event)"
          />
        </v-window-item>
      </v-window>
    </v-card-text>

    <v-card-actions class="bg-grey-lighten-5 px-4 py-3">
      <v-btn
        variant="text"
        @click="$emit('back')"
        :disabled="isProcessing"
      >
        <v-icon icon="mdi-chevron-left" start></v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        variant="outlined"
        @click="handleSkip"
        :disabled="isProcessing"
      >
        Bereinigung überspringen
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        @click="handleNext"
        :disabled="isProcessing"
      >
        Weiter
        <v-icon icon="mdi-chevron-right" end></v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableItem, TableHeader } from '../../composables/useCSVParser'
import type { CleaningSuggestion } from '../../utils/dataCleaningSuggestions'
import type { AppliedOperation } from '../../composables/useDataCleaning'
import ColumnCleaningView from './ColumnCleaningView.vue'

const props = defineProps<{
  tableHeaders: TableHeader[]
  tableItems: TableItem[]
  cleanedTableItems: TableItem[]
  cleaningSuggestions: CleaningSuggestion[]
  appliedOperations: AppliedOperation[]
  operationHistory: any[]
  selectedOptions: Record<string, number>
  isProcessing: boolean
  errorMessage: string | null
  hasChanges: boolean
  cleaningSummary: {
    originalCount: number
    cleanedCount: number
    removed: number
    appliedCount: number
    totalSuggestions: number
    skippedCount: number
  }
  selectedLabelColumn: string
  selectedValueColumns: string[]
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'next'): void
  (e: 'skip'): void
  (e: 'apply', suggestion: CleaningSuggestion, optionIndex: number): void
  (e: 'reset'): void
  (e: 'undo'): void
  (e: 'update:selectedLabelColumn', value: string): void
  (e: 'update:selectedValueColumns', value: string[]): void
}>()

// Tab state
const currentTab = ref<'problems' | 'columns'>('problems')

// Local mutable copy of selectedOptions
const localSelectedOptions = ref<Record<string, number>>({})

// Initialize from props and watch for external changes
watch(() => props.selectedOptions, (newVal) => {
  localSelectedOptions.value = { ...newVal }
}, { immediate: true })

const currentData = computed(() =>
  props.cleanedTableItems.length > 0 ? props.cleanedTableItems : props.tableItems
)

const isSuggestionApplied = (suggestionId: string): boolean => {
  return suggestionId in props.selectedOptions
}

const handleApply = (suggestion: CleaningSuggestion) => {
  const optionIndex = localSelectedOptions.value[suggestion.id]
  if (optionIndex !== undefined) {
    emit('apply', suggestion, optionIndex)
  }
}

const handleReset = () => {
  emit('reset')
}

const handleUndo = () => {
  emit('undo')
}

const handleSkip = () => {
  emit('skip')
}

const handleNext = () => {
  emit('next')
}

const handleColumnOperation = (
  columnKey: string,
  operation: (data: TableItem[]) => TableItem[],
  operationName: string
) => {
  // Create a custom CleaningSuggestion for the column operation
  const customSuggestion: CleaningSuggestion = {
    id: `column_${columnKey}_${Date.now()}`,
    type: 'missing_values', // Placeholder type
    severity: 'medium',
    title: `${operationName} (${props.tableHeaders.find(h => h.key === columnKey)?.title || columnKey})`,
    description: operationName,
    affectedCount: 0,
    affectedColumn: columnKey,
    options: [
      {
        label: operationName,
        description: operationName,
        isDefault: true,
        apply: operation
      }
    ],
    icon: 'mdi-table-column',
    color: 'primary'
  }

  // Apply the operation using the existing apply handler
  emit('apply', customSuggestion, 0)
}
</script>

<style scoped>
.text-h4 {
  font-weight: 600;
}
</style>
