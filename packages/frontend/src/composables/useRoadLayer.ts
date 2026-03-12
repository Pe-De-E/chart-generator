import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateRoadLayer, type RoadConfig } from '../utils/chartGenerators/routeMap/roadLayer'
import { useGeoLayer } from './useGeoLayer'

export function useRoadLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<RoadConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: roadSvg, isLoading, error } = useGeoLayer(
    generateRoadLayer, routeBounds, projectionParams, config, viewWidth, viewHeight,
  )
  return { roadSvg, isLoading, error }
}
