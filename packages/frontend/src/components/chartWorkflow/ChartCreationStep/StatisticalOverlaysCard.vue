<template>
  <div class="overlays-content">
    <v-row>
        <v-col cols="12" md="6">
          <!-- Mittelwert -->
          <div class="overlay-item">
            <v-checkbox
              :model-value="statisticalOverlays.showMean"
              @update:model-value="
                $emit('update:statisticalOverlays', {
                  ...statisticalOverlays,
                  showMean: !!$event,
                })
              "
              label="Mittelwert anzeigen"
              density="comfortable"
              hide-details
            >
              <template v-slot:label>
                <span>Mittelwert anzeigen</span>
                <span class="color-chip ml-2" :style="{ backgroundColor: statisticalOverlays.colors.mean }">━━━</span>
              </template>
            </v-checkbox>
            <input
              v-if="statisticalOverlays.showMean"
              type="color"
              :value="statisticalOverlays.colors.mean"
              @input="updateColor('mean', ($event.target as HTMLInputElement).value)"
              class="color-picker-inline"
              title="Farbe anpassen"
            />
          </div>

          <!-- Median -->
          <div class="overlay-item mt-2">
            <v-checkbox
              :model-value="statisticalOverlays.showMedian"
              @update:model-value="
                $emit('update:statisticalOverlays', {
                  ...statisticalOverlays,
                  showMedian: !!$event,
                })
              "
              label="Median anzeigen"
              density="comfortable"
              hide-details
            >
              <template v-slot:label>
                <span>Median anzeigen</span>
                <span class="color-chip ml-2" :style="{ backgroundColor: statisticalOverlays.colors.median }">- - -</span>
              </template>
            </v-checkbox>
            <input
              v-if="statisticalOverlays.showMedian"
              type="color"
              :value="statisticalOverlays.colors.median"
              @input="updateColor('median', ($event.target as HTMLInputElement).value)"
              class="color-picker-inline"
              title="Farbe anpassen"
            />
          </div>

          <!-- Standardabweichung -->
          <div class="overlay-item mt-2">
            <v-checkbox
              :model-value="statisticalOverlays.showStdDev"
              @update:model-value="
                $emit('update:statisticalOverlays', {
                  ...statisticalOverlays,
                  showStdDev: !!$event,
                })
              "
              label="Standardabweichung anzeigen"
              density="comfortable"
              hide-details
            >
              <template v-slot:label>
                <span>Standardabweichung anzeigen</span>
                <span class="color-chip color-chip-outlined ml-2" :style="{ borderColor: statisticalOverlays.colors.stdDev, color: statisticalOverlays.colors.stdDev }">±σ</span>
              </template>
            </v-checkbox>
            <input
              v-if="statisticalOverlays.showStdDev"
              type="color"
              :value="statisticalOverlays.colors.stdDev"
              @input="updateColor('stdDev', ($event.target as HTMLInputElement).value)"
              class="color-picker-inline"
              title="Farbe anpassen"
            />
          </div>
        </v-col>
        <v-col cols="12" md="6">
          <!-- Min/Max -->
          <div class="overlay-item">
            <v-checkbox
              :model-value="statisticalOverlays.showMinMax"
              @update:model-value="
                $emit('update:statisticalOverlays', {
                  ...statisticalOverlays,
                  showMinMax: !!$event,
                })
              "
              label="Min/Max anzeigen"
              density="comfortable"
              hide-details
            >
              <template v-slot:label>
                <span>Min/Max anzeigen</span>
                <span class="color-chip color-chip-outlined ml-2" :style="{ borderColor: statisticalOverlays.colors.minMax, color: statisticalOverlays.colors.minMax }">↕</span>
              </template>
            </v-checkbox>
            <input
              v-if="statisticalOverlays.showMinMax"
              type="color"
              :value="statisticalOverlays.colors.minMax"
              @input="updateColor('minMax', ($event.target as HTMLInputElement).value)"
              class="color-picker-inline"
              title="Farbe anpassen"
            />
          </div>

          <!-- Quartile -->
          <div class="overlay-item mt-2">
            <v-checkbox
              :model-value="statisticalOverlays.showQuartiles"
              @update:model-value="
                $emit('update:statisticalOverlays', {
                  ...statisticalOverlays,
                  showQuartiles: !!$event,
                })
              "
              label="Quartile anzeigen (Q1/Q3)"
              density="comfortable"
              hide-details
            >
              <template v-slot:label>
                <span>Quartile anzeigen (Q1/Q3)</span>
                <span class="color-chip color-chip-tonal ml-2" :style="{ backgroundColor: statisticalOverlays.colors.quartiles + '30', color: statisticalOverlays.colors.quartiles }">Q</span>
              </template>
            </v-checkbox>
            <input
              v-if="statisticalOverlays.showQuartiles"
              type="color"
              :value="statisticalOverlays.colors.quartiles"
              @input="updateColor('quartiles', ($event.target as HTMLInputElement).value)"
              class="color-picker-inline"
              title="Farbe anpassen"
            />
          </div>

          <!-- Benutzerdefinierter Bereich -->
          <div class="overlay-item mt-2">
            <v-checkbox
              :model-value="statisticalOverlays.showCustomRange"
              @update:model-value="
                $emit('update:statisticalOverlays', {
                  ...statisticalOverlays,
                  showCustomRange: !!$event,
                })
              "
              label="Benutzerdefinierten Bereich anzeigen"
              density="comfortable"
              hide-details
            >
              <template v-slot:label>
                <span>Benutzerdefinierten Bereich anzeigen</span>
                <span class="color-chip color-chip-tonal ml-2" :style="{ backgroundColor: statisticalOverlays.colors.customRange + '30', color: statisticalOverlays.colors.customRange }">⬌</span>
              </template>
            </v-checkbox>
            <input
              v-if="statisticalOverlays.showCustomRange"
              type="color"
              :value="statisticalOverlays.colors.customRange"
              @input="updateColor('customRange', ($event.target as HTMLInputElement).value)"
              class="color-picker-inline"
              title="Farbe anpassen"
            />
          </div>

          <!-- Z-Score -->
          <div class="overlay-item mt-2">
            <v-checkbox
              :model-value="statisticalOverlays.showZScore"
              @update:model-value="
                $emit('update:statisticalOverlays', {
                  ...statisticalOverlays,
                  showZScore: !!$event,
                })
              "
              label="Z-Score Grenzwerte anzeigen"
              density="comfortable"
              hide-details
            >
              <template v-slot:label>
                <span>Z-Score Grenzwerte anzeigen</span>
                <span class="color-chip color-chip-tonal ml-2" :style="{ backgroundColor: statisticalOverlays.colors.zScore + '30', color: statisticalOverlays.colors.zScore }">Z</span>
              </template>
            </v-checkbox>
            <input
              v-if="statisticalOverlays.showZScore"
              type="color"
              :value="statisticalOverlays.colors.zScore"
              @input="updateColor('zScore', ($event.target as HTMLInputElement).value)"
              class="color-picker-inline"
              title="Farbe anpassen"
            />
          </div>
        </v-col>
      </v-row>

      <!-- Z-Score Threshold Slider -->
      <v-row v-if="statisticalOverlays.showZScore" class="mt-2">
        <v-col cols="12">
          <v-label class="text-caption mb-2">
            Z-Score Grenzwert: ±{{ statisticalOverlays.zScoreThreshold }}σ
          </v-label>
          <v-slider
            :model-value="statisticalOverlays.zScoreThreshold"
            @update:model-value="
              $emit('update:statisticalOverlays', {
                ...statisticalOverlays,
                zScoreThreshold: $event,
              })
            "
            :min="0.5"
            :max="4"
            :step="0.5"
            color="error"
            thumb-label="always"
            :thumb-size="20"
          >
            <template v-slot:thumb-label="{ modelValue }">
              ±{{ modelValue }}σ
            </template>
          </v-slider>
          <div class="text-caption text-grey mt-n2">
            Werte außerhalb von ±{{ statisticalOverlays.zScoreThreshold }} Standardabweichungen werden als Ausreißer markiert
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
import type { StatisticalOverlays, StatisticalOverlayColors } from "../../../utils/chartGenerators/types";

const props = defineProps({
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

const emit = defineEmits<{
  "update:statisticalOverlays": [value: StatisticalOverlays];
}>();

function updateColor(colorKey: keyof StatisticalOverlayColors, value: string) {
  emit("update:statisticalOverlays", {
    ...props.statisticalOverlays,
    colors: {
      ...props.statisticalOverlays.colors,
      [colorKey]: value,
    },
  });
}
</script>

<style scoped>
.overlay-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker-inline {
  width: 28px;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.color-picker-inline:hover {
  border-color: #888;
}

.color-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: white;
  min-width: 32px;
}

.color-chip-outlined {
  background: transparent !important;
  border: 1px solid;
}

.color-chip-tonal {
  border: none;
}
</style>
