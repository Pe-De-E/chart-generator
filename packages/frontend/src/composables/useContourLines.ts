import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateContourLines, type ContourConfig } from '../utils/chartGenerators/routeMap/contourLines'
import { useGeoLayer } from './useGeoLayer'

export function useContourLines(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<ContourConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: contourSvg, isLoading, error } = useGeoLayer(
    generateContourLines, routeBounds, projectionParams, config, viewWidth, viewHeight,
  )
  return { contourSvg, isLoading, error }
}
