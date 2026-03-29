import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generatePlaceBoundaryLayer, type PlaceBoundaryConfig } from '../utils/chartGenerators/routeMap/placeBoundaries'
import { useGeoLayer } from './useGeoLayer'

export function usePlaceBoundaries(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<PlaceBoundaryConfig | null>,
  enabled: Ref<boolean>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: placeBoundarySvg, isLoading, error } = useGeoLayer(
    generatePlaceBoundaryLayer, routeBounds, projectionParams, config, viewWidth, viewHeight, [], enabled,
  )
  return { placeBoundarySvg, isLoading, error }
}
