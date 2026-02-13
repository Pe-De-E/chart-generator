import { calculateSegmentGradients } from './effort'

/**
 * Find the most visually interesting point in the elevation data.
 * Uses gradient magnitude (steepness) with a sliding window to find
 * the most dramatic section of the route.
 *
 * @returns Progress value 0-1 representing the hook point
 */
export function findHookPoint(data: Array<{ value: number }>): number {
  if (data.length < 10) return 0.3

  const gradients = calculateSegmentGradients(data)
  if (gradients.length === 0) return 0.3

  // Convert normalized gradients (0=steep descent, 0.5=flat, 1=steep ascent)
  // to magnitude (distance from 0.5 = how steep, regardless of direction)
  const magnitudes = gradients.map(g => Math.abs(g - 0.5))

  // Sliding window: ~10% of route length, find window with highest average magnitude
  const windowSize = Math.max(5, Math.floor(magnitudes.length * 0.1))
  let bestCenter = Math.floor(magnitudes.length / 3) // fallback
  let bestScore = 0

  for (let i = 0; i <= magnitudes.length - windowSize; i++) {
    let sum = 0
    for (let j = i; j < i + windowSize; j++) {
      sum += magnitudes[j]
    }
    const avg = sum / windowSize
    if (avg > bestScore) {
      bestScore = avg
      bestCenter = i + Math.floor(windowSize / 2)
    }
  }

  // Convert index to progress (0-1), clamped away from edges
  const progress = bestCenter / (magnitudes.length - 1)
  return Math.max(0.05, Math.min(0.9, progress))
}
