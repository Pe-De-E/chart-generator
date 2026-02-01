import { ref, computed } from 'vue'
import { elevationThemeService } from '../services/elevationTheme.service'
import type {
  ElevationTheme,
  SavedElevationTheme,
  SystemElevationTheme,
  ElevationThemeTokens,
} from '@chart-generator/shared'

export function useElevationThemes() {
  const themes = ref<ElevationTheme[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Separate system and user themes for UI grouping
  const systemThemes = computed(() =>
    themes.value.filter((t): t is SystemElevationTheme => 'isSystem' in t && t.isSystem === true)
  )

  const userThemes = computed(() =>
    themes.value.filter((t): t is SavedElevationTheme => !('isSystem' in t) || !t.isSystem)
  )

  async function fetchThemes() {
    loading.value = true
    error.value = null
    try {
      themes.value = await elevationThemeService.getAllThemes()
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message || 'Fehler beim Laden der Themes'
    } finally {
      loading.value = false
    }
  }

  async function createThemeFromCurrentSettings(
    name: string,
    description: string,
    preview: string,
    tokens: ElevationThemeTokens
  ): Promise<SavedElevationTheme | null> {
    loading.value = true
    error.value = null
    try {
      const theme = await elevationThemeService.createTheme({
        name,
        description,
        preview,
        tokens,
      })
      themes.value = [...themes.value, theme]
      return theme
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message || 'Fehler beim Speichern des Themes'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteTheme(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      await elevationThemeService.deleteTheme(id)
      themes.value = themes.value.filter((t) => t.id !== id)
      return true
    } catch (e: unknown) {
      const err = e as Error
      error.value = err.message || 'Fehler beim Loeschen des Themes'
      return false
    } finally {
      loading.value = false
    }
  }

  function getThemeById(themeId: string): ElevationTheme | undefined {
    return themes.value.find((t) => t.id === themeId)
  }

  function getDefaultTheme(): ElevationTheme | undefined {
    // Return the first system theme as default (usually 'dark')
    return systemThemes.value[0]
  }

  return {
    themes,
    systemThemes,
    userThemes,
    loading,
    error,
    fetchThemes,
    createThemeFromCurrentSettings,
    deleteTheme,
    getThemeById,
    getDefaultTheme,
  }
}
