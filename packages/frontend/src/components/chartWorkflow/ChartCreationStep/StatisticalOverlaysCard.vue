<template>
  <v-card variant="outlined" class="mb-4" v-if="chartType !== 'pie'">
    <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
      <v-icon icon="mdi-chart-bell-curve-cumulative" class="mr-2"></v-icon>
      Statistische Vergleichswerte
    </v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12" md="6">
          <v-checkbox
            :model-value="statisticalOverlays.showMean"
            @update:model-value="$emit('update:statisticalOverlays', { ...statisticalOverlays, showMean: !!$event })"
            label="Mittelwert anzeigen"
            color="error"
            density="comfortable"
            hide-details
          >
            <template v-slot:label>
              <span>Mittelwert anzeigen</span>
              <v-chip size="x-small" class="ml-2" color="error" variant="flat">━━━</v-chip>
            </template>
          </v-checkbox>

          <v-checkbox
            :model-value="statisticalOverlays.showMedian"
            @update:model-value="$emit('update:statisticalOverlays', { ...statisticalOverlays, showMedian: !!$event })"
            label="Median anzeigen"
            color="error"
            density="comfortable"
            hide-details
            class="mt-2"
          >
            <template v-slot:label>
              <span>Median anzeigen</span>
              <v-chip size="x-small" class="ml-2" color="error" variant="flat">- - -</v-chip>
            </template>
          </v-checkbox>

          <v-checkbox
            :model-value="statisticalOverlays.showStdDev"
            @update:model-value="$emit('update:statisticalOverlays', { ...statisticalOverlays, showStdDev: !!$event })"
            label="Standardabweichung anzeigen"
            color="error"
            density="comfortable"
            hide-details
            class="mt-2"
          >
            <template v-slot:label>
              <span>Standardabweichung anzeigen</span>
              <v-chip size="x-small" class="ml-2" color="error" variant="outlined">±σ</v-chip>
            </template>
          </v-checkbox>
        </v-col>
        <v-col cols="12" md="6">
          <v-checkbox
            :model-value="statisticalOverlays.showMinMax"
            @update:model-value="$emit('update:statisticalOverlays', { ...statisticalOverlays, showMinMax: !!$event })"
            label="Min/Max anzeigen"
            color="error"
            density="comfortable"
            hide-details
          >
            <template v-slot:label>
              <span>Min/Max anzeigen</span>
              <v-chip size="x-small" class="ml-2" color="error" variant="outlined">↕</v-chip>
            </template>
          </v-checkbox>

          <v-checkbox
            :model-value="statisticalOverlays.showQuartiles"
            @update:model-value="$emit('update:statisticalOverlays', { ...statisticalOverlays, showQuartiles: !!$event })"
            label="Quartile anzeigen (Q1/Q3)"
            color="error"
            density="comfortable"
            hide-details
            class="mt-2"
          >
            <template v-slot:label>
              <span>Quartile anzeigen (Q1/Q3)</span>
              <v-chip size="x-small" class="ml-2" color="error" variant="tonal">Q</v-chip>
            </template>
          </v-checkbox>

          <div class="mt-3">
            <v-label class="text-caption">Farbe der Vergleichswerte</v-label>
            <input
              type="color"
              :value="statisticalOverlays.color"
              @input="$emit('update:statisticalOverlays', { ...statisticalOverlays, color: ($event.target as HTMLInputElement).value })"
              class="color-picker-full mt-1"
            />
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { ChartType } from '../../../composables/useChartConfig'
import type { StatisticalOverlays } from '../../../utils/chartGenerators/types'

defineProps({
  chartType: {
    type: String as PropType<ChartType>,
    required: true
  },
  statisticalOverlays: {
    type: Object as PropType<StatisticalOverlays>,
    required: true
  }
})

defineEmits<{
  'update:statisticalOverlays': [value: StatisticalOverlays]
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
