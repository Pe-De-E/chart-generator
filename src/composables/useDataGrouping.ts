import { ref, computed, type Ref } from 'vue'
import type { DataPoint } from '../utils/chartGenerators'
import type { TableItem } from './useCSVParser'
import {
  analyzeGroupingPotential,
  type GroupingSuggestion
} from '../utils/groupingAnalysis'
import {
  groupByCategorical,
  groupByDatePeriod,
  groupByNumericRange,
  type AggregationMethod
} from '../utils/dataGrouping'

export function useDataGrouping(
  tableItems: Ref<TableItem[]>,
  selectedLabelColumn: Ref<string>,
  selectedValueColumn: Ref<string>
) {
  const enableGrouping = ref(false)
  const groupingPeriod = ref<'year' | 'month' | 'quarter' | 'week'>('month')
  const aggregationMethod = ref<AggregationMethod>('sum')
  const numericRangeSize = ref(10)

  const groupingSuggestion = computed<GroupingSuggestion>(() => {
    if (tableItems.value.length === 0) {
      return analyzeGroupingPotential([])
    }

    // Extract labels from selected label column
    const labels = tableItems.value.map(row => String(row[selectedLabelColumn.value] || ''))
    return analyzeGroupingPotential(labels)
  })

  const data = computed<DataPoint[]>(() => {
    if (tableItems.value.length === 0) return []

    // Extract raw data - ensure all values are numbers
    const rawLabels = tableItems.value.map(row => String(row[selectedLabelColumn.value] || ''))
    const rawValues = tableItems.value.map(row => {
      const val = row[selectedValueColumn.value]
      return typeof val === 'number' ? val : (parseFloat(String(val)) || 0)
    })

    // Apply grouping if enabled
    if (enableGrouping.value && groupingSuggestion.value.canGroup) {
      let grouped

      switch (groupingSuggestion.value.type) {
        case 'categorical':
          grouped = groupByCategorical(rawLabels, rawValues, aggregationMethod.value)
          break

        case 'date':
          grouped = groupByDatePeriod(rawLabels, rawValues, groupingPeriod.value, aggregationMethod.value)
          break

        case 'numeric':
          grouped = groupByNumericRange(rawLabels, rawValues, numericRangeSize.value, aggregationMethod.value)
          break

        default:
          grouped = rawLabels.map((label, i) => ({
            label,
            value: rawValues[i],
            count: 1,
            originalLabels: [label]
          }))
      }

      return grouped.map(g => ({ label: g.label, value: g.value }))
    }

    // Return ungrouped data
    return rawLabels.map((label, i) => ({ label, value: rawValues[i] }))
  })

  function resetGrouping() {
    enableGrouping.value = false
    groupingPeriod.value = 'month'
    aggregationMethod.value = 'sum'
    numericRangeSize.value = 10
  }

  return {
    enableGrouping,
    groupingPeriod,
    aggregationMethod,
    numericRangeSize,
    groupingSuggestion,
    data,
    resetGrouping
  }
}
