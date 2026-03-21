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
  // Internal progress tracking (decoupled from Vue ref so we can throttle renders)
  let actualProgress = progress.value
  // Cap preview re-renders at 30fps — SVG generation is expensive
  const RENDER_INTERVAL_MS = 1000 / 30
  let lastRenderTimestamp: number | null = null

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

  // Track changes to force re-render
  const optionsTrigger = ref(0)
  watch(
    () => animationOptions.value.curveEndpoint,
    () => { optionsTrigger.value++ }
  )
  watch(
    () => chartOptions.value.colors?.primary,
    () => { optionsTrigger.value++ }
  )

  // Generate current SVG frame
  const currentSvg = computed(() => {
    // Include trigger to ensure reactivity when options change
    void optionsTrigger.value

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
      lastRenderTimestamp = timestamp
    }

    const deltaMs = (timestamp - lastTimestamp) * playbackSpeed.value
    lastTimestamp = timestamp

    // Advance internal progress (always accurate, no Vue overhead)
    actualProgress = Math.min(actualProgress + deltaMs / animationOptions.value.durationMs, 1)

    // Push to Vue ref at 30fps max — limits SVG re-generation to every ~33ms
    const timeSinceRender = timestamp - (lastRenderTimestamp ?? 0)
    if (timeSinceRender >= RENDER_INTERVAL_MS || actualProgress >= 1) {
      progress.value = actualProgress
      lastRenderTimestamp = timestamp
    }

    // Check if animation is complete
    if (actualProgress >= 1) {
      isPlaying.value = false
      progress.value = 1
      lastTimestamp = null
      lastRenderTimestamp = null
      return
    }

    // Continue animation
    animationFrameId = requestAnimationFrame(animationLoop)
  }

  // Playback controls
  function play() {
    if (progress.value >= 1) {
      progress.value = 0
      actualProgress = 0
    } else {
      actualProgress = progress.value
    }
    isPlaying.value = true
    lastTimestamp = null
    lastRenderTimestamp = null
    animationFrameId = requestAnimationFrame(animationLoop)
  }

  function pause() {
    isPlaying.value = false
    lastTimestamp = null
    lastRenderTimestamp = null
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
    actualProgress = 0
  }

  function seekTo(newProgress: number) {
    const clamped = Math.max(0, Math.min(1, newProgress))
    actualProgress = clamped
    progress.value = clamped
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
