import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateForestLayer, type ForestConfig } from '../utils/chartGenerators/routeMap/forestLayer'
import { useGeoLayer } from './useGeoLayer'

export function useForestLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<ForestConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: forestSvg, isLoading, error } = useGeoLayer(
    generateForestLayer, routeBounds, projectionParams, config, viewWidth, viewHeight,
  )
  return { forestSvg, isLoading, error }
}
