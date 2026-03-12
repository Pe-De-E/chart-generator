import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateRiverLayer, type RiverConfig } from '../utils/chartGenerators/routeMap/riverTiles'
import { useGeoLayer } from './useGeoLayer'

export function useRiverTiles(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<RiverConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: riverSvg, isLoading, error } = useGeoLayer(
    generateRiverLayer, routeBounds, projectionParams, config, viewWidth, viewHeight,
  )
  return { riverSvg, isLoading, error }
}
