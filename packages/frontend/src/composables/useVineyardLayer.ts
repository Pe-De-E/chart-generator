import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateVineyardLayer, type VineyardConfig } from '../utils/chartGenerators/routeMap/vineyardLayer'
import { useGeoLayer } from './useGeoLayer'

export function useVineyardLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<VineyardConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: vineyardSvg, isLoading, error } = useGeoLayer(
    generateVineyardLayer, routeBounds, projectionParams, config, viewWidth, viewHeight,
  )
  return { vineyardSvg, isLoading, error }
}
