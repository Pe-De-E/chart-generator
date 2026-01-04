<template>
  <v-card flat>
    <v-card-text>
      <div class="text-h5 mb-4">Daten inspizieren & konfigurieren</div>

      <!-- Data Quality Badge -->
      <v-card variant="outlined" class="mb-4">
        <v-card-text>
          <div class="d-flex align-items-center justify-space-between">
            <div>
              <div class="text-subtitle-2 text-grey-darken-2 mb-1">Datenqualität</div>
              <v-chip
                :color="getQualityColor(dataQuality.qualityScore)"
                variant="flat"
                size="large"
              >
                <v-icon start icon="mdi-chart-box-outline"></v-icon>
                {{ getQualityLabel(dataQuality.qualityScore) }} ({{ dataQuality.completenessPercentage }}%)
              </v-chip>
            </div>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-information-outline"
              @click="emit('show-quality-dialog')"
            >
              Details anzeigen
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- Column Selection -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
          <v-icon icon="mdi-table-column" class="mr-2"></v-icon>
          Spalten für Chart auswählen
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                :model-value="selectedLabelColumn"
                @update:model-value="emit('update:selectedLabelColumn', $event)"
                :items="columnOptions"
                label="Label-Spalte (X-Achse)"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-format-text"
                hint="Wählen Sie die Spalte für Beschriftungen"
                persistent-hint
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-2">Wert-Spalten (Y-Achse)</div>

              <!-- Ausgewählte Serien anzeigen -->
              <div class="selected-series-container mb-3" v-if="selectedValueColumns.length > 0">
                <v-chip
                  v-for="(series, index) in selectedValueColumns"
                  :key="series.columnKey"
                  closable
                  :color="series.color"
                  class="ma-1"
                  @click:close="emit('removeSeries', index)"
                >
                  <v-icon start>mdi-chart-line</v-icon>
                  {{ series.name }}
                </v-chip>
              </div>

              <!-- Serie hinzufügen -->
              <v-row>
                <v-col cols="8">
                  <v-select
                    v-model="newSeriesColumn"
                    :items="availableNumericColumns"
                    label="Spalte hinzufügen"
                    variant="outlined"
                    density="compact"
                    prepend-inner-icon="mdi-plus-circle"
                    :disabled="availableNumericColumns.length === 0"
                  ></v-select>
                </v-col>
                <v-col cols="4">
                  <v-btn
                    color="primary"
                    variant="outlined"
                    block
                    :disabled="!newSeriesColumn"
                    @click="handleAddSeries"
                  >
                    <v-icon start>mdi-plus</v-icon>
                    Hinzufügen
                  </v-btn>
                </v-col>
              </v-row>

              <v-alert
                type="info"
                density="compact"
                class="mt-2"
                v-if="selectedValueColumns.length === 0"
              >
                Wählen Sie mindestens eine numerische Spalte für die Y-Achse
              </v-alert>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Grouping Suggestion -->
      <v-card variant="outlined" class="mb-4" v-if="groupingSuggestion.canGroup">
        <v-card-text>
          <div class="d-flex align-items-center justify-space-between">
            <div class="d-flex align-items-center">
              <v-icon :icon="getGroupingIcon(groupingSuggestion.type)" :color="getGroupingColor(groupingSuggestion.canGroup)" class="mr-3" size="large"></v-icon>
              <div>
                <div class="text-subtitle-2 font-weight-bold">Gruppierung möglich</div>
                <div class="text-caption text-grey-darken-1">{{ groupingSuggestion.reason }}</div>
              </div>
            </div>
            <v-chip
              :color="getGroupingColor(groupingSuggestion.canGroup)"
              variant="flat"
              size="small"
            >
              <v-icon start icon="mdi-lightbulb-on-outline"></v-icon>
              {{ groupingSuggestion.groupCount ? `${groupingSuggestion.groupCount} Gruppen` : 'Kategorisierbar' }}
            </v-chip>
          </div>
          <v-divider class="my-3"></v-divider>

          <!-- Grouping Controls -->
          <v-row>
            <v-col cols="12">
              <v-switch
                :model-value="enableGrouping"
                @update:model-value="emit('update:enableGrouping', $event)"
                label="Gruppierung aktivieren"
                color="primary"
                density="compact"
                hide-details
              ></v-switch>
            </v-col>
          </v-row>

          <v-expand-transition>
            <div v-if="enableGrouping">
              <v-row class="mt-2">
                <!-- Date grouping period -->
                <v-col cols="12" md="6" v-if="groupingSuggestion.type === 'date'">
                  <v-select
                    :model-value="groupingPeriod"
                    @update:model-value="emit('update:groupingPeriod', $event)"
                    :items="[
                      { title: 'Nach Jahr', value: 'year' },
                      { title: 'Nach Monat', value: 'month' },
                      { title: 'Nach Quartal', value: 'quarter' },
                      { title: 'Nach Woche', value: 'week' }
                    ]"
                    label="Gruppierungsperiode"
                    variant="outlined"
                    density="compact"
                  ></v-select>
                </v-col>

                <!-- Numeric range size -->
                <v-col cols="12" md="6" v-if="groupingSuggestion.type === 'numeric'">
                  <v-text-field
                    :model-value="numericRangeSize"
                    @update:model-value="emit('update:numericRangeSize', Number($event))"
                    label="Bereichsgröße"
                    type="number"
                    variant="outlined"
                    density="compact"
                    min="1"
                  ></v-text-field>
                </v-col>

                <!-- Aggregation method -->
                <v-col cols="12" md="6">
                  <v-select
                    :model-value="aggregationMethod"
                    @update:model-value="emit('update:aggregationMethod', $event)"
                    :items="[
                      { title: 'Summe', value: 'sum' },
                      { title: 'Durchschnitt', value: 'average' },
                      { title: 'Anzahl', value: 'count' },
                      { title: 'Minimum', value: 'min' },
                      { title: 'Maximum', value: 'max' }
                    ]"
                    label="Aggregationsmethode"
                    variant="outlined"
                    density="compact"
                  ></v-select>
                </v-col>
              </v-row>

              <!-- Info about current grouping -->
              <v-alert type="info" variant="tonal" density="compact" class="mt-2">
                <template v-if="groupingSuggestion.type === 'categorical'">
                  Daten werden nach Kategorie gruppiert ({{ groupingSuggestion.groupCount }} Gruppen)
                </template>
                <template v-else-if="groupingSuggestion.type === 'date'">
                  Daten werden nach {{ groupingPeriod === 'year' ? 'Jahr' : groupingPeriod === 'month' ? 'Monat' : groupingPeriod === 'quarter' ? 'Quartal' : 'Woche' }} gruppiert
                </template>
                <template v-else-if="groupingSuggestion.type === 'numeric'">
                  Daten werden in Bereiche von {{ numericRangeSize }} gruppiert
                </template>
              </v-alert>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>

      <!-- Full Data Table -->
      <v-card variant="outlined">
        <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
          <v-icon icon="mdi-table" class="mr-2"></v-icon>
          Vollständige Daten ({{ tableItems.length }} Zeilen)
        </v-card-title>
        <v-card-text class="pa-0">
          <v-data-table
            :headers="tableHeaders"
            :items="tableItems"
            :items-per-page="10"
            density="compact"
            class="elevation-0"
          ></v-data-table>
        </v-card-text>
      </v-card>
    </v-card-text>

    <v-card-actions>
      <v-btn
        variant="text"
        @click="emit('back')"
      >
        <v-icon start>mdi-chevron-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        variant="flat"
        :disabled="!selectedLabelColumn || selectedValueColumns.length === 0"
        @click="emit('next')"
      >
        Weiter
        <v-icon end>mdi-chevron-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import type { TableHeader, TableItem } from '../../composables/useCSVParser'
