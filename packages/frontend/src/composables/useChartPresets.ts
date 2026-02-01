import { ref, computed } from 'vue'
import { chartPresetService } from '../services/chartPreset.service'
import type {
  ChartPreset,
  SavedChartPreset,
  SystemChartPreset,
  ChartPresetConfig,
  ChartType,
  StatisticalOverlays,
  ChartStyleOverrides,
} from '@chart-generator/shared'

export function useChartPresets() {
  const presets = ref<ChartPreset[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Separate system and user presets for UI grouping
  const systemPresets = computed(() =>
    presets.value.filter((p): p is SystemChartPreset => 'isSystem' in p && p.isSystem === true)
  )

  const userPresets = computed(() =>
    presets.value.filter((p): p is SavedChartPreset => !('isSystem' in p) || !p.isSystem)
  )

  async function fetchPresets() {
    loading.value = true
    error.value = null
    try {
      presets.value = await chartPresetService.getAllPresets()
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message || 'Fehler beim Laden der Presets'
    } finally {
      loading.value = false
    }
  }

  async function createPresetFromCurrentSettings(
    name: string,
    chartType: ChartType,
    colors: { background: string; series: string[] },
    statisticalOverlays: StatisticalOverlays,
    styleOverrides?: ChartStyleOverrides
  ): Promise<SavedChartPreset | null> {
    loading.value = true
    error.value = null
    try {
      const config: ChartPresetConfig = {
        chartType,
        colors,
        statisticalOverlays,
        styleOverrides,
      }
      const preset = await chartPresetService.createPreset({ name, config })
      presets.value = [...presets.value, preset]
      return preset
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message || 'Fehler beim Speichern des Presets'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deletePreset(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      await chartPresetService.deletePreset(id)
      presets.value = presets.value.filter((p) => p.id !== id)
      return true
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message || 'Fehler beim Loeschen des Presets'
      return false
    } finally {
      loading.value = false
    }
  }

  function getPresetConfig(presetId: string): ChartPresetConfig | null {
    const preset = presets.value.find((p) => p.id === presetId)
    return preset?.config || null
  }

  return {
    presets,
    systemPresets,
    userPresets,
    loading,
    error,
    fetchPresets,
    createPresetFromCurrentSettings,
    deletePreset,
    getPresetConfig,
  }
}
