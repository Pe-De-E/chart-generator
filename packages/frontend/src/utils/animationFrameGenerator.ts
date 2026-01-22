/**
 * Animation Frame Generator
 * Generates an array of SVG frames for video export or preview playback
 */

import type { ChartOptions, AnimationOptions } from '@chart-generator/shared'
import { generateElevationFrame, type FrameOptions } from './chartGenerators/elevationChart/elevationChart'
import { applyEasing } from './easing'

/**
 * Export dimensions for video rendering
 */
export interface ExportDimensions {
  width: number
  height: number
}

/**
 * Generate all animation frames for a chart
 * @param chartOptions - The chart configuration
 * @param animationOptions - Animation settings (duration, fps, easing, etc.)
 * @param exportDimensions - Optional export dimensions for video export
 * @returns Array of SVG strings, one per frame
 */
export function generateAnimationFrames(
  chartOptions: ChartOptions,
  animationOptions: AnimationOptions,
  exportDimensions?: ExportDimensions
): string[] {
  const { durationMs, fps, easing, showMarker, markerSize, markerColor } = animationOptions

  // Calculate total number of frames
  const totalFrames = Math.ceil((durationMs / 1000) * fps)

  // Generate each frame
  const frames: string[] = []

  for (let i = 0; i <= totalFrames; i++) {
    // Linear progress (0 to 1)
    const linearProgress = i / totalFrames

    // Apply easing function
    const easedProgress = applyEasing(linearProgress, easing)

    // Generate frame options
    const frameOptions: FrameOptions = {
      progress: easedProgress,
      showMarker,
      markerSize,
      markerColor,
      curveEndpoint: animationOptions.curveEndpoint ?? 0,
      exportWidth: exportDimensions?.width,
      exportHeight: exportDimensions?.height
    }

    // Generate the SVG for this frame
    const svg = generateElevationFrame(chartOptions, frameOptions)
    frames.push(svg)
  }

  return frames
}

/**
 * Calculate frame count from animation options
 */
export function getFrameCount(animationOptions: AnimationOptions): number {
  return Math.ceil((animationOptions.durationMs / 1000) * animationOptions.fps) + 1
}

/**
 * Get progress value for a specific frame index
 */
export function getProgressForFrame(
  frameIndex: number,
  animationOptions: AnimationOptions
): number {
  const totalFrames = getFrameCount(animationOptions) - 1
  const linearProgress = Math.min(frameIndex / totalFrames, 1)
  return applyEasing(linearProgress, animationOptions.easing)
}

/**
 * Get time in milliseconds for a specific frame index
 */
export function getTimeForFrame(
  frameIndex: number,
  animationOptions: AnimationOptions
): number {
  const totalFrames = getFrameCount(animationOptions) - 1
  return (frameIndex / totalFrames) * animationOptions.durationMs
}

/**
 * Get frame index for a specific time in milliseconds
 */
export function getFrameForTime(
  timeMs: number,
  animationOptions: AnimationOptions
): number {
  const progress = Math.min(timeMs / animationOptions.durationMs, 1)
  const totalFrames = getFrameCount(animationOptions) - 1
  return Math.round(progress * totalFrames)
}
