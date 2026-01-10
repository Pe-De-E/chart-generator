import { ref, computed } from 'vue'

export interface TableHeader {
  title: string
  key: string
  sortable: boolean
}

export interface TableItem {
  [key: string]: string | number
}

// Haversine formula to calculate distance between two GPS points in meters
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
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

  function parseGPX(xmlText: string) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, 'application/xml')

    // Check for parsing errors
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      console.error('GPX parsing error:', parseError.textContent)
      return
    }

    // Extract all trackpoints from <trkpt> elements
    const trackPoints = doc.querySelectorAll('trkpt')

    if (trackPoints.length === 0) {
      console.error('No trackpoints found in GPX file')
      return
    }

    // Set up headers for elevation profile
    tableHeaders.value = [
      { title: 'Entfernung (km)', key: 'col_0', sortable: true },
      { title: 'Höhe (m)', key: 'col_1', sortable: true },
    ]

    const rows: TableItem[] = []
    let cumulativeDistance = 0
    let prevLat: number | null = null
    let prevLon: number | null = null

    trackPoints.forEach((point) => {
      const lat = parseFloat(point.getAttribute('lat') || '0')
      const lon = parseFloat(point.getAttribute('lon') || '0')
      const eleElement = point.querySelector('ele')
      const elevation = eleElement ? parseFloat(eleElement.textContent || '0') : 0

      // Calculate distance from previous point
      if (prevLat !== null && prevLon !== null) {
        cumulativeDistance += haversineDistance(prevLat, prevLon, lat, lon)
      }

      // Convert to kilometers and round to 2 decimal places
      const distanceKm = Math.round((cumulativeDistance / 1000) * 100) / 100

      rows.push({
        col_0: distanceKm,
        col_1: Math.round(elevation)
      })

      prevLat = lat
      prevLon = lon
    })

    // Reduce data points if too many (keep ~500 points max for performance)
    if (rows.length > 500) {
      const step = Math.ceil(rows.length / 500)
      tableItems.value = rows.filter((_, index) => index % step === 0)
    } else {
      tableItems.value = rows
    }
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
    parseGPX,
    resetData
  }
}
