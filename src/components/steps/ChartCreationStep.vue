<template>
  <v-card flat>
    <v-card-text>
      <div class="text-h5 mb-4">Chart erstellen</div>

      <!-- Chart Settings -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
          <v-icon icon="mdi-cog" class="mr-2"></v-icon>
          Einstellungen
        </v-card-title>
        <v-card-text>
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
                <v-btn value="bar">
                  <v-icon>mdi-chart-bar</v-icon>
                </v-btn>
                <v-btn value="line">
                  <v-icon>mdi-chart-line</v-icon>
                </v-btn>
                <v-btn value="area">
                  <v-icon>mdi-chart-areaspline</v-icon>
                </v-btn>
                <v-btn value="scatter">
                  <v-icon>mdi-chart-scatter-plot</v-icon>
                </v-btn>
                <v-btn value="pie">
                  <v-icon>mdi-chart-pie</v-icon>
                </v-btn>
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
        </v-card-text>
      </v-card>

      <!-- Chart Preview -->
      <v-card variant="outlined">
        <v-card-title class="text-subtitle-1 bg-grey-lighten-4 d-flex justify-space-between align-center">
          <div>
            <v-icon icon="mdi-eye" class="mr-2"></v-icon>
            Vorschau
          </div>
          <v-btn
            icon="mdi-fullscreen"
            size="small"
            variant="text"
            @click="$emit('show-fullscreen')"
          ></v-btn>
        </v-card-title>
        <v-card-text class="pa-6">
          <div class="preview-container" v-html="svgContent"></div>
        </v-card-text>
      </v-card>
    </v-card-text>

    <v-card-actions>
      <v-btn
        variant="text"
        @click="$emit('back')"
      >
        <v-icon start>mdi-chevron-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        color="secondary"
        variant="outlined"
        @click="$emit('reset')"
      >
        Neu starten
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-download"
        @click="$emit('download')"
      >
        SVG herunterladen
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { ChartType, ChartColors } from '../../composables/useChartConfig'
import type { SeriesConfig } from '../../utils/chartGenerators/types'

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
  svgContent: {
    type: String,
    required: true
  },
  seriesConfig: {
    type: Array as PropType<SeriesConfig[]>,
    default: () => []
  }
})

defineEmits<{
  back: []
  reset: []
  download: []
  'show-fullscreen': []
  'update:chartTitle': [value: string]
  'update:chartType': [value: ChartType]
  'update:colors': [value: ChartColors]
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

.preview-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  min-height: 400px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  overflow-x: auto;
  overflow-y: hidden;
}
</style>
