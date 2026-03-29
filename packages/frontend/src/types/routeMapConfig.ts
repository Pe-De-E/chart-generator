/**
 * RouteMap animation config — defined here so it can be imported by Pinia
 * stores and other modules without creating circular dependencies through
 * RouteMapChartStep.vue.
 */

import type { BackgroundType } from '../utils/chartGenerators/elevationChart/types'
import type { MarkerIconType } from '../utils/chartGenerators/routeMap/markerIcons'
import type { Annotation } from '../utils/chartGenerators/elevationChart/types'

export type { BackgroundType }

export interface RouteMapAnimationConfig {
  // Shared with elevation
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  showMarker: boolean;
  markerSize: number;
  curveEndpoint: number;
  curveColor: string;
  titleColor: string;
  showAreaFill: boolean;
  backgroundColor: string;
  backgroundType: BackgroundType;
  gradientColor: string;
  meshColor1: string;
  meshColor2: string;
  meshColor3: string;
  patternColor: string;
  patternOpacity: number;
  showElevationLabels: boolean;
  elevationLabelColor: string;
  showDistanceLabels: boolean;
  distanceLabelColor: string;
  imageOptions?: {
    imageId: string;
    imageUrl: string;
    position: 'cover' | 'contain' | 'center' | 'stretch';
    blur: number;
    brightness: number;
    contrast: number;
    overlayColor: string;
    overlayOpacity: number;
  };
  animationMode: 'uniform' | 'time-based' | 'gradient' | 'effort';
  gradientSensitivity: number;
  effortConfig: {
    variableStroke: boolean;
    variableStrokeIntensity: number;
    colorGradient: boolean;
    colorGradientIntensity: number;
    glowAura: boolean;
    glowAuraIntensity: number;
  };
  panZoomEnabled: boolean;
  panZoomZoomLevel: number;
  panZoomZoomOutStart: number;
  // Map-specific
  mapCameraMode: 'overview' | 'chase';
  mapChaseZoomLevel: number;
  mapChaseZoomOutStart: number;
  mapChaseRotateWithRoute: boolean;
  routeColor: string;
  routeWidth: number;
  routeGlow: boolean;
  routeGlowColor: string;
  routeGlowIntensity: number;
  routeTrailDash: string;
  routeTrailOpacity: number;
  showMapMarker: boolean;
  mapMarkerSize: number;
  mapMarkerColor: string;
  showMarkerPulse: boolean;
  markerIcon: MarkerIconType;
  showDirection: boolean;
  showDistanceMarkers: boolean;
  distanceMarkerInterval: number;
  showStartEndLabels: boolean;
  mapHeightRatio: number;
  showMapSection: boolean;
  showDivider: boolean;
  dividerColor: string;
  showElevationColoring: boolean;
  elevationColorIntensity: number;
  showElevationCurveColoring: boolean;
  showSpeedColoring: boolean;
  speedColorIntensity: number;
  showHrColoring: boolean;
  hrColorIntensity: number;
  hfmax: number;
  // Geo context layers
  showBorders: boolean;
  showRivers: boolean;
  showCities: boolean;
  borderOpacity: number;
  riverOpacity: number;
  riverLabelOffsets?: Record<string, number>;
  cityOpacity: number;
  showPeaks: boolean;
  peakOpacity: number;
  showPlaceBoundaries: boolean;
  placeBoundaryOpacity: number;
  showForests: boolean;
  forestOpacity: number;
  forestColor?: string;
  showWater: boolean;
  waterOpacity: number;
  waterColor?: string;
  showGlaciers: boolean;
  glacierOpacity: number;
  glacierColor?: string;
  showUrban: boolean;
  urbanOpacity: number;
  urbanColor?: string;
  showVineyards: boolean;
  vineyardOpacity: number;
  vineyardColor?: string;
  showMeadows: boolean;
  meadowOpacity: number;
  meadowColor?: string;
  // Privacy
  anonymizeStart: boolean;
  anonymizeEnd: boolean;
  anonymizeRadiusM: number;
  // Satellite imagery
  showSatellite: boolean;
  satelliteOpacity: number;
  // Hillshade
  showHillshade: boolean;
  hillshadeOpacity: number;
  hillshadeStrength: number;
  // Contour lines
  showContours: boolean;
  contourColor: string;
  contourOpacity: number;
  contourInterval: number;
  contourMajorInterval: number;
  contourShowLabels: boolean;
  // Stats overlay
  showStatsOverlay: boolean;
  statsOverlayColor: string;
  statsX: number;
  statsY: number;
  statsShowDistance: boolean;
  statsShowElevGain: boolean;
  statsShowCurrentElev: boolean;
  statsShowTime: boolean;
  statsShowSpeed: boolean;
  statsShowHr: boolean;
  // Annotations — text chips shown at specific progress points
  annotations?: Annotation[];
  // Roads
  showRoads: boolean;
  roadOpacity: number;
  // Map visual enhancements
  showNorthArrow: boolean;
  showScaleBar: boolean;
  showMapFade: boolean;
  // Intro / Outro duration + stats card
  introDurationSec: number;
  outroDurationSec: number;
  showOutroStats: boolean;
  swapIntroOutro: boolean;
  // Weather overlay
  showWeatherOverlay: boolean;
  weatherTemp: string;
  weatherCondition: string;
  weatherOverlayColor: string;
  weatherX: number;
  weatherY: number;
  // Route halo/outline
  routeHalo: boolean;
  routeHaloOpacity: number;
  // Per-km label drag offsets (dx/dy in SVG coords from route anchor)
  kmLabelOffsets?: Record<number, { dx: number; dy: number }>;
  // Per-annotation chip positions (absolute SVG x/y for chip center)
  annotationPositions?: Record<string, { x: number; y: number }>;
}

