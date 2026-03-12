import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateWaterLayer, type WaterConfig } from '../utils/chartGenerators/routeMap/waterLayer'
import { useGeoLayer } from './useGeoLayer'

export function useWaterLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<WaterConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: waterSvg, isLoading, error } = useGeoLayer(
    generateWaterLayer, routeBounds, projectionParams, config, viewWidth, viewHeight,
  )
  return { waterSvg, isLoading, error }
}
