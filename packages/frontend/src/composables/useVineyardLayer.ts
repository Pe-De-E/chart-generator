import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateVineyardLayer, type VineyardConfig } from '../utils/chartGenerators/routeMap/vineyardLayer'
import { useGeoLayer } from './useGeoLayer'

export function useVineyardLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<VineyardConfig | null>,
  enabled: Ref<boolean>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: vineyardSvg, isLoading, error } = useGeoLayer(
    generateVineyardLayer, routeBounds, projectionParams, config, viewWidth, viewHeight, [], enabled,
  )
  return { vineyardSvg, isLoading, error }
}
