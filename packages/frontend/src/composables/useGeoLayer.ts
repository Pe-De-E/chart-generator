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
 *
 * For layers controlled by a boolean toggle (e.g. showForests), pass an
 * `enabled` ref as the last argument instead of encoding enabled/disabled
 * into the config type (via | null).  When enabled becomes false the SVG is
 * cleared and no fetch is issued; when it becomes true the fetch runs:
 *   useGeoLayer(generate, ..., [], enabled)
 */

import { ref, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'

/** Delay before automatically retrying a failed geo-layer fetch (ms).
 *  Must be clearly longer than a normal Overpass fetch (2–8 s) so the retry
 *  doesn't fire while the original request is still being processed server-side. */
const AUTO_RETRY_MS = 10_000

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
  enabled?: Ref<boolean>,
) {
  const layerSvg = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Internal retry signal: incrementing it re-fires the watcher after a failed fetch.
  // This avoids requiring the user to manually toggle the layer off/on to retry.
  const _retrySignal = ref(0)
  let _retryTimer: ReturnType<typeof setTimeout> | null = null

  onUnmounted(() => {
    if (_retryTimer) clearTimeout(_retryTimer)
  })

  let generation = 0
  let lastKey = ''
  let lastExtraRefs: unknown[] = []

  // Combine extraDeps and enabled into one variadic source array so a single
  // watcher fires for all dependencies.  enabled (if present) sits at the end
  // of `extra` in the destructure, but we read it directly via enabled?.value
  // so we don't need to index into the array.
  const allDeps = enabled ? [...extraDeps, enabled as Ref<unknown>] : extraDeps

  watch(
    [routeBounds, projectionParams, config, viewWidth, viewHeight, _retrySignal, ...allDeps],
    async ([bounds, params, cfg, w, h, , ...extra]) => {
      // Cancel any pending auto-retry — a real watcher trigger just fired.
      if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null }

      if (!bounds || !params || !cfg || enabled?.value === false) {
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
          // Reset lastKey so the next watcher fire retries the fetch.
          // Without this, a failed request (e.g. 504 from Overpass) permanently
          // blocks the layer — the key matches so the guard short-circuits forever.
          lastKey = ''
          // Auto-retry: use a longer backoff for 429 (rate-limit) so we don't extend
          // the rate-limit window by hammering the API every 10 s.
          const is429 = error.value?.includes('429') ?? false
          _retryTimer = setTimeout(() => { _retrySignal.value++ }, is429 ? 60_000 : AUTO_RETRY_MS)
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
