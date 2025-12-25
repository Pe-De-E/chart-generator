export interface GroupedDataPoint {
  label: string
  value: number
  count: number
  originalLabels: string[]
}

export type AggregationMethod = 'sum' | 'average' | 'count' | 'min' | 'max'

/**
 * Groups data by categorical labels and aggregates values
 */
export function groupByCategorical(
  labels: string[],
  values: number[],
  method: AggregationMethod = 'sum'
): GroupedDataPoint[] {
  const groups = new Map<string, number[]>()

  // Group values by label
  labels.forEach((label, i) => {
    const cleanLabel = label.trim()
    if (!cleanLabel) return

    if (!groups.has(cleanLabel)) {
      groups.set(cleanLabel, [])
    }
    groups.get(cleanLabel)!.push(values[i])
  })

  // Aggregate each group
  const result: GroupedDataPoint[] = []
  groups.forEach((groupValues, groupLabel) => {
    const aggregated = aggregate(groupValues, method)
    result.push({
      label: groupLabel,
      value: aggregated,
      count: groupValues.length,
      originalLabels: Array(groupValues.length).fill(groupLabel)
    })
  })

  return result.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Groups data by date periods (year, month, quarter, week)
 */
export function groupByDatePeriod(
  labels: string[],
  values: number[],
  period: 'year' | 'month' | 'quarter' | 'week',
  method: AggregationMethod = 'sum'
): GroupedDataPoint[] {
  const groups = new Map<string, { values: number[], labels: string[] }>()

  labels.forEach((label, i) => {
    const date = parseDate(label)
    if (!date) return

    const periodKey = getDatePeriodKey(date, period)

    if (!groups.has(periodKey)) {
      groups.set(periodKey, { values: [], labels: [] })
    }
    groups.get(periodKey)!.values.push(values[i])
    groups.get(periodKey)!.labels.push(label)
  })

  // Aggregate each group
  const result: GroupedDataPoint[] = []
  groups.forEach((group, periodKey) => {
    const aggregated = aggregate(group.values, method)
    result.push({
      label: periodKey,
      value: aggregated,
      count: group.values.length,
      originalLabels: group.labels
    })
  })

  return result.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Groups data by numeric ranges
 */
export function groupByNumericRange(
  labels: string[],
  values: number[],
  rangeSize: number,
  method: AggregationMethod = 'sum'
): GroupedDataPoint[] {
  const numericLabels = labels.map(l => parseFloat(l.replace(',', '.')))

  // Find min and max to determine range
  const validNumericLabels = numericLabels.filter(n => !isNaN(n))
  if (validNumericLabels.length === 0) return []

  const min = Math.min(...validNumericLabels)
  const max = Math.max(...validNumericLabels)

  const groups = new Map<string, { values: number[], labels: string[] }>()

  labels.forEach((label, i) => {
    const numLabel = numericLabels[i]
    if (isNaN(numLabel)) return

    const rangeStart = Math.floor(numLabel / rangeSize) * rangeSize
    const rangeEnd = rangeStart + rangeSize - 1
    const rangeKey = `${rangeStart}-${rangeEnd}`

    if (!groups.has(rangeKey)) {
      groups.set(rangeKey, { values: [], labels: [] })
    }
    groups.get(rangeKey)!.values.push(values[i])
    groups.get(rangeKey)!.labels.push(label)
  })

  // Aggregate each group
  const result: GroupedDataPoint[] = []
  groups.forEach((group, rangeKey) => {
    const aggregated = aggregate(group.values, method)
    result.push({
      label: rangeKey,
      value: aggregated,
      count: group.values.length,
      originalLabels: group.labels
    })
  })

  return result.sort((a, b) => {
    const [aStart] = a.label.split('-').map(Number)
    const [bStart] = b.label.split('-').map(Number)
    return aStart - bStart
  })
}

/**
 * Aggregate values using specified method
 */
function aggregate(values: number[], method: AggregationMethod): number {
  if (values.length === 0) return 0

  switch (method) {
    case 'sum':
      return values.reduce((acc, v) => acc + v, 0)
    case 'average':
      return values.reduce((acc, v) => acc + v, 0) / values.length
    case 'count':
      return values.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    default:
      return 0
  }
}

/**
 * Parse various date formats to Date object
 */
function parseDate(dateString: string): Date | null {
  if (!dateString) return null

  // Try ISO format (YYYY-MM-DD)
  let match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
  }

  // Try German format (DD.MM.YYYY)
  match = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
  }

  // Try US format (MM/DD/YYYY)
  match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]))
  }

  // Try year-month format (YYYY-MM)
  match = dateString.match(/^(\d{4})-(\d{2})$/)
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, 1)
  }

  // Try year only
  match = dateString.match(/^(19|20)\d{2}$/)
  if (match) {
    return new Date(parseInt(dateString), 0, 1)
  }

  return null
}

/**
 * Get period key for a date
 */
function getDatePeriodKey(date: Date, period: 'year' | 'month' | 'quarter' | 'week'): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  switch (period) {
    case 'year':
      return year.toString()

    case 'month':
      return `${year}-${month.toString().padStart(2, '0')}`

    case 'quarter':
      const quarter = Math.floor((month - 1) / 3) + 1
      return `${year}-Q${quarter}`

    case 'week':
      const weekNum = getWeekNumber(date)
      return `${year}-W${weekNum.toString().padStart(2, '0')}`

    default:
      return year.toString()
  }
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
