import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateMeadowLayer, type MeadowConfig } from '../utils/chartGenerators/routeMap/meadowLayer'
import { useGeoLayer } from './useGeoLayer'

export function useMeadowLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<MeadowConfig | null>,
  enabled: Ref<boolean>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: meadowSvg, isLoading, error } = useGeoLayer(
    generateMeadowLayer, routeBounds, projectionParams, config, viewWidth, viewHeight, [], enabled,
  )
  return { meadowSvg, isLoading, error }
}
