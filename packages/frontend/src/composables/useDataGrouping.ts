import { ref, computed, type Ref } from 'vue'
import type { SeriesDataPoint, SeriesConfig } from '../utils/chartGenerators'
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
  selectedValueColumns: Ref<SeriesConfig[]>
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

  const seriesData = computed<SeriesDataPoint[]>(() => {
    if (tableItems.value.length === 0 || selectedValueColumns.value.length === 0) return []

    // Extract raw labels
    const rawLabels = tableItems.value.map(row => String(row[selectedLabelColumn.value] || ''))

    // Extract raw values for EACH series
    const rawValuesBySeries = selectedValueColumns.value.map(series => {
      return tableItems.value.map(row => {
        const val = row[series.columnKey]
        return typeof val === 'number' ? val : (parseFloat(String(val)) || 0)
      })
    })

    // Apply grouping if enabled
    if (enableGrouping.value && groupingSuggestion.value.canGroup) {
      // Group each series independently with the SAME labels
      const groupedSeries = rawValuesBySeries.map(seriesValues => {
        switch (groupingSuggestion.value.type) {
          case 'categorical':
            return groupByCategorical(rawLabels, seriesValues, aggregationMethod.value)

          case 'date':
            return groupByDatePeriod(rawLabels, seriesValues, groupingPeriod.value, aggregationMethod.value)

          case 'numeric':
            return groupByNumericRange(rawLabels, seriesValues, numericRangeSize.value, aggregationMethod.value)

          default:
            return rawLabels.map((label, i) => ({
              label,
              value: seriesValues[i],
              count: 1,
              originalLabels: [label]
            }))
        }
      })

      // Merge into SeriesDataPoint[] format
      // Ensure all series use the SAME grouped labels
      const uniqueLabels = groupedSeries[0].map(g => g.label)

      return uniqueLabels.map(label => {
        const values: Record<string, number> = {}
        selectedValueColumns.value.forEach((series, i) => {
          const point = groupedSeries[i].find(p => p.label === label)
          values[series.name] = point?.value || 0
        })
        return { label, values }
      })
    }

    // Return ungrouped multi-series data
    return rawLabels.map((label, i) => {
      const values: Record<string, number> = {}
      selectedValueColumns.value.forEach((series, idx) => {
        values[series.name] = rawValuesBySeries[idx][i]
      })
      return { label, values }
    })
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
    seriesData,
    resetGrouping
  }
}
