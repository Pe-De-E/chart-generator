import type { TableItem } from '../composables/useCSVParser'

/**
 * Removes rows where ALL fields are empty
 */
export function removeEmptyRows(data: TableItem[]): TableItem[] {
  return data.filter(row => {
    const values = Object.values(row)
    return values.some(val => {
      if (typeof val === 'number') return !isNaN(val)
      if (typeof val === 'string') return val.trim() !== ''
      return val !== null && val !== undefined
    })
  })
}

/**
 * Removes rows where a specific column is empty
 */
export function removeRowsWithEmptyColumn(
  data: TableItem[],
  columnKey: string
): TableItem[] {
  return data.filter(row => {
    const val = row[columnKey]
    if (typeof val === 'number') return !isNaN(val)
    if (typeof val === 'string') return val.trim() !== ''
    return val !== null && val !== undefined
  })
}

/**
 * Removes duplicate rows based on all columns or specific key columns
 */
export function removeDuplicateRows(
  data: TableItem[],
  keyColumns?: string[]
): TableItem[] {
  const seen = new Set<string>()
  return data.filter(row => {
    const keys = keyColumns || Object.keys(row).sort()
    const signature = keys.map(k => String(row[k])).join('|')
    if (seen.has(signature)) {
      return false
    }
    seen.add(signature)
    return true
  })
}

/**
 * Keeps only the first occurrence of duplicate labels (based on first column)
 */
export function keepFirstOccurrence(
  data: TableItem[],
  labelColumn: string
): TableItem[] {
  const seen = new Set<string>()
  return data.filter(row => {
    const label = String(row[labelColumn])
    if (seen.has(label)) {
      return false
    }
    seen.add(label)
    return true
  })
}

/**
 * Adds suffix to duplicate labels: "Label", "Label (1)", "Label (2)", etc.
 */
export function addSuffixToDuplicates(
  data: TableItem[],
  labelColumn: string
): TableItem[] {
  const labelCounts = new Map<string, number>()

  return data.map(row => {
    const originalLabel = String(row[labelColumn])
    const count = labelCounts.get(originalLabel) || 0
    labelCounts.set(originalLabel, count + 1)

    if (count === 0) {
      return row
    }

    return {
      ...row,
      [labelColumn]: `${originalLabel} (${count})`
    }
  })
}

/**
 * Removes rows where a specific numeric column has negative values
 */
export function removeNegativeValues(
  data: TableItem[],
  columnKey: string
): TableItem[] {
  return data.filter(row => {
    const val = row[columnKey]
    if (typeof val === 'number') {
      return val >= 0
    }
    return true // Keep non-numeric values
  })
}

/**
 * Converts negative values to absolute values in a specific column
 */
export function convertToAbsolute(
  data: TableItem[],
  columnKey: string
): TableItem[] {
  return data.map(row => {
    const val = row[columnKey]
    if (typeof val === 'number' && val < 0) {
      return { ...row, [columnKey]: Math.abs(val) }
    }
    return row
  })
}

/**
 * Replaces negative values with zero in a specific column
 */
export function replaceNegativesWithZero(
  data: TableItem[],
  columnKey: string
): TableItem[] {
  return data.map(row => {
    const val = row[columnKey]
    if (typeof val === 'number' && val < 0) {
      return { ...row, [columnKey]: 0 }
    }
    return row
  })
}

/**
 * Fill missing values using various strategies
 */
export type FillMethod = 'forward' | 'backward' | 'mean' | 'median' | 'zero' | 'custom'

