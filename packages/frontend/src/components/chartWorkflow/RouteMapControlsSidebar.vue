<template>
  <v-navigation-drawer
    permanent
    location="right"
    :rail="controlsCollapsed"
    :width="320"
    rail-width="56"
    class="controls-sidebar"
  >
    <!-- Sidebar Header -->
    <div class="sidebar-header" :class="{ 'collapsed': controlsCollapsed }">
      <v-btn
        icon
        variant="text"
        size="small"
        @click="controlsCollapsed = !controlsCollapsed"
      >
        <v-icon>{{ controlsCollapsed ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
      </v-btn>
      <span v-if="!controlsCollapsed" class="text-subtitle-2 font-weight-medium ml-2">
        Einstellungen
      </span>
    </div>

    <v-divider />

    <!-- Collapsed state: Icon buttons -->
    <div v-if="controlsCollapsed" class="collapsed-controls">
      <v-tooltip location="left" :text="chartTitle || 'Chart-Name'">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Karte">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; activeTab = 0">
            <v-icon>mdi-map</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Route">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; activeTab = 1">
            <v-icon>mdi-map-marker-path</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Profil">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; activeTab = 2">
            <v-icon>mdi-chart-line</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Animation">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; activeTab = 3">
            <v-icon>mdi-animation-play</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Stil">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; activeTab = 4">
            <v-icon>mdi-palette</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Momente">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; activeTab = 5">
            <v-icon>mdi-map-marker-star</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-spacer />

      <!-- Playback in collapsed mode -->
      <v-tooltip location="left" :text="isPlaying ? 'Pause' : 'Abspielen'">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" variant="flat" color="primary" @click="$emit('toggle-playback')" />
        </template>
      </v-tooltip>

      <v-divider class="my-2" />

      <!-- Actions in collapsed mode -->
      <v-tooltip location="left" text="Zurueck">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon="mdi-chevron-left" variant="text" size="small" @click="$emit('back')" />
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Speichern">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon="mdi-content-save" color="success" variant="flat" size="small" @click="$emit('save')" />
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="MP4 Export">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon="mdi-video-outline" color="deep-purple" variant="flat" size="small" @click="$emit('open-export-settings')" :disabled="!videoExportSupported || videoExporting" />
        </template>
      </v-tooltip>
    </div>

    <!-- Expanded state: Full controls -->
    <div v-else class="expanded-controls">
      <!-- Chart Name (above tabs) -->
      <div class="chart-name-section">
        <v-text-field
          :model-value="chartTitle"
          @update:model-value="$emit('update:chartTitle', $event)"
          label="Chart-Name"
          variant="outlined"
          density="compact"
          hide-details
          placeholder="z.B. Alpenueberquerung Tag 1"
          prepend-inner-icon="mdi-pencil"
        />
        <div class="d-flex ga-1 mt-2">
          <v-btn icon="mdi-undo" size="small" variant="tonal"
            :disabled="!canUndo" @click="$emit('undo')" />
          <v-btn icon="mdi-redo" size="small" variant="tonal"
            :disabled="!canRedo" @click="$emit('redo')" />
        </div>
      </div>

      <!-- Tab Navigation -->
      <v-tabs v-model="activeTab" grow density="compact" color="primary" class="sidebar-tabs">
        <v-tab :value="0" class="tab-item">
          <v-icon size="16">mdi-map</v-icon>
          <span class="tab-label">Karte</span>
        </v-tab>
        <v-tab :value="1" class="tab-item">
          <v-icon size="16">mdi-map-marker-path</v-icon>
          <span class="tab-label">Route</span>
        </v-tab>
        <v-tab :value="2" class="tab-item">
          <v-icon size="16">mdi-chart-line</v-icon>
          <span class="tab-label">Profil</span>
        </v-tab>
        <v-tab :value="3" class="tab-item">
          <v-icon size="16">mdi-animation-play</v-icon>
          <span class="tab-label">Anim.</span>
        </v-tab>
        <v-tab :value="4" class="tab-item">
          <v-icon size="16">mdi-palette</v-icon>
          <span class="tab-label">Stil</span>
        </v-tab>
        <v-tab :value="5" class="tab-item">
          <v-icon size="16">mdi-map-marker-star</v-icon>
          <span class="tab-label">Momente</span>
        </v-tab>
      </v-tabs>

      <!-- Tab Content -->
      <div class="tab-content">

        <!-- ── Tab 0: Karte ──────────────────────────────── -->
        <div v-show="activeTab === 0">
          <div class="tab-panel">
            <div class="section-label">Layout</div>
            <v-checkbox v-model="showElevationChart" label="Höhenprofil anzeigen" density="compact" hide-details color="primary" />
            <template v-if="showElevationChart">
              <div class="height-control mt-1">
                <v-slider v-model="mapHeightRatio" :min="0.3" :max="0.8" :step="0.05" hide-details thumb-label color="primary" />
                <span class="text-caption">{{ Math.round(mapHeightRatio * 100) }}%</span>
              </div>
              <v-checkbox v-model="showDivider" label="Trennlinie anzeigen" density="compact" hide-details color="primary" class="mt-1" />
              <v-menu v-if="showDivider" :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: dividerColor }"></div>
                    Trennlinienfarbe
                  </v-btn>
                </template>
                <v-color-picker v-model="dividerColor" mode="hexa" hide-inputs />
              </v-menu>
            </template>

            <v-divider class="my-3" />
            <div class="section-label">Kartendetails</div>
            <v-checkbox v-model="showNorthArrow" label="Nordpfeil" density="compact" hide-details color="primary" />
            <v-checkbox v-model="showScaleBar" label="Maßstabsleiste" density="compact" hide-details color="primary" class="mt-1" />
            <v-checkbox v-model="showMapFade" label="Verblassen unten" density="compact" hide-details color="primary" class="mt-1" />

            <v-divider class="my-3" />
            <div class="section-label">Kamera</div>
            <label class="text-caption text-medium-emphasis d-block mb-1">Modus</label>
            <v-btn-toggle v-model="mapCameraMode" mandatory density="compact" variant="outlined" divided class="w-100" color="primary">
              <v-btn value="overview" size="small" class="flex-grow-1">
                <v-icon start size="small">mdi-image-filter-center-focus</v-icon>
                Uebersicht
              </v-btn>
              <v-btn value="chase" size="small" class="flex-grow-1">
                <v-icon start size="small">mdi-video-outline</v-icon>
                Verfolgung
              </v-btn>
            </v-btn-toggle>
            <template v-if="mapCameraMode === 'chase'">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-3">Zoom: {{ mapChaseZoomLevel.toFixed(1) }}x</label>
              <v-slider v-model="mapChaseZoomLevel" :min="1.5" :max="6" :step="0.5" density="compact" hide-details thumb-label />
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Auszoom bei: {{ Math.round(mapChaseZoomOutStart * 100) }}%</label>
              <v-slider v-model="mapChaseZoomOutStart" :min="0.5" :max="0.95" :step="0.05" density="compact" hide-details thumb-label />
            </template>

            <v-divider class="my-3" />
            <div class="section-label">Geo-Layer</div>
            <v-btn
              block variant="tonal" color="teal" prepend-icon="mdi-map-legend"
              size="small" class="mb-3"
              @click="applyTopoPreset"
            >
              Topo-Stil aktivieren
            </v-btn>

            <div class="section-label mt-1">Farbschema</div>
            <div class="d-flex ga-1 flex-wrap mb-3">
              <v-chip
                v-for="scheme in colorSchemes"
                :key="scheme.id"
                size="small"
                :variant="activeColorScheme === scheme.id ? 'flat' : 'tonal'"
                :color="activeColorScheme === scheme.id ? 'primary' : undefined"
                class="scheme-chip"
                @click="applyLandUseColorScheme(scheme.id)"
              >
                <div class="d-flex ga-1 mr-1">
                  <div class="scheme-dot" :style="{ background: scheme.colors.forest }" />
                  <div class="scheme-dot" :style="{ background: scheme.colors.water }" />
                  <div class="scheme-dot" :style="{ background: scheme.colors.meadow }" />
                </div>
                {{ scheme.label }}
              </v-chip>
            </div>

            <v-checkbox v-model="showBorders" label="Laendergrenzen" density="compact" hide-details />
            <template v-if="showBorders">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(borderOpacity * 100) }}%</label>
              <v-slider v-model="borderOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showRivers" label="Fluesse" density="compact" hide-details class="mt-1" />
            <template v-if="showRivers && riverLoading">
              <v-progress-linear :model-value="riverLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="riverLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ riverLP.label.value }}</div>
            </template>
            <template v-if="showRivers">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(riverOpacity * 100) }}%</label>
              <v-slider v-model="riverOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
              <div v-if="detectedRiverNames.length > 0" class="text-caption text-medium-emphasis mt-2" style="line-height:1.4">
                <v-icon size="12" class="mr-1">mdi-cursor-pointer</v-icon>Auf Flussnamen klicken zum Neupositionieren
              </div>
            </template>
            <v-checkbox v-model="showCities" label="Staedte" density="compact" hide-details class="mt-1" />
            <template v-if="showCities">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(cityOpacity * 100) }}%</label>
              <v-slider v-model="cityOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showPlaceBoundaries" label="Ortsgrenzen" density="compact" hide-details class="mt-1" />
            <template v-if="showPlaceBoundaries && placeBoundaryLoading">
              <v-progress-linear :model-value="placeBoundaryLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="placeBoundaryLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ placeBoundaryLP.label.value }}</div>
            </template>
            <template v-if="showPlaceBoundaries">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(placeBoundaryOpacity * 100) }}%</label>
              <v-slider v-model="placeBoundaryOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showForests" label="Waelder" density="compact" hide-details class="mt-1" />
            <template v-if="showForests && forestLoading">
              <v-progress-linear :model-value="forestLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="forestLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ forestLP.label.value }}</div>
            </template>
            <template v-if="showForests">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(forestOpacity * 100) }}%</label>
              <v-slider v-model="forestOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showVineyards" label="Weinberge & Obstgaerten" density="compact" hide-details class="mt-1" />
            <template v-if="showVineyards && vineyardLoading">
              <v-progress-linear :model-value="vineyardLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="vineyardLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ vineyardLP.label.value }}</div>
            </template>
            <template v-if="showVineyards">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(vineyardOpacity * 100) }}%</label>
              <v-slider v-model="vineyardOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showMeadows" label="Wiesen & Felder" density="compact" hide-details class="mt-1" />
            <template v-if="showMeadows && meadowLoading">
              <v-progress-linear :model-value="meadowLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="meadowLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ meadowLP.label.value }}</div>
            </template>
            <template v-if="showMeadows">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(meadowOpacity * 100) }}%</label>
              <v-slider v-model="meadowOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showWater" label="Seen & Gewaesser" density="compact" hide-details class="mt-1" />
            <template v-if="showWater && waterLoading">
              <v-progress-linear :model-value="waterLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="waterLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ waterLP.label.value }}</div>
            </template>
            <template v-if="showWater">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(waterOpacity * 100) }}%</label>
              <v-slider v-model="waterOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showGlaciers" label="Gletscher" density="compact" hide-details class="mt-1" />
            <v-checkbox v-model="showUrban" label="Siedlungen" density="compact" hide-details class="mt-1" />
            <template v-if="(showGlaciers || showUrban) && landCoverLoading">
              <v-progress-linear :model-value="landCoverLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="landCoverLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ landCoverLP.label.value }}</div>
            </template>
            <template v-if="showGlaciers">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Gletscher Deckkraft: {{ Math.round(glacierOpacity * 100) }}%</label>
              <v-slider v-model="glacierOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <template v-if="showUrban">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Siedlungen Deckkraft: {{ Math.round(urbanOpacity * 100) }}%</label>
              <v-slider v-model="urbanOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showRoads" label="Strassen" density="compact" hide-details class="mt-1" />
            <template v-if="showRoads && roadLoading">
              <v-progress-linear :model-value="roadLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="roadLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ roadLP.label.value }}</div>
            </template>
            <template v-if="showRoads">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(roadOpacity * 100) }}%</label>
              <v-slider v-model="roadOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showPeaks" label="Gipfel" density="compact" hide-details class="mt-1" />
            <template v-if="showPeaks && peakLoading">
              <v-progress-linear :model-value="peakLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="peakLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ peakLP.label.value }}</div>
            </template>
            <template v-if="showPeaks">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(peakOpacity * 100) }}%</label>
              <v-slider v-model="peakOpacity" :min="0.05" :max="1" :step="0.05" density="compact" hide-details />
            </template>
            <v-divider class="my-3" />
            <div class="section-label">Datenschutz</div>
            <v-checkbox v-model="anonymizeStart" label="Start verbergen" density="compact" hide-details class="mt-1" />
            <v-checkbox v-model="anonymizeEnd" label="Ziel verbergen" density="compact" hide-details class="mt-1" />
            <template v-if="anonymizeStart || anonymizeEnd">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Radius: {{ anonymizeRadiusM }} m</label>
              <v-slider v-model="anonymizeRadiusM" :min="100" :max="1000" :step="50" density="compact" hide-details />
            </template>

            <v-divider class="my-2" />
            <v-checkbox v-model="showSatellite" label="Satellitenbild" density="compact" hide-details class="mt-1" />
            <template v-if="showSatellite && satelliteLoading">
              <v-progress-linear :model-value="satelliteLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="satelliteLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ satelliteLP.label.value }}</div>
            </template>
            <template v-if="showSatellite">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(satelliteOpacity * 100) }}%</label>
              <v-slider v-model="satelliteOpacity" :min="0.10" :max="1.00" :step="0.05" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showHillshade" label="Schummerung (Hillshade)" density="compact" hide-details class="mt-1" />
            <template v-if="showHillshade && hillshadeLoading">
              <v-progress-linear :model-value="hillshadeLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="hillshadeLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ hillshadeLP.label.value }}</div>
            </template>
            <template v-if="showHillshade">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(hillshadeOpacity * 100) }}%</label>
              <v-slider v-model="hillshadeOpacity" :min="0.05" :max="0.80" :step="0.05" density="compact" hide-details />
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Staerke: {{ hillshadeStrength.toFixed(2) }}</label>
              <v-slider v-model="hillshadeStrength" :min="0.005" :max="0.10" :step="0.005" density="compact" hide-details />
            </template>
            <v-checkbox v-model="showContours" label="Hoehenlinien" density="compact" hide-details class="mt-1" />
            <template v-if="showContours && contourLoading">
              <v-progress-linear :model-value="contourLP.progress.value" color="primary" height="2" class="mt-1" />
              <div v-if="contourLP.label.value" class="text-caption text-medium-emphasis" style="font-size:10px">{{ contourLP.label.value }}</div>
            </template>
            <template v-if="showContours">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-1">Deckkraft: {{ Math.round(contourOpacity * 100) }}%</label>
              <v-slider v-model="contourOpacity" :min="0.05" :max="0.60" :step="0.05" density="compact" hide-details />
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Intervall: {{ contourInterval }}m</label>
              <v-slider v-model="contourInterval" :min="25" :max="500" :step="25" density="compact" hide-details thumb-label />
              <v-checkbox v-model="contourShowLabels" label="Hoehenbeschriftung" density="compact" hide-details class="mt-1" />
            </template>
          </div>
        </div>

        <!-- ── Tab 1: Route ──────────────────────────────── -->
        <div v-show="activeTab === 1">
          <div class="tab-panel">
            <div class="section-label">Routenstil</div>
            <v-menu :close-on-content-click="false">
              <template v-slot:activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="outlined" block size="small">
                  <div class="color-swatch mr-2" :style="{ backgroundColor: routeColor }"></div>
                  Routenfarbe
                </v-btn>
              </template>
              <v-color-picker v-model="routeColor" mode="hexa" hide-inputs />
            </v-menu>
            <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Linienstaerke: {{ routeWidth }}px</label>
            <v-slider v-model="routeWidth" :min="1" :max="10" :step="0.5" density="compact" hide-details thumb-label />
            <v-checkbox v-model="routeGlow" label="Glow-Effekt" density="compact" hide-details color="primary" class="mt-1" />
            <template v-if="routeGlow">
              <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: routeGlowColor }"></div>
                    Glow-Farbe
                  </v-btn>
                </template>
                <v-color-picker v-model="routeGlowColor" mode="hexa" hide-inputs />
              </v-menu>
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Glow-Intensitaet: {{ routeGlowIntensity }}</label>
              <v-slider v-model="routeGlowIntensity" :min="1" :max="10" :step="1" density="compact" hide-details thumb-label />
            </template>
            <label class="text-caption text-medium-emphasis d-block mb-1 mt-3">Vorschau-Spur: {{ Math.round(routeTrailOpacity * 100) }}%</label>
            <v-slider v-model="routeTrailOpacity" :min="0" :max="0.5" :step="0.05" density="compact" hide-details thumb-label />
            <v-checkbox v-model="routeHalo" label="Kontur (dunkler Rand)" density="compact" hide-details color="primary" class="mt-1" />
            <template v-if="routeHalo">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Kontur-Deckkraft: {{ Math.round(routeHaloOpacity * 100) }}%</label>
              <v-slider v-model="routeHaloOpacity" :min="0.05" :max="0.8" :step="0.05" density="compact" hide-details thumb-label />
            </template>
            <v-checkbox v-model="showElevationColoring" label="Route nach Hoehe einfaerben" density="compact" hide-details color="primary" class="mt-2" :disabled="showSpeedColoring" />
            <template v-if="showElevationColoring && !showSpeedColoring">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Intensitaet: {{ elevationColorIntensity }}</label>
              <v-slider v-model="elevationColorIntensity" :min="1" :max="8" :step="1" density="compact" hide-details thumb-label />
            </template>
            <v-checkbox v-model="showSpeedColoring" label="Route nach Tempo einfaerben" density="compact" hide-details color="primary" class="mt-1" />
            <template v-if="showSpeedColoring">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Intensitaet: {{ speedColorIntensity }}</label>
              <v-slider v-model="speedColorIntensity" :min="1" :max="8" :step="1" density="compact" hide-details thumb-label />
              <div class="text-caption text-medium-emphasis mt-1" style="font-size:10px">Blau = langsam · Gruen = mittel · Rot = schnell<br>Benoetigt Zeitdaten im GPX</div>
            </template>

            <v-divider class="my-3" />
            <div class="section-label">Karten-Overlays</div>
            <v-checkbox v-model="showMapMarker" label="Karten-Marker" density="compact" hide-details color="primary" />
            <template v-if="showMapMarker">
              <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: mapMarkerColor }"></div>
                    Marker-Farbe
                  </v-btn>
                </template>
                <v-color-picker v-model="mapMarkerColor" mode="hexa" hide-inputs />
              </v-menu>
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Groesse: {{ mapMarkerSize }}px</label>
              <v-slider v-model="mapMarkerSize" :min="4" :max="16" :step="1" density="compact" hide-details thumb-label />
            </template>
            <v-checkbox v-model="showMarkerPulse" label="Pulse-Ringe" density="compact" hide-details color="primary" class="mt-1" />
            <v-checkbox v-model="showDirection" label="Richtungspfeil" density="compact" hide-details color="primary" class="mt-1" />
            <v-checkbox v-model="showStartEndLabels" label="Start/Ziel Labels" density="compact" hide-details color="primary" class="mt-1" />
            <v-checkbox v-model="showDistanceMarkers" label="Kilometer-Markierungen" density="compact" hide-details color="primary" class="mt-1" />
            <v-text-field
              v-if="showDistanceMarkers"
              v-model.number="distanceMarkerInterval"
              label="Intervall (km)"
              type="number"
              :min="1"
              :max="50"
              variant="outlined"
              density="compact"
              hide-details
              class="mt-1 ml-6"
            />
            <div v-if="showDistanceMarkers" class="text-caption text-medium-emphasis mt-2">
              <v-icon size="12" class="mr-1">mdi-cursor-move</v-icon>Kilometer-Labels ziehen zum Neupositionieren
            </div>
          </div>
        </div>

        <!-- ── Tab 2: Profil ─────────────────────────────── -->
        <div v-show="activeTab === 2">
          <div class="tab-panel">
            <div class="section-label">Profilhoehe</div>
            <div class="height-control">
              <v-slider v-model="curveEndpoint" :min="15" :max="100" :step="1" hide-details thumb-label color="primary" />
              <span class="text-caption">{{ curveEndpoint }}%</span>
            </div>

            <v-divider class="my-3" />
            <div class="section-label">Profil-Stil</div>
            <v-checkbox v-model="showAreaFill" label="Flaeche fuellen" density="compact" hide-details color="primary" />
            <v-checkbox v-model="showElevationCurveColoring" label="Kurve nach Hoehe einfaerben" density="compact" hide-details color="primary" class="mt-1" />

            <v-divider class="my-3" />
            <div class="section-label">Marker & Labels</div>
            <v-checkbox v-model="animationShowMarker" label="Profil-Marker" density="compact" hide-details color="primary" />
            <v-checkbox v-model="showElevationLabels" label="Hoehenmeter anzeigen" density="compact" hide-details color="primary" class="mt-1" />
            <v-menu v-if="showElevationLabels" :close-on-content-click="false">
              <template v-slot:activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                  <div class="color-swatch mr-2" :style="{ backgroundColor: elevationLabelColor }"></div>
                  Hoehenmeter-Farbe
                </v-btn>
              </template>
              <v-color-picker v-model="elevationLabelColor" mode="hexa" show-swatches />
            </v-menu>
            <v-checkbox v-model="showDistanceLabels" label="Kilometer anzeigen" density="compact" hide-details color="primary" class="mt-2" />
            <v-menu v-if="showDistanceLabels" :close-on-content-click="false">
              <template v-slot:activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                  <div class="color-swatch mr-2" :style="{ backgroundColor: distanceLabelColor }"></div>
                  Kilometer-Farbe
                </v-btn>
              </template>
              <v-color-picker v-model="distanceLabelColor" mode="hexa" show-swatches />
            </v-menu>

            <v-divider class="my-3" />
            <div class="section-label">Stats-Overlay</div>
            <v-checkbox v-model="showStatsOverlay" label="Stats anzeigen (Distanz, Hoehe, Zeit)" density="compact" hide-details color="primary" />
            <template v-if="showStatsOverlay">
              <p class="text-caption text-medium-emphasis mt-1 mb-2">Box im Preview ziehen um zu positionieren.</p>
              <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: statsOverlayColor }"></div>
                    Stats-Farbe
                  </v-btn>
                </template>
                <v-color-picker v-model="statsOverlayColor" mode="hexa" show-swatches />
              </v-menu>
            </template>
          </div>
        </div>

        <!-- ── Tab 3: Animation ──────────────────────────── -->
        <div v-show="activeTab === 3">
          <div class="tab-panel">
            <div class="panel-grid">
              <v-text-field v-model.number="animationDuration" label="Dauer (Sek.)" type="number" :min="1" :max="30" variant="outlined" density="compact" hide-details />
              <v-select v-model="animationEasing" label="Easing" :items="easingOptions" variant="outlined" density="compact" hide-details />
            </div>
            <label class="text-caption text-medium-emphasis d-block mb-1 mt-3">Intro-Dauer: {{ introDurationSec.toFixed(1) }} Sek.</label>
            <v-slider v-model="introDurationSec" :min="0" :max="5" :step="0.5" density="compact" hide-details thumb-label />
            <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Outro-Dauer: {{ outroDurationSec.toFixed(1) }} Sek.</label>
            <v-slider v-model="outroDurationSec" :min="0" :max="5" :step="0.5" density="compact" hide-details thumb-label />
            <v-divider class="my-3" />
            <div class="section-label">Outro Gesamtstats</div>
            <v-checkbox v-model="showOutroStats" label="Statistik-Karte im Outro" density="compact" hide-details color="primary" />
            <v-btn
              v-if="showOutroStats"
              :variant="swapIntroOutro ? 'flat' : 'outlined'"
              :color="swapIntroOutro ? 'primary' : undefined"
              block
              size="small"
              class="mt-2"
              @click="swapIntroOutro = !swapIntroOutro"
            >
              {{ swapIntroOutro ? '⇄ Stats zuerst, Titel am Ende' : '⇄ Intro ↔ Outro tauschen' }}
            </v-btn>
            <v-divider class="my-3" />
            <div class="section-label">
              Wetter-Overlay
              <v-progress-circular v-if="weatherLoading" indeterminate size="14" width="2" class="ml-2" />
            </div>
            <v-checkbox v-model="showWeatherOverlay" label="Wetter einblenden" density="compact" hide-details color="primary" />
            <template v-if="showWeatherOverlay">
              <div v-if="weatherLoading" class="text-caption text-medium-emphasis mt-1">
                Wetterdaten werden geladen…
              </div>
              <div v-else-if="weatherHoursCount > 0" class="text-caption text-medium-emphasis mt-1">
                {{ weatherHoursCount }} Stunden geladen · animiert sich mit der Route
              </div>
              <div v-else class="text-caption text-medium-emphasis mt-1">
                Manuell eingeben (kein GPS-Zeitstempel gefunden)
              </div>
              <template v-if="weatherHoursCount === 0 && !weatherLoading">
                <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Temperatur</label>
                <v-text-field
                  v-model="weatherTemp"
                  density="compact"
                  variant="outlined"
                  hide-details
                  placeholder="z.B. 18°C"
                  class="mb-2"
                />
                <label class="text-caption text-medium-emphasis d-block mb-1">Wetterbedingung</label>
                <v-text-field
                  v-model="weatherCondition"
                  density="compact"
                  variant="outlined"
                  hide-details
                  placeholder="z.B. ☀️ Sonnig"
                  class="mb-2"
                />
              </template>
              <div class="d-flex align-center mt-2">
                <label class="text-caption text-medium-emphasis mr-3">Farbe</label>
                <v-menu :close-on-content-click="false">
                  <template #activator="{ props: menuProps }">
                    <div class="color-swatch" :style="{ backgroundColor: weatherOverlayColor }" v-bind="menuProps"></div>
                  </template>
                  <v-color-picker v-model="weatherOverlayColor" mode="hexa" show-swatches />
                </v-menu>
              </div>
            </template>
            <label class="text-caption text-medium-emphasis d-block mb-1 mt-3">Animationsmodus</label>
            <v-btn-toggle v-model="animationMode" mandatory density="compact" variant="outlined" divided class="w-100">
              <v-btn value="uniform" size="small" class="flex-grow-1">Gleichmaessig</v-btn>
              <v-btn value="gradient" size="small" class="flex-grow-1">Steigung</v-btn>
              <v-btn value="effort" size="small" class="flex-grow-1">Anstrengung</v-btn>
              <v-btn v-if="timeArray && timeArray.length > 0" value="time-based" size="small" class="flex-grow-1">Zeitbasiert</v-btn>
            </v-btn-toggle>
            <template v-if="animationMode === 'gradient'">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-3">Intensitaet: {{ gradientSensitivity.toFixed(1) }}</label>
              <v-slider v-model="gradientSensitivity" :min="1" :max="8" :step="0.5" density="compact" hide-details thumb-label />
            </template>
            <template v-if="animationMode === 'effort'">
              <div class="section-label mt-3">Effekte</div>
              <v-checkbox v-model="effortVariableStroke" label="Linienstaerke variiert" density="compact" hide-details class="mt-0" />
              <v-slider v-if="effortVariableStroke" v-model="effortVariableStrokeIntensity" :min="1" :max="8" :step="0.5" density="compact" hide-details thumb-label class="ml-6 mt-n2" />
              <v-checkbox v-model="effortColorGradient" label="Farbverlauf (hell → dunkel)" density="compact" hide-details class="mt-1" />
              <v-slider v-if="effortColorGradient" v-model="effortColorGradientIntensity" :min="1" :max="8" :step="0.5" density="compact" hide-details thumb-label class="ml-6 mt-n2" />
              <v-checkbox v-model="effortGlowAura" label="Glow-Aura" density="compact" hide-details class="mt-1" />
              <v-slider v-if="effortGlowAura" v-model="effortGlowAuraIntensity" :min="1" :max="8" :step="0.5" density="compact" hide-details thumb-label class="ml-6 mt-n2" />
            </template>
            <v-divider class="my-3" />
            <div class="section-label">Profil-Kamerafahrt</div>
            <v-checkbox v-model="panZoomEnabled" label="Aktivieren" density="compact" hide-details color="primary" />
            <template v-if="panZoomEnabled">
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Zoom: {{ panZoomZoomLevel.toFixed(1) }}x</label>
              <v-slider v-model="panZoomZoomLevel" :min="1.5" :max="5" :step="0.5" density="compact" hide-details thumb-label />
              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">Auszoom bei: {{ Math.round(panZoomZoomOutStart * 100) }}%</label>
              <v-slider v-model="panZoomZoomOutStart" :min="0.5" :max="0.95" :step="0.05" density="compact" hide-details thumb-label />
            </template>
          </div>
        </div>

        <!-- ── Tab 4: Stil ───────────────────────────────── -->
        <div v-show="activeTab === 4">
          <div class="tab-panel">
            <div class="section-label">Farben</div>
            <!-- Theme Selector -->
            <v-select
              :model-value="selectedThemeId"
              :items="themeOptions"
              item-title="name"
              item-value="id"
              label="Theme"
              variant="outlined"
              density="compact"
              hide-details
              class="mb-2"
              @update:model-value="applyTheme"
            >
              <template v-slot:item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps">
                  <template v-slot:prepend>
                    <div class="theme-preview-swatch mr-3" :style="{ background: item.raw.preview }"></div>
                  </template>
                  <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                </v-list-item>
              </template>
              <template v-slot:selection="{ item }">
                <div class="d-flex align-center">
                  <div class="theme-preview-swatch mr-2" :style="{ background: item.raw.preview }"></div>
                  {{ item.raw.name }}
                </div>
              </template>
              <template v-slot:append-item>
                <v-divider class="my-2" />
                <v-list-item prepend-icon="mdi-content-save-plus" title="Als Theme speichern" @click="showSaveThemeDialog = true" />
              </template>
            </v-select>
            <v-divider class="mb-3" />
            <v-menu :close-on-content-click="false">
              <template v-slot:activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="outlined" block>
                  <div class="color-swatch mr-2" :style="{ backgroundColor: silhouetteCurveColor }"></div>
                  Profilkurve
                </v-btn>
              </template>
              <v-color-picker v-model="silhouetteCurveColor" mode="hexa" hide-inputs />
            </v-menu>
            <v-menu :close-on-content-click="false">
              <template v-slot:activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="outlined" block class="mt-2">
                  <div class="color-swatch mr-2" :style="{ backgroundColor: titleColor }"></div>
                  Titel
                </v-btn>
              </template>
              <v-color-picker v-model="titleColor" mode="hexa" hide-inputs />
            </v-menu>

            <v-divider class="my-3" />
            <div class="section-label">Hintergrund</div>
            <v-select
              v-model="backgroundType"
              :items="backgroundTypeOptions"
              item-title="title"
              item-value="value"
              label="Typ"
              variant="outlined"
              density="compact"
              hide-details
            >
              <template v-slot:item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps">
                  <template v-slot:prepend>
                    <v-icon :icon="item.raw.icon" size="small" />
                  </template>
                </v-list-item>
              </template>
            </v-select>
            <v-menu v-if="backgroundType === 'solid' || backgroundType === 'grid' || backgroundType === 'dots'" :close-on-content-click="false">
              <template v-slot:activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                  <div class="color-swatch mr-2" :style="{ backgroundColor: backgroundColor }"></div>
                  Hintergrundfarbe
                </v-btn>
              </template>
              <v-color-picker v-model="backgroundColor" mode="hexa" hide-inputs />
            </v-menu>
            <v-menu v-if="backgroundType === 'gradient'" :close-on-content-click="false">
              <template v-slot:activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                  <div class="color-swatch mr-2" :style="{ backgroundColor: gradientColor }"></div>
                  Gradient-Farbe
                </v-btn>
              </template>
              <v-color-picker v-model="gradientColor" mode="hexa" hide-inputs />
            </v-menu>
            <template v-if="backgroundType === 'mesh'">
              <div class="text-caption text-grey mt-2 mb-1">Mesh-Farben</div>
              <div class="d-flex ga-2">
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" variant="outlined" size="small" icon>
                      <div class="color-swatch-small" :style="{ backgroundColor: meshColor1 }"></div>
                    </v-btn>
                  </template>
                  <v-color-picker v-model="meshColor1" mode="hexa" hide-inputs />
                </v-menu>
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" variant="outlined" size="small" icon>
                      <div class="color-swatch-small" :style="{ backgroundColor: meshColor2 }"></div>
                    </v-btn>
                  </template>
                  <v-color-picker v-model="meshColor2" mode="hexa" hide-inputs />
                </v-menu>
                <v-menu :close-on-content-click="false">
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" variant="outlined" size="small" icon>
                      <div class="color-swatch-small" :style="{ backgroundColor: meshColor3 }"></div>
                    </v-btn>
                  </template>
                  <v-color-picker v-model="meshColor3" mode="hexa" hide-inputs />
                </v-menu>
              </div>
            </template>
            <template v-if="backgroundType === 'grid' || backgroundType === 'dots'">
              <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: patternColor }"></div>
                    Musterfarbe
                  </v-btn>
                </template>
                <v-color-picker v-model="patternColor" mode="hexa" hide-inputs />
              </v-menu>
              <v-slider v-model="patternOpacity" :min="0.05" :max="0.5" :step="0.05" label="Deckkraft" density="compact" hide-details thumb-label class="mt-2" />
            </template>
            <template v-if="backgroundType === 'image'">
              <div class="mt-2">
                <v-file-input v-if="!imageOptions?.imageUrl" label="Bild hochladen" accept="image/jpeg,image/png,image/webp" prepend-icon="mdi-image-plus" variant="outlined" density="compact" hide-details @update:model-value="handleImageUpload" :loading="imageUploading" />
                <div v-else class="image-preview-container">
                  <img :src="imageOptions.imageUrl" class="image-preview" alt="Background" />
                  <v-btn icon="mdi-close" size="x-small" color="error" variant="flat" class="remove-image-btn" @click="removeBackgroundImage" />
                </div>
              </div>
              <v-select v-if="imageOptions?.imageUrl" v-model="imagePosition" :items="imagePositionOptions" item-title="title" item-value="value" label="Position" variant="outlined" density="compact" hide-details class="mt-2" />
              <v-slider v-if="imageOptions?.imageUrl" v-model="imageBlur" :min="0" :max="20" :step="1" label="Weichzeichnung" density="compact" hide-details thumb-label class="mt-2">
                <template v-slot:append><span class="text-caption">{{ imageBlur }}px</span></template>
              </v-slider>
              <v-slider v-if="imageOptions?.imageUrl" v-model="imageBrightness" :min="0.5" :max="1.5" :step="0.05" label="Helligkeit" density="compact" hide-details thumb-label class="mt-2">
                <template v-slot:append><span class="text-caption">{{ Math.round(imageBrightness * 100) }}%</span></template>
              </v-slider>
              <v-slider v-if="imageOptions?.imageUrl" v-model="imageContrast" :min="0.5" :max="1.5" :step="0.05" label="Kontrast" density="compact" hide-details thumb-label class="mt-2">
                <template v-slot:append><span class="text-caption">{{ Math.round(imageContrast * 100) }}%</span></template>
              </v-slider>
              <v-menu v-if="imageOptions?.imageUrl" :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: imageOverlayColor }"></div>
                    Overlay-Farbe
                  </v-btn>
                </template>
                <v-color-picker v-model="imageOverlayColor" mode="hexa" hide-inputs />
              </v-menu>
              <v-slider v-if="imageOptions?.imageUrl" v-model="imageOverlayOpacity" :min="0" :max="0.8" :step="0.05" label="Overlay Deckkraft" density="compact" hide-details thumb-label class="mt-2">
                <template v-slot:append><span class="text-caption">{{ Math.round(imageOverlayOpacity * 100) }}%</span></template>
              </v-slider>
            </template>
          </div>
        </div>

        <!-- ── Tab 5: Momente ────────────────────────────── -->
        <div v-show="activeTab === 5">
          <div class="tab-panel">
            <v-btn
              block variant="tonal" color="primary"
              prepend-icon="mdi-auto-fix"
              :loading="isDetecting"
              :disabled="chartData.length === 0"
              @click="runDetection"
            >
              Momente erkennen
            </v-btn>

            <div v-if="annotations && annotations.length > 0" class="text-caption text-medium-emphasis mt-2 mb-1">
              <v-icon size="12" class="mr-1">mdi-cursor-move</v-icon>Momente-Chip im Preview ziehen zum Neupositionieren
            </div>
            <div v-if="annotations && annotations.length > 0" class="annotation-list mt-1">
              <div v-for="annotation in annotations" :key="annotation.id" class="annotation-item">
                <v-checkbox
                  :model-value="annotation.enabled"
                  density="compact" hide-details color="primary"
                  class="annotation-toggle flex-shrink-0"
                  @update:model-value="toggleAnnotation(annotation.id)"
                />
                <v-chip size="x-small" :color="annotationTypeColor(annotation.type)" class="mr-1 flex-shrink-0">
                  <v-icon size="x-small">{{ annotationTypeIcon(annotation.type) }}</v-icon>
                </v-chip>
                <template v-if="editingId === annotation.id">
                  <v-text-field
                    v-model="editingText" density="compact" variant="outlined"
                    hide-details autofocus class="flex-grow-1"
                    @keydown.enter="commitEdit(annotation.id)"
                    @keydown.escape="editingId = null"
                  />
                  <v-btn icon="mdi-check" size="x-small" variant="text" color="success" @click="commitEdit(annotation.id)" />
                </template>
                <template v-else>
                  <span class="annotation-text flex-grow-1 text-caption" :class="{ 'text-disabled': !annotation.enabled }">
                    {{ annotation.text }}
                    <span class="text-grey ml-1">{{ Math.round(annotation.progress * 100) }}%</span>
                  </span>
                  <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="startEdit(annotation)" />
                  <v-btn icon="mdi-delete-outline" size="x-small" variant="text" color="error" @click="deleteAnnotation(annotation.id)" />
                </template>
              </div>
            </div>

            <div v-else class="text-caption text-medium-emphasis text-center py-2 mt-2">
              Keine Momente. Klicke „Momente erkennen" oder füge eigene hinzu.
            </div>

            <v-divider class="my-3" />
            <div class="section-label">Eigener Moment</div>
            <v-text-field
              v-model="newAnnotationText" label="Beschriftung" density="compact"
              variant="outlined" hide-details placeholder="z.B. Aussichtspunkt" class="mb-2"
            />
            <div class="d-flex align-center gap-2">
              <v-slider
                v-model="newAnnotationProgress" :min="1" :max="99" :step="1"
                density="compact" hide-details thumb-label color="primary" class="flex-grow-1"
              />
              <span class="text-caption text-no-wrap ml-2">{{ newAnnotationProgress }}%</span>
            </div>
            <v-btn
              block variant="outlined" prepend-icon="mdi-plus"
              :disabled="!newAnnotationText.trim()" class="mt-2"
              @click="handleAddCustom"
            >
              Hinzufügen
            </v-btn>
          </div>
        </div>

      </div>
    </div>

    <!-- Fixed bottom: Playback + Actions (always visible) -->
    <div v-if="!controlsCollapsed" class="sidebar-bottom">
      <!-- Playback Controls -->
      <div class="playback-section">
        <v-divider class="mb-3" />

        <div class="playback-row">
          <v-btn
            :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
            variant="flat"
            color="primary"
            size="small"
            @click="$emit('toggle-playback')"
          />
          <v-btn
            icon="mdi-replay"
            variant="text"
            size="x-small"
            @click="$emit('reset-animation')"
            :disabled="animationProgress === 0"
          />
          <v-slider
            :model-value="sliderProgress"
            :min="0"
            :max="100"
            :step="0.1"
            hide-details
            color="primary"
            track-color="grey-lighten-2"
            class="mx-2"
            @update:model-value="$emit('slider-change', $event)"
          />
          <span class="text-caption text-no-wrap" style="font-family: monospace; font-size: 11px;">
            {{ formattedTime }}
          </span>
          <v-menu>
            <template v-slot:activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" variant="text" size="x-small" class="ml-1">
                {{ playbackSpeed }}x
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item
                v-for="speed in speedOptions"
                :key="speed"
                :active="playbackSpeed === speed"
                @click="$emit('set-speed', speed)"
              >
                <v-list-item-title>{{ speed }}x</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <v-btn
          icon="mdi-chevron-left"
          variant="text"
          @click="$emit('back')"
        />
        <v-spacer />
        <v-btn
          icon="mdi-content-save"
          color="success"
          variant="flat"
          @click="$emit('save')"
        />
        <v-btn
          icon="mdi-video-outline"
          color="deep-purple"
          variant="flat"
          @click="$emit('open-export-settings')"
          :disabled="!videoExportSupported || videoExporting"
        />
      </div>
    </div>
  </v-navigation-drawer>

  <SaveThemeDialog
    v-model="showSaveThemeDialog"
    :loading="themesLoading"
    @save="handleSaveTheme"
  />
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import type { PropType } from 'vue'
import type { PlaybackSpeed } from '../../composables/useChartAnimation'
import { useRouteMapConfig } from '../../composables/useRouteMapConfig'
import { useLoadingProgress } from '../../composables/useLoadingProgress'
import { useElevationThemes } from '../../composables/useElevationThemes'
import { uploadService } from '../../services/upload.service'
import type { RouteMapAnimationConfig } from './RouteMapChartStep.vue'
import SaveThemeDialog from './SaveThemeDialog.vue'
import type { Annotation, AnnotationType } from '../../utils/chartGenerators/elevationChart/types'
import { detectAnnotations } from '../../utils/chartGenerators/elevationChart/annotationDetection'

