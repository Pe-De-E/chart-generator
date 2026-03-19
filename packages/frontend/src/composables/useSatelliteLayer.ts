import type { Ref } from 'vue'
import type { RouteBounds, ProjectionParams } from '../utils/chartGenerators/routeMap/projection'
import { generateSatelliteLayer, type SatelliteConfig } from '../utils/chartGenerators/routeMap/satelliteLayer'
import { useGeoLayer } from './useGeoLayer'

export function useSatelliteLayer(
  routeBounds: Ref<RouteBounds | null>,
  projectionParams: Ref<ProjectionParams | null>,
  config: Ref<SatelliteConfig | null>,
  viewWidth: Ref<number>,
  viewHeight: Ref<number>,
) {
  const { layerSvg: satelliteSvg, isLoading, error } = useGeoLayer(
    generateSatelliteLayer, routeBounds, projectionParams, config, viewWidth, viewHeight,
  )
  return { satelliteSvg, isLoading, error }
}
