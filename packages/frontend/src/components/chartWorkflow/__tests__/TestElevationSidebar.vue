<template>
  <v-app style="min-height: 100vh; position: relative;">
    <ElevationControlsSidebar
      :animation-config="animationConfig"
      :chart-title="chartTitle"
      :is-playing="isPlaying"
      :playback-speed="playbackSpeed"
      :formatted-time="formattedTime"
      :animation-progress="animationProgress"
      :slider-progress="sliderProgress"
      :video-export-supported="videoExportSupported"
      :video-exporting="videoExporting"
      :collapsed="collapsed"
      @toggle-playback="$emit('toggle-playback')"
      @update:animationConfig="$emit('update:animationConfig', $event)"
      @update:chartTitle="$emit('update:chartTitle', $event)"
    />
  </v-app>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import ElevationControlsSidebar from '../ElevationControlsSidebar.vue'
import type { ElevationAnimationConfig } from '../ElevationChartStep.vue'

defineProps({
  animationConfig: { type: Object as PropType<ElevationAnimationConfig>, required: true },
  chartTitle: { type: String, required: true },
  isPlaying: { type: Boolean, required: true },
  playbackSpeed: { type: Number, required: true },
  formattedTime: { type: String, required: true },
  animationProgress: { type: Number, required: true },
  sliderProgress: { type: Number, required: true },
  videoExportSupported: { type: Boolean, required: true },
  videoExporting: { type: Boolean, required: true },
  collapsed: { type: Boolean, default: false },
})

defineEmits<{
  'toggle-playback': []
  'update:animationConfig': [value: ElevationAnimationConfig]
  'update:chartTitle': [value: string]
}>()
</script>
