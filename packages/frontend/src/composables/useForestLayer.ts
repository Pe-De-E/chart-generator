/**
 * Composable for reactive forest polygon fetching.
 * Same pattern as usePlaceBoundaries / useRiverTiles / usePeakLayer.
 */

import { ref, watch, type Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateForestLayer, type ForestConfig } from '../utils/chartGenerators/routeMap/forestLayer'

export function useForestLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<ForestConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const forestSvg = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0

  watch(
    [routeBounds, projectionParams, config, viewWidth, viewHeight],
    async ([bounds, params, cfg, w, h]) => {
      if (!bounds || !params || !cfg) {
        forestSvg.value = ''
        return
      }

      const thisGeneration = ++generation
      isLoading.value = true
      error.value = null

      try {
        const svg = await generateForestLayer(bounds, params, cfg, w, h)
        if (thisGeneration === generation) {
          forestSvg.value = svg
        }
      } catch (e) {
        if (thisGeneration === generation) {
          error.value = e instanceof Error ? e.message : 'Forest fetch failed'
          forestSvg.value = ''
          console.warn('Forest layer generation failed:', e)
        }
      } finally {
        if (thisGeneration === generation) {
          isLoading.value = false
        }
      }
    },
    { immediate: true, deep: true },
  )

  return { forestSvg, isLoading, error }
}
