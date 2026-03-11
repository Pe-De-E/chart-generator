/**
 * Composable for reactive contour line generation.
 *
 * Bridges the async terrain tile fetching + contour generation with
 * Vue reactivity. Watches route bounds, projection params, and contour
 * config — generates SVG when any change. Uses a generation counter
 * to discard stale results from superseded requests.
 */

import { ref, watch, type Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateContourLines, type ContourConfig } from '../utils/chartGenerators/routeMap/contourLines'

export function useContourLines(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<ContourConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const contourSvg = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0

  watch(
    [routeBounds, projectionParams, config, viewWidth, viewHeight],
    async ([bounds, params, cfg, w, h]) => {
      const thisGeneration = ++generation

      if (!bounds || !params || !cfg) {
        contourSvg.value = ''
        return
      }
      isLoading.value = true
      error.value = null

      try {
        const svg = await generateContourLines(bounds, params, cfg, w, h)
        if (thisGeneration === generation) {
          contourSvg.value = svg
        }
      } catch (e) {
        if (thisGeneration === generation) {
          error.value = e instanceof Error ? e.message : 'Contour generation failed'
          contourSvg.value = ''
          console.warn('Contour line generation failed:', e)
        }
      } finally {
        if (thisGeneration === generation) {
          isLoading.value = false
        }
      }
    },
    { immediate: true, deep: true },
  )

  return { contourSvg, isLoading, error }
}
