/**
 * Composable for reactive water body polygon fetching.
 * Same pattern as useForestLayer / usePlaceBoundaries / useRiverTiles.
 */

import { ref, watch, type Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateWaterLayer, type WaterConfig } from '../utils/chartGenerators/routeMap/waterLayer'

export function useWaterLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<WaterConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const waterSvg = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0

  watch(
    [routeBounds, projectionParams, config, viewWidth, viewHeight],
    async ([bounds, params, cfg, w, h]) => {
      const thisGeneration = ++generation

      if (!bounds || !params || !cfg) {
        waterSvg.value = ''
        return
      }
      isLoading.value = true
      error.value = null

      try {
        const svg = await generateWaterLayer(bounds, params, cfg, w, h)
        if (thisGeneration === generation) {
          waterSvg.value = svg
        }
      } catch (e) {
        if (thisGeneration === generation) {
          error.value = e instanceof Error ? e.message : 'Water fetch failed'
          waterSvg.value = ''
          console.warn('Water layer generation failed:', e)
        }
      } finally {
        if (thisGeneration === generation) {
          isLoading.value = false
        }
      }
    },
    { immediate: true, deep: true },
  )

  return { waterSvg, isLoading, error }
}
