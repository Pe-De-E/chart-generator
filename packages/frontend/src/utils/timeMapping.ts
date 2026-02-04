/**
 * Time-based animation mapping utilities.
 *
 * Maps time-based progress (0-1) to distance-based progress (0-1)
 * so that the animation follows the actual ride timing from GPX data.
 *
 * Strategy: "controlled liar"
 * 1. Extract raw time→distance mapping from GPS data
 * 2. Clean only true artifacts (GPS jitter, zero-time segments)
 * 3. Amplify the speed differences to make them visually obvious
 *
 * Raw GPS deltas are often small (3-5% for normal rides).
 * Without amplification, time-based looks identical to uniform.
 * With 3-5x amplification, uphills visibly slow down and
 * downhills visibly speed up - that's the storytelling effect.
 */

import type { GPXPoint } from './downsampling'

/** How much to amplify speed differences (1 = raw, 3-5 = clearly visible) */
const SPEED_AMPLIFICATION = 4

/**
 * Extract a normalized time array (0-1) from GPXPoints.
 * Returns null if no time data is available.
 */
export function extractNormalizedTimeArray(points: GPXPoint[]): number[] | null {
  if (points.length === 0) return null

  const hasTime = points.some(p => p.time != null)
  if (!hasTime) return null

  const lastTime = points[points.length - 1].time
  if (lastTime == null || lastTime === 0) return null

  return points.map(p => (p.time ?? 0) / lastTime)
}

/**
 * Build a cleaned time array from raw GPS timestamps.
 *
 * Only removes true artifacts (zero-time segments, GPS teleporting).
 * Does NOT aggressively smooth - we want the real speed variation.
 * Light smoothing (1.5% window) removes GPS noise while preserving
 * the macro speed pattern (uphill vs downhill).
 */
export function buildSmoothedTimeArray(rawTimeArray: number[]): number[] {
  const len = rawTimeArray.length
  if (len <= 2) return rawTimeArray

  // Step 1: Calculate raw speeds (distance delta / time delta) per segment
  const speeds: number[] = []
  for (let i = 1; i < len; i++) {
    const dDist = 1 / (len - 1)
    const dTime = rawTimeArray[i] - rawTimeArray[i - 1]

    if (dTime <= 0) {
      speeds.push(1)
    } else {
      speeds.push(dDist / dTime)
    }
  }

  // Step 2: Only clamp true GPS artifacts
  const sortedSpeeds = [...speeds].sort((a, b) => a - b)
  const medianSpeed = sortedSpeeds[Math.floor(sortedSpeeds.length / 2)]
  const minSpeed = medianSpeed * 0.05
  const maxSpeed = medianSpeed * 20.0
  const clampedSpeeds = speeds.map(s => Math.max(minSpeed, Math.min(maxSpeed, s)))

  // Step 3: Very light smoothing to remove noise
  const windowSize = Math.max(3, Math.floor(len * 0.015) | 1)
  const halfWindow = Math.floor(windowSize / 2)
  const smoothedSpeeds: number[] = new Array(clampedSpeeds.length)

  for (let i = 0; i < clampedSpeeds.length; i++) {
    let sum = 0
    let count = 0
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(clampedSpeeds.length - 1, i + halfWindow); j++) {
      sum += clampedSpeeds[j]
      count++
    }
    smoothedSpeeds[i] = sum / count
  }

  // Step 4: Re-integrate to get new time values
  const dDist = 1 / (len - 1)
  const newTimes: number[] = [0]
  let cumulative = 0

  for (let i = 0; i < smoothedSpeeds.length; i++) {
    cumulative += dDist / smoothedSpeeds[i]
    newTimes.push(cumulative)
  }

  const totalTime = newTimes[newTimes.length - 1]
  if (totalTime === 0) return rawTimeArray

  return newTimes.map(t => t / totalTime)
}

/**
 * Map time-based progress (0-1) to distance-based progress (0-1).
 *
 * The raw time→distance mapping is often subtle (3-5% deviation).
 * We amplify the deviation from uniform to make it visually obvious:
 *
 *   rawDist = lookup(timeProgress, timeArray)
 *   delta = rawDist - timeProgress
 *   result = timeProgress + delta * AMPLIFICATION
 *
 * This preserves the direction (uphills slower, downhills faster)
 * while making the effect clearly visible in the animation.
 */
export function remapProgressByTime(
  timeProgress: number,
  smoothedTimeArray: number[]
): number {
  if (smoothedTimeArray.length === 0) return timeProgress
  if (timeProgress <= 0) return 0
  if (timeProgress >= 1) return 1

  // Get the raw distance progress from the time array
  const rawDistProgress = lookupProgress(timeProgress, smoothedTimeArray)

  // Amplify the deviation from uniform
  const delta = rawDistProgress - timeProgress
  const amplified = timeProgress + delta * SPEED_AMPLIFICATION

  // Clamp to valid range
  return Math.max(0, Math.min(1, amplified))
}

/**
 * Look up distance progress for a given time progress in the time array.
 */
function lookupProgress(timeProgress: number, timeArray: number[]): number {
  const len = timeArray.length

  for (let i = 1; i < len; i++) {
    if (timeArray[i] >= timeProgress) {
      const t0 = timeArray[i - 1]
      const t1 = timeArray[i]
      const timeDelta = t1 - t0

      if (timeDelta === 0) {
        return (i - 1) / (len - 1)
      }

      const fraction = (timeProgress - t0) / timeDelta
      const d0 = (i - 1) / (len - 1)
      const d1 = i / (len - 1)

      return d0 + fraction * (d1 - d0)
    }
  }

  return 1
}
