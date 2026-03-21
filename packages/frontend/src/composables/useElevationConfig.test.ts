/**
 * Tests for useElevationConfig composable.
 *
 * The composable exposes computed getter/setter pairs — we verify that:
 *  1. getters return the correct default values
 *  2. setters call updateConfig with the right partial
 *  3. annotation helpers (toggle, update, delete, add) work correctly
 */

import { describe, it, expect, vi } from 'vitest'
import { useElevationConfig } from './useElevationConfig'
import type { ElevationAnimationConfig } from '../components/chartWorkflow/ElevationChartStep.vue'
import { DEFAULT_ELEVATION_ANIMATION_CONFIG } from '../components/chartWorkflow/ElevationChartStep.vue'

// ── Test harness ──────────────────────────────────────────────────────────────

function makeHarness(overrides: Partial<ElevationAnimationConfig> = {}) {
  let cfg: ElevationAnimationConfig = { ...DEFAULT_ELEVATION_ANIMATION_CONFIG, ...overrides }
  const updateConfig = vi.fn((partial: Partial<ElevationAnimationConfig>) => {
    cfg = { ...cfg, ...partial }
  })
  const getConfig = () => cfg
  const composable = useElevationConfig(getConfig, updateConfig)
  return { composable, updateConfig, getCfg: () => cfg }
}

// ── Animation fields ──────────────────────────────────────────────────────────

describe('useElevationConfig — animation', () => {
  it('animationDuration getter returns default', () => {
    const { composable } = makeHarness()
    expect(composable.animationDuration.value).toBe(DEFAULT_ELEVATION_ANIMATION_CONFIG.duration)
  })

  it('animationDuration setter calls updateConfig', () => {
    const { composable, updateConfig } = makeHarness()
    composable.animationDuration.value = 10
    expect(updateConfig).toHaveBeenCalledWith({ duration: 10 })
  })

  it('animationEasing getter returns default', () => {
    const { composable } = makeHarness()
    expect(composable.animationEasing.value).toBe('ease-in-out')
  })

  it('animationEasing setter calls updateConfig', () => {
    const { composable, updateConfig } = makeHarness()
    composable.animationEasing.value = 'linear'
    expect(updateConfig).toHaveBeenCalledWith({ easing: 'linear' })
  })

  it('animationMode defaults to "uniform"', () => {
    const { composable } = makeHarness()
    expect(composable.animationMode.value).toBe('uniform')
  })

  it('animationMode setter calls updateConfig', () => {
    const { composable, updateConfig } = makeHarness()
    composable.animationMode.value = 'gradient'
    expect(updateConfig).toHaveBeenCalledWith({ animationMode: 'gradient' })
  })

  it('gradientSensitivity defaults to 3', () => {
    const { composable } = makeHarness()
    expect(composable.gradientSensitivity.value).toBe(3)
  })
})

// ── Colors / background ───────────────────────────────────────────────────────

describe('useElevationConfig — colors', () => {
  it('titleColor defaults to #ffffff', () => {
    const { composable } = makeHarness()
    expect(composable.titleColor.value).toBe('#ffffff')
  })

  it('titleColor setter calls updateConfig', () => {
    const { composable, updateConfig } = makeHarness()
    composable.titleColor.value = '#ff0000'
    expect(updateConfig).toHaveBeenCalledWith({ titleColor: '#ff0000' })
  })

  it('backgroundColor defaults to #000000', () => {
    const { composable } = makeHarness()
    expect(composable.backgroundColor.value).toBe('#000000')
  })

  it('backgroundType defaults to "solid"', () => {
    const { composable } = makeHarness()
    expect(composable.backgroundType.value).toBe('solid')
  })

  it('useGradientBackground returns true when backgroundType is "gradient"', () => {
    const { composable } = makeHarness({ backgroundType: 'gradient' })
    expect(composable.useGradientBackground.value).toBe(true)
  })

  it('useGradientBackground setter switches backgroundType', () => {
    const { composable, updateConfig } = makeHarness()
    composable.useGradientBackground.value = true
    expect(updateConfig).toHaveBeenCalledWith({ backgroundType: 'gradient' })
    composable.useGradientBackground.value = false
    expect(updateConfig).toHaveBeenCalledWith({ backgroundType: 'solid' })
  })

  it('showAreaFill defaults to true', () => {
    const { composable } = makeHarness()
    expect(composable.showAreaFill.value).toBe(true)
  })
})

// ── Pan-Zoom ──────────────────────────────────────────────────────────────────