const props = defineProps({
  animationConfig: {
    type: Object as PropType<RouteMapAnimationConfig>,
    required: true,
  },
  chartTitle: {
    type: String,
    required: true,
  },
  timeArray: {
    type: Array as PropType<number[]>,
    default: undefined,
  },
  isPlaying: {
    type: Boolean,
    required: true,
  },
  playbackSpeed: {
    type: Number,
    required: true,
  },
  formattedTime: {
    type: String,
    required: true,
  },
  animationProgress: {
    type: Number,
    required: true,
  },
  sliderProgress: {
    type: Number,
    required: true,
  },
  videoExportSupported: {
    type: Boolean,
    required: true,
  },
  videoExporting: {
    type: Boolean,
    required: true,
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
  satelliteLoading: {
    type: Boolean,
    default: false,
  },
  hillshadeLoading: {
    type: Boolean,
    default: false,
  },
  contourLoading: {
    type: Boolean,
    default: false,
  },
  riverLoading: {
    type: Boolean,
    default: false,
  },
  detectedRiverNames: {
    type: Array as () => string[],
    default: () => [],
  },
  peakLoading: {
    type: Boolean,
    default: false,
  },
  placeBoundaryLoading: {
    type: Boolean,
    default: false,
  },
  forestLoading: {
    type: Boolean,
    default: false,
  },
  vineyardLoading: {
    type: Boolean,
    default: false,
  },
  meadowLoading: {
    type: Boolean,
    default: false,
  },
  waterLoading: {
    type: Boolean,
    default: false,
  },
  landCoverLoading: {
    type: Boolean,
    default: false,
  },
  roadLoading: {
    type: Boolean,
    default: false,
  },
  weatherLoading: {
    type: Boolean,
    default: false,
  },
  weatherHoursCount: {
    type: Number,
    default: 0,
  },
  chartData: {
    type: Array as PropType<Array<{ label: string; value: number }>>,
    default: () => [],
  },
  canUndo: {
    type: Boolean,
    default: false,
  },
  canRedo: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  'update:animationConfig': [value: RouteMapAnimationConfig]
  'update:chartTitle': [value: string]
  'update:collapsed': [value: boolean]
  'back': []
  'save': []
  'toggle-playback': []
  'reset-animation': []
  'set-speed': [speed: PlaybackSpeed]
  'slider-change': [value: number]
  'open-export-settings': []
  'undo': []
  'redo': []
}>()

// --- Internal state ---

const controlsCollapsed = computed({
  get: () => props.collapsed,
  set: (val: boolean) => emit('update:collapsed', val),
})
const activeTab = ref(0)
const imageUploading = ref(false)
const selectedThemeId = ref<string | null>(null)
const showSaveThemeDialog = ref(false)

// Annotation local state
const isDetecting = ref(false)
const newAnnotationProgress = ref(50)
const newAnnotationText = ref('')
const editingId = ref<string | null>(null)
const editingText = ref('')

// --- Config composable ---

function updateAnimationConfig(partial: Partial<RouteMapAnimationConfig>) {
  emit('update:animationConfig', { ...props.animationConfig, ...partial })
}

const {
  // Shared elevation fields
  animationDuration,
  animationEasing,
  animationShowMarker,
  curveEndpoint,
  animationMode,
  gradientSensitivity,
  effortVariableStroke,
  effortVariableStrokeIntensity,
  effortColorGradient,
  effortColorGradientIntensity,
  effortGlowAura,
  effortGlowAuraIntensity,
  panZoomEnabled,
  panZoomZoomLevel,
  panZoomZoomOutStart,
  silhouetteCurveColor,
  titleColor,
  showAreaFill,
  showElevationLabels,
  elevationLabelColor,
  showDistanceLabels,
  distanceLabelColor,
  backgroundColor,
  backgroundType,
  gradientColor,
  meshColor1,
  meshColor2,
  meshColor3,
  patternColor,
  patternOpacity,
  imageOptions,
  imagePosition,
  imageBlur,
  imageBrightness,
  imageContrast,
  imageOverlayColor,
  imageOverlayOpacity,
  // Map-specific fields
  introDurationSec,
  outroDurationSec,
  showOutroStats,
  swapIntroOutro,
  mapCameraMode,
  mapChaseZoomLevel,
  mapChaseZoomOutStart,
  routeColor,
  routeWidth,
  routeGlow,
  routeGlowColor,
  routeGlowIntensity,
  routeTrailOpacity,
  routeHalo,
  routeHaloOpacity,
  showMapMarker,
  mapMarkerSize,
  mapMarkerColor,
  showMarkerPulse,
  showDirection,
  showDistanceMarkers,
  distanceMarkerInterval,
  showStartEndLabels,
  showElevationChart,
  mapHeightRatio,
  showDivider,
  dividerColor,
  showElevationColoring,
  elevationColorIntensity,
  showElevationCurveColoring,
  showSpeedColoring,
  speedColorIntensity,
  // Geo Context Layers
  showBorders,
  showRivers,
  showCities,
  borderOpacity,
  riverOpacity,
  cityOpacity,
  showPlaceBoundaries,
  placeBoundaryOpacity,
  showForests,
  forestOpacity,
  showVineyards,
  vineyardOpacity,
  showMeadows,
  meadowOpacity,
  showWater,
  waterOpacity,
  showGlaciers,
  glacierOpacity,
  showUrban,
  urbanOpacity,
  // Roads
  showRoads,
  roadOpacity,
  // Privacy
  anonymizeStart,
  anonymizeEnd,
  anonymizeRadiusM,
  // Peaks
  showPeaks,
  peakOpacity,
  // Satellite
  showSatellite,
  satelliteOpacity,
  // Hillshade
  showHillshade,
  hillshadeOpacity,
  hillshadeStrength,
  // Contour Lines
  showContours,
  contourColor,
  contourOpacity,
  contourInterval,
  contourMajorInterval,
  contourShowLabels,
  showStatsOverlay,
  statsOverlayColor,
  showNorthArrow,
  showScaleBar,
  showMapFade,
  annotations,
  toggleAnnotation,
  updateAnnotationText,
  deleteAnnotation,
  addCustomAnnotation,
  showWeatherOverlay,
  weatherTemp,
  weatherCondition,
  weatherOverlayColor,
} = useRouteMapConfig(
  () => props.animationConfig,
  updateAnimationConfig,
)

// --- Loading Progress ---
const riverLP         = useLoadingProgress(() => props.riverLoading,         3000)
const placeBoundaryLP = useLoadingProgress(() => props.placeBoundaryLoading, 3000)
const forestLP        = useLoadingProgress(() => props.forestLoading,        3500)
const vineyardLP      = useLoadingProgress(() => props.vineyardLoading,      3000)
const meadowLP        = useLoadingProgress(() => props.meadowLoading,        3000)
const waterLP         = useLoadingProgress(() => props.waterLoading,         3000)
const landCoverLP     = useLoadingProgress(() => props.landCoverLoading,     3000)
const roadLP          = useLoadingProgress(() => props.roadLoading,          3000)
const peakLP          = useLoadingProgress(() => props.peakLoading,          3000)
const satelliteLP     = useLoadingProgress(() => props.satelliteLoading,     4000)
const hillshadeLP     = useLoadingProgress(() => props.hillshadeLoading,     4000)
const contourLP       = useLoadingProgress(() => props.contourLoading,       5000)

// --- Land Use Color Schemes ---

interface LandUseColors {
  forest: string
  water: string
  meadow: string
  vineyard: string
  glacier: string
  urban: string
}

const colorSchemes: { id: string; label: string; colors: LandUseColors }[] = [
  {
    id: 'topo',
    label: 'Topo',
    colors: { forest: '#5a9950', water: '#7ab8d9', meadow: '#c8db8c', vineyard: '#d4a855', glacier: '#cce8f4', urban: '#d4c0a8' },
  },
  {
    id: 'pastel',
    label: 'Pastell',
    colors: { forest: '#a8d8a0', water: '#a8d0e8', meadow: '#dde8a8', vineyard: '#e8c888', glacier: '#e0f0f8', urban: '#e8dfd0' },
  },
  {
    id: 'dark',
    label: 'Dunkel',
    colors: { forest: '#2a5220', water: '#1a4870', meadow: '#4a5c1e', vineyard: '#6b4a1a', glacier: '#3a7898', urban: '#604832' },
  },
  {
    id: 'neon',
    label: 'Neon',
    colors: { forest: '#00c853', water: '#00b0ff', meadow: '#c6ff00', vineyard: '#ff9100', glacier: '#40c4ff', urban: '#546e7a' },
  },
]

const activeColorScheme = computed(() => {
  const cfg = props.animationConfig
  return colorSchemes.find(s =>
    s.colors.forest === (cfg.forestColor ?? '#4a8c3f') &&
    s.colors.water === (cfg.waterColor ?? '#4a90d9') &&
    s.colors.meadow === (cfg.meadowColor ?? '#b5c97a') &&
    s.colors.vineyard === (cfg.vineyardColor ?? '#c8a04a') &&
    s.colors.glacier === (cfg.glacierColor ?? '#cce8f4') &&
    s.colors.urban === (cfg.urbanColor ?? '#c8b8a2')
  )?.id ?? null
})

function applyLandUseColorScheme(schemeId: string) {
  const scheme = colorSchemes.find(s => s.id === schemeId)
  if (!scheme) return
  updateAnimationConfig({
    forestColor: scheme.colors.forest,
    waterColor: scheme.colors.water,
    meadowColor: scheme.colors.meadow,
    vineyardColor: scheme.colors.vineyard,
    glacierColor: scheme.colors.glacier,
    urbanColor: scheme.colors.urban,
  })
}

// --- Topo Preset ---

function applyTopoPreset() {
  updateAnimationConfig({
    showBorders: true,
    borderOpacity: 0.35,
    showRivers: true,
    riverOpacity: 0.40,
    showCities: true,
    cityOpacity: 0.60,
    showForests: true,
    forestOpacity: 0.55,
    showWater: true,
    waterOpacity: 0.70,
    showGlaciers: true,
    glacierOpacity: 0.65,
    showUrban: true,
    urbanOpacity: 0.40,
    showMeadows: true,
    meadowOpacity: 0.45,
    showRoads: true,
    roadOpacity: 0.25,
    showPeaks: true,
    peakOpacity: 0.70,
    showHillshade: true,
    hillshadeOpacity: 0.35,
    hillshadeStrength: 0.03,
    showContours: true,
    contourOpacity: 0.25,
    contourInterval: 100,
    contourShowLabels: false,
  })
}

// --- Annotation helpers ---

async function runDetection() {
  if (props.chartData.length === 0) return
  isDetecting.value = true
  await nextTick()
  const detected = detectAnnotations(props.chartData)
  const existingByType = new Map(
    (annotations.value ?? []).filter(a => a.isAutoGenerated).map(a => [a.type, a])
  )
  const merged = detected.map(d => {
    const existing = existingByType.get(d.type)
    return existing ? { ...d, text: existing.text, enabled: existing.enabled } : d
  })
  const customAnnotations = (annotations.value ?? []).filter(a => !a.isAutoGenerated)
  annotations.value = [...merged, ...customAnnotations]
  isDetecting.value = false
}

function handleAddCustom() {
  if (!newAnnotationText.value.trim()) return
  addCustomAnnotation(newAnnotationProgress.value / 100, newAnnotationText.value.trim())
  newAnnotationText.value = ''
  newAnnotationProgress.value = 50
}

function startEdit(annotation: Annotation) {
  editingId.value = annotation.id
  editingText.value = annotation.text
}

function commitEdit(id: string) {
  if (editingText.value.trim()) updateAnnotationText(id, editingText.value.trim())
  editingId.value = null
}

function annotationTypeIcon(type: AnnotationType): string {
  const icons: Record<AnnotationType, string> = {
    summit: 'mdi-triangle', steepest_climb: 'mdi-trending-up',
    steepest_descent: 'mdi-trending-down', longest_descent: 'mdi-ski-water',
    custom: 'mdi-map-marker',
  }
  return icons[type] ?? 'mdi-map-marker'
}

function annotationTypeColor(type: AnnotationType): string {
  const colors: Record<AnnotationType, string> = {
    summit: 'amber', steepest_climb: 'red-lighten-1',
    steepest_descent: 'blue-lighten-1', longest_descent: 'cyan-lighten-1',
    custom: 'grey',
  }
  return colors[type] ?? 'grey'
}

// --- Theme system ---

const {
  themes: elevationThemes,
  loading: themesLoading,
  fetchThemes,
  getThemeById,
  createThemeFromCurrentSettings,
} = useElevationThemes()

const themeOptions = computed(() =>
  elevationThemes.value.map((t) => ({
    id: t.id,
    name: t.name,
    description: 'description' in t ? t.description : '',
    preview: t.preview,
    isSystem: 'isSystem' in t && t.isSystem,
  }))
)

onMounted(() => {
  fetchThemes()
})

function applyTheme(themeId: string) {
  const theme = getThemeById(themeId)
  if (!theme) return
  selectedThemeId.value = themeId
  const { tokens } = theme
  updateAnimationConfig({
    duration: tokens.animation.duration,
    easing: tokens.animation.easing,
    curveColor: tokens.curve.color,
    backgroundColor: tokens.background.color,
    backgroundType: tokens.background.type,
    gradientColor: tokens.background.gradientColor,
    meshColor1: tokens.background.meshColors[0],
    meshColor2: tokens.background.meshColors[1],
    meshColor3: tokens.background.meshColors[2],
    showElevationLabels: tokens.labels.showElevation,
    elevationLabelColor: tokens.labels.elevationColor,
    showDistanceLabels: tokens.labels.showDistance,
    distanceLabelColor: tokens.labels.distanceColor,
    patternColor: tokens.pattern.color,
    patternOpacity: tokens.pattern.opacity,
  })
}

async function handleSaveTheme(name: string, description: string) {
  const cfg = props.animationConfig
  let preview = cfg.backgroundColor
  if (cfg.backgroundType === 'gradient') {
    preview = `linear-gradient(180deg, ${cfg.backgroundColor} 0%, ${cfg.gradientColor} 100%)`
  } else if (cfg.backgroundType === 'mesh') {
    preview = `linear-gradient(135deg, ${cfg.meshColor1} 0%, ${cfg.meshColor2} 50%, ${cfg.meshColor3} 100%)`
  }
  await createThemeFromCurrentSettings(
    name,
    description || 'Eigenes Theme',
    preview,
    {
      curve: { color: cfg.curveColor, strokeWidth: 6 },
      marker: { size: cfg.markerSize, color: cfg.curveColor, show: cfg.showMarker },
      background: {
        type: (['solid', 'gradient', 'mesh'].includes(cfg.backgroundType)
          ? cfg.backgroundType
          : 'solid') as 'solid' | 'gradient' | 'mesh',
        color: cfg.backgroundColor,
        gradientColor: cfg.gradientColor,
        meshColors: [cfg.meshColor1, cfg.meshColor2, cfg.meshColor3],
      },
      labels: {
        elevationColor: cfg.elevationLabelColor,
        distanceColor: cfg.distanceLabelColor,
        showElevation: cfg.showElevationLabels,
        showDistance: cfg.showDistanceLabels,
      },
      pattern: { color: cfg.patternColor, opacity: cfg.patternOpacity },
      animation: { duration: cfg.duration, easing: cfg.easing },
    }
  )
}

// --- Image upload ---

async function handleImageUpload(files: File[] | File | null) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  imageUploading.value = true
  try {
    const uploadedImage = await uploadService.uploadImage(file)
    const imageUrl = uploadService.getImageUrl(uploadedImage)
    updateAnimationConfig({
      backgroundType: 'image',
      imageOptions: {
        imageId: uploadedImage.id,
        imageUrl,
        position: 'cover',
        blur: 0,
        brightness: 1,
        contrast: 1,
        overlayColor: '#000000',
        overlayOpacity: 0.3,
      },
    })
  } catch (error: any) {
    console.error('Image upload failed:', error)
    alert('Bild-Upload fehlgeschlagen: ' + (error.response?.data?.error || error.message))
  } finally {
    imageUploading.value = false
  }
}

function removeBackgroundImage() {
  updateAnimationConfig({
    backgroundType: 'solid',
    imageOptions: undefined,
  })
}

// --- Constants ---

const easingOptions = [
  { title: 'Linear', value: 'linear' },
  { title: 'Ease In', value: 'ease-in' },
  { title: 'Ease Out', value: 'ease-out' },
  { title: 'Ease In-Out', value: 'ease-in-out' },
]

const speedOptions: PlaybackSpeed[] = [0.25, 0.5, 1, 1.5, 2]

const backgroundTypeOptions = [
  { title: 'Solid', value: 'solid', icon: 'mdi-square' },
  { title: 'Gradient', value: 'gradient', icon: 'mdi-gradient-vertical' },
  { title: 'Mesh', value: 'mesh', icon: 'mdi-blur' },
  { title: 'Grid', value: 'grid', icon: 'mdi-grid' },
  { title: 'Dots', value: 'dots', icon: 'mdi-dots-grid' },
  { title: 'Bild', value: 'image', icon: 'mdi-image' },
]

const imagePositionOptions = [
  { title: 'Ausfuellen', value: 'cover' },
  { title: 'Einpassen', value: 'contain' },
  { title: 'Zentriert', value: 'center' },
  { title: 'Strecken', value: 'stretch' },
]
</script>

<style scoped>
.sidebar-header {
  display: flex;
  align-items: center;
  padding: 12px;
  min-height: 52px;
}

.sidebar-header.collapsed {
  justify-content: center;
}

.collapsed-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  flex: 1;
}

