/**
 * Tests for useRouteMapConfig composable.
 *
 * Route-map-specific fields only — the shared elevation fields are
 * already covered in useElevationConfig.test.ts.
 */

import { describe, it, expect, vi } from 'vitest'
import { useRouteMapConfig } from './useRouteMapConfig'
import type { RouteMapAnimationConfig } from '../types/routeMapConfig'
import { DEFAULT_ROUTEMAP_ANIMATION_CONFIG } from '../types/routeMapConfig'

// ── Test harness ──────────────────────────────────────────────────────────────

function makeHarness(overrides: Partial<RouteMapAnimationConfig> = {}) {
  let cfg: RouteMapAnimationConfig = { ...DEFAULT_ROUTEMAP_ANIMATION_CONFIG, ...overrides }
  const updateConfig = vi.fn((partial: Partial<RouteMapAnimationConfig>) => {
    cfg = { ...cfg, ...partial }
  })
  const getConfig = () => cfg
  const composable = useRouteMapConfig(getConfig, updateConfig)
  return { composable, updateConfig, getCfg: () => cfg }
}

// ── Intro / Outro ─────────────────────────────────────────────────────────────

describe('useRouteMapConfig — intro/outro', () => {
  it('introDurationSec defaults to 1', () => {
    const { composable } = makeHarness()
    expect(composable.introDurationSec.value).toBe(1)
  })

  it('outroDurationSec defaults to 1.5', () => {
    const { composable } = makeHarness()
    expect(composable.outroDurationSec.value).toBe(1.5)
  })

  it('introDurationSec setter calls updateConfig', () => {
    const { composable, updateConfig } = makeHarness()
    composable.introDurationSec.value = 3
    expect(updateConfig).toHaveBeenCalledWith({ introDurationSec: 3 })
  })

  it('showOutroStats defaults to false', () => {
    const { composable } = makeHarness()
    expect(composable.showOutroStats.value).toBe(false)
  })

  it('swapIntroOutro defaults to false', () => {
    const { composable } = makeHarness()
    expect(composable.swapIntroOutro.value).toBe(false)
  })
})

// ── Map camera ────────────────────────────────────────────────────────────────

describe('useRouteMapConfig — map camera', () => {
  it('mapCameraMode defaults to "overview"', () => {
    const { composable } = makeHarness()
    expect(composable.mapCameraMode.value).toBe('overview')
  })

  it('mapCameraMode setter calls updateConfig', () => {
    const { composable, updateConfig } = makeHarness()
    composable.mapCameraMode.value = 'chase'
    expect(updateConfig).toHaveBeenCalledWith({ mapCameraMode: 'chase' })
  })

  it('mapChaseZoomLevel defaults to 3', () => {
    const { composable } = makeHarness()
    expect(composable.mapChaseZoomLevel.value).toBe(3)
  })

  it('mapChaseZoomOutStart defaults to 0.85', () => {
    const { composable } = makeHarness()
    expect(composable.mapChaseZoomOutStart.value).toBe(0.85)
  })

  it('mapChaseRotateWithRoute defaults to false', () => {
    const { composable } = makeHarness()
    expect(composable.mapChaseRotateWithRoute.value).toBe(false)
  })
})

// ── Route styling ─────────────────────────────────────────────────────────────

describe('useRouteMapConfig — route styling', () => {
  it('routeColor defaults to #ffffff', () => {
    const { composable } = makeHarness()
    expect(composable.routeColor.value).toBe('#ffffff')
  })

  it('routeWidth defaults to 4', () => {
    const { composable } = makeHarness()
    expect(composable.routeWidth.value).toBe(4)
  })

  it('routeGlow defaults to true', () => {
    const { composable } = makeHarness()
    expect(composable.routeGlow.value).toBe(true)
  })

  it('routeTrailOpacity defaults to 0.2', () => {
    const { composable } = makeHarness()
    expect(composable.routeTrailOpacity.value).toBe(0.2)
  })

  it('routeHalo defaults to false', () => {
    const { composable } = makeHarness()
    expect(composable.routeHalo.value).toBe(false)
  })

  it('routeColor setter calls updateConfig', () => {
    const { composable, updateConfig } = makeHarness()
    composable.routeColor.value = '#ff6600'
    expect(updateConfig).toHaveBeenCalledWith({ routeColor: '#ff6600' })
  })
})

// ── Map marker ────────────────────────────────────────────────────────────────

