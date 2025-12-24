import type { DataPoint } from './chartGenerators'

export interface DataQualityMetrics {
  totalRows: number
  totalFields: number
  filledFields: number
  emptyFields: number
  completenessPercentage: number
  missingValuesByColumn: Record<string, number>
  qualityScore: 'excellent' | 'good' | 'fair' | 'poor'
  issues: string[]
}

/**
 * Analyzes data quality and completeness
 */
export function analyzeDataQuality(data: DataPoint[]): DataQualityMetrics {
  if (data.length === 0) {
    return {
      totalRows: 0,
      totalFields: 0,
      filledFields: 0,
      emptyFields: 0,
      completenessPercentage: 0,
      missingValuesByColumn: {},
      qualityScore: 'poor',
      issues: ['Keine Daten vorhanden']
    }
  }

  // Get all unique keys across all data points
  const allKeys = new Set<string>()
  data.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key))
  })

  const totalRows = data.length
  const columnsPerRow = allKeys.size
  const totalFields = totalRows * columnsPerRow

  let filledFields = 0
  const missingValuesByColumn: Record<string, number> = {}
  const issues: string[] = []

  // Initialize missing values counter for each column
  allKeys.forEach(key => {
    missingValuesByColumn[key] = 0
  })

  // Count filled and empty fields
  data.forEach(row => {
    allKeys.forEach(key => {
      const value = row[key]
      const isEmpty = value === null ||
                      value === undefined ||
                      value === '' ||
                      (typeof value === 'string' && value.trim() === '') ||
                      (typeof value === 'number' && isNaN(value))

      if (isEmpty) {
        missingValuesByColumn[key]++
      } else {
        filledFields++
      }
    })
  })

  const emptyFields = totalFields - filledFields
  const completenessPercentage = Math.round((filledFields / totalFields) * 100)

  // Check for specific issues
  if (totalRows < 3) {
    issues.push('Sehr wenige Datensätze (< 3)')
  }

  // Check for columns with many missing values
  Object.entries(missingValuesByColumn).forEach(([column, missing]) => {
    const missingPercentage = (missing / totalRows) * 100
    if (missingPercentage > 50) {
      issues.push(`Spalte "${column}" hat ${Math.round(missingPercentage)}% fehlende Werte`)
    }
  })

  // Check for empty labels
  const emptyLabels = data.filter(d => !d.label || (typeof d.label === 'string' && d.label.trim() === '')).length
  if (emptyLabels > 0) {
    issues.push(`${emptyLabels} Zeile(n) ohne Bezeichnung in erster Spalte`)
  }

  // Check for duplicate labels (excluding empty ones)
  const nonEmptyLabels = data
    .map(d => d.label)
    .filter(label => label && (typeof label !== 'string' || label.trim() !== ''))

  const uniqueLabels = new Set(nonEmptyLabels)
  if (nonEmptyLabels.length !== uniqueLabels.size) {
    // Find which labels are duplicated
    const labelCounts = new Map<string, number>()
    nonEmptyLabels.forEach(label => {
      labelCounts.set(String(label), (labelCounts.get(String(label)) || 0) + 1)
    })
    const duplicates = Array.from(labelCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([label, count]) => `"${label}" (${count}x)`)
      .slice(0, 3) // Show max 3 examples

    if (duplicates.length > 0) {
      const duplicateCount = nonEmptyLabels.length - uniqueLabels.size
      issues.push(`${duplicateCount} doppelte Bezeichnung(en): ${duplicates.join(', ')}${duplicates.length === 3 ? '...' : ''}`)
    }
  }

  // Check for zero or negative values in value column
  const negativeValues = data.filter(d => d.value < 0).length
  const zeroValues = data.filter(d => d.value === 0).length
  if (negativeValues > 0) {
    issues.push(`${negativeValues} negative Werte gefunden`)
  }
  if (zeroValues > totalRows * 0.5) {
    issues.push(`Viele Null-Werte (${zeroValues} von ${totalRows})`)
  }

  // Determine quality score
  let qualityScore: 'excellent' | 'good' | 'fair' | 'poor'
  if (completenessPercentage >= 95 && issues.length === 0) {
    qualityScore = 'excellent'
  } else if (completenessPercentage >= 85 && issues.length <= 2) {
    qualityScore = 'good'
  } else if (completenessPercentage >= 70) {
    qualityScore = 'fair'
  } else {
    qualityScore = 'poor'
  }

  return {
    totalRows,
    totalFields,
    filledFields,
    emptyFields,
    completenessPercentage,
    missingValuesByColumn,
    qualityScore,
    issues
  }
}

/**
 * Get color for quality score
 */
export function getQualityColor(score: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (score) {
    case 'excellent':
      return 'success'
    case 'good':
      return 'info'
    case 'fair':
      return 'warning'
    case 'poor':
      return 'error'
  }
}

/**
 * Get label for quality score
 */
export function getQualityLabel(score: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (score) {
    case 'excellent':
      return 'Ausgezeichnet'
    case 'good':
      return 'Gut'
    case 'fair':
      return 'Befriedigend'
    case 'poor':
      return 'Mangelhaft'
  }
}
