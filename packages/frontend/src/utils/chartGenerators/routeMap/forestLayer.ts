/**
 * Forest Layer — Overpass API
 *
 * Fetches forest and woodland polygon data (natural=wood, landuse=forest)
 * from OpenStreetMap via the Overpass API. Renders them as subtle green
 * filled polygons behind the route, giving cartographic depth.
 *
 * Small polygons are filtered by minimum pixel area to avoid clutter
 * in densely forested regions.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import {
  generateOverpassPolygonLayer,
  type PolygonLayerStyle,
} from './overpassPolygonLayer'

export interface ForestConfig {
  color: string
  opacity: number
}

export const DEFAULT_FOREST_CONFIG: ForestConfig = {
  color: '#4a8c3f',
  opacity: 0.60,
}

const FOREST_FILTERS = [
  'way[natural=wood]',
  'way[landuse=forest]',
  'relation[natural=wood]',
  'relation[landuse=forest]',
]

const FOREST_STYLE: PolygonLayerStyle = {
  fillOpacity: 0.25,
  strokeWidth: 0.5,
  strokeOpacity: 0.30,
  minAreaPx: 400,
  maxPolygons: 300,
  viewportMargin: 300,
}

const forestCache = new Map<string, string>()

export async function generateForestLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: ForestConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  return generateOverpassPolygonLayer(
    FOREST_FILTERS, forestCache,
    routeBounds, projectionParams, config, FOREST_STYLE,
    viewWidth, viewHeight,
  )
}
