/**
 * Marker Icon Renderer
 *
 * Provides selectable icons for the animated route marker.
 * Each icon is rendered as inline SVG, rotates with heading,
 * and scales with markerSize.
 */

export type MarkerIconType = 'dot' | 'arrow'

/**
 * Render a marker icon as an SVG string.
 *
 * @param type       - Icon type
 * @param cx         - Center X in SVG coordinate space
 * @param cy         - Center Y in SVG coordinate space
 * @param size       - markerSize (base unit)
 * @param color      - Fill/stroke color for the icon
 * @param heading    - Rotation in degrees from atan2(dy,dx): 0 = right (+X), 90 = down
 * @param routeColor - Secondary color (used for dot outline)
 */
export function renderMarkerIcon(
  type: MarkerIconType,
  cx: number,
  cy: number,
  size: number,
  color: string,
  heading: number,
  routeColor: string,
): string {
  const s = size

  switch (type) {
    case 'dot':
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${s}" fill="${color}" stroke="${routeColor}" stroke-width="${Math.max(2, s * 0.3).toFixed(1)}"/>`

    case 'arrow': {
      // GPS navigation arrow, tip pointing right (+X = forward at heading=0, matching atan2 convention)
      // 30% larger than base icon: scale factor 1.3
      const as = s * 1.3
      const pts = [
        `${(2.6 * as).toFixed(1)},0`,
        `${(-1.4 * as).toFixed(1)},${(1.2 * as).toFixed(1)}`,
        `${(-0.5 * as).toFixed(1)},0`,
        `${(-1.4 * as).toFixed(1)},${(-1.2 * as).toFixed(1)}`,
      ].join(' ')
      return `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${heading.toFixed(1)})">` +
        `<polygon points="${pts}" fill="${color}"/>` +
        `</g>`
    }

    case 'bike': {
      // Side-view bicycle moving right (+X). rotate(heading) aligns correctly.
      // Classic A-frame: two wheel circles + horizontal axle line + triangle peak above.
      // The axle line through the wheel centers looks like hubs; the triangle is the frame.
      const wheelR = (0.58 * s).toFixed(1)
      const sw = Math.max(2, s * 0.3).toFixed(1)
      const rx = (-1.4 * s).toFixed(1)   // rear axle x
      const fx = (1.4 * s).toFixed(1)    // front axle x
      const pkY = (-1.05 * s).toFixed(1) // frame peak (seat/head junction), above axle line
      return `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${heading.toFixed(1)})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">` +
        `<circle cx="${rx}" cy="0" r="${wheelR}"/>` +
        `<circle cx="${fx}" cy="0" r="${wheelR}"/>` +
        // Horizontal axle line = chain stay (also looks like wheel axles)
        `<line x1="${rx}" y1="0" x2="${fx}" y2="0"/>` +
        // Seat stay: rear axle → peak
        `<line x1="${rx}" y1="0" x2="0" y2="${pkY}"/>` +
        // Fork: peak → front axle
        `<line x1="0" y1="${pkY}" x2="${fx}" y2="0"/>` +
        `</g>`
    }

    case 'runner': {
      // Side-view running figure moving right (+X). rotate(heading) aligns correctly.
      // No arms — just large head + leaning body + clear scissors legs.
      // Fewer elements = more readable at small sizes.
      const sw = Math.max(2.5, s * 0.38).toFixed(1)
      const headR = (0.62 * s).toFixed(1)
      const hipX = (-0.05 * s).toFixed(1), hipY = (0.25 * s).toFixed(1)
      return `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${heading.toFixed(1)})" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}">` +
        // Large head — forward and up
        `<circle cx="${(0.75 * s).toFixed(1)}" cy="${(-1.4 * s).toFixed(1)}" r="${headR}" fill="${color}" stroke="none"/>` +
        // Body — clear forward lean
        `<line x1="${(0.4 * s).toFixed(1)}" y1="${(-0.8 * s).toFixed(1)}" x2="${hipX}" y2="${hipY}" fill="none"/>` +
        // Forward leg — long stride ahead
        `<line x1="${hipX}" y1="${hipY}" x2="${(1.3 * s).toFixed(1)}" y2="${(1.8 * s).toFixed(1)}" fill="none"/>` +
        // Back leg — kicking behind
        `<line x1="${hipX}" y1="${hipY}" x2="${(-1.4 * s).toFixed(1)}" y2="${(1.5 * s).toFixed(1)}" fill="none"/>` +
        `</g>`
    }

    case 'hiker': {
      // Side-view hiker moving right (+X) with trekking pole. rotate(heading) aligns correctly.
      // Upright body, gentle stride, bold pole planted ahead distinguishes from runner.
      const sw = Math.max(2.5, s * 0.35).toFixed(1)
      const headR = (0.58 * s).toFixed(1)
      const hipX = '0', hipY = (0.4 * s).toFixed(1)
      return `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${heading.toFixed(1)})" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}">` +
        // Head — centred, upright
        `<circle cx="${(0.2 * s).toFixed(1)}" cy="${(-1.7 * s).toFixed(1)}" r="${headR}" fill="${color}" stroke="none"/>` +
        // Body — upright
        `<line x1="${(0.2 * s).toFixed(1)}" y1="${(-1.1 * s).toFixed(1)}" x2="${hipX}" y2="${hipY}" fill="none"/>` +
        // Forward leg
        `<line x1="${hipX}" y1="${hipY}" x2="${(0.8 * s).toFixed(1)}" y2="${(1.85 * s).toFixed(1)}" fill="none"/>` +
        // Back leg
        `<line x1="${hipX}" y1="${hipY}" x2="${(-0.7 * s).toFixed(1)}" y2="${(1.85 * s).toFixed(1)}" fill="none"/>` +
        // Trekking pole — planted ahead, very prominent (thicker stroke)
        `<line x1="${(1.05 * s).toFixed(1)}" y1="${(-0.85 * s).toFixed(1)}" x2="${(1.85 * s).toFixed(1)}" y2="${(1.85 * s).toFixed(1)}" stroke-width="${Math.max(3, s * 0.42).toFixed(1)}" fill="none"/>` +
        // Arm holding pole
        `<line x1="${(0.2 * s).toFixed(1)}" y1="${(-0.35 * s).toFixed(1)}" x2="${(1.05 * s).toFixed(1)}" y2="${(-0.85 * s).toFixed(1)}" fill="none"/>` +
        `</g>`
    }

    default:
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${s}" fill="${color}"/>`
  }
}