describe('useElevationConfig — panZoom', () => {
  it('panZoomEnabled defaults to false', () => {
    const { composable } = makeHarness()
    expect(composable.panZoomEnabled.value).toBe(false)
  })

  it('panZoomZoomLevel defaults to 3', () => {
    const { composable } = makeHarness()
    expect(composable.panZoomZoomLevel.value).toBe(3)
  })

  it('panZoomZoomOutStart defaults to 0.75', () => {
    const { composable } = makeHarness()
    expect(composable.panZoomZoomOutStart.value).toBe(0.75)
  })

  it('setter updates correctly', () => {
    const { composable, updateConfig } = makeHarness()
    composable.panZoomZoomLevel.value = 5
    expect(updateConfig).toHaveBeenCalledWith({ panZoomZoomLevel: 5 })
  })
})

// ── Effort config ─────────────────────────────────────────────────────────────

describe('useElevationConfig — effort', () => {
  it('effortVariableStroke defaults to true', () => {
    const { composable } = makeHarness()
    expect(composable.effortVariableStroke.value).toBe(true)
  })

  it('effortVariableStrokeIntensity defaults to 5', () => {
    const { composable } = makeHarness()
    expect(composable.effortVariableStrokeIntensity.value).toBe(5)
  })

  it('effortVariableStroke setter preserves other effort fields', () => {
    const { composable, updateConfig } = makeHarness()
    composable.effortVariableStroke.value = false
    const call = updateConfig.mock.calls[0][0]
    expect(call.effortConfig?.variableStroke).toBe(false)
    // Other fields should still be present
    expect(call.effortConfig?.colorGradient).toBeDefined()
    expect(call.effortConfig?.glowAura).toBeDefined()
  })
})

// ── Annotations ───────────────────────────────────────────────────────────────

describe('useElevationConfig — annotations', () => {
  const sampleAnnotations = [
    { id: 'a1', progress: 0.3, text: 'Start', enabled: true, type: 'custom' as const, isAutoGenerated: false },
    { id: 'a2', progress: 0.7, text: 'Gipfel', enabled: true, type: 'summit' as const, isAutoGenerated: true },
  ]

  it('annotations getter returns empty array when undefined', () => {
    const { composable } = makeHarness()
    expect(composable.annotations.value).toEqual([])
  })

  it('annotations getter returns configured annotations', () => {
    const { composable } = makeHarness({ annotations: sampleAnnotations })
    expect(composable.annotations.value).toHaveLength(2)
  })

  it('toggleAnnotation flips enabled state', () => {
    const { composable, getCfg } = makeHarness({ annotations: sampleAnnotations })
    composable.toggleAnnotation('a1')
    const updated = getCfg().annotations!.find(a => a.id === 'a1')!
    expect(updated.enabled).toBe(false)
  })

  it('toggleAnnotation does not affect other annotations', () => {
    const { composable, getCfg } = makeHarness({ annotations: sampleAnnotations })
    composable.toggleAnnotation('a1')
    const a2 = getCfg().annotations!.find(a => a.id === 'a2')!
    expect(a2.enabled).toBe(true)
  })

  it('updateAnnotationText changes text of the right annotation', () => {
    const { composable, getCfg } = makeHarness({ annotations: sampleAnnotations })
    composable.updateAnnotationText('a2', 'Neuer Gipfel')
    const updated = getCfg().annotations!.find(a => a.id === 'a2')!
    expect(updated.text).toBe('Neuer Gipfel')
  })

  it('deleteAnnotation removes the annotation', () => {
    const { composable, getCfg } = makeHarness({ annotations: sampleAnnotations })
    composable.deleteAnnotation('a1')
    const remaining = getCfg().annotations!
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('a2')
  })

  it('addCustomAnnotation adds a new annotation with correct fields', () => {
    const { composable, getCfg } = makeHarness({ annotations: [] })
    composable.addCustomAnnotation(0.5, 'Neue Markierung')
    const added = getCfg().annotations!
    expect(added).toHaveLength(1)
    expect(added[0].text).toBe('Neue Markierung')
    expect(added[0].progress).toBe(0.5)
    expect(added[0].type).toBe('custom')
    expect(added[0].enabled).toBe(true)
    expect(added[0].isAutoGenerated).toBe(false)
  })

  it('addCustomAnnotation clamps progress to 0.01-0.99', () => {
    const { composable, getCfg } = makeHarness({ annotations: [] })
    composable.addCustomAnnotation(-0.5, 'Zu früh')
    expect(getCfg().annotations![0].progress).toBe(0.01)
    composable.addCustomAnnotation(1.5, 'Zu spät')
    expect(getCfg().annotations![1].progress).toBe(0.99)
  })
})
