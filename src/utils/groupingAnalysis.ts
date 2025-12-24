export interface GroupingSuggestion {
  type: 'categorical' | 'date' | 'numeric' | 'none'
  reason: string
  groupCount?: number
  suggestions: string[]
  canGroup: boolean
}

/**
 * Analyzes if label data can be grouped/categorized
 */
export function analyzeGroupingPotential(labels: string[]): GroupingSuggestion {
  if (labels.length === 0) {
    return {
      type: 'none',
      reason: 'Keine Daten vorhanden',
      suggestions: [],
      canGroup: false
    }
  }

  // Remove empty labels for analysis
  const nonEmptyLabels = labels.filter(l => l && l.trim() !== '')
  const uniqueLabels = new Set(nonEmptyLabels)
  const duplicateCount = nonEmptyLabels.length - uniqueLabels.size

  // Check for categorical grouping (duplicates)
  if (duplicateCount > 0) {
    const duplicatePercentage = (duplicateCount / nonEmptyLabels.length) * 100

    if (duplicatePercentage > 10) {
      return {
        type: 'categorical',
        reason: `${duplicateCount} doppelte Bezeichnungen gefunden (${Math.round(duplicatePercentage)}%)`,
        groupCount: uniqueLabels.size,
        suggestions: [
          'Werte nach Kategorie gruppieren',
          'Summe/Durchschnitt pro Kategorie berechnen'
        ],
        canGroup: true
      }
    }
  }

  // Check for date-based grouping
  const datePatterns = {
    iso: /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    german: /^\d{2}\.\d{2}\.\d{4}/, // DD.MM.YYYY
    us: /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
    yearMonth: /^\d{4}-\d{2}/, // YYYY-MM
    year: /^(19|20)\d{2}$/ // Year only
  }

  let dateCount = 0
  for (const label of nonEmptyLabels.slice(0, 10)) { // Check first 10 samples
    for (const pattern of Object.values(datePatterns)) {
      if (pattern.test(label)) {
        dateCount++
        break
      }
    }
  }

  if (dateCount >= 7) { // At least 70% of samples look like dates
    const suggestions = []

    // Detect specific date patterns
    const hasFullDates = nonEmptyLabels.some(l =>
      datePatterns.iso.test(l) || datePatterns.german.test(l) || datePatterns.us.test(l)
    )
    const hasYearMonth = nonEmptyLabels.some(l => datePatterns.yearMonth.test(l))

    if (hasFullDates) {
      suggestions.push('Nach Jahr gruppieren')
      suggestions.push('Nach Monat gruppieren')
      suggestions.push('Nach Quartal gruppieren')
      suggestions.push('Nach Woche gruppieren')
    } else if (hasYearMonth) {
      suggestions.push('Nach Jahr gruppieren')
      suggestions.push('Nach Quartal gruppieren')
    } else {
      suggestions.push('Nach Jahr gruppieren')
    }

    return {
      type: 'date',
      reason: 'Datumswerte erkannt',
      suggestions,
      canGroup: true
    }
  }

  // Check for numeric ranges
  const numericLabels = nonEmptyLabels
    .map(l => parseFloat(l.replace(',', '.')))
    .filter(n => !isNaN(n))

  if (numericLabels.length >= nonEmptyLabels.length * 0.8) {
    const min = Math.min(...numericLabels)
    const max = Math.max(...numericLabels)
    const range = max - min

    if (range > 10 && numericLabels.length > 20) {
      return {
        type: 'numeric',
        reason: 'Numerische Werte erkannt',
        suggestions: [
          'In Bereiche gruppieren (z.B. 0-10, 11-20, ...)',
          'Nach Dezilen gruppieren',
          'Nach Quartilen gruppieren'
        ],
        canGroup: true
      }
    }
  }

  // No grouping potential found
  if (uniqueLabels.size === nonEmptyLabels.length) {
    return {
      type: 'none',
      reason: 'Alle Bezeichnungen sind einzigartig',
      suggestions: ['Keine Gruppierung empfohlen'],
      canGroup: false
    }
  }

  return {
    type: 'none',
    reason: 'Keine klare Gruppierungsmöglichkeit erkannt',
    suggestions: [],
    canGroup: false
  }
}

/**
 * Get icon for grouping type
 */
export function getGroupingIcon(type: 'categorical' | 'date' | 'numeric' | 'none'): string {
  switch (type) {
    case 'categorical':
      return 'mdi-group'
    case 'date':
      return 'mdi-calendar-month'
    case 'numeric':
      return 'mdi-numeric'
    case 'none':
      return 'mdi-information-outline'
  }
}

/**
 * Get color for grouping suggestion
 */
export function getGroupingColor(canGroup: boolean): string {
  return canGroup ? 'info' : 'grey'
}
