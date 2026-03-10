/**
 * Composable for reactive place boundary polygon fetching.
 * Same pattern as usePeakLayer / useRiverTiles.
 */

import { ref, watch, type Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generatePlaceBoundaryLayer, type PlaceBoundaryConfig } from '../utils/chartGenerators/routeMap/placeBoundaries'

export function usePlaceBoundaries(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<PlaceBoundaryConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const placeBoundarySvg = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0

  watch(
    [routeBounds, projectionParams, config, viewWidth, viewHeight],
    async ([bounds, params, cfg, w, h]) => {
      if (!bounds || !params || !cfg) {
        placeBoundarySvg.value = ''
        return
      }

      const thisGeneration = ++generation
      isLoading.value = true
      error.value = null

      try {
        const svg = await generatePlaceBoundaryLayer(bounds, params, cfg, w, h)
        if (thisGeneration === generation) {
          placeBoundarySvg.value = svg
        }
      } catch (e) {
        if (thisGeneration === generation) {
          error.value = e instanceof Error ? e.message : 'Place boundary fetch failed'
          placeBoundarySvg.value = ''
          console.warn('Place boundary generation failed:', e)
        }
      } finally {
        if (thisGeneration === generation) {
          isLoading.value = false
        }
      }
    },
    { immediate: true, deep: true },
  )

  return { placeBoundarySvg, isLoading, error }
}
