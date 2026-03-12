/**
 * Meadow & Farmland Layer — Overpass API
 *
 * Fetches meadow and farmland polygons (landuse=meadow|farmland) from
 * OpenStreetMap. Rendered as a soft yellow-green, giving the map an
 * open, agricultural feel typical of European countryside.
 */

import type { RouteBounds, ProjectionParams } from './projection'
import {
  generateOverpassPolygonLayer,
  type PolygonLayerStyle,
} from './overpassPolygonLayer'

export interface MeadowConfig {
  color: string
  opacity: number
}

export const DEFAULT_MEADOW_CONFIG: MeadowConfig = {
  color: '#b5c97a',
  opacity: 0.50,
}

const MEADOW_FILTERS = [
  'way[landuse=meadow]',
  'way[landuse=farmland]',
  'relation[landuse=meadow]',
  'relation[landuse=farmland]',
]

const MEADOW_STYLE: PolygonLayerStyle = {
  fillOpacity: 0.30,
  strokeWidth: 0.4,
  strokeOpacity: 0.35,
  minAreaPx: 300,
  maxPolygons: 300,
  viewportMargin: 300,
}

const meadowCache = new Map<string, string>()

export async function generateMeadowLayer(
  routeBounds: RouteBounds,
  projectionParams: ProjectionParams,
  config: MeadowConfig,
  viewWidth = 1080,
  viewHeight = 1152,
): Promise<string> {
  return generateOverpassPolygonLayer(
    MEADOW_FILTERS, meadowCache,
    routeBounds, projectionParams, config, MEADOW_STYLE,
    viewWidth, viewHeight,
  )
}