import type { GroupingSuggestion } from '../../utils/groupingAnalysis'
import type { AggregationMethod } from '../../utils/dataGrouping'
import type { DataQualityMetrics } from '../../utils/dataQuality'
import type { SeriesConfig } from '../../utils/chartGenerators/types'
import { getQualityColor, getQualityLabel } from '../../utils/dataQuality'
import { getGroupingIcon, getGroupingColor } from '../../utils/groupingAnalysis'

const props = defineProps({
  tableHeaders: {
    type: Array as PropType<TableHeader[]>,
    required: true
  },
  tableItems: {
    type: Array as PropType<TableItem[]>,
    required: true
  },
  columnOptions: {
    type: Array as PropType<{ title: string, value: string }[]>,
    required: true
  },
  numericColumnOptions: {
    type: Array as PropType<{ title: string, value: string }[]>,
    required: true
  },
  selectedLabelColumn: {
    type: String,
    required: true
  },
  selectedValueColumns: {
    type: Array as PropType<SeriesConfig[]>,
    required: true
  },
  dataQuality: {
    type: Object as PropType<DataQualityMetrics>,
    required: true
  },
  groupingSuggestion: {
    type: Object as PropType<GroupingSuggestion>,
    required: true
  },
  enableGrouping: {
    type: Boolean,
    required: true
  },
  groupingPeriod: {
    type: String as PropType<'year' | 'month' | 'quarter' | 'week'>,
    required: true
  },
  aggregationMethod: {
    type: String as PropType<AggregationMethod>,
    required: true
  },
  numericRangeSize: {
    type: Number,
    required: true
  }
})

const emit = defineEmits([
  'back',
  'next',
  'show-quality-dialog',
  'update:selectedLabelColumn',
  'addSeries',
  'removeSeries',
  'update:enableGrouping',
  'update:groupingPeriod',
  'update:aggregationMethod',
  'update:numericRangeSize'
])

// Local state für neue Serie
const newSeriesColumn = ref<string>('')

// Verfügbare Spalten (exkludiere bereits ausgewählte)
const availableNumericColumns = computed(() => {
  const selectedColumnKeys = props.selectedValueColumns.map(s => s.columnKey)
  return props.numericColumnOptions.filter(opt => !selectedColumnKeys.includes(opt.value))
})

function handleAddSeries() {
  if (newSeriesColumn.value) {
    emit('addSeries', newSeriesColumn.value)
    newSeriesColumn.value = '' // Reset nach Hinzufügen
  }
}
</script>
