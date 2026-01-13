<template>
  <v-card elevation="2" class="chart-card">
    <v-img
      v-if="chart.svgContent"
      :src="'data:image/svg+xml;base64,' + encodeSvg(chart.svgContent)"
      height="200"
      cover
      class="chart-preview"
    ></v-img>
    <div v-else class="chart-preview-placeholder">
      <v-icon size="64" color="grey-lighten-1">
        {{ chartIcon }}
      </v-icon>
    </div>

    <v-card-title class="text-h6">
      {{ chart.title }}
    </v-card-title>

    <v-card-subtitle>
      <v-chip size="small" :color="chartColor" class="mr-2">
        {{ chart.type.toUpperCase() }}
      </v-chip>
      <span class="text-caption">
        {{ formattedDate }}
      </span>
    </v-card-subtitle>

    <v-card-actions>
      <v-btn
        color="primary"
        variant="text"
        prepend-icon="mdi-pencil"
        @click="$emit('edit', chart.id)"
      >
        Edit
      </v-btn>
      <v-spacer />
      <v-btn
        color="error"
        variant="text"
        icon="mdi-delete"
        @click="$emit('delete', chart)"
      />
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SavedChart } from '@chart-generator/shared'

const props = defineProps<{
  chart: SavedChart
}>()

defineEmits<{
  edit: [chartId: string]
  delete: [chart: SavedChart]
}>()

const chartIcon = computed(() => {
  const icons: Record<string, string> = {
    bar: 'mdi-chart-bar',
    line: 'mdi-chart-line',
    scatter: 'mdi-chart-scatter-plot',
    pie: 'mdi-chart-pie',
    area: 'mdi-chart-areaspline',
  }
  return icons[props.chart.type] || 'mdi-chart-box'
})

const chartColor = computed(() => {
  const colors: Record<string, string> = {
    bar: 'blue',
    line: 'green',
    scatter: 'orange',
    pie: 'purple',
    area: 'teal',
  }
  return colors[props.chart.type] || 'grey'
})

const formattedDate = computed(() => {
  const date = new Date(props.chart.updatedAt)
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
})

function encodeSvg(svgContent: string): string {
  return window.btoa(svgContent)
}
</script>

<style scoped>
.chart-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-preview {
  background: #f5f5f5;
}

.chart-preview-placeholder {
  height: 200px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
