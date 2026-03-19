import { ref, computed, watch, onUnmounted } from 'vue'

/**
 * Simulates a deterministic loading progress bar for async fetches.
 *
 * - Advances from 0 → ~85% asymptotically over `estimatedMs`
 * - Snaps to 100% when loading finishes, then resets after 500 ms
 * - Provides a countdown label ("~3 Sek.", "~2 Sek.", "Moment…")
 */
export function useLoadingProgress(isLoading: () => boolean, estimatedMs = 3000) {
  const _progress = ref(0)
  const _secsLeft = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null
  let startTime = 0

  function start() {
    startTime = Date.now()
    _progress.value = 0
    _secsLeft.value = Math.ceil(estimatedMs / 1000)
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      // Asymptotic curve: approaches 85% as elapsed → estimatedMs
      const p = 85 * (1 - Math.exp(-3 * elapsed / estimatedMs))
      _progress.value = Math.min(85, p)
      _secsLeft.value = Math.max(0, Math.ceil((estimatedMs - elapsed) / 1000))
    }, 80)
  }

  function finish() {
    if (timer) { clearInterval(timer); timer = null }
    _progress.value = 100
    setTimeout(() => { _progress.value = 0 }, 500)
  }

  // Watch for loading state changes
  const stopWatch = watch(
    computed(isLoading),
    (val, old) => {
      if (val && !old) start()
      else if (!val && old) finish()
    },
  )

  // Handle case where loading is already true on mount
  if (isLoading()) start()

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    stopWatch()
  })

  const progress = computed(() => _progress.value)

  const label = computed(() => {
    const p = _progress.value
    if (p <= 0 || p >= 100) return ''
    return _secsLeft.value > 0 ? `~${_secsLeft.value} Sek.` : 'Moment…'
  })

  return { progress, label }
}