.expanded-controls {
  display: grid;
  grid-template-rows: auto auto 1fr;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar-tabs {
  overflow: hidden;
}

.sidebar-tabs :deep(.v-tab) {
  min-width: 0;
  padding: 0 4px;
}

.tab-item {
  flex-direction: column;
  gap: 2px;
  min-height: 52px !important;
}

.tab-label {
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0;
  text-transform: none;
}

.tab-content {
  overflow-y: auto;
  min-height: 0;
}

.tab-panel {
  padding: 12px;
}

.annotation-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.annotation-item {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 36px;
}

.annotation-toggle {
  margin: 0;
  padding: 0;
}

.annotation-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-name-section {
  padding: 8px 12px 6px;
  flex-shrink: 0;
}

.sidebar-bottom {
  flex-shrink: 0;
  padding: 0 12px 12px;
}

.playback-section {
  padding-top: 8px;
}

.playback-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.playback-row .v-slider {
  flex: 1;
  min-width: 60px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid rgba(var(--v-border-color), 0.08);
}

.control-section {
  margin-bottom: 12px;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 8px;
}

.height-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.height-control .v-slider {
  flex: 1;
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.scheme-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.scheme-chip {
  cursor: pointer;
}

.color-swatch {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm, 8px);
  border: 1px solid rgba(var(--v-border-color), 0.2);
}

.color-swatch-small {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm, 8px);
  border: 1px solid rgba(var(--v-border-color), 0.2);
}

.theme-preview-swatch {
  width: 32px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  flex-shrink: 0;
}

.image-preview-container {
  position: relative;
  width: 100%;
  margin-top: 8px;
}

.image-preview {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
}

.remove-image-btn {
  position: absolute;
  top: 4px;
  right: 4px;
}

.controls-sidebar :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
