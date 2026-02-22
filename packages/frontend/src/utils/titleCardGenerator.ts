/**
 * Title Card Generator
 * Generates SVG frames for a title card with fade-in/hold/fade-out animation.
 * Used before chart animation in video exports.
 */

import type { ImageBackgroundOptions } from '@chart-generator/shared'
import { generateBackgroundElements } from './chartGenerators/elevationChart/background'
import type { BackgroundType } from './chartGenerators/elevationChart/types'

export interface TitleCardOptions {
  title: string
  width: number
  height: number
  opacity: number
  textColor: string
  backgroundColor: string
  backgroundType: BackgroundType
  gradientColor: string
  meshColor1: string
  meshColor2: string
  meshColor3: string
  patternColor: string
  patternOpacity: number
  imageOptions?: ImageBackgroundOptions
}

/**
 * Calculate opacity for the title card based on progress through the title phase.
 *
 * Timeline (2.5s total):
 *   0.0 - 0.2  → Fade-in  (0.5s)
 *   0.2 - 0.8  → Hold     (1.5s)
 *   0.8 - 1.0  → Fade-out (0.5s)
 */
export function getTitleCardOpacity(titleProgress: number): number {
  if (titleProgress <= 0.2) {
    // Fade in: 0 → 1
    return titleProgress / 0.2
  } else if (titleProgress <= 0.8) {
    // Hold
    return 1
  } else {
    // Fade out: 1 → 0
    return (1 - titleProgress) / 0.2
  }
}

/** Duration of the title card phase in milliseconds */
export const TITLE_CARD_DURATION_MS = 1000

/** Duration of the transition from title hook to animation in milliseconds (used by elevation chart) */
export const TRANSITION_DURATION_MS = 1500

/** Duration of the outro (full static image) phase in milliseconds */
export const OUTRO_DURATION_MS = 1500

/**
 * Generate an SVG frame for the title card.
 */
export function generateTitleCardSvg(options: TitleCardOptions): string {
  const {
    title,
    width,
    height,
    opacity,
    textColor,
    backgroundColor,
    backgroundType,
    gradientColor,
    meshColor1,
    meshColor2,
    meshColor3,
    patternColor,
    patternOpacity,
    imageOptions,
  } = options

  const bg = generateBackgroundElements(
    width,
    height,
    backgroundType,
    backgroundColor,
    gradientColor,
    meshColor1,
    meshColor2,
    meshColor3,
    patternColor,
    patternOpacity,
    imageOptions,
  )

  // Font size scales with width, capped for readability
  const fontSize = Math.min(Math.round(width * 0.06), 72)
  const centerX = width / 2
  const centerY = height / 2

  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <defs>${bg.defs}</defs>
  ${bg.elements}
  <text
    x="${centerX}"
    y="${centerY}"
    text-anchor="middle"
    dominant-baseline="central"
    font-size="${fontSize}"
    font-weight="bold"
    fill="${textColor}"
    opacity="${opacity}"
    font-family="system-ui, -apple-system, sans-serif"
  >${escapeXml(title)}</text>
</svg>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