export function fillMissingValues(
  data: TableItem[],
  columnKey: string,
  method: FillMethod,
  customValue?: any
): TableItem[] {
  const isEmpty = (val: any): boolean => {
    if (val === null || val === undefined) return true
    if (typeof val === 'string' && val.trim() === '') return true
    if (typeof val === 'number' && isNaN(val)) return true
    return false
  }

  if (method === 'custom' && customValue !== undefined) {
    return data.map(row =>
      isEmpty(row[columnKey]) ? { ...row, [columnKey]: customValue } : row
    )
  }

  if (method === 'zero') {
    return data.map(row =>
      isEmpty(row[columnKey]) ? { ...row, [columnKey]: 0 } : row
    )
  }

  if (method === 'forward') {
    let lastValue: any = null
    return data.map(row => {
      if (!isEmpty(row[columnKey])) {
        lastValue = row[columnKey]
        return row
      }
      return lastValue !== null ? { ...row, [columnKey]: lastValue } : row
    })
  }

  if (method === 'backward') {
    let lastValue: any = null
    return data.reverse().map(row => {
      if (!isEmpty(row[columnKey])) {
        lastValue = row[columnKey]
        return row
      }
      return lastValue !== null ? { ...row, [columnKey]: lastValue } : row
    }).reverse()
  }

  if (method === 'mean' || method === 'median') {
    const numericValues = data
      .map(row => row[columnKey])
      .filter(val => typeof val === 'number' && !isNaN(val)) as number[]

    if (numericValues.length === 0) {
      return data
    }

    let fillValue: number
    if (method === 'mean') {
      fillValue = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length
      fillValue = Math.round(fillValue * 100) / 100 // Round to 2 decimals
    } else {
      numericValues.sort((a, b) => a - b)
      const mid = Math.floor(numericValues.length / 2)
      fillValue = numericValues.length % 2 === 0
        ? (numericValues[mid - 1] + numericValues[mid]) / 2
        : numericValues[mid]
      fillValue = Math.round(fillValue * 100) / 100
    }

    return data.map(row =>
      isEmpty(row[columnKey]) ? { ...row, [columnKey]: fillValue } : row
    )
  }

  return data
}

/**
 * Fill empty labels with sequential numbers
 */
export function fillEmptyLabelsWithNumbers(
  data: TableItem[],
  labelColumn: string,
  startFrom: number = 1
): TableItem[] {
  let counter = startFrom
  return data.map(row => {
    const val = row[labelColumn]
    const isEmpty = val === null || val === undefined ||
                   (typeof val === 'string' && val.trim() === '')

    if (isEmpty) {
      return { ...row, [labelColumn]: String(counter++) }
    }
    return row
  })
}

/**
 * Fill empty labels with "Unnamed {n}"
 */
export function fillEmptyLabelsWithText(
  data: TableItem[],
  labelColumn: string,
  prefix: string = 'Unnamed'
): TableItem[] {
  let counter = 1
  return data.map(row => {
    const val = row[labelColumn]
    const isEmpty = val === null || val === undefined ||
                   (typeof val === 'string' && val.trim() === '')

    if (isEmpty) {
      return { ...row, [labelColumn]: `${prefix} ${counter++}` }
    }
    return row
  })
}

/**
 * Normalize whitespace in all string values
 */
export function normalizeWhitespace(data: TableItem[]): TableItem[] {
  return data.map(row => {
    const normalized: TableItem = {}
    for (const [key, val] of Object.entries(row)) {
      if (typeof val === 'string') {
        normalized[key] = val.trim().replace(/\s+/g, ' ')
      } else {
        normalized[key] = val
      }
    }
    return normalized
  })
}

/**
 * Remove outliers using IQR (Interquartile Range) method
 */
export function removeOutliersIQR(
  data: TableItem[],
  columnKey: string,
  multiplier: number = 1.5
): TableItem[] {
  const values = data
    .map(row => row[columnKey])
    .filter(val => typeof val === 'number' && !isNaN(val)) as number[]

  if (values.length < 4) return data // Need at least 4 values for quartiles

  values.sort((a, b) => a - b)
  const q1Index = Math.floor(values.length * 0.25)
  const q3Index = Math.floor(values.length * 0.75)
  const q1 = values[q1Index]
  const q3 = values[q3Index]
  const iqr = q3 - q1
  const lowerBound = q1 - multiplier * iqr
  const upperBound = q3 + multiplier * iqr

  return data.filter(row => {
    const val = row[columnKey]
    if (typeof val === 'number' && !isNaN(val)) {
      return val >= lowerBound && val <= upperBound
    }
    return true
  })
}

/**
 * Remove outliers using Z-score method
 */
export function removeOutliersZScore(
  data: TableItem[],
  columnKey: string,
  threshold: number = 3
): TableItem[] {
  const values = data
    .map(row => row[columnKey])
    .filter(val => typeof val === 'number' && !isNaN(val)) as number[]

  if (values.length === 0) return data

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) return data

  return data.filter(row => {
    const val = row[columnKey]
    if (typeof val === 'number' && !isNaN(val)) {
      const zScore = Math.abs((val - mean) / stdDev)
      return zScore <= threshold
    }
    return true
  })
}

/**
 * Validation: Check if data has at least minimum rows
 */
export function validateMinimumRows(data: TableItem[], minRows: number = 2): boolean {
  return data.length >= minRows
}

/**
 * Count affected rows between before and after
 */
export function countAffectedRows(before: TableItem[], after: TableItem[]): number {
  return before.length - after.length
}
