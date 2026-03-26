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
 * through this shared queue. The queue serialises requests with a 600 ms gap
 * between them, which stays well within Overpass's rate limits.
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

/** Minimum gap between successive Overpass requests (ms). */
const REQUEST_GAP_MS = 600

let _running = false
const _queue: Array<() => void> = []

function _drain() {
  if (_running || _queue.length === 0) return
  _running = true
  const next = _queue.shift()!
  next()
}

/**
 * Enqueue an async Overpass fetch.
 * The provided function is called only when no other request is in-flight,
 * with at least REQUEST_GAP_MS between successive calls.
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
        // Wait the minimum gap before allowing the next request
        setTimeout(() => {
          _running = false
          _drain()
        }, REQUEST_GAP_MS)
      }
    })
    _drain()
  })
}
