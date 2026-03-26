/**
 * Generic composable for reactive geo layer generation.
 *
 * Watches route bounds, projection params, config, and viewport dimensions.
 * Calls the provided async generator and exposes the resulting SVG string
 * along with loading and error state.
 *
 * A generation counter discards stale results when inputs change rapidly
 * (e.g. user panning the config while an Overpass request is in-flight).
 *
 * Usage:
 *   const { layerSvg, isLoading, error } = useGeoLayer(
 *     generateForestLayer,
 *     routeBounds, projectionParams, config, viewWidth, viewHeight,
 *   )
 *
 * For generators that need extra reactive deps (e.g. routePoints for peaks),
 * wrap the generator in a closure and list the extra ref in `extraDeps`:
 *   const generate = (...args) => generatePeakLayer(...args, routePoints.value)
 *   useGeoLayer(generate, ..., [routePoints])
 */

import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'

type GeoGenerator<TConfig> = (
  bounds: RouteBounds,
  params: ProjectionParams,
  config: TConfig,
  width: number,
  height: number,
) => Promise<string>

export function useGeoLayer<TConfig>(
  generate: GeoGenerator<TConfig>,
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<TConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
  extraDeps: Ref<unknown>[] = [],
) {
  const layerSvg = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let generation = 0
  let lastKey = ''
  let lastExtraRefs: unknown[] = []

  watch(
    [routeBounds, projectionParams, config, viewWidth, viewHeight, ...extraDeps],
    async ([bounds, params, cfg, w, h, ...extra]) => {
      if (!bounds || !params || !cfg) {
        layerSvg.value = ''
        lastKey = ''
        return
      }

      // Only start a new fetch when the actual values changed, not just object references.
      // This prevents spurious watcher fires (from new object refs with identical data)
      // from incrementing the generation counter and discarding valid in-flight fetches.
      const key = JSON.stringify([bounds, params, cfg, w, h])
      const extraChanged = extra.some((val, i) => val !== lastExtraRefs[i])
      if (key === lastKey && !extraChanged) return
      lastKey = key
      lastExtraRefs = extra as unknown[]

      const thisGen = ++generation

      isLoading.value = true
      error.value = null

      try {
        const svg = await generate(
          bounds as RouteBounds,
          params as ProjectionParams,
          cfg as TConfig,
          viewWidth.value,
          viewHeight.value,
        )
        if (thisGen === generation) {
          layerSvg.value = svg
        }
      } catch (e) {
        if (thisGen === generation) {
          error.value = e instanceof Error ? e.message : 'Geo layer generation failed'
          layerSvg.value = ''
          console.warn('Geo layer generation failed:', e)
        }
      } finally {
        if (thisGen === generation) {
          isLoading.value = false
        }
      }
    },
    { immediate: true, deep: true },
  )

  return { layerSvg, isLoading, error }
}
