/**
 * Weather layer composable — fetches historical weather from Open-Meteo.
 *
 * Open-Meteo is free, no API key required.
 * Archive API: https://archive-api.open-meteo.com/v1/archive
 *
 * Fetches hourly temperature + weather condition for the full activity duration
 * so the overlay can animate alongside the route.
 */

import { ref, watch } from 'vue'
import type { Ref } from 'vue'

export interface WeatherHourEntry {
  offsetMs: number     // ms from activity start (0, 3_600_000, 7_200_000, …)
  tempC: number
  conditionCode: number
  condition: string    // German label with emoji, e.g. "☀️ Sonnig"
}

/** WMO weather interpretation codes → German label */
function wmoToGerman(code: number): string {
  if (code === 0)   return '☀️ Sonnig'
  if (code <= 2)    return '🌤️ Teilweise bewölkt'
  if (code === 3)   return '☁️ Bedeckt'
  if (code <= 48)   return '🌫️ Nebel'
  if (code <= 57)   return '🌦️ Nieselregen'
  if (code <= 67)   return '🌧️ Regen'
  if (code <= 77)   return '❄️ Schnee'
  if (code <= 82)   return '🌧️ Schauer'
  if (code <= 86)   return '❄️ Schneeschauer'
  if (code <= 99)   return '⛈️ Gewitter'
  return '❓ Unbekannt'
}

// Cache keyed by lat/lon (2 decimals) + startDate + endDate
const weatherCache = new Map<string, WeatherHourEntry[]>()

function cacheKey(lat: number, lon: number, startDate: string, endDate: string): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)},${startDate},${endDate}`
}

async function fetchWeatherHourly(
  lat: number,
  lon: number,
  startTimeMs: number,
  durationMs: number,
): Promise<WeatherHourEntry[]> {
  const startD   = new Date(startTimeMs)
  const endD     = new Date(startTimeMs + Math.max(durationMs, 0))
  const startStr = startD.toISOString().split('T')[0]
  const endStr   = endD.toISOString().split('T')[0]

  const key = cacheKey(lat, lon, startStr, endStr)
  const cached = weatherCache.get(key)
  if (cached) return cached

  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.searchParams.set('latitude',   lat.toFixed(4))
  url.searchParams.set('longitude',  lon.toFixed(4))
  url.searchParams.set('start_date', startStr)
  url.searchParams.set('end_date',   endStr)
  url.searchParams.set('hourly',     'temperature_2m,weathercode')
  url.searchParams.set('timezone',   'UTC')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const data = await res.json()

  const times: string[] = data.hourly?.time              ?? []
  const temps: number[] = data.hourly?.temperature_2m    ?? []
  const codes: number[] = data.hourly?.weathercode       ?? []
  if (temps.length === 0) throw new Error('Keine Wetterdaten für dieses Datum')

  // Only keep hours that fall within [startTimeMs, startTimeMs + durationMs]
  // offsetMs is relative to startTimeMs so it can be negative (pre-start) — we skip those.
  const startHourMs = Math.floor(startTimeMs / 3_600_000) * 3_600_000

  const entries: WeatherHourEntry[] = []
  for (let i = 0; i < times.length; i++) {
    const hourMs    = new Date(times[i] + 'Z').getTime()
    const offsetMs  = hourMs - startHourMs
    if (offsetMs < 0) continue                               // before activity
    if (durationMs > 0 && offsetMs > durationMs + 3_600_000) break  // well past end

    entries.push({
      offsetMs,
      tempC:         Math.round((temps[i] ?? 0) * 10) / 10,
      conditionCode: codes[i] ?? 0,
      condition:     wmoToGerman(codes[i] ?? 0),
    })
  }

  if (entries.length === 0 && temps.length > 0) {
    // Fallback: just take the first hour
    entries.push({
      offsetMs:      0,
      tempC:         Math.round(temps[0] * 10) / 10,
      conditionCode: codes[0] ?? 0,
      condition:     wmoToGerman(codes[0] ?? 0),
    })
  }

  weatherCache.set(key, entries)
  return entries
}

/**
 * Given a list of hourly entries and an elapsed-ms offset into the activity,
 * return the entry whose hour contains that offset (or the last entry if past the end).
 */
export function getWeatherAtOffset(hours: WeatherHourEntry[], offsetMs: number): WeatherHourEntry {
  let best = hours[0]
  for (const entry of hours) {
    if (entry.offsetMs <= offsetMs) best = entry
    else break
  }
  return best
}

export function useWeatherLayer(
  lat:         Ref<number | null>,
  lon:         Ref<number | null>,
  startTimeMs: Ref<number | null>,
  durationMs:  Ref<number | null>,
) {
  const weatherHours = ref<WeatherHourEntry[] | null>(null)
  const isLoading    = ref(false)
  const error        = ref<string | null>(null)

  watch(
    [lat, lon, startTimeMs, durationMs],
    async ([latVal, lonVal, startTime, dur]) => {
      if (latVal === null || lonVal === null || startTime === null) {
        weatherHours.value = null
        return
      }
      isLoading.value = true
      error.value     = null
      try {
        weatherHours.value = await fetchWeatherHourly(latVal, lonVal, startTime, dur ?? 0)
      } catch (e) {
        error.value        = e instanceof Error ? e.message : 'Wetterdaten nicht verfügbar'
        weatherHours.value = null
        console.warn('Weather fetch failed:', e)
      } finally {
        isLoading.value = false
      }
    },
    { immediate: true },
  )

  return { weatherHours, isLoading, error }
}
