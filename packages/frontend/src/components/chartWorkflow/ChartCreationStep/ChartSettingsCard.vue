<template>
  <div class="settings-content">
    <v-row>
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
            <v-tooltip text="Höhenprofil" location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn value="elevation" v-bind="props">
                  <v-icon>mdi-elevation-rise</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </v-btn-toggle>

          <!-- Silhouette Mode Toggle (only for elevation) -->
          <v-switch
            v-if="chartType === 'elevation'"
            :model-value="silhouetteMode"
            @update:model-value="$emit('update:silhouetteMode', $event ?? false)"
            label="Silhouette-Modus"
            hint="Nur Kurve, perfekt für Social Media"
            persistent-hint
            density="compact"
            color="primary"
            class="mt-3"
          ></v-switch>
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
  </div>
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
  silhouetteMode: {
    type: Boolean,
    default: false
  }
})

defineEmits<{
  'update:chartTitle': [value: string]
  'update:chartType': [value: ChartType]
  'update:colors': [value: ChartColors]
  'update:silhouetteMode': [value: boolean]
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
