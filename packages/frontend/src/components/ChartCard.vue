<template>
  <div class="reel-card" @click="$emit('edit', chart.id)">
    <!-- Chart Preview Background -->
    <div class="reel-background">
      <v-img
        v-if="chart.svgContent"
        :src="'data:image/svg+xml;base64,' + encodeSvg(chart.svgContent)"
        cover
        class="reel-image"
      />
      <div v-else class="reel-placeholder">
        <v-icon size="36" color="rgba(255,255,255,0.5)">
          {{ chartIcon }}
        </v-icon>
      </div>
    </div>

    <!-- Gradient Overlay -->
    <div class="reel-gradient" />

    <!-- Chart Type Badge -->
    <div class="reel-badge">
      <v-icon size="14" color="white">{{ chartIcon }}</v-icon>
    </div>

    <!-- Bottom Info Overlay -->
    <div class="reel-info">
      <div class="reel-title">{{ chart.title }}</div>
      <div class="reel-meta">
        <span class="reel-type">{{ chart.type }}</span>
        <span class="reel-date">{{ formattedDate }}</span>
      </div>
    </div>

    <!-- Side Actions -->
    <div class="reel-actions">
      <v-btn
        icon
        size="x-small"
        variant="text"
        class="reel-action-btn"
        @click.stop="$emit('edit', chart.id)"
      >
        <v-icon size="16" color="white">mdi-pencil</v-icon>
      </v-btn>
      <v-btn
        icon
        size="x-small"
        variant="text"
        class="reel-action-btn"
        @click.stop="$emit('delete', chart)"
      >
        <v-icon size="16" color="white">mdi-delete</v-icon>
      </v-btn>
    </div>
  </div>
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
.reel-card {
  position: relative;
  aspect-ratio: 9 / 16;
  max-width: 250px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: #1a1a1a;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.reel-card:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.reel-card:hover .reel-actions {
  opacity: 1;
}

.reel-background {
  position: absolute;
  inset: 0;
}

.reel-image {
  width: 100%;
  height: 100%;
}

.reel-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
}

.reel-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 30%,
    rgba(0, 0, 0, 0) 60%
  );
  pointer-events: none;
}

.reel-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reel-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  color: white;
}

.reel-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reel-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
}

.reel-type {
  text-transform: capitalize;
}

.reel-date::before {
  content: '•';
  margin-right: 8px;
}

.reel-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.reel-action-btn {
  background: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(4px);
}
</style>
