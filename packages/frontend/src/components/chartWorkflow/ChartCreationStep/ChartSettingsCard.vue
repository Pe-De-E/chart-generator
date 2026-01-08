<template>
  <v-card variant="outlined" class="mb-4">
    <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
      <v-icon icon="mdi-cog" class="mr-2"></v-icon>
      Einstellungen
    </v-card-title>
    <v-card-text>
      <v-row class="mt-2">
        <v-col cols="12" md="4">
          <v-text-field
            :model-value="chartTitle"
            @update:model-value="$emit('update:chartTitle', $event)"
            label="Chart-Titel"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-format-title"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="4">
          <div class="text-caption mb-2">Chart-Typ</div>
          <v-btn-toggle
            :model-value="chartType"
            @update:model-value="$emit('update:chartType', $event)"
            color="primary"
            mandatory
            divided
            class="w-100"
          >
            <v-tooltip text="Balkendiagramm" location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn value="bar" v-bind="props">
                  <v-icon>mdi-chart-bar</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="Liniendiagramm" location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn value="line" v-bind="props">
                  <v-icon>mdi-chart-line</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="Flächendiagramm" location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn value="area" v-bind="props">
                  <v-icon>mdi-chart-areaspline</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="Streudiagramm" location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn value="scatter" v-bind="props">
                  <v-icon>mdi-chart-scatter-plot</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="Kreisdiagramm" location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn value="pie" v-bind="props">
                  <v-icon>mdi-chart-pie</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </v-btn-toggle>
        </v-col>
        <v-col cols="12" md="4">
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                variant="outlined"
                block
                prepend-icon="mdi-palette"
              >
                Farben anpassen
              </v-btn>
            </template>
            <v-card min-width="300">
              <v-card-text>
                <!-- Serien-Farben -->
                <div v-if="seriesConfig && seriesConfig.length > 0">
                  <v-label class="text-subtitle-2 mb-2 d-block">Serien-Farben</v-label>
                  <div v-for="(series, index) in seriesConfig" :key="series.columnKey" class="mb-3">
                    <v-label class="text-caption">{{ series.name }}</v-label>
                    <input
                      type="color"
                      :value="series.color"
                      @input="$emit('updateSeriesColor', index, ($event.target as HTMLInputElement).value)"
                      class="color-picker-full"
                    />
                  </div>
                  <v-btn
                    variant="text"
                    size="small"
                    prepend-icon="mdi-refresh"
                    class="mb-3"
                    @click="$emit('regenerateColors')"
                  >
                    Farben neu generieren
                  </v-btn>
                  <v-divider class="my-3"></v-divider>
                </div>

                <!-- Hintergrund-Farbe -->
                <div>
                  <v-label class="text-caption">Hintergrund</v-label>
                  <input
                    type="color"
                    :value="colors.background"
                    @input="$emit('update:colors', { ...colors, background: ($event.target as HTMLInputElement).value })"
                    class="color-picker-full"
                  />
                </div>
              </v-card-text>
            </v-card>
          </v-menu>
        </v-col>
      </v-row>

      <!-- Y-Axis Scaling (only for bar, line, area, scatter charts) -->
      <v-row v-if="['bar', 'line', 'area', 'scatter'].includes(chartType)" class="mt-2">
        <v-col cols="12">
          <v-checkbox
            :model-value="customYAxis"
            @update:model-value="$emit('update:customYAxis', $event)"
            label="Benutzerdefinierte Y-Achsen-Skalierung"
            density="comfortable"
            hide-details
          ></v-checkbox>
        </v-col>
        <v-col v-if="customYAxis" cols="12">
          <v-label class="text-caption mb-2">
            Y-Achsen-Bereich: {{ yAxisRange[0] }} - {{ yAxisRange[1] }}
          </v-label>
          <v-range-slider
            :model-value="yAxisRange"
            @update:model-value="$emit('update:yAxisRange', $event)"
            :min="dataExtent[0]"
            :max="dataExtent[1]"
            :step="1"
            color="primary"
            thumb-label="always"
            strict
          ></v-range-slider>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { ChartType, ChartColors } from '../../../composables/useChartConfig'
import type { SeriesConfig } from '../../../utils/chartGenerators/types'

defineProps({
  chartTitle: {
    type: String,
    required: true
  },
  chartType: {
    type: String as PropType<ChartType>,
    required: true
  },
  colors: {
    type: Object as PropType<ChartColors>,
    required: true
  },
  seriesConfig: {
    type: Array as PropType<SeriesConfig[]>,
    default: () => []
  },
  customYAxis: {
    type: Boolean,
    default: false
  },
  yAxisRange: {
    type: Array as PropType<[number, number]>,
    default: () => [0, 100]
  },
  dataExtent: {
    type: Array as PropType<[number, number]>,
    default: () => [0, 100]
  }
})

defineEmits<{
  'update:chartTitle': [value: string]
  'update:chartType': [value: ChartType]
  'update:colors': [value: ChartColors]
  'update:customYAxis': [value: boolean]
  'update:yAxisRange': [value: [number, number]]
  updateSeriesColor: [index: number, color: string]
  regenerateColors: []
}>()
</script>

<style scoped>
.color-picker-full {
  width: 100%;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}
</style>
