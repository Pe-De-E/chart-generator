import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { PlaybackSpeed } from '../composables/useChartAnimation'

export const useAnimationStore = defineStore('animation', () => {
  // State — written by step component watchers, read by sidebar
  const progress = ref(0)
  const isPlaying = ref(false)
  const playbackSpeed = ref<PlaybackSpeed>(1)
  const sliderProgress = ref(0)
  const formattedTime = ref('0:00.00')

  // Control callbacks registered by the active step component.
  // Not reactive — just plain closures so we avoid reactive overhead on the hot rAF path.
  let _controls: {
    toggle: () => void
    seekTo: (p: number) => void
    setSpeed: (s: PlaybackSpeed) => void
    reset: () => void
  } | null = null

  function registerControls(controls: NonNullable<typeof _controls>) {
    _controls = controls
  }

  function unregisterControls() {
    _controls = null
  }

  // Actions called by sidebar
  function togglePlayback() {
    _controls?.toggle()
  }

  function onSliderChange(value: number) {
    sliderProgress.value = value
    _controls?.seekTo(value / 100)
  }

  function setSpeed(speed: PlaybackSpeed) {
    _controls?.setSpeed(speed)
  }

  function resetAnimation() {
    _controls?.reset()
  }

  return {
    progress,
    isPlaying,
    playbackSpeed,
    sliderProgress,
    formattedTime,
    registerControls,
    unregisterControls,
    togglePlayback,
    onSliderChange,
    setSpeed,
    resetAnimation,
  }
})
