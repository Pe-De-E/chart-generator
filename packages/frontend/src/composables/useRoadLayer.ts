/**
 * Composable for reactive road layer generation.
 *
 * Bridges the async Overpass API fetch + road rendering with Vue reactivity.
 * Watches route bounds, projection params, and road config — generates SVG
 * when any change. Uses a generation counter to discard stale results from
 * superseded requests.
 */

import { ref, watch, type Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateRoadLayer, type RoadConfig } from '../utils/chartGenerators/routeMap/roadLayer'

export function useRoadLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<RoadConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const roadSvg = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0

  watch(
    [routeBounds, projectionParams, config, viewWidth, viewHeight],
    async ([bounds, params, cfg, w, h]) => {
      const thisGeneration = ++generation

      if (!bounds || !params || !cfg) {
        roadSvg.value = ''
        return
      }
      isLoading.value = true
      error.value = null

      try {
        const svg = await generateRoadLayer(bounds, params, cfg, w, h)
        if (thisGeneration === generation) {
          roadSvg.value = svg
        }
      } catch (e) {
        if (thisGeneration === generation) {
          error.value = e instanceof Error ? e.message : 'Road layer fetch failed'
          roadSvg.value = ''
          console.warn('Road layer generation failed:', e)
        }
      } finally {
        if (thisGeneration === generation) {
          isLoading.value = false
        }
      }
    },
    { immediate: true, deep: true },
  )

  return { roadSvg, isLoading, error }
}
