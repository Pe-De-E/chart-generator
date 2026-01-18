/**
 * Easing functions for smooth animations
 * All functions take a progress value (0-1) and return an eased value (0-1)
 */

import type { EasingType } from '@chart-generator/shared'

export type EasingFunction = (t: number) => number

/**
 * Linear easing - no acceleration
 */
export function linear(t: number): number {
  return t
}

/**
 * Ease-in - starts slow, accelerates
 * Uses quadratic curve (t^2)
 */
export function easeIn(t: number): number {
  return t * t
}

/**
 * Ease-out - starts fast, decelerates
 * Uses inverse quadratic curve
 */
export function easeOut(t: number): number {
  return t * (2 - t)
}

/**
 * Ease-in-out - starts slow, speeds up, then slows down
 * Combines ease-in and ease-out
 */
export function easeInOut(t: number): number {
  return t < 0.5
    ? 2 * t * t
    : -1 + (4 - 2 * t) * t
}

/**
 * Get easing function by type name
 */
export function getEasingFunction(type: EasingType): EasingFunction {
  switch (type) {
    case 'linear':
      return linear
    case 'ease-in':
      return easeIn
    case 'ease-out':
      return easeOut
    case 'ease-in-out':
      return easeInOut
    default:
      return linear
  }
}

/**
 * Apply easing to a progress value
 */
export function applyEasing(progress: number, easingType: EasingType): number {
  const clampedProgress = Math.max(0, Math.min(1, progress))
  const easingFn = getEasingFunction(easingType)
  return easingFn(clampedProgress)
}
