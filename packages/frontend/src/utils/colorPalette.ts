// Vordefinierte Farbpalette für konsistente und gut unterscheidbare Farben
export const DEFAULT_SERIES_PALETTE = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#6366F1', // Indigo-light
]

/**
 * Gibt die Farbe für eine Serie basierend auf ihrem Index zurück
 * Verwendet die vordefinierte Palette für die ersten 10 Serien,
 * danach algorithmisch generierte HSL-Farben
 */
export function getSeriesColor(index: number): string {
  if (index < DEFAULT_SERIES_PALETTE.length) {
    return DEFAULT_SERIES_PALETTE[index]
  }

  // Fallback: HSL-generierte Farben für mehr als 10 Serien
  const hue = (index * 360 / (index + 1)) % 360
  return `hsl(${hue}, 70%, 55%)`
}

/**
 * Generiert ein Array von Farben für eine bestimmte Anzahl von Serien
 */
export function generateSeriesColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => getSeriesColor(i))
}
