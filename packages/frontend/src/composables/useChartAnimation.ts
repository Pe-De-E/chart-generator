/**
 * Composable for managing chart animation state and playback
 */

import { ref, computed, watch, onUnmounted, type Ref } from 'vue'
import type { ChartOptions, AnimationOptions } from '@chart-generator/shared'
import { DEFAULT_ANIMATION_OPTIONS } from '@chart-generator/shared'
import { generateElevationFrame, type FrameOptions } from '../utils/chartGenerators/elevationChart/elevationChart'
import { getFrameCount } from '../utils/animationFrameGenerator'

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 1.5 | 2

export interface UseChartAnimationReturn {
  // State
  progress: Ref<number>
  isPlaying: Ref<boolean>
  currentFrame: Ref<number>
  totalFrames: Ref<number>
  currentTimeMs: Ref<number>
  playbackSpeed: Ref<PlaybackSpeed>

  // Computed
  currentSvg: Ref<string>
  formattedTime: Ref<string>

  // Actions
  play: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  seekTo: (progress: number) => void
  seekToFrame: (frame: number) => void
  setSpeed: (speed: PlaybackSpeed) => void
}

export function useChartAnimation(
  chartOptions: Ref<ChartOptions>,
  animationOptions: Ref<AnimationOptions> = ref({ ...DEFAULT_ANIMATION_OPTIONS })
): UseChartAnimationReturn {
  // Playback state
  // Start at progress=1 so the chart is initially visible
  // When play() is called, it resets to 0 and animates
  const progress = ref(1)
  const isPlaying = ref(false)
  const playbackSpeed = ref<PlaybackSpeed>(1)

  // Animation frame tracking
  let animationFrameId: number | null = null
  let lastTimestamp: number | null = null

  // Computed values
  const totalFrames = computed(() => getFrameCount(animationOptions.value))

  const currentFrame = computed(() => {
    const frames = totalFrames.value - 1
    return Math.round(progress.value * frames)
  })

  const currentTimeMs = computed(() => {
    return progress.value * animationOptions.value.durationMs
  })

  const formattedTime = computed(() => {
    const totalSeconds = Math.floor(currentTimeMs.value / 1000)
    const ms = Math.floor((currentTimeMs.value % 1000) / 10)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  })

  // Track curveEndpoint changes to force re-render
  const curveEndpointTrigger = ref(0)
  watch(
    () => animationOptions.value.curveEndpoint,
    () => {
      curveEndpointTrigger.value++
    }
  )

  // Generate current SVG frame
  const currentSvg = computed(() => {
    // Include trigger to ensure reactivity when curveEndpoint changes
    void curveEndpointTrigger.value

    const frameOptions: FrameOptions = {
      progress: progress.value,
      showMarker: animationOptions.value.showMarker,
      markerSize: animationOptions.value.markerSize,
      markerColor: animationOptions.value.markerColor,
      curveEndpoint: animationOptions.value.curveEndpoint
    }
    return generateElevationFrame(chartOptions.value, frameOptions)
  })

  // Animation loop using requestAnimationFrame
  function animationLoop(timestamp: number) {
    if (!isPlaying.value) return

    if (lastTimestamp === null) {
      lastTimestamp = timestamp
    }

    const deltaMs = (timestamp - lastTimestamp) * playbackSpeed.value
    lastTimestamp = timestamp

    // Calculate new progress
    const newTimeMs = currentTimeMs.value + deltaMs
    const newProgress = Math.min(newTimeMs / animationOptions.value.durationMs, 1)

    // Apply easing for display (but store linear progress for seeking)
    progress.value = newProgress

    // Check if animation is complete
    if (newProgress >= 1) {
      isPlaying.value = false
      progress.value = 1
      lastTimestamp = null
      return
    }

    // Continue animation
    animationFrameId = requestAnimationFrame(animationLoop)
  }

  // Playback controls
  function play() {
    if (progress.value >= 1) {
      progress.value = 0
    }
    isPlaying.value = true
    lastTimestamp = null
    animationFrameId = requestAnimationFrame(animationLoop)
  }

  function pause() {
    isPlaying.value = false
    lastTimestamp = null
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  function toggle() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  function reset() {
    pause()
    progress.value = 0
  }

  function seekTo(newProgress: number) {
    progress.value = Math.max(0, Math.min(1, newProgress))
  }

  function seekToFrame(frame: number) {
    const frames = totalFrames.value - 1
    seekTo(frame / frames)
  }

  function setSpeed(speed: PlaybackSpeed) {
    playbackSpeed.value = speed
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }
  })

  // Reset when chart options change significantly
  watch(
    () => chartOptions.value.data?.length,
    () => {
      reset()
    }
  )

  return {
    // State
    progress,
    isPlaying,
    currentFrame,
    totalFrames,
    currentTimeMs,
    playbackSpeed,

    // Computed
    currentSvg,
    formattedTime,

    // Actions
    play,
    pause,
    toggle,
    reset,
    seekTo,
    seekToFrame,
    setSpeed
  }
}
