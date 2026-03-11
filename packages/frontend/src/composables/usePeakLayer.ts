/**
 * Composable for reactive mountain peak fetching.
 *
 * Same pattern as useRiverTiles / useContourLines — watches route bounds,
 * projection params and peak config, fetches from Overpass API when any change.
 */

import { ref, watch, type Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generatePeakLayer, type PeakConfig } from '../utils/chartGenerators/routeMap/peakLayer'

export function usePeakLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<PeakConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
  routePoints?: Ref<ReadonlyArray<{ lat: number; lon: number }>>,
) {
  const peakSvg = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0

  watch(
    [routeBounds, projectionParams, config, viewWidth, viewHeight],
    async ([bounds, params, cfg, w, h]) => {
      const thisGeneration = ++generation

      if (!bounds || !params || !cfg) {
        peakSvg.value = ''
        return
      }
      isLoading.value = true
      error.value = null

      try {
        const svg = await generatePeakLayer(bounds, params, cfg, w, h, routePoints?.value)
        if (thisGeneration === generation) {
          peakSvg.value = svg
        }
      } catch (e) {
        if (thisGeneration === generation) {
          error.value = e instanceof Error ? e.message : 'Peak fetch failed'
          peakSvg.value = ''
          console.warn('Peak layer generation failed:', e)
        }
      } finally {
        if (thisGeneration === generation) {
          isLoading.value = false
        }
      }
    },
    { immediate: true, deep: true },
  )

  return { peakSvg, isLoading, error }
}
