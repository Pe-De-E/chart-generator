/**
 * Vineyard & Orchard Layer — Overpass API
 *
 * Fetches vineyard and orchard polygons (landuse=vineyard|orchard) from
 * OpenStreetMap. Rendered as warm golden-ochre filled polygons, giving
 * the map a characteristic agricultural/wine-country feel.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import {
  generateOverpassPolygonLayer,
  type PolygonLayerStyle,
} from './overpassPolygonLayer'

export interface VineyardConfig {
  color: string
  opacity: number
}

export const DEFAULT_VINEYARD_CONFIG: VineyardConfig = {
  color: '#c8a04a',
  opacity: 0.55,
}

const VINEYARD_FILTERS = [
  'way[landuse=vineyard]',
  'way[landuse=orchard]',
  'relation[landuse=vineyard]',
  'relation[landuse=orchard]',
]

const VINEYARD_STYLE: PolygonLayerStyle = {
  fillOpacity: 0.35,
  strokeWidth: 0.5,
  strokeOpacity: 0.45,
  minAreaPx: 200,
  maxPolygons: 200,
  viewportMargin: 300,
}

const vineyardCache = new Map<string, string>()

export async function generateVineyardLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: VineyardConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  return generateOverpassPolygonLayer(
    VINEYARD_FILTERS, vineyardCache,
    routeBounds, projectionParams, config, VINEYARD_STYLE,
    viewWidth, viewHeight,
  )
}
