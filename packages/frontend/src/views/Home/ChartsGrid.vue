<template>
  <v-row>
    <v-col
      v-for="chart in charts"
      :key="chart.id"
      cols="12"
      sm="6"
      md="4"
      lg="3"
    >
      <ChartCard
        :chart="chart"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import type { SavedChart } from '@chart-generator/shared'
import ChartCard from '../../components/ChartCard.vue'

defineProps<{
  charts: SavedChart[]
}>()

defineEmits<{
  edit: [chartId: string]
  delete: [chart: SavedChart]
}>()
</script>
