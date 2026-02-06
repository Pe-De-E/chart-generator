import type { ImageBackgroundOptions } from '@chart-generator/shared'
import type { BackgroundType } from './types'

/**
 * Map image position to SVG preserveAspectRatio
 */
function getAspectRatio(position: string): string {
  switch (position) {
    case 'cover': return 'xMidYMid slice'
    case 'contain': return 'xMidYMid meet'
    case 'center': return 'xMidYMid meet'
    case 'stretch': return 'none'
    default: return 'xMidYMid slice'
  }
}

export function generateBackgroundElements(
  width: number,
  height: number,
  backgroundType: BackgroundType,
  backgroundColor: string,
  gradientColor: string,
  meshColor1: string,
  meshColor2: string,
  meshColor3: string,
  patternColor: string,
  patternOpacity: number,
  imageOptions?: ImageBackgroundOptions
): { defs: string; elements: string } {
  const bgGradientId = 'background-gradient-anim'
  const meshGradientId = 'mesh-gradient-anim'
  const patternId = 'pattern-anim'
  const imageFilterId = 'image-filter-anim'

  switch (backgroundType) {
    case 'image':
      if (imageOptions) {
        // Calculate filter values
        // brightness: 0.5-1.5, where 1 = no change
        // contrast: 0.5-1.5, where 1 = no change
        // The formula for brightness/contrast in SVG feComponentTransfer:
        // slope = contrast, intercept = (1 - contrast) / 2 + (brightness - 1) * 0.5
        const slope = imageOptions.contrast
        const intercept = (1 - imageOptions.contrast) / 2 + (imageOptions.brightness - 1) * 0.5

        return {
          defs: `
            <filter id="${imageFilterId}" x="0" y="0" width="100%" height="100%">
              ${imageOptions.blur > 0 ? `<feGaussianBlur in="SourceGraphic" stdDeviation="${imageOptions.blur}" result="blur"/>` : ''}
              <feComponentTransfer ${imageOptions.blur > 0 ? 'in="blur"' : ''}>
                <feFuncR type="linear" slope="${slope}" intercept="${intercept}"/>
                <feFuncG type="linear" slope="${slope}" intercept="${intercept}"/>
                <feFuncB type="linear" slope="${slope}" intercept="${intercept}"/>
              </feComponentTransfer>
            </filter>`,
          elements: `
            <image
              href="${imageOptions.imageUrl}"
              x="0" y="0"
              width="${width}"
              height="${height}"
              preserveAspectRatio="${getAspectRatio(imageOptions.position)}"
              filter="url(#${imageFilterId})"
            />
            ${imageOptions.overlayOpacity > 0 ? `<rect width="${width}" height="${height}" fill="${imageOptions.overlayColor}" opacity="${imageOptions.overlayOpacity}"/>` : ''}`
        }
      }
      // Fallback to solid if no imageOptions
      return {
        defs: '',
        elements: `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`
      }
    case 'gradient':
      return {
        defs: `
          <linearGradient id="${bgGradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#000000;stop-opacity:1"/>
            <stop offset="50%" style="stop-color:${gradientColor};stop-opacity:1"/>
            <stop offset="100%" style="stop-color:#000000;stop-opacity:1"/>
          </linearGradient>`,
        elements: `<rect width="${width}" height="${height}" fill="url(#${bgGradientId})"/>`
      }

    case 'mesh':
      // Mesh gradient using overlapping radial gradients
      return {
        defs: `
          <radialGradient id="${meshGradientId}-1" cx="20%" cy="30%" r="80%" fx="20%" fy="30%">
            <stop offset="0%" style="stop-color:${meshColor1};stop-opacity:1"/>
            <stop offset="100%" style="stop-color:${meshColor1};stop-opacity:0"/>
          </radialGradient>
          <radialGradient id="${meshGradientId}-2" cx="80%" cy="20%" r="70%" fx="80%" fy="20%">
            <stop offset="0%" style="stop-color:${meshColor2};stop-opacity:0.8"/>
            <stop offset="100%" style="stop-color:${meshColor2};stop-opacity:0"/>
          </radialGradient>
          <radialGradient id="${meshGradientId}-3" cx="50%" cy="80%" r="60%" fx="50%" fy="80%">
            <stop offset="0%" style="stop-color:${meshColor3};stop-opacity:0.9"/>
            <stop offset="100%" style="stop-color:${meshColor3};stop-opacity:0"/>
          </radialGradient>`,
        elements: `
          <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
          <rect width="${width}" height="${height}" fill="url(#${meshGradientId}-1)"/>
          <rect width="${width}" height="${height}" fill="url(#${meshGradientId}-2)" style="mix-blend-mode: screen;"/>
          <rect width="${width}" height="${height}" fill="url(#${meshGradientId}-3)" style="mix-blend-mode: screen;"/>`
      }

    case 'grid':
      // Grid pattern
      const gridSize = 40
      return {
        defs: `
          <pattern id="${patternId}" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
            <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="${patternColor}" stroke-width="1" opacity="${patternOpacity}"/>
          </pattern>`,
        elements: `
          <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
          <rect width="${width}" height="${height}" fill="url(#${patternId})"/>`
      }

    case 'dots':
      // Dot pattern
      const dotSpacing = 30
      const dotRadius = 3
      return {
        defs: `
          <pattern id="${patternId}" width="${dotSpacing}" height="${dotSpacing}" patternUnits="userSpaceOnUse">
            <circle cx="${dotSpacing / 2}" cy="${dotSpacing / 2}" r="${dotRadius}" fill="${patternColor}" opacity="${patternOpacity}"/>
          </pattern>`,
        elements: `
          <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
          <rect width="${width}" height="${height}" fill="url(#${patternId})"/>`
      }

    case 'solid':
    default:
      return {
        defs: '',
        elements: `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`
      }
  }
}
