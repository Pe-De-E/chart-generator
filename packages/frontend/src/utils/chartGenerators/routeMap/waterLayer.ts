/**
 * Water Layer — Overpass API
 *
 * Fetches lakes, ponds and reservoirs (natural=water) from OpenStreetMap
 * via the Overpass API. Rendered as soft blue filled polygons behind the
 * route, giving the map an immediate cartographic quality boost.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import {
  generateOverpassPolygonLayer,
  type PolygonLayerStyle,
} from './overpassPolygonLayer'

export interface WaterConfig {
  color: string
  opacity: number
}

export const DEFAULT_WATER_CONFIG: WaterConfig = {
  color: '#4a90d9',
  opacity: 0.70,
}

const WATER_FILTERS = [
  // Require explicit water sub-type — filters out mis-tagged administrative/other relations
  'way[natural=water][water~"^(lake|pond|reservoir|lagoon|oxbow|basin|canal)$"]',
  'way[landuse=reservoir]',
  'relation[natural=water][water~"^(lake|pond|reservoir|lagoon|oxbow|basin|canal)$"]',
  'relation[landuse=reservoir]',
]

const WATER_STYLE: PolygonLayerStyle = {
  fillOpacity: 0.55,
  strokeWidth: 1,
  strokeOpacity: 0.70,
  minAreaPx: 200,
  maxPolygons: 200,
  viewportMargin: 0,     // only render lakes whose centroid is inside the visible map area
  fetchPaddingDeg: 0.05,
}

const waterCache = new Map<string, string>()

export async function generateWaterLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: WaterConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  return generateOverpassPolygonLayer(
    WATER_FILTERS, waterCache,
    routeBounds, projectionParams, config, WATER_STYLE,
    viewWidth, viewHeight,
  )
}
