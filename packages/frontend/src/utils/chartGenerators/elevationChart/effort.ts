import type { ViewBoxPoint } from '../../coordinateContract'

/**
 * Calculate gradient (slope) for each segment of the curve
 * Returns normalized values 0-1 where 0=steepest descent, 1=steepest ascent
 */
export function calculateSegmentGradients(data: Array<{ value: number }>): number[] {
  if (data.length < 2) return []

  const gradients: number[] = []
  const minEle = Math.min(...data.map(d => d.value))
  const maxEle = Math.max(...data.map(d => d.value))
  const range = maxEle - minEle || 1

  // Use a window for smoother gradient calculation
  const windowHalf = Math.max(2, Math.floor(data.length * 0.02))

  for (let i = 0; i < data.length - 1; i++) {
    const lo = Math.max(0, i - windowHalf)
    const hi = Math.min(data.length - 1, i + windowHalf + 1)
    const eleChange = (data[hi].value - data[lo].value) / range

    // Map to 0-1 range: -1 (steep descent) -> 0, +1 (steep ascent) -> 1
    const normalized = (eleChange + 1) / 2
    gradients.push(Math.max(0, Math.min(1, normalized)))
  }

  return gradients
}

/**
 * Generate effort-based curve with variable stroke width, color gradient, and glow
 */
export function generateEffortCurve(
  points: ViewBoxPoint[],
  data: Array<{ value: number }>,
  baseColor: string,
  config: {
    variableStroke: boolean
    variableStrokeIntensity: number
    colorGradient: boolean
    colorGradientIntensity: number
    glowAura: boolean
    glowAuraIntensity: number
  }
): { defs: string; curve: string; glowFilter: string } {
  if (points.length < 2) return { defs: '', curve: '', glowFilter: '' }

  const gradients = calculateSegmentGradients(data)

  // Normalize intensities to ~1 at default (5)
  const strokeIntensity = config.variableStrokeIntensity / 5
  const colorIntensity = config.colorGradientIntensity / 5
  const glowIntensityFactor = config.glowAuraIntensity / 5

  // Parse base color to HSL for manipulation
  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 }
  }

  const baseHsl = hexToHsl(baseColor.length === 7 ? baseColor : '#ffffff')

  // Generate segments
  const segments: string[] = []
  let maxGradient = 0

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const gradient = gradients[i] ?? 0.5

    // Track max gradient for glow intensity
    if (gradient > maxGradient) maxGradient = gradient

    // Calculate stroke width: 3-15 based on gradient and intensity
    const baseStroke = 6
    const strokeVar = config.variableStroke
      ? baseStroke + (gradient - 0.5) * 12 * strokeIntensity
      : baseStroke
    const strokeWidth = Math.max(3, Math.min(15, strokeVar))

    // Calculate color: lighter when easy, darker when hard
    let segmentColor = baseColor
    if (config.colorGradient) {
      const lightness = baseHsl.l - (gradient - 0.5) * 30 * colorIntensity
      const clampedL = Math.max(20, Math.min(80, lightness))
      segmentColor = `hsl(${baseHsl.h}, ${baseHsl.s}%, ${clampedL}%)`
    }

    segments.push(`
      <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"
            stroke="${segmentColor}" stroke-width="${strokeWidth}"
            stroke-linecap="round"/>
    `)
  }

  // Generate glow filter if enabled
  let glowFilter = ''
  let glowFilterId = ''
  if (config.glowAura) {
    glowFilterId = 'effort-glow-filter'
    const glowStrength = maxGradient * glowIntensityFactor * 2
    const blurRadius = 8 + glowStrength * 8

    glowFilter = `
      <filter id="${glowFilterId}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${blurRadius}" result="blur"/>
        <feColorMatrix in="blur" type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 ${0.3 + glowStrength * 0.4} 0" result="glow"/>
        <feMerge>
          <feMergeNode in="glow"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `
  }

  const curveGroup = config.glowAura
    ? `<g filter="url(#${glowFilterId})">${segments.join('')}</g>`
    : `<g>${segments.join('')}</g>`

  return {
    defs: glowFilter,
    curve: curveGroup,
    glowFilter: glowFilterId
  }
}