export const DEFAULT_ROUTEMAP_ANIMATION_CONFIG: RouteMapAnimationConfig = {
  // Shared defaults
  duration: 8,
  easing: 'ease-in-out',
  showMarker: true,
  markerSize: 6,
  curveEndpoint: 30,
  showAreaFill: true,
  showElevationLabels: false,
  elevationLabelColor: '#ffffffb3',
  showDistanceLabels: false,
  distanceLabelColor: '#ffffffb3',
  curveColor: '#ffffff',
  titleColor: '#ffffff',
  backgroundColor: '#1a1a2e',
  backgroundType: 'solid',
  gradientColor: '#302b63',
  meshColor1: '#667eea',
  meshColor2: '#764ba2',
  meshColor3: '#f093fb',
  patternColor: '#ffffff',
  patternOpacity: 0.1,
  animationMode: 'uniform',
  gradientSensitivity: 3,
  effortConfig: {
    variableStroke: true,
    variableStrokeIntensity: 5,
    colorGradient: true,
    colorGradientIntensity: 5,
    glowAura: true,
    glowAuraIntensity: 5,
  },
  panZoomEnabled: false,
  panZoomZoomLevel: 3,
  panZoomZoomOutStart: 0.75,
  // Map-specific defaults
  mapCameraMode: 'overview',
  mapChaseZoomLevel: 3,
  mapChaseZoomOutStart: 0.85,
  mapChaseRotateWithRoute: false,
  routeColor: '#ffffff',
  routeWidth: 4,
  routeGlow: true,
  routeGlowColor: '#ffffff',
  routeGlowIntensity: 4,
  routeTrailDash: '8 12',
  routeTrailOpacity: 0.2,
  showMapMarker: true,
  mapMarkerSize: 8,
  mapMarkerColor: '#ffffff',
  showMarkerPulse: false,
  markerIcon: 'dot',
  showDirection: true,
  showDistanceMarkers: false,
  distanceMarkerInterval: 5,
  showStartEndLabels: false,
  mapHeightRatio: 0.6,
  showMapSection: true,
  showDivider: false,
  dividerColor: '#ffffff33',
  showElevationColoring: false,
  elevationColorIntensity: 5,
  showElevationCurveColoring: false,
  showSpeedColoring: false,
  speedColorIntensity: 5,
  showHrColoring: false,
  hrColorIntensity: 5,
  hfmax: 190,
  // Geo context layers
  showBorders: false,
  showRivers: false,
  showCities: false,
  borderOpacity: 0.35,
  riverOpacity: 0.40,
  cityOpacity: 0.50,
  showPeaks: false,
  peakOpacity: 0.70,
  showPlaceBoundaries: false,
  placeBoundaryOpacity: 0.50,
  showForests: false,
  forestOpacity: 0.60,
  showWater: false,
  waterOpacity: 0.70,
  showGlaciers: false,
  glacierOpacity: 0.65,
  showUrban: false,
  urbanOpacity: 0.45,
  showVineyards: false,
  vineyardOpacity: 0.55,
  showMeadows: false,
  meadowOpacity: 0.50,
  // Privacy
  anonymizeStart: false,
  anonymizeEnd: false,
  anonymizeRadiusM: 300,
  // Satellite imagery
  showSatellite: false,
  satelliteOpacity: 0.85,
  // Hillshade
  showHillshade: false,
  hillshadeOpacity: 0.35,
  hillshadeStrength: 0.03,
  // Contour lines
  showContours: false,
  contourColor: '#8B7355',
  contourOpacity: 0.25,
  contourInterval: 100,
  contourMajorInterval: 500,
  contourShowLabels: false,
  // Stats overlay
  showStatsOverlay: false,
  statsOverlayColor: '#ffffff',
  statsX: 1.0,
  statsY: 1.0,
  statsShowDistance: true,
  statsShowElevGain: true,
  statsShowCurrentElev: true,
  statsShowTime: true,
  statsShowSpeed: false,
  statsShowHr: false,
  annotations: [],
  // Roads
  showRoads: false,
  roadOpacity: 0.30,
  // Map visual enhancements
  showNorthArrow: true,
  showScaleBar: true,
  showMapFade: true,
  // Intro / Outro duration + stats card
  introDurationSec: 1,
  outroDurationSec: 1.5,
  showOutroStats: false,
  swapIntroOutro: false,
  // Weather overlay
  showWeatherOverlay: false,
  weatherTemp: '',
  weatherCondition: '',
  weatherOverlayColor: '#ffffff',
  weatherX: 0.0,
  weatherY: 0.5,
  // Route halo/outline
  routeHalo: false,
  routeHaloOpacity: 0.25,
}
