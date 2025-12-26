import type { TableItem, TableHeader } from '../composables/useCSVParser'
import type { CleaningSuggestion } from './dataCleaningSuggestions'
import type { AppliedOperation } from '../composables/useDataCleaning'

export interface ColumnIssue {
  type: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  affectedCount: number
}

export interface ColumnOperation {
  title: string
  timestamp: string
}

export interface ColumnInfo {
  key: string
  title: string

  // Datenqualität
  totalValues: number
  filledValues: number
  emptyValues: number
  completeness: number
  dataType: 'numeric' | 'text' | 'mixed' | 'date'

  // Erkannte Probleme
  issues: ColumnIssue[]

  // Datenvorschau
  previewValues: (string | number)[]

  // Angewandte Operationen
  appliedOperations: ColumnOperation[]
}

/**
 * Erkennt den Datentyp einer Spalte basierend auf den Werten
 */
function detectDataType(values: (string | number)[]): 'numeric' | 'text' | 'mixed' | 'date' {
  const nonEmptyValues = values.filter(v => v !== '' && v !== null && v !== undefined)

  if (nonEmptyValues.length === 0) {
    return 'text'
  }

  const numericCount = nonEmptyValues.filter(v => typeof v === 'number').length
  const numericRatio = numericCount / nonEmptyValues.length

  // Wenn >80% numerisch, dann numeric
  if (numericRatio > 0.8) {
    return 'numeric'
  }

  // Prüfe auf Datum-Pattern (DD.MM.YYYY, YYYY-MM-DD, etc.)
  const datePatterns = [
    /^\d{2}\.\d{2}\.\d{4}$/,
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4}$/
  ]

  const dateCount = nonEmptyValues.filter(v => {
    if (typeof v !== 'string') return false
    return datePatterns.some(pattern => pattern.test(v))
  }).length

  const dateRatio = dateCount / nonEmptyValues.length

  // Wenn >80% Datum-Pattern, dann date
  if (dateRatio > 0.8) {
    return 'date'
  }

  // Wenn <20% numerisch, dann text
  if (numericRatio < 0.2) {
    return 'text'
  }

  // Sonst mixed
  return 'mixed'
}

/**
 * Extrahiert Probleme für eine spezifische Spalte aus den Cleaning Suggestions
 */
function extractColumnIssues(
  columnKey: string,
  cleaningSuggestions: CleaningSuggestion[]
): ColumnIssue[] {
  return cleaningSuggestions
    .filter(suggestion => {
      // Filtere Probleme, die diese Spalte betreffen
      if (suggestion.affectedColumn && suggestion.affectedColumn !== columnKey) {
        return false
      }

      // Für Probleme ohne spezifische Spalte (z.B. empty_labels),
      // nur bei col_0 (Label-Spalte) anzeigen
      if (!suggestion.affectedColumn) {
        return columnKey === 'col_0'
      }

      return true
    })
    .map(suggestion => ({
      type: suggestion.type,
      severity: suggestion.severity,
      title: suggestion.title,
      description: suggestion.description,
      affectedCount: suggestion.affectedCount
    }))
}

/**
 * Extrahiert angewandte Operationen für eine spezifische Spalte
 */
function extractColumnOperations(
  columnKey: string,
  appliedOperations: AppliedOperation[]
): ColumnOperation[] {
  // Filtere Operationen basierend auf dem Titel (enthält oft den Spaltennamen)
  // Für eine vollständige Lösung sollten AppliedOperation ein columnKey-Feld haben
  return appliedOperations
    .filter(op => {
      // Einfache Heuristik: Wenn der suggestionId den columnKey enthält
      return op.suggestionId.includes(columnKey) || op.suggestionId.includes('_all')
    })
    .map(op => ({
      title: `${op.suggestionTitle}: ${op.optionLabel}`,
      timestamp: new Date(op.timestamp).toLocaleString('de-DE')
    }))
}

/**
 * Analysiert eine Spalte und gibt umfassende Informationen zurück
 */
export function analyzeColumn(
  data: TableItem[],
  columnKey: string,
  columnTitle: string,
  cleaningSuggestions: CleaningSuggestion[],
  appliedOperations: AppliedOperation[]
): ColumnInfo {
  // Extrahiere alle Werte für diese Spalte
  const values = data.map(row => row[columnKey])

  // Berechne Datenqualität
  const totalValues = values.length
  const filledValues = values.filter(v => v !== '' && v !== null && v !== undefined).length
  const emptyValues = totalValues - filledValues
  const completeness = totalValues > 0 ? (filledValues / totalValues) * 100 : 0

  // Erkenne Datentyp
  const dataType = detectDataType(values)

  // Extrahiere Probleme
  const issues = extractColumnIssues(columnKey, cleaningSuggestions)

  // Extrahiere Preview-Werte (erste 10 einzigartige Werte)
  const uniqueValues = Array.from(new Set(values))
  const previewValues = uniqueValues.slice(0, 10)

  // Extrahiere angewandte Operationen
  const operations = extractColumnOperations(columnKey, appliedOperations)

  return {
    key: columnKey,
    title: columnTitle,
    totalValues,
    filledValues,
    emptyValues,
    completeness,
    dataType,
    issues,
    previewValues,
    appliedOperations: operations
  }
}

/**
 * Analysiert alle Spalten und gibt ein Array von ColumnInfo zurück
 */
export function analyzeAllColumns(
  data: TableItem[],
  headers: TableHeader[],
  cleaningSuggestions: CleaningSuggestion[],
  appliedOperations: AppliedOperation[]
): ColumnInfo[] {
  return headers.map(header =>
    analyzeColumn(
      data,
      header.key,
      header.title,
      cleaningSuggestions,
      appliedOperations
    )
  )
}
