/**
 * Tests for useGeoLayer composable.
 *
 * Key behaviours verified:
 *  1. Generator is NOT called while any required dep is null
 *  2. Generator is called once all deps are non-null
 *  3. isLoading transitions correctly around the async fetch
 *  4. Error from generator sets error ref and clears layerSvg
 *  5. Spurious object-reference changes (same JSON values) do NOT
 *     trigger a new fetch — regression for the race where Pattern-B
 *     config computeds re-create plain objects on every animationConfig
 *     change, causing the generation counter to increment and discard
 *     valid in-flight fetches.
 *  6. A genuine value change DOES trigger a new fetch
 *  7. Rapid changes keep only the latest result (stale-fetch guard)
 *  8. extraDeps reference change triggers a new fetch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useGeoLayer } from './useGeoLayer'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'

// ── Minimal fixtures ───────────────────────────────────────────────────────────

const BOUNDS: RouteBounds = {
  minLat: 47.0, maxLat: 47.5,
  minLon: 8.0,  maxLon: 8.5,
  centerLat: 47.25, centerLon: 8.25,
}

const PARAMS: ProjectionParams = {
  cosLat: 0.68, scale: 100,
  offsetX: 0, offsetY: 0,
  minLon: 8.0, maxLat: 47.5,
}

type SimpleConfig = { opacity: number; color: string }
const CFG: SimpleConfig = { opacity: 0.6, color: '#00ff00' }

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeLayer(
  generator: ReturnType<typeof vi.fn>,
  initialCfg: SimpleConfig | null = CFG,
) {
  const routeBounds       = ref<RouteBounds | null>(null)
  const projectionParams  = ref<ProjectionParams | null>(null)
  const config            = ref<SimpleConfig | null>(initialCfg)
  const viewWidth         = ref(1080)
  const viewHeight        = ref(1152)

  const { layerSvg, isLoading, error } = useGeoLayer<SimpleConfig>(
    generator,
    routeBounds,
    projectionParams,
    config,
    viewWidth,
    viewHeight,
  )

  return { routeBounds, projectionParams, config, viewWidth, viewHeight, layerSvg, isLoading, error }
}

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('useGeoLayer', () => {
  let generate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    generate = vi.fn().mockResolvedValue('<svg>result</svg>')
  })

  // ── 1. Null deps → no fetch ──────────────────────────────────────────────────

  it('does not call generator when routeBounds is null', async () => {
    const { projectionParams, config } = makeLayer(generate)
    projectionParams.value = PARAMS
    config.value = CFG
    await flushPromises()
    expect(generate).not.toHaveBeenCalled()
  })

  it('does not call generator when projectionParams is null', async () => {
    const { routeBounds, config } = makeLayer(generate)
    routeBounds.value = BOUNDS
    config.value = CFG
    await flushPromises()
    expect(generate).not.toHaveBeenCalled()
  })

  it('does not call generator when config is null', async () => {
    const { routeBounds, projectionParams } = makeLayer(generate, null)
    routeBounds.value = BOUNDS
    projectionParams.value = PARAMS
    await flushPromises()
    expect(generate).not.toHaveBeenCalled()
  })

  it('clears layerSvg when config becomes null after a successful fetch', async () => {
    const { routeBounds, projectionParams, config, layerSvg } = makeLayer(generate)
    routeBounds.value = BOUNDS
    projectionParams.value = PARAMS
    await flushPromises()
    expect(layerSvg.value).toBe('<svg>result</svg>')

    config.value = null
    await nextTick()
    expect(layerSvg.value).toBe('')
  })

  // ── 2. All deps set → fetch fires ────────────────────────────────────────────

  it('calls generator once all deps are non-null', async () => {
    const { routeBounds, projectionParams, layerSvg } = makeLayer(generate)
    routeBounds.value = BOUNDS
    projectionParams.value = PARAMS
    await flushPromises()
    expect(generate).toHaveBeenCalledTimes(1)
    expect(layerSvg.value).toBe('<svg>result</svg>')
  })

  // ── 3. isLoading state ───────────────────────────────────────────────────────

  it('sets isLoading to true during fetch and false after', async () => {
    let resolveGen!: (v: string) => void
    generate = vi.fn(() => new Promise<string>(r => { resolveGen = r }))

    const { routeBounds, projectionParams, isLoading } = makeLayer(generate)
    routeBounds.value = BOUNDS
    projectionParams.value = PARAMS
    await nextTick()

    expect(isLoading.value).toBe(true)

    resolveGen('<svg>done</svg>')
    await flushPromises()

    expect(isLoading.value).toBe(false)
  })

  // ── 4. Error handling ────────────────────────────────────────────────────────

  it('sets error and clears layerSvg when generator throws', async () => {
    generate = vi.fn().mockRejectedValue(new Error('API timeout'))
    const { routeBounds, projectionParams, layerSvg, isLoading, error } = makeLayer(generate)
    routeBounds.value = BOUNDS
    projectionParams.value = PARAMS
    await flushPromises()

    expect(error.value).toBe('API timeout')
    expect(layerSvg.value).toBe('')
    expect(isLoading.value).toBe(false)
  })

  // ── 5. Spurious reference change does NOT trigger a new fetch ────────────────
  //
  // Regression: Pattern-B config computeds (forest, water, road …) return a new
  // plain-object reference every time animationConfig changes — even when the
  // actual values are identical.  Before the fix, each spurious fire incremented
  // `generation`, causing in-flight fetches to be discarded and layers to
  // appear stuck (needing multiple toggle cycles to finally show).

  it('does not re-fetch when config reference changes but values are identical', async () => {
    const { routeBounds, projectionParams, config, layerSvg } = makeLayer(generate)
    routeBounds.value = BOUNDS
    projectionParams.value = PARAMS
    await flushPromises()

    expect(generate).toHaveBeenCalledTimes(1)
    expect(layerSvg.value).toBe('<svg>result</svg>')

    // Replace with a NEW object that has the SAME values
    config.value = { ...CFG }
    await flushPromises()

    expect(generate).toHaveBeenCalledTimes(1) // still only 1 — no spurious re-fetch
    expect(layerSvg.value).toBe('<svg>result</svg>')
  })

  it('does not increment generation counter on spurious reference changes', async () => {
    let resolveFirst!: (v: string) => void
    let callCount = 0
    generate = vi.fn(() => {
      callCount++
      if (callCount === 1) return new Promise<string>(r => { resolveFirst = r })
      return Promise.resolve('<svg>second</svg>')
    })

    const { routeBounds, projectionParams, config, layerSvg } = makeLayer(generate)
    routeBounds.value = BOUNDS
    projectionParams.value = PARAMS
    await nextTick() // watcher fires, fetch #1 in-flight

    // Spurious reference changes while fetch #1 is still in-flight
    config.value = { ...CFG }
    config.value = { ...CFG }
    config.value = { ...CFG }
    await nextTick()

    // Now resolve fetch #1 — should NOT be discarded
    resolveFirst('<svg>first</svg>')
    await flushPromises()

    expect(generate).toHaveBeenCalledTimes(1) // only the original fetch
    expect(layerSvg.value).toBe('<svg>first</svg>') // result kept, not discarded
  })

  // ── 6. Real value change triggers a new fetch ────────────────────────────────

  it('re-fetches when config values actually change', async () => {
    generate = vi.fn()
      .mockResolvedValueOnce('<svg>v1</svg>')
      .mockResolvedValueOnce('<svg>v2</svg>')

    const { routeBounds, projectionParams, config, layerSvg } = makeLayer(generate)
    routeBounds.value = BOUNDS
    projectionParams.value = PARAMS
    await flushPromises()

    expect(layerSvg.value).toBe('<svg>v1</svg>')

    config.value = { opacity: 0.9, color: '#ff0000' } // genuinely different
    await flushPromises()

    expect(generate).toHaveBeenCalledTimes(2)
    expect(layerSvg.value).toBe('<svg>v2</svg>')
  })

  it('re-fetches when routeBounds changes', async () => {
    generate = vi.fn()
      .mockResolvedValueOnce('<svg>b1</svg>')
      .mockResolvedValueOnce('<svg>b2</svg>')

    const { routeBounds, projectionParams, layerSvg } = makeLayer(generate)
    routeBounds.value = BOUNDS
    projectionParams.value = PARAMS
    await flushPromises()
    expect(layerSvg.value).toBe('<svg>b1</svg>')

    routeBounds.value = { ...BOUNDS, minLat: 46.0, maxLat: 46.5, centerLat: 46.25 }
    await flushPromises()

    expect(generate).toHaveBeenCalledTimes(2)
    expect(layerSvg.value).toBe('<svg>b2</svg>')
  })

  // ── 7. Stale-fetch guard (rapid real changes) ────────────────────────────────

  it('discards result from a superseded fetch and keeps the latest', async () => {
    let resolveFirst!: (v: string) => void
    generate = vi.fn()
      .mockImplementationOnce(() => new Promise<string>(r => { resolveFirst = r }))
      .mockResolvedValueOnce('<svg>latest</svg>')

    const { routeBounds, projectionParams, config, layerSvg } = makeLayer(generate)
    routeBounds.value = BOUNDS
    projectionParams.value = PARAMS
    await nextTick() // fetch #1 in-flight

    // Real change triggers fetch #2
    config.value = { opacity: 0.1, color: '#aaaaaa' }
    await flushPromises() // fetch #2 completes

    // Now resolve the stale fetch #1
    resolveFirst('<svg>stale</svg>')
    await flushPromises()

    expect(layerSvg.value).toBe('<svg>latest</svg>') // stale result ignored
  })

  // ── 8. extraDeps reference change triggers a new fetch ───────────────────────

  it('re-fetches when an extraDep reference changes', async () => {
    generate = vi.fn()
      .mockResolvedValueOnce('<svg>e1</svg>')
      .mockResolvedValueOnce('<svg>e2</svg>')

    const extraDep = ref<number[]>([1, 2, 3])
    const routeBounds      = ref<RouteBounds | null>(BOUNDS)
    const projectionParams = ref<ProjectionParams | null>(PARAMS)
    const config           = ref<SimpleConfig | null>(CFG)
    const viewWidth        = ref(1080)
    const viewHeight       = ref(1152)

    const { layerSvg } = useGeoLayer<SimpleConfig>(
      generate, routeBounds, projectionParams, config, viewWidth, viewHeight,
      [extraDep],
    )

    await flushPromises()
    expect(layerSvg.value).toBe('<svg>e1</svg>')

    extraDep.value = [4, 5, 6] // new reference with different content
    await flushPromises()

    expect(generate).toHaveBeenCalledTimes(2)
    expect(layerSvg.value).toBe('<svg>e2</svg>')
  })
})
