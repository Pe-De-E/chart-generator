import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generatePeakLayer, type PeakConfig } from '../utils/chartGenerators/routeMap/peakLayer'
import { useGeoLayer } from './useGeoLayer'

export function usePeakLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<PeakConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
  routePoints?: Ref<ReadonlyArray<{ lat: number; lon: number }>>,
) {
  const generate = (
    bounds: RouteBounds,
    params: ProjectionParams,
    cfg: PeakConfig,
    w: number,
    h: number,
  ) => generatePeakLayer(bounds, params, cfg, w, h, routePoints?.value)

  const { layerSvg: peakSvg, isLoading, error } = useGeoLayer(
    generate, routeBounds, projectionParams, config, viewWidth, viewHeight,
    routePoints ? [routePoints] : [],
  )
  return { peakSvg, isLoading, error }
}
