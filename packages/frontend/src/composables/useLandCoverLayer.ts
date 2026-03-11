/**
 * Composable for reactive land cover layer (glaciers + urban areas).
 * Same pattern as useWaterLayer / useForestLayer.
 *
 * Note: raw Overpass elements are cached in landCoverLayer.ts so toggling
 * one type (e.g. turning on urban after glaciers loaded) does NOT fire
 * a new network request.
 */

import { ref, watch, type Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateLandCoverLayer, type LandCoverConfig } from '../utils/chartGenerators/routeMap/landCoverLayer'

export function useLandCoverLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<LandCoverConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const landCoverSvg = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0

  watch(
    [routeBounds, projectionParams, config, viewWidth, viewHeight],
    async ([bounds, params, cfg, w, h]) => {
      if (!bounds || !params || !cfg) {
        landCoverSvg.value = ''
        return
      }

      const thisGeneration = ++generation
      isLoading.value = true
      error.value = null

      try {
        const svg = await generateLandCoverLayer(bounds, params, cfg, w, h)
        if (thisGeneration === generation) {
          landCoverSvg.value = svg
        }
      } catch (e) {
        if (thisGeneration === generation) {
          error.value = e instanceof Error ? e.message : 'Land cover fetch failed'
          landCoverSvg.value = ''
          console.warn('Land cover layer generation failed:', e)
        }
      } finally {
        if (thisGeneration === generation) {
          isLoading.value = false
        }
      }
    },
    { immediate: true, deep: true },
  )

  return { landCoverSvg, isLoading, error }
}
