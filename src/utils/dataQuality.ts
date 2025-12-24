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

  // Check for duplicate labels
  const labels = data.map(d => d.label)
  const uniqueLabels = new Set(labels)
  if (labels.length !== uniqueLabels.size) {
    const duplicateCount = labels.length - uniqueLabels.size
    issues.push(`${duplicateCount} doppelte Label gefunden`)
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
