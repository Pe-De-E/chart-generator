import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { RouteMapAnimationConfig } from '../types/routeMapConfig'
import { DEFAULT_ROUTEMAP_ANIMATION_CONFIG } from '../types/routeMapConfig'
import type { RoutePoint } from '@chart-generator/shared'

export const useRouteMapStore = defineStore('routeMap', () => {
  // ── Animation config ──
  const routeMapConfig = ref<RouteMapAnimationConfig>({ ...DEFAULT_ROUTEMAP_ANIMATION_CONFIG })

  function updateConfig(partial: Partial<RouteMapAnimationConfig>) {
    routeMapConfig.value = { ...routeMapConfig.value, ...partial }
  }

  function setConfig(config: RouteMapAnimationConfig, skipHistory = false) {
    if (skipHistory) _ignoreNext = true
    routeMapConfig.value = config
  }

  // ── GPX / chart data (written by GPXGenerator, read by step + sidebar) ──
  const chartTitle = ref('Route Map')
  const routePoints = ref<RoutePoint[]>([])
  const chartData = ref<Array<{ label: string; value: number }>>([])
  const timeArray = ref<number[] | undefined>(undefined)
  const gpxStartTime = ref<number | null>(null)

  // ── Geo layer loading states (written by RouteMapChartStep, read by sidebar) ──
  const satelliteLoading = ref(false)
  const hillshadeLoading = ref(false)
  const contourLoading = ref(false)
  const riverLoading = ref(false)
  const detectedRiverNames = ref<string[]>([])
  const peakLoading = ref(false)
  const placeBoundaryLoading = ref(false)
  const forestLoading = ref(false)
  const vineyardLoading = ref(false)
  const meadowLoading = ref(false)
  const waterLoading = ref(false)
  const landCoverLoading = ref(false)
  const roadLoading = ref(false)
  const weatherLoading = ref(false)
  const weatherHoursCount = ref(0)
  const geoLayerError = ref<string | null>(null)

  // ── Undo / redo (snapshot-before-burst, max 50) ──
  const past = ref<RouteMapAnimationConfig[]>([])
  const future = ref<RouteMapAnimationConfig[]>([])
  let _snapshot: RouteMapAnimationConfig | null = null
  const hasSnapshot = ref(false)
  let _timer: ReturnType<typeof setTimeout> | null = null
  let _ignoreNext = false

  const canUndo = computed(() => past.value.length > 0 || hasSnapshot.value)
  const canRedo = computed(() => future.value.length > 0)

  function _cloneConfig(config: RouteMapAnimationConfig): RouteMapAnimationConfig {
    return JSON.parse(JSON.stringify(config))
  }

  watch(
    () => routeMapConfig.value,
    (_newVal, oldVal) => {
      if (_ignoreNext) { _ignoreNext = false; return }
      if (!_snapshot) {
        _snapshot = _cloneConfig(oldVal)
        hasSnapshot.value = true
      }
      future.value = []
      if (_timer) clearTimeout(_timer)
      _timer = setTimeout(() => {
        if (_snapshot) {
          past.value = [...past.value.slice(-49), _snapshot]
          _snapshot = null
          hasSnapshot.value = false
        }
        _timer = null
      }, 800)
    },
    { deep: true },
  )

  function undoConfig() {
    if (_timer) { clearTimeout(_timer); _timer = null }
    if (_snapshot) {
      future.value = [_cloneConfig(routeMapConfig.value), ...future.value]
      _ignoreNext = true
      routeMapConfig.value = _snapshot
      _snapshot = null
      hasSnapshot.value = false
      return
    }
    if (past.value.length === 0) return
    const prev = past.value[past.value.length - 1]
    past.value = past.value.slice(0, -1)
    future.value = [_cloneConfig(routeMapConfig.value), ...future.value]
    _ignoreNext = true
    routeMapConfig.value = prev
  }

  function redoConfig() {
    if (future.value.length === 0) return
    past.value = [...past.value, _cloneConfig(routeMapConfig.value)]
    _ignoreNext = true
    routeMapConfig.value = future.value[0]
    future.value = future.value.slice(1)
  }

  function resetHistory() {
    past.value = []
    future.value = []
    _snapshot = null
    hasSnapshot.value = false
    if (_timer) { clearTimeout(_timer); _timer = null }
  }

  function resetConfig() {
    _ignoreNext = true
    routeMapConfig.value = { ...DEFAULT_ROUTEMAP_ANIMATION_CONFIG }
    resetHistory()
  }

  return {
    // config
    routeMapConfig,
    updateConfig,
    setConfig,
    resetConfig,
    // data
    chartTitle,
    routePoints,
    chartData,
    timeArray,
    gpxStartTime,
    // geo loading
    satelliteLoading,
    hillshadeLoading,
    contourLoading,
    riverLoading,
    detectedRiverNames,
    peakLoading,
    placeBoundaryLoading,
    forestLoading,
    vineyardLoading,
    meadowLoading,
    waterLoading,
    landCoverLoading,
    roadLoading,
    weatherLoading,
    weatherHoursCount,
    geoLayerError,
    // undo/redo
    canUndo,
    canRedo,
    undoConfig,
    redoConfig,
    resetHistory,
  }
})
