/**
 * Overpass API Request Queue
 * ==========================
 *
 * WHY THIS EXISTS — READ BEFORE DELETING OR BYPASSING:
 *
 * The Overpass API (overpass-api.de) rate-limits clients that send too many
 * concurrent requests. When multiple geo layers are enabled simultaneously
 * (e.g. via a preset like "Topo"), all their composables fire at the same time
 * and each makes an independent POST to /overpass/interpreter. This floods the
 * server with 5–8 parallel requests, which reliably triggers:
 *
 *   1. 504 Gateway Timeout  — server too busy to respond in time
 *   2. 429 Too Many Requests — IP temporarily rate-limited
 *
 * The 504 looks like a transient error, so the UI retries → more requests →
 * 429 → feedback loop where layers never load and need multiple manual
 * toggles to recover.
 *
 * THE FIX: All Overpass fetches across ALL geo layers (rivers, roads, forests,
 * water, peaks, meadows, vineyards, urban, glaciers, place boundaries) must go
 * through this shared queue. The queue caps concurrent requests at MAX_CONCURRENT
 * (= 2), which is the documented limit per IP on overpass-api.de. This keeps
 * load times fast (layers load in pairs) while preventing rate-limit errors.
 *
 * WHY NOT FULLY SERIALISE (1 AT A TIME)?
 * Strict serialisation with a 600 ms gap means 6 active layers take ~19 s to
 * load sequentially. MAX_CONCURRENT = 2 loads them in three pairs of ~3 s each
 * (~9 s total), matching the pre-queue experience of "a few seconds".
 *
 * RULES:
 *  - Every new `fetch(OVERPASS_URL, ...)` call MUST use `enqueueOverpassRequest`
 *  - Do NOT add a raw `fetch` to /overpass/interpreter anywhere
 *  - The queue is module-level (singleton) so it works across all layer files
 *
 * If you remove this queue or bypass it, you will reproduce the
 * 504 → 429 feedback loop, typically within 30 seconds of enabling
 * more than two geo layers simultaneously.
 */

/** Maximum number of simultaneous Overpass requests (overpass-api.de allows 2 per IP). */
const MAX_CONCURRENT = 2

let _activeCount = 0
const _queue: Array<() => void> = []

function _drain() {
  while (_activeCount < MAX_CONCURRENT && _queue.length > 0) {
    _activeCount++
    const next = _queue.shift()!
    next()
  }
}

/**
 * Enqueue an async Overpass fetch.
 * Up to MAX_CONCURRENT requests run simultaneously; the rest wait in line.
 *
 * Usage:
 *   const data = await enqueueOverpassRequest(() =>
 *     fetch('/overpass/interpreter', { method: 'POST', body: '...' })
 *       .then(r => r.json())
 *   )
 */
export function enqueueOverpassRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    _queue.push(async () => {
      try {
        resolve(await fn())
      } catch (e) {
        reject(e)
      } finally {
        _activeCount--
        _drain()
      }
    })
    _drain()
  })
}
