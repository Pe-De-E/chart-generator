/**
 * Composable for reactive river vector tile fetching.
 *
 * Bridges the async OpenFreeMap vector tile fetching + river rendering
 * with Vue reactivity. Watches route bounds, projection params, and river
 * config — generates SVG when any change. Uses a generation counter
 * to discard stale results from superseded requests.
 */

import { ref, watch, type Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateRiverLayer, type RiverConfig } from '../utils/chartGenerators/routeMap/riverTiles'

export function useRiverTiles(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<RiverConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const riverSvg = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0

  watch(
    [routeBounds, projectionParams, config, viewWidth, viewHeight],
    async ([bounds, params, cfg, w, h]) => {
      const thisGeneration = ++generation

      if (!bounds || !params || !cfg) {
        riverSvg.value = ''
        return
      }
      isLoading.value = true
      error.value = null

      try {
        const svg = await generateRiverLayer(bounds, params, cfg, w, h)
        if (thisGeneration === generation) {
          riverSvg.value = svg
        }
      } catch (e) {
        if (thisGeneration === generation) {
          error.value = e instanceof Error ? e.message : 'River tile fetch failed'
          riverSvg.value = ''
          console.warn('River tile generation failed:', e)
        }
      } finally {
        if (thisGeneration === generation) {
          isLoading.value = false
        }
      }
    },
    { immediate: true, deep: true },
  )

  return { riverSvg, isLoading, error }
}
