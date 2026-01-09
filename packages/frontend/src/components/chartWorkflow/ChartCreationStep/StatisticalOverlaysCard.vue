<template>
  <div class="overlays-content">
    <v-row>
        <v-col cols="12" md="6">
          <!-- TODO couldn't this be a list, with an own component? is this a good idea? -->
          <!-- TODO man sollte die farben für die verschiedenen statistischen mittel einstellen können und nicht komplett für alle, das macht es 
           übersichtlicher, wenn man mehrere einsetzt -->
          <v-checkbox
            :model-value="statisticalOverlays.showMean"
            @update:model-value="
              $emit('update:statisticalOverlays', {
                ...statisticalOverlays,
                showMean: !!$event,
              })
            "
            label="Mittelwert anzeigen"
            color="error"
            density="comfortable"
            hide-details
          >
            <template v-slot:label>
              <span>Mittelwert anzeigen</span>
              <v-chip size="x-small" class="ml-2" color="error" variant="flat"
                >━━━</v-chip
              >
            </template>
          </v-checkbox>

          <v-checkbox
            :model-value="statisticalOverlays.showMedian"
            @update:model-value="
              $emit('update:statisticalOverlays', {
                ...statisticalOverlays,
                showMedian: !!$event,
              })
            "
            label="Median anzeigen"
            color="error"
            density="comfortable"
            hide-details
            class="mt-2"
          >
            <template v-slot:label>
              <span>Median anzeigen</span>
              <v-chip size="x-small" class="ml-2" color="error" variant="flat"
                >- - -</v-chip
              >
            </template>
          </v-checkbox>

          <v-checkbox
            :model-value="statisticalOverlays.showStdDev"
            @update:model-value="
              $emit('update:statisticalOverlays', {
                ...statisticalOverlays,
                showStdDev: !!$event,
              })
            "
            label="Standardabweichung anzeigen"
            color="error"
            density="comfortable"
            hide-details
            class="mt-2"
          >
            <template v-slot:label>
              <span>Standardabweichung anzeigen</span>
              <v-chip
                size="x-small"
                class="ml-2"
                color="error"
                variant="outlined"
                >±σ</v-chip
              >
            </template>
          </v-checkbox>
        </v-col>
        <v-col cols="12" md="6">
          <v-checkbox
            :model-value="statisticalOverlays.showMinMax"
            @update:model-value="
              $emit('update:statisticalOverlays', {
                ...statisticalOverlays,
                showMinMax: !!$event,
              })
            "
            label="Min/Max anzeigen"
            color="error"
            density="comfortable"
            hide-details
          >
            <template v-slot:label>
              <span>Min/Max anzeigen</span>
              <v-chip
                size="x-small"
                class="ml-2"
                color="error"
                variant="outlined"
                >↕</v-chip
              >
            </template>
          </v-checkbox>

          <v-checkbox
            :model-value="statisticalOverlays.showQuartiles"
            @update:model-value="
              $emit('update:statisticalOverlays', {
                ...statisticalOverlays,
                showQuartiles: !!$event,
              })
            "
            label="Quartile anzeigen (Q1/Q3)"
            color="error"
            density="comfortable"
            hide-details
            class="mt-2"
          >
            <template v-slot:label>
              <span>Quartile anzeigen (Q1/Q3)</span>
              <v-chip size="x-small" class="ml-2" color="error" variant="tonal"
                >Q</v-chip
              >
            </template>
          </v-checkbox>

          <v-checkbox
            :model-value="statisticalOverlays.showCustomRange"
            @update:model-value="
              $emit('update:statisticalOverlays', {
                ...statisticalOverlays,
                showCustomRange: !!$event,
              })
            "
            label="Benutzerdefinierten Bereich anzeigen"
            color="error"
            density="comfortable"
            hide-details
            class="mt-2"
          >
            <template v-slot:label>
              <span>Benutzerdefinierten Bereich anzeigen</span>
              <v-chip size="x-small" class="ml-2" color="error" variant="tonal"
                >⬌</v-chip
              >
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

      <!-- Custom Range Slider -->
      <v-row v-if="statisticalOverlays.showCustomRange" class="mt-2">
        <v-col cols="12">
          <v-label class="text-caption mb-2">
            Bereich: {{ statisticalOverlays.customRangeMin }} -
            {{ statisticalOverlays.customRangeMax }}
          </v-label>
          <v-range-slider
            :model-value="[
              statisticalOverlays.customRangeMin,
              statisticalOverlays.customRangeMax,
            ]"
            @update:model-value="
              $emit('update:statisticalOverlays', {
                ...statisticalOverlays,
                customRangeMin: $event[0],
                customRangeMax: $event[1],
              })
            "
            :min="dataExtent[0]"
            :max="dataExtent[1]"
            :step="1"
            color="error"
            thumb-label="always"
            strict
          ></v-range-slider>
        </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import type { ChartType } from "../../../composables/useChartConfig";
import type { StatisticalOverlays } from "../../../utils/chartGenerators/types";

defineProps({
  chartType: {
    type: String as PropType<ChartType>,
    required: true,
  },
  statisticalOverlays: {
    type: Object as PropType<StatisticalOverlays>,
    required: true,
  },
  dataExtent: {
    type: Array as PropType<[number, number]>,
    default: () => [0, 100],
  },
});

defineEmits<{
  "update:statisticalOverlays": [value: StatisticalOverlays];
}>();
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
