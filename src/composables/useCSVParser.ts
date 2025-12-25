import { ref, computed } from 'vue'

export interface TableHeader {
  title: string
  key: string
  sortable: boolean
}

export interface TableItem {
  [key: string]: string | number
}

export function useCSVParser() {
  const tableHeaders = ref<TableHeader[]>([
    { title: "Label", key: "col_0", sortable: true },
    { title: "Wert", key: "col_1", sortable: true },
  ])

  const tableItems = ref<TableItem[]>([
    { col_0: "Q1", col_1: 30 },
    { col_0: "Q2", col_1: 45 },
    { col_0: "Q3", col_1: 60 },
    { col_0: "Q4", col_1: 55 },
  ])

  const columnOptions = computed(() => {
    return tableHeaders.value.map(h => ({
      title: h.title,
      value: h.key
    }))
  })

  const numericColumnOptions = computed(() => {
    if (tableItems.value.length === 0) return []

    return tableHeaders.value
      .filter(h => {
        const sampleValues = tableItems.value.slice(0, 10).map(row => row[h.key])
        const numericCount = sampleValues.filter(v => typeof v === 'number').length
        return numericCount > sampleValues.length / 2
      })
      .map(h => ({
        title: h.title,
        value: h.key
      }))
  })

  function parseCSV(text: string) {
    const lines = text.trim().split("\n").filter(line => line.trim())

    // Detect delimiter: comma or semicolon (common in German CSVs)
    const delimiter = lines[0].includes(';') ? ';' : ','

    // Check if first line is a header
    const firstLine = lines[0].split(delimiter).map(col => col.trim())
    const hasHeader = firstLine.length > 1 && isNaN(parseFloat(firstLine[1].replace(',', '.')))

    // Generate column headers
    const headers = hasHeader ? firstLine : firstLine.map((_, i) => `Column ${i + 1}`)
    const dataLines = hasHeader ? lines.slice(1) : lines

    // Create Vuetify table headers
    tableHeaders.value = headers.map((header, i) => ({
      title: header,
      key: `col_${i}`,
      sortable: true,
    }))

    // Parse data into table format
    const allRows: TableItem[] = []
    dataLines.forEach((line) => {
      const columns = line.split(delimiter).map(col => col.trim())

      const row: TableItem = {}
      columns.forEach((col, i) => {
        // Handle empty cells
        if (!col || col.trim() === '') {
          row[`col_${i}`] = ''
          return
        }

        // Check if value looks like a date (contains date separators like -, /, or multiple dots)
        const looksLikeDate = /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(col) || // YYYY-MM-DD or DD.MM.YYYY
                              /\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(col)   // MM/DD/YYYY or DD/MM/YY

        // If it looks like a date, keep it as string
        if (looksLikeDate) {
          row[`col_${i}`] = col
          return
        }

        // Try to parse as number - handle both comma and dot as decimal separator
        const normalizedValue = col.replace(/,/g, '.')
        const numValue = parseFloat(normalizedValue)

        // Only convert to number if:
        // 1. It's a valid number
        // 2. The string doesn't contain letters (except e/E for scientific notation)
        const hasLetters = /[a-df-zA-DF-Z]/.test(col) // Exclude e/E

        if (!isNaN(numValue) && !hasLetters && normalizedValue.trim() !== '') {
          row[`col_${i}`] = numValue
        } else {
          row[`col_${i}`] = col
        }
      })
      allRows.push(row)
    })

    tableItems.value = allRows
  }

  function resetData() {
    tableHeaders.value = [
      { title: "Label", key: "col_0", sortable: true },
      { title: "Wert", key: "col_1", sortable: true },
    ]
    tableItems.value = [
      { col_0: "Q1", col_1: 30 },
      { col_0: "Q2", col_1: 45 },
      { col_0: "Q3", col_1: 60 },
      { col_0: "Q4", col_1: 55 },
    ]
  }

  return {
    tableHeaders,
    tableItems,
    columnOptions,
    numericColumnOptions,
    parseCSV,
    resetData
  }
}
