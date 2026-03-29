import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateLandCoverLayer, type LandCoverConfig } from '../utils/chartGenerators/routeMap/landCoverLayer'
import { useGeoLayer } from './useGeoLayer'

export function useLandCoverLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<LandCoverConfig | null>,
  enabled: Ref<boolean>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: landCoverSvg, isLoading, error } = useGeoLayer(
    generateLandCoverLayer, routeBounds, projectionParams, config, viewWidth, viewHeight, [], enabled,
  )
  return { landCoverSvg, isLoading, error }
}
