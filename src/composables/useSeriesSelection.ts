import { ref, type Ref } from 'vue'
import type { SeriesConfig } from '../utils/chartGenerators/types'
import { getSeriesColor, generateSeriesColors } from '../utils/colorPalette'

export function useSeriesSelection(
  numericColumnOptions: Ref<{ title: string, value: string }[]>
) {
  const selectedSeries = ref<SeriesConfig[]>([])

  /**
   * Fügt eine neue Serie hinzu
   */
  function addSeries(columnKey: string) {
    // Finde den Spaltentitel
    const column = numericColumnOptions.value.find(opt => opt.value === columnKey)
    if (!column) return

    // Generiere Farbe basierend auf aktuellem Index
    const color = getSeriesColor(selectedSeries.value.length)

    selectedSeries.value.push({
      name: column.title,
      columnKey,
      color
    })
  }

  /**
   * Entfernt eine Serie basierend auf Index
   */
  function removeSeries(index: number) {
    selectedSeries.value.splice(index, 1)
  }

  /**
   * Aktualisiert die Farbe einer Serie
   */
  function updateSeriesColor(index: number, color: string) {
    if (index >= 0 && index < selectedSeries.value.length) {
      selectedSeries.value[index].color = color
    }
  }

  /**
   * Regeneriert alle Farben basierend auf der aktuellen Palette
   */
  function regenerateColors() {
    const newColors = generateSeriesColors(selectedSeries.value.length)
    selectedSeries.value.forEach((series, i) => {
      series.color = newColors[i]
    })
  }

  /**
   * Setzt alle Serien zurück
   */
  function resetSeries() {
    selectedSeries.value = []
  }

  return {
    selectedSeries,
    addSeries,
    removeSeries,
    updateSeriesColor,
    regenerateColors,
    resetSeries
  }
}
