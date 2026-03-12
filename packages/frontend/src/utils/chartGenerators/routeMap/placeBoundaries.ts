/**
 * Place Boundary Layer — Overpass API
 *
 * Fetches city/town/village outline polygons from OpenStreetMap via the
 * Overpass API. Renders them as subtle filled polygons with a dotted outline,
 * giving a cartographic "urban footprint" look behind the route.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import {
  generateOverpassPolygonLayer,
  type PolygonLayerStyle,
} from './overpassPolygonLayer'

export interface PlaceBoundaryConfig {
  color: string
  opacity: number
}

export const DEFAULT_PLACE_BOUNDARY_CONFIG: PlaceBoundaryConfig = {
  color: '#ffffff',
  opacity: 0.50,
}

const PLACE_FILTERS = [
  'way[place~"^(city|town|village)$"]',
  'relation[place~"^(city|town|village)$"]',
]

const PLACE_STYLE: PolygonLayerStyle = {
  fillOpacity: 0.07,
  strokeWidth: 1.5,
  strokeOpacity: 0.40,
  strokeDasharray: '5,3',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  minAreaPx: 0,
  maxPolygons: 20,
  viewportMargin: 200,
  requireTag: 'place',
}

const placeCache = new Map<string, string>()

/**
 * Generate place boundary SVG for the given route bounds.
 * Queries Overpass API for city/town/village polygons, returns SVG string.
 */
export async function generatePlaceBoundaryLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: PlaceBoundaryConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  return generateOverpassPolygonLayer(
    PLACE_FILTERS, placeCache,
    routeBounds, projectionParams, config, PLACE_STYLE,
    viewWidth, viewHeight,
  )
}
