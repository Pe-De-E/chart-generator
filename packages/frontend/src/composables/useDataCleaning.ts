import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { TableItem, TableHeader } from './useCSVParser'
import type { DataQualityMetrics } from '../utils/dataQuality'
import {
  generateCleaningSuggestions,
  type CleaningSuggestion
} from '../utils/dataCleaningSuggestions'
import { validateMinimumRows, countAffectedRows } from '../utils/dataCleaningOperations'

export interface AppliedOperation {
  suggestionId: string
  suggestionTitle: string
  optionLabel: string
  affectedRows: number
  timestamp: number
}

export interface OperationHistory {
  operation: AppliedOperation
  beforeData: TableItem[]
  afterData: TableItem[]
}

export function useDataCleaning(
  originalTableItems: Ref<TableItem[]>,
  tableHeaders: Ref<TableHeader[]>,
  dataQuality: ComputedRef<DataQualityMetrics>,
  labelColumn: Ref<string> = ref('col_0')
) {
  const cleanedTableItems = ref<TableItem[]>([])
  const showCleaningStep = ref(false)
  const appliedOperations = ref<AppliedOperation[]>([])
  const operationHistory = ref<OperationHistory[]>([])
  const selectedOptions = ref<Record<string, number>>({}) // suggestionId → optionIndex
  const isProcessing = ref(false)
  const errorMessage = ref<string | null>(null)

  // Generate cleaning suggestions based on structured issues
  const cleaningSuggestions = computed<CleaningSuggestion[]>(() => {
    if (!dataQuality.value || dataQuality.value.structuredIssues.length === 0) {
      return []
    }

    // Filter out "too_few_rows" as it can't be fixed by cleaning
    const fixableIssues = dataQuality.value.structuredIssues.filter(
      issue => issue.type !== 'too_few_rows'
    )

    return generateCleaningSuggestions(
      fixableIssues,
      tableHeaders.value,
      labelColumn.value
    )
  })

  // Count of rows affected by cleaning
  const rowCountDelta = computed(() => {
    if (cleanedTableItems.value.length === 0) return 0
    return cleanedTableItems.value.length - originalTableItems.value.length
  })

  // Check if there are any changes
  const hasChanges = computed(() => appliedOperations.value.length > 0)

  // Current data to work with (cleaned or original)
  const currentData = computed(() =>
    cleanedTableItems.value.length > 0 ? cleanedTableItems.value : originalTableItems.value
  )

  /**
   * Initialize the cleaning step with a copy of original data
   */
  function initializeCleaningStep() {
    cleanedTableItems.value = JSON.parse(JSON.stringify(originalTableItems.value))
    showCleaningStep.value = true
    appliedOperations.value = []
    operationHistory.value = []
    selectedOptions.value = {}
    errorMessage.value = null
  }

  /**
   * Apply a cleaning operation
   */
  function applyOperation(suggestion: CleaningSuggestion, optionIndex: number) {
    isProcessing.value = true
    errorMessage.value = null

    try {
      const option = suggestion.options[optionIndex]
      if (!option) {
        throw new Error('Ungültige Option ausgewählt')
      }

      const before = JSON.parse(JSON.stringify(cleanedTableItems.value)) as TableItem[]
      const after = option.apply(before)

      // Validate result
      if (!validateMinimumRows(after, 2)) {
        errorMessage.value = 'Diese Operation würde alle Daten entfernen. Bitte anders konfigurieren.'
        return
      }

      // Check if operation would remove >25% of rows
      const affected = countAffectedRows(before, after)
      const percentageRemoved = (affected / before.length) * 100

      if (percentageRemoved > 25 && affected > 0) {
        // Store for confirmation dialog (handled by component)
        const confirmed = confirm(
          `Diese Operation wird ${affected} von ${before.length} Zeilen entfernen (${Math.round(percentageRemoved)}%). Fortfahren?`
        )
        if (!confirmed) {
          return
        }
      }

      // Store history
      operationHistory.value.push({
        operation: {
          suggestionId: suggestion.id,
          suggestionTitle: suggestion.title,
          optionLabel: option.label,
          affectedRows: affected,
          timestamp: Date.now()
        },
        beforeData: before,
        afterData: after
      })

      // Apply changes
      cleanedTableItems.value = after
      appliedOperations.value.push({
        suggestionId: suggestion.id,
        suggestionTitle: suggestion.title,
        optionLabel: option.label,
        affectedRows: affected,
        timestamp: Date.now()
      })

      // Mark option as selected
      selectedOptions.value[suggestion.id] = optionIndex
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unbekannter Fehler'
      console.error('Error applying cleaning operation:', error)
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Undo the last operation
   */
  function undoLastOperation() {
    const lastHistory = operationHistory.value.pop()
    if (!lastHistory) return

    cleanedTableItems.value = JSON.parse(JSON.stringify(lastHistory.beforeData))
    appliedOperations.value.pop()

    // Remove from selected options
    delete selectedOptions.value[lastHistory.operation.suggestionId]
  }

  /**
   * Reset to original data
   */
  function resetToOriginal() {
    cleanedTableItems.value = JSON.parse(JSON.stringify(originalTableItems.value))
    appliedOperations.value = []
    operationHistory.value = []
    selectedOptions.value = {}
    errorMessage.value = null
  }

  /**
   * Skip the cleaning step entirely
   */
  function skipCleaning() {
    showCleaningStep.value = false
    cleanedTableItems.value = []
    appliedOperations.value = []
    operationHistory.value = []
    selectedOptions.value = {}
  }

  /**
   * Finalize changes and proceed
   */
  function finalizeChanges() {
    // Cleaning is complete, data is ready for next step
    showCleaningStep.value = false
  }

  /**
   * Check if an option is selected for a suggestion
   */
  function isOptionSelected(suggestionId: string, optionIndex: number): boolean {
    return selectedOptions.value[suggestionId] === optionIndex
  }

  /**
   * Check if a suggestion has been applied
   */
  function isSuggestionApplied(suggestionId: string): boolean {
    return suggestionId in selectedOptions.value
  }

  /**
   * Get summary stats
   */
  const cleaningSummary = computed(() => {
    const originalCount = originalTableItems.value.length
    const cleanedCount = cleanedTableItems.value.length || originalCount
    const removed = originalCount - cleanedCount
    const appliedCount = appliedOperations.value.length
    const totalSuggestions = cleaningSuggestions.value.length

    return {
      originalCount,
      cleanedCount,
      removed,
      appliedCount,
      totalSuggestions,
      skippedCount: totalSuggestions - appliedCount
    }
  })

  return {
    // State
    cleanedTableItems,
    showCleaningStep,
    appliedOperations,
    selectedOptions,
    isProcessing,
    errorMessage,

    // Computed
    cleaningSuggestions,
    rowCountDelta,
    hasChanges,
    currentData,
    cleaningSummary,

    // Methods
    initializeCleaningStep,
    applyOperation,
    undoLastOperation,
    resetToOriginal,
    skipCleaning,
    finalizeChanges,
    isOptionSelected,
    isSuggestionApplied
  }
}