describe('useRouteMapConfig — map marker', () => {
  it('showMapMarker defaults to true', () => {
    const { composable } = makeHarness()
    expect(composable.showMapMarker.value).toBe(true)
  })

  it('mapMarkerSize defaults to 8', () => {
    const { composable } = makeHarness()
    expect(composable.mapMarkerSize.value).toBe(8)
  })

  it('showMarkerPulse defaults to false', () => {
    const { composable } = makeHarness()
    expect(composable.showMarkerPulse.value).toBe(false)
  })
})

// ── Layout ────────────────────────────────────────────────────────────────────

describe('useRouteMapConfig — layout', () => {
  it('showElevationChart defaults to true', () => {
    const { composable } = makeHarness()
    expect(composable.showElevationChart.value).toBe(true)
  })

  it('mapHeightRatio defaults to 0.6', () => {
    const { composable } = makeHarness()
    expect(composable.mapHeightRatio.value).toBe(0.6)
  })

  it('showDivider defaults to false', () => {
    const { composable } = makeHarness()
    expect(composable.showDivider.value).toBe(false)
  })

  it('mapHeightRatio setter calls updateConfig', () => {
    const { composable, updateConfig } = makeHarness()
    composable.mapHeightRatio.value = 0.75
    expect(updateConfig).toHaveBeenCalledWith({ mapHeightRatio: 0.75 })
  })
})

// ── Geo layers ────────────────────────────────────────────────────────────────

describe('useRouteMapConfig — geo layers', () => {
  it('showBorders defaults to false', () => {
    const { composable } = makeHarness()
    expect(composable.showBorders.value).toBe(false)
  })

  it('showPeaks defaults to false', () => {
    const { composable } = makeHarness()
    expect(composable.showPeaks.value).toBe(false)
  })

  it('showForests defaults to false', () => {
    const { composable } = makeHarness()
    expect(composable.showForests.value).toBe(false)
  })

  it('showPeaks setter calls updateConfig', () => {
    const { composable, updateConfig } = makeHarness()
    composable.showPeaks.value = true
    expect(updateConfig).toHaveBeenCalledWith({ showPeaks: true })
  })

  it('peakOpacity defaults to 0.85', () => {
    const { composable } = makeHarness()
    expect(composable.peakOpacity.value).toBeGreaterThan(0)
  })

  it('forestOpacity defaults to 0.6', () => {
    const { composable } = makeHarness()
    expect(composable.forestOpacity.value).toBe(0.60)
  })
})

// ── Annotation positions ──────────────────────────────────────────────────────

describe('useRouteMapConfig — annotation positions', () => {
  it('annotationPositions defaults to empty object', () => {
    const { composable } = makeHarness()
    expect(composable.annotationPositions.value).toEqual({})
  })

  it('setAnnotationPosition stores position keyed by id', () => {
    const { composable, getCfg } = makeHarness()
    composable.setAnnotationPosition('ann_1', { x: 100, y: 200 })
    expect(getCfg().annotationPositions!['ann_1']).toEqual({ x: 100, y: 200 })
  })

  it('setAnnotationPosition merges with existing positions', () => {
    const { composable, getCfg } = makeHarness({
      annotationPositions: { ann_1: { x: 50, y: 50 } },
    })
    composable.setAnnotationPosition('ann_2', { x: 300, y: 400 })
    expect(getCfg().annotationPositions!['ann_1']).toEqual({ x: 50, y: 50 })
    expect(getCfg().annotationPositions!['ann_2']).toEqual({ x: 300, y: 400 })
  })
})

// ── Km label offsets ──────────────────────────────────────────────────────────

describe('useRouteMapConfig — km label offsets', () => {
  it('kmLabelOffsets defaults to empty object', () => {
    const { composable } = makeHarness()
    expect(composable.kmLabelOffsets.value).toEqual({})
  })

  it('setKmLabelOffset stores offset keyed by km value', () => {
    const { composable, getCfg } = makeHarness()
    composable.setKmLabelOffset(5, { dx: 10, dy: -20 })
    expect(getCfg().kmLabelOffsets![5]).toEqual({ dx: 10, dy: -20 })
  })

  it('setKmLabelOffset merges with existing offsets', () => {
    const { composable, getCfg } = makeHarness({
      kmLabelOffsets: { 5: { dx: 10, dy: 0 } },
    })
    composable.setKmLabelOffset(10, { dx: -5, dy: 15 })
    expect(getCfg().kmLabelOffsets![5]).toEqual({ dx: 10, dy: 0 })
    expect(getCfg().kmLabelOffsets![10]).toEqual({ dx: -5, dy: 15 })
  })
})
