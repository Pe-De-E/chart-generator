import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateHillshadeLayer, type HillshadeConfig } from '../utils/chartGenerators/routeMap/hillshadeLayer'
import { useGeoLayer } from './useGeoLayer'

export function useHillshadeLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<HillshadeConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: hillshadeSvg, isLoading, error } = useGeoLayer(
    generateHillshadeLayer, routeBounds, projectionParams, config, viewWidth, viewHeight,
  )
  return { hillshadeSvg, isLoading, error }
}
