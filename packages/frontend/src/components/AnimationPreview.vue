<template>
  <v-card variant="outlined" class="animation-preview">
    <!-- SVG Preview -->
    <div class="svg-container" v-html="animation.currentSvg.value"></div>

    <!-- Controls -->
    <v-card-actions class="controls pa-4">
      <!-- Play/Pause Button -->
      <v-btn
        :icon="animation.isPlaying.value ? 'mdi-pause' : 'mdi-play'"
        variant="flat"
        color="primary"
        size="large"
        @click="animation.toggle"
      />

      <!-- Reset Button -->
      <v-btn
        icon="mdi-replay"
        variant="text"
        size="small"
        @click="animation.reset"
        :disabled="animation.progress.value === 0"
      />

      <!-- Progress Slider -->
      <v-slider
        v-model="sliderProgress"
        :min="0"
        :max="100"
        :step="0.1"
        hide-details
        class="mx-4 flex-grow-1"
        color="primary"
        track-color="grey-lighten-2"
        @update:model-value="onSliderChange"
      />

      <!-- Time Display -->
      <span class="time-display text-caption mr-2">
        {{ animation.formattedTime.value }}
      </span>

      <!-- Speed Selector -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            size="small"
            class="speed-btn"
          >
            {{ animation.playbackSpeed.value }}x
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item
            v-for="speed in speedOptions"
            :key="speed"
            :active="animation.playbackSpeed.value === speed"
            @click="animation.setSpeed(speed)"
          >
            <v-list-item-title>{{ speed }}x</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-actions>

    <!-- Frame Info -->
    <v-card-text class="pt-0 text-caption text-medium-emphasis">
      Frame {{ animation.currentFrame.value + 1 }} / {{ animation.totalFrames.value }}
      <span class="ml-2">|</span>
      <span class="ml-2">{{ Math.round(animation.progress.value * 100) }}%</span>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ChartOptions, AnimationOptions } from '@chart-generator/shared'
import { DEFAULT_ANIMATION_OPTIONS } from '@chart-generator/shared'
import { useChartAnimation, type PlaybackSpeed } from '../composables/useChartAnimation'

const props = defineProps<{
  chartOptions: ChartOptions
  animationOptions?: AnimationOptions
}>()

const emit = defineEmits<{
  (e: 'progress', progress: number): void
}>()

// Animation options with defaults
const mergedAnimationOptions = computed(() => ({
  ...DEFAULT_ANIMATION_OPTIONS,
  ...props.animationOptions
}))

// Use the animation composable
const animation = useChartAnimation(
  computed(() => props.chartOptions),
  computed(() => mergedAnimationOptions.value)
)

// Speed options
const speedOptions: PlaybackSpeed[] = [0.25, 0.5, 1, 1.5, 2]

// Slider progress (0-100 for better UX)
const sliderProgress = ref(0)

// Sync slider with animation progress
watch(() => animation.progress.value, (newProgress) => {
  sliderProgress.value = newProgress * 100
  emit('progress', newProgress)
})

// Handle slider change
function onSliderChange(value: number) {
  animation.seekTo(value / 100)
}

// Expose animation controls for parent components
defineExpose({
  play: animation.play,
  pause: animation.pause,
  reset: animation.reset,
  seekTo: animation.seekTo,
  isPlaying: animation.isPlaying,
  progress: animation.progress
})
</script>

<style scoped>
.animation-preview {
  overflow: hidden;
}

.svg-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
  padding: 16px;
}

.svg-container :deep(svg) {
  max-width: 100%;
  height: auto;
}

.controls {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background: #fafafa;
}

.time-display {
  font-family: monospace;
  min-width: 70px;
  text-align: right;
}

.speed-btn {
  min-width: 48px;
}
</style>
