import type { TableItem, TableHeader } from '../composables/useCSVParser'
import type { DataQualityIssue } from './dataQuality'
import {
  removeRowsWithEmptyColumn,
  keepFirstOccurrence,
  addSuffixToDuplicates,
  removeNegativeValues,
  convertToAbsolute,
  replaceNegativesWithZero,
  fillMissingValues,
  fillEmptyLabelsWithNumbers,
  fillEmptyLabelsWithText
} from './dataCleaningOperations'

export interface CleaningOption {
  label: string
  description: string
  isDefault: boolean
  apply: (data: TableItem[]) => TableItem[]
}

export interface CleaningSuggestion {
  id: string
  type: 'empty_labels' | 'duplicate_labels' | 'negative_values' | 'missing_values' | 'too_many_zeros' | 'column_mostly_empty' | 'outliers'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  affectedCount: number
  affectedColumn?: string
  options: CleaningOption[]
  icon: string
  color: string
}

/**
 * Generates cleaning suggestions based on data quality issues
 */
export function generateCleaningSuggestions(
  issues: DataQualityIssue[],
  tableHeaders: TableHeader[],
  labelColumn: string = 'col_0'
): CleaningSuggestion[] {
  return issues.map((issue, index) => {
    switch (issue.type) {
      case 'empty_labels':
        return {
          id: `empty_labels_${index}`,
          type: 'empty_labels',
          severity: issue.severity,
          title: 'Leere Bezeichnungen',
          description: `${issue.affectedCount} Zeile(n) ohne Label in der ersten Spalte`,
          affectedCount: issue.affectedCount,
          affectedColumn: labelColumn,
          icon: 'mdi-label-off-outline',
          color: 'warning',
          options: [
            {
              label: 'Zeilen entfernen',
              description: 'Entfernt alle Zeilen ohne Bezeichnung',
              isDefault: true,
              apply: (data) => removeRowsWithEmptyColumn(data, labelColumn)
            },
            {
              label: 'Mit fortlaufenden Nummern füllen',
              description: 'Füllt leere Labels mit 1, 2, 3, ...',
              isDefault: false,
              apply: (data) => fillEmptyLabelsWithNumbers(data, labelColumn)
            },
            {
              label: 'Mit "Unnamed" füllen',
              description: 'Füllt leere Labels mit "Unnamed 1", "Unnamed 2", ...',
              isDefault: false,
              apply: (data) => fillEmptyLabelsWithText(data, labelColumn, 'Unnamed')
            }
          ]
        }

      case 'duplicate_labels':
        return {
          id: `duplicate_labels_${index}`,
          type: 'duplicate_labels',
          severity: issue.severity,
          title: 'Doppelte Bezeichnungen',
          description: `${issue.affectedCount} doppelte Einträge gefunden`,
          affectedCount: issue.affectedCount,
          affectedColumn: labelColumn,
          icon: 'mdi-content-duplicate',
          color: 'info',
          options: [
            {
              label: 'Erste Zeile behalten',
              description: 'Behält nur die erste Zeile jeder doppelten Bezeichnung',
              isDefault: true,
              apply: (data) => keepFirstOccurrence(data, labelColumn)
            },
            {
              label: 'Suffix hinzufügen',
              description: 'Fügt "(1)", "(2)", etc. zu Duplikaten hinzu',
              isDefault: false,
              apply: (data) => addSuffixToDuplicates(data, labelColumn)
            },
            {
              label: 'Für Gruppierung beibehalten',
              description: 'Duplikate nicht entfernen (für spätere Gruppierung)',
              isDefault: false,
              apply: (data) => data
            }
          ]
        }

      case 'negative_values':
        const columnKey = issue.affectedColumn || 'col_1'
        const columnTitle = tableHeaders.find(h => h.key === columnKey)?.title || columnKey

        return {
          id: `negative_values_${index}`,
          type: 'negative_values',
          severity: issue.severity,
          title: 'Negative Werte',
          description: `${issue.affectedCount} negative Werte in Spalte "${columnTitle}"`,
          affectedCount: issue.affectedCount,
          affectedColumn: columnKey,
          icon: 'mdi-minus-circle-outline',
          color: 'error',
          options: [
            {
              label: 'Zeilen entfernen',
              description: 'Entfernt alle Zeilen mit negativen Werten',
              isDefault: true,
              apply: (data) => removeNegativeValues(data, columnKey)
            },
            {
              label: 'In Absolutwerte umwandeln',
              description: 'Wandelt negative Werte in positive um (z.B. -5 → 5)',
              isDefault: false,
              apply: (data) => convertToAbsolute(data, columnKey)
            },
            {
              label: 'Mit 0 ersetzen',
              description: 'Ersetzt alle negativen Werte mit 0',
              isDefault: false,
              apply: (data) => replaceNegativesWithZero(data, columnKey)
            }
          ]
        }

      case 'missing_values':
        const missingColumnKey = issue.affectedColumn || 'col_1'
        const missingColumnTitle = tableHeaders.find(h => h.key === missingColumnKey)?.title || missingColumnKey

        return {
          id: `missing_values_${index}`,
          type: 'missing_values',
          severity: issue.severity,
          title: 'Fehlende Werte',
          description: `${issue.affectedCount} fehlende Werte in Spalte "${missingColumnTitle}"`,
          affectedCount: issue.affectedCount,
          affectedColumn: missingColumnKey,
          icon: 'mdi-alert-circle-outline',
          color: 'warning',
          options: [
            {
              label: 'Zeilen entfernen',
              description: 'Entfernt alle Zeilen mit fehlenden Werten',
              isDefault: true,
              apply: (data) => removeRowsWithEmptyColumn(data, missingColumnKey)
            },
            {
              label: 'Forward Fill',
              description: 'Füllt mit dem letzten bekannten Wert',
              isDefault: false,
              apply: (data) => fillMissingValues(data, missingColumnKey, 'forward')
            },
            {
              label: 'Mit Mittelwert füllen',
              description: 'Berechnet den Durchschnitt und füllt damit',
              isDefault: false,
              apply: (data) => fillMissingValues(data, missingColumnKey, 'mean')
            },
            {
              label: 'Mit Median füllen',
              description: 'Verwendet den Median als Füllwert',
              isDefault: false,
              apply: (data) => fillMissingValues(data, missingColumnKey, 'median')
            },
            {
              label: 'Mit 0 füllen',
              description: 'Ersetzt fehlende Werte mit 0',
              isDefault: false,
              apply: (data) => fillMissingValues(data, missingColumnKey, 'zero')
            }
          ]
        }

      case 'too_many_zeros':
        return {
          id: `too_many_zeros_${index}`,
          type: 'too_many_zeros',
          severity: 'low',
          title: 'Viele Nullwerte',
          description: issue.message,
          affectedCount: issue.affectedCount,
          icon: 'mdi-information-outline',
          color: 'grey',
          options: [
            {
              label: 'Beibehalten',
              description: 'Nullwerte sind valide - keine Aktion erforderlich',
              isDefault: true,
              apply: (data) => data
            }
          ]
        }

      case 'column_mostly_empty':
        const emptyColumnKey = issue.affectedColumn || ''
        const emptyColumnTitle = tableHeaders.find(h => h.key === emptyColumnKey)?.title || emptyColumnKey

        return {
          id: `column_mostly_empty_${index}`,
          type: 'column_mostly_empty',
          severity: issue.severity,
          title: 'Spalte größtenteils leer',
          description: `Spalte "${emptyColumnTitle}" hat > 50% fehlende Werte`,
          affectedCount: issue.affectedCount,
          affectedColumn: emptyColumnKey,
          icon: 'mdi-table-column-remove',
          color: 'warning',
          options: [
            {
              label: 'Fehlende Werte füllen',
              description: 'Füllt leere Felder mit Mittelwert',
              isDefault: true,
              apply: (data) => fillMissingValues(data, emptyColumnKey, 'mean')
            },
            {
              label: 'Mit 0 füllen',
              description: 'Ersetzt fehlende Werte mit 0',
              isDefault: false,
              apply: (data) => fillMissingValues(data, emptyColumnKey, 'zero')
            },
            {
              label: 'Beibehalten',
              description: 'Keine Aktion - Spalte in diesem Zustand belassen',
              isDefault: false,
              apply: (data) => data
            }
          ]
        }

      default:
        return {
          id: `unknown_${index}`,
          type: 'missing_values',
          severity: 'low',
          title: 'Unbekanntes Problem',
          description: issue.message,
          affectedCount: issue.affectedCount,
          icon: 'mdi-help-circle-outline',
          color: 'grey',
          options: [
            {
              label: 'Überspringen',
              description: 'Keine Aktion verfügbar',
              isDefault: true,
              apply: (data) => data
            }
          ]
        }
    }
  })
}

/**
 * Get icon for issue type
 */
export function getIssueIcon(type: CleaningSuggestion['type']): string {
  switch (type) {
    case 'empty_labels': return 'mdi-label-off-outline'
    case 'duplicate_labels': return 'mdi-content-duplicate'
    case 'negative_values': return 'mdi-minus-circle-outline'
    case 'missing_values': return 'mdi-alert-circle-outline'
    case 'too_many_zeros': return 'mdi-information-outline'
    case 'column_mostly_empty': return 'mdi-table-column-remove'
    case 'outliers': return 'mdi-chart-scatter-plot'
    default: return 'mdi-help-circle-outline'
  }
}

/**
 * Get color for severity
 */
export function getSeverityColor(severity: 'high' | 'medium' | 'low'): string {
  switch (severity) {
    case 'high': return 'error'
    case 'medium': return 'warning'
    case 'low': return 'info'
  }
}
