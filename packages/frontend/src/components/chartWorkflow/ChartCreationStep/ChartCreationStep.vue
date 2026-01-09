<template>
  <v-card flat>
    <v-card-text>
      <div class="text-h5 mb-4">Chart erstellen</div>

      <!-- Chart Settings -->
      <ChartSettingsCard
        :chart-title="chartTitle"
        :chart-type="chartType"
        :colors="colors"
        :series-config="seriesConfig"
        @update:chart-title="$emit('update:chartTitle', $event)"
        @update:chart-type="$emit('update:chartType', $event)"
        @update:colors="$emit('update:colors', $event)"
        @update-series-color="(index, color) => $emit('updateSeriesColor', index, color)"
        @regenerate-colors="$emit('regenerateColors')"
      />

      <!-- Statistical Overlays -->
      <StatisticalOverlaysCard
        :chart-type="chartType"
        :statistical-overlays="statisticalOverlays"
        :data-extent="dataExtent"
        @update:statistical-overlays="$emit('update:statisticalOverlays', $event)"
      />

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
        color="success"
        variant="flat"
        prepend-icon="mdi-content-save"
        @click="$emit('save')"
      >
        Speichern
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
import type { ChartType, ChartColors } from '../../../composables/useChartConfig'
import type { SeriesConfig, StatisticalOverlays } from '../../../utils/chartGenerators/types'
import ChartSettingsCard from './ChartSettingsCard.vue'
import StatisticalOverlaysCard from './StatisticalOverlaysCard.vue'

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
  statisticalOverlays: {
    type: Object as PropType<StatisticalOverlays>,
    required: true
  },
  svgContent: {
    type: String,
    required: true
  },
  seriesConfig: {
    type: Array as PropType<SeriesConfig[]>,
    default: () => []
  },
  dataExtent: {
    type: Array as PropType<[number, number]>,
    default: () => [0, 100]
  }
})

defineEmits<{
  back: []
  reset: []
  download: []
  save: []
  'show-fullscreen': []
  'update:chartTitle': [value: string]
  'update:chartType': [value: ChartType]
  'update:colors': [value: ChartColors]
  'update:statisticalOverlays': [value: StatisticalOverlays]
  updateSeriesColor: [index: number, color: string]
  regenerateColors: []
}>()
</script>

<style scoped>
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
