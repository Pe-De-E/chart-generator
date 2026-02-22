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
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; expandedPanels = ['route']">
            <v-icon>mdi-map-marker-path</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Animation">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; expandedPanels = ['animation']">
            <v-icon>mdi-animation-play</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Farben">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; expandedPanels = ['colors']">
            <v-icon>mdi-palette</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Marker & Labels">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; expandedPanels = ['markers']">
            <v-icon>mdi-map-marker</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="left" text="Geo-Kontext">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; expandedPanels = ['geo']">
            <v-icon>mdi-earth</v-icon>
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
      <!-- Chart Name -->
      <div class="control-section">
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
      </div>

      <v-divider class="my-2" />

      <!-- Layout: Map Height Ratio -->
      <div class="control-section">
        <div class="section-label">Layout (Karte / Profil)</div>
        <div class="height-control">
          <v-slider
            v-model="mapHeightRatio"
            :min="0.3"
            :max="0.8"
            :step="0.05"
            hide-details
            thumb-label
            color="primary"
          />
          <span class="text-caption">{{ Math.round(mapHeightRatio * 100) }}%</span>
        </div>
        <v-checkbox
          v-model="showDivider"
          label="Trennlinie anzeigen"
          density="compact"
          hide-details
          color="primary"
          class="mt-1"
        />
        <v-menu v-if="showDivider" :close-on-content-click="false">
          <template v-slot:activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
              <div class="color-swatch mr-2" :style="{ backgroundColor: dividerColor }"></div>
              Trennlinienfarbe
            </v-btn>
          </template>
          <v-color-picker v-model="dividerColor" mode="hexa" hide-inputs />
        </v-menu>
      </div>

      <v-divider class="my-2" />

      <!-- Curve Height Slider (Elevation Profile) -->
      <div class="control-section">
        <div class="section-label">Profilhoehe</div>
        <div class="height-control">
          <v-slider
            v-model="curveEndpoint"
            :min="15"
            :max="100"
            :step="1"
            hide-details
            thumb-label
            color="primary"
          />
          <span class="text-caption">{{ curveEndpoint }}%</span>
        </div>
      </div>

      <v-divider class="my-2" />

      <!-- Collapsible Settings Panels -->
      <v-expansion-panels v-model="expandedPanels" multiple class="settings-panels">
        <!-- Route & Map Settings -->
        <v-expansion-panel value="route">
          <v-expansion-panel-title>
            <v-icon start size="small">mdi-map-marker-path</v-icon>
            Route & Karte
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="panel-stack">
              <!-- Map Camera Mode -->
              <label class="text-caption text-medium-emphasis d-block mb-1">Kamera-Modus</label>
              <v-btn-toggle
                v-model="mapCameraMode"
                mandatory
                density="compact"
                variant="outlined"
                divided
                class="w-100"
                color="primary"
              >
                <v-btn value="overview" size="small" class="flex-grow-1">
                  <v-icon start size="small">mdi-image-filter-center-focus</v-icon>
                  Uebersicht
                </v-btn>
                <v-btn value="chase" size="small" class="flex-grow-1">
                  <v-icon start size="small">mdi-video-outline</v-icon>
                  Verfolgung
                </v-btn>
              </v-btn-toggle>

              <!-- Chase Camera Settings -->
              <template v-if="mapCameraMode === 'chase'">
                <label class="text-caption text-medium-emphasis d-block mb-1 mt-3">
                  Zoom: {{ mapChaseZoomLevel.toFixed(1) }}x
                </label>
                <v-slider
                  v-model="mapChaseZoomLevel"
                  :min="1.5"
                  :max="6"
                  :step="0.5"
                  density="compact"
                  hide-details
                  thumb-label
                />
                <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">
                  Auszoom bei: {{ Math.round(mapChaseZoomOutStart * 100) }}%
                </label>
                <v-slider
                  v-model="mapChaseZoomOutStart"
                  :min="0.5"
                  :max="0.95"
                  :step="0.05"
                  density="compact"
                  hide-details
                  thumb-label
                />
              </template>

              <v-divider class="my-3" />

              <!-- Route Line Style -->
              <label class="text-caption text-medium-emphasis d-block mb-1">Routenlinie</label>

              <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: routeColor }"></div>
                    Routenfarbe
                  </v-btn>
                </template>
                <v-color-picker v-model="routeColor" mode="hexa" hide-inputs />
              </v-menu>

              <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">
                Linienstaerke: {{ routeWidth }}px
              </label>
              <v-slider
                v-model="routeWidth"
                :min="1"
                :max="10"
                :step="0.5"
                density="compact"
                hide-details
                thumb-label
              />

              <!-- Route Glow -->
              <v-checkbox
                v-model="routeGlow"
                label="Glow-Effekt"
                density="compact"
                hide-details
                color="primary"
                class="mt-1"
              />
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
                <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">
                  Glow-Intensitaet: {{ routeGlowIntensity }}
                </label>
                <v-slider
                  v-model="routeGlowIntensity"
                  :min="1"
                  :max="10"
                  :step="1"
                  density="compact"
                  hide-details
                  thumb-label
                />
              </template>

              <!-- Route Trail -->
              <v-divider class="my-3" />
              <label class="text-caption text-medium-emphasis d-block mb-1">Vorschau-Spur</label>
              <label class="text-caption text-medium-emphasis d-block mb-1">
                Deckkraft: {{ Math.round(routeTrailOpacity * 100) }}%
              </label>
              <v-slider
                v-model="routeTrailOpacity"
                :min="0"
                :max="0.5"
                :step="0.05"
                density="compact"
                hide-details
                thumb-label
              />

              <!-- Elevation Coloring -->
              <v-divider class="my-3" />
              <v-checkbox
                v-model="showElevationColoring"
                label="Route nach Hoehe einfaerben"
                density="compact"
                hide-details
                color="primary"
              />
              <template v-if="showElevationColoring">
                <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">
                  Intensitaet: {{ elevationColorIntensity }}
                </label>
                <v-slider
                  v-model="elevationColorIntensity"
                  :min="1"
                  :max="8"
                  :step="1"
                  density="compact"
                  hide-details
                  thumb-label
                />
              </template>

              <!-- Map Marker -->
              <v-divider class="my-3" />
              <v-checkbox
                v-model="showMapMarker"
                label="Karten-Marker"
                density="compact"
                hide-details
                color="primary"
              />
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
                <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">
                  Groesse: {{ mapMarkerSize }}px
                </label>
                <v-slider
                  v-model="mapMarkerSize"
                  :min="4"
                  :max="16"
                  :step="1"
                  density="compact"
                  hide-details
                  thumb-label
                />
              </template>

              <!-- Direction Arrow -->
              <v-checkbox
                v-model="showDirection"
                label="Richtungspfeil"
                density="compact"
                hide-details
                color="primary"
                class="mt-1"
              />

              <!-- Start/End Labels -->
              <v-checkbox
                v-model="showStartEndLabels"
                label="Start/Ziel Labels"
                density="compact"
                hide-details
                color="primary"
                class="mt-1"
              />

              <!-- Distance Markers on Route -->
              <v-checkbox
                v-model="showDistanceMarkers"
                label="Kilometer-Markierungen"
                density="compact"
                hide-details
                color="primary"
                class="mt-1"
              />
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
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Animation Settings -->
        <v-expansion-panel value="animation">
          <v-expansion-panel-title>
            <v-icon start size="small">mdi-animation-play</v-icon>
            Animation
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="panel-grid">
              <v-text-field
                v-model.number="animationDuration"
                label="Dauer (Sek.)"
                type="number"
                :min="1"
                :max="30"
                variant="outlined"
                density="compact"
                hide-details
              />
              <v-select
                v-model="animationEasing"
                label="Easing"
                :items="easingOptions"
                variant="outlined"
                density="compact"
                hide-details
              />
            </div>
            <!-- Animation Mode Toggle -->
            <div class="mt-3">
              <label class="text-caption text-medium-emphasis d-block mb-1">Animationsmodus</label>
              <v-btn-toggle
                v-model="animationMode"
                mandatory
                density="compact"
                variant="outlined"
                divided
                class="w-100"
              >
                <v-btn value="uniform" size="small" class="flex-grow-1">
                  Gleichmaessig
                </v-btn>
                <v-btn value="gradient" size="small" class="flex-grow-1">
                  Steigung
                </v-btn>
                <v-btn value="effort" size="small" class="flex-grow-1">
                  Anstrengung
                </v-btn>
                <v-btn v-if="timeArray && timeArray.length > 0" value="time-based" size="small" class="flex-grow-1">
                  Zeitbasiert
                </v-btn>
              </v-btn-toggle>
            </div>
            <!-- Gradient Sensitivity -->
            <div v-if="animationMode === 'gradient'" class="mt-3">
              <label class="text-caption text-medium-emphasis d-block mb-1">
                Intensitaet: {{ gradientSensitivity.toFixed(1) }}
              </label>
              <v-slider
                v-model="gradientSensitivity"
                :min="1"
                :max="8"
                :step="0.5"
                density="compact"
                hide-details
                thumb-label
              />
            </div>
            <!-- Effort Mode Settings -->
            <div v-if="animationMode === 'effort'" class="mt-3">
              <label class="text-caption text-medium-emphasis d-block mb-2">Effekte</label>
              <v-checkbox
                v-model="effortVariableStroke"
                label="Linienstaerke variiert"
                density="compact"
                hide-details
                class="mt-0"
              />
              <v-slider
                v-if="effortVariableStroke"
                v-model="effortVariableStrokeIntensity"
                :min="1"
                :max="8"
                :step="0.5"
                density="compact"
                hide-details
                thumb-label
                class="ml-6 mt-n2"
              />
              <v-checkbox
                v-model="effortColorGradient"
                label="Farbverlauf (hell → dunkel)"
                density="compact"
                hide-details
                class="mt-1"
              />
              <v-slider
                v-if="effortColorGradient"
                v-model="effortColorGradientIntensity"
                :min="1"
                :max="8"
                :step="0.5"
                density="compact"
                hide-details
                thumb-label
                class="ml-6 mt-n2"
              />
              <v-checkbox
                v-model="effortGlowAura"
                label="Glow-Aura"
                density="compact"
                hide-details
                class="mt-1"
              />
              <v-slider
                v-if="effortGlowAura"
                v-model="effortGlowAuraIntensity"
                :min="1"
                :max="8"
                :step="0.5"
                density="compact"
                hide-details
                thumb-label
                class="ml-6 mt-n2"
              />
            </div>
            <!-- Elevation Pan-Zoom (Kamerafahrt) -->
            <div class="mt-3">
              <v-divider class="mb-3" />
              <v-checkbox
                v-model="panZoomEnabled"
                label="Profil-Kamerafahrt"
                density="compact"
                hide-details
                color="primary"
              />
              <template v-if="panZoomEnabled">
                <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">
                  Zoom: {{ panZoomZoomLevel.toFixed(1) }}x
                </label>
                <v-slider
                  v-model="panZoomZoomLevel"
                  :min="1.5"
                  :max="5"
                  :step="0.5"
                  density="compact"
                  hide-details
                  thumb-label
                />
                <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">
                  Auszoom bei: {{ Math.round(panZoomZoomOutStart * 100) }}%
                </label>
                <v-slider
                  v-model="panZoomZoomOutStart"
                  :min="0.5"
                  :max="0.95"
                  :step="0.05"
                  density="compact"
                  hide-details
                  thumb-label
                />
              </template>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Colors Settings -->
        <v-expansion-panel value="colors">
          <v-expansion-panel-title>
            <v-icon start size="small">mdi-palette</v-icon>
            Farben
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="panel-stack">
              <!-- Curve Color (elevation profile) -->
              <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block>
                    <div class="color-swatch mr-2" :style="{ backgroundColor: silhouetteCurveColor }"></div>
                    Profilkurve
                  </v-btn>
                </template>
                <v-color-picker v-model="silhouetteCurveColor" mode="hexa" hide-inputs />
              </v-menu>

              <!-- Title Color -->
              <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block class="mt-2">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: titleColor }"></div>
                    Titel
                  </v-btn>
                </template>
                <v-color-picker v-model="titleColor" mode="hexa" hide-inputs />
              </v-menu>

              <!-- Background Type Selector -->
              <v-select
                v-model="backgroundType"
                :items="backgroundTypeOptions"
                item-title="title"
                item-value="value"
                label="Hintergrund"
                variant="outlined"
                density="compact"
                hide-details
                class="mt-2"
              >
                <template v-slot:item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template v-slot:prepend>
                      <v-icon :icon="item.raw.icon" size="small" />
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <!-- Solid Background Color -->
              <v-menu v-if="backgroundType === 'solid' || backgroundType === 'grid' || backgroundType === 'dots'" :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: backgroundColor }"></div>
                    Hintergrundfarbe
                  </v-btn>
                </template>
                <v-color-picker v-model="backgroundColor" mode="hexa" hide-inputs />
              </v-menu>

              <!-- Gradient Color -->
              <v-menu v-if="backgroundType === 'gradient'" :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: gradientColor }"></div>
                    Gradient-Farbe
                  </v-btn>
                </template>
                <v-color-picker v-model="gradientColor" mode="hexa" hide-inputs />
              </v-menu>

              <!-- Mesh Gradient Colors -->
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

              <!-- Pattern Color and Opacity (Grid/Dots) -->
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
                <v-slider
                  v-model="patternOpacity"
                  :min="0.05"
                  :max="0.5"
                  :step="0.05"
                  label="Deckkraft"
                  density="compact"
                  hide-details
                  thumb-label
                  class="mt-2"
                />
              </template>

              <!-- Image Background Controls -->
              <template v-if="backgroundType === 'image'">
                <div class="mt-2">
                  <v-file-input
                    v-if="!imageOptions?.imageUrl"
                    label="Bild hochladen"
                    accept="image/jpeg,image/png,image/webp"
                    prepend-icon="mdi-image-plus"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @update:model-value="handleImageUpload"
                    :loading="imageUploading"
                  />
                  <div v-else class="image-preview-container">
                    <img :src="imageOptions.imageUrl" class="image-preview" alt="Background" />
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      color="error"
                      variant="flat"
                      class="remove-image-btn"
                      @click="removeBackgroundImage"
                    />
                  </div>
                </div>
                <v-select
                  v-if="imageOptions?.imageUrl"
                  v-model="imagePosition"
                  :items="imagePositionOptions"
                  item-title="title"
                  item-value="value"
                  label="Position"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mt-2"
                />
                <v-slider
                  v-if="imageOptions?.imageUrl"
                  v-model="imageBlur"
                  :min="0"
                  :max="20"
                  :step="1"
                  label="Weichzeichnung"
                  density="compact"
                  hide-details
                  thumb-label
                  class="mt-2"
                >
                  <template v-slot:append>
                    <span class="text-caption">{{ imageBlur }}px</span>
                  </template>
                </v-slider>
                <v-slider
                  v-if="imageOptions?.imageUrl"
                  v-model="imageBrightness"
                  :min="0.5"
                  :max="1.5"
                  :step="0.05"
                  label="Helligkeit"
                  density="compact"
                  hide-details
                  thumb-label
                  class="mt-2"
                >
                  <template v-slot:append>
                    <span class="text-caption">{{ Math.round(imageBrightness * 100) }}%</span>
                  </template>
                </v-slider>
                <v-slider
                  v-if="imageOptions?.imageUrl"
                  v-model="imageContrast"
                  :min="0.5"
                  :max="1.5"
                  :step="0.05"
                  label="Kontrast"
                  density="compact"
                  hide-details
                  thumb-label
                  class="mt-2"
                >
                  <template v-slot:append>
                    <span class="text-caption">{{ Math.round(imageContrast * 100) }}%</span>
                  </template>
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
                <v-slider
                  v-if="imageOptions?.imageUrl"
                  v-model="imageOverlayOpacity"
                  :min="0"
                  :max="0.8"
                  :step="0.05"
                  label="Overlay Deckkraft"
                  density="compact"
                  hide-details
                  thumb-label
                  class="mt-2"
                >
                  <template v-slot:append>
                    <span class="text-caption">{{ Math.round(imageOverlayOpacity * 100) }}%</span>
                  </template>
                </v-slider>
              </template>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Geo Context Layers -->
        <v-expansion-panel value="geo">
          <v-expansion-panel-title>
            <v-icon start size="small">mdi-earth</v-icon>
            Geo-Kontext
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="panel-stack">
              <v-checkbox
                v-model="showBorders"
                label="Laendergrenzen"
                density="compact"
                hide-details
              />
              <template v-if="showBorders">
                <label class="text-caption text-medium-emphasis d-block mb-1">
                  Deckkraft: {{ Math.round(borderOpacity * 100) }}%
                </label>
                <v-slider
                  v-model="borderOpacity"
                  :min="0.05"
                  :max="1"
                  :step="0.05"
                  density="compact"
                  hide-details
                />
              </template>

              <v-checkbox
                v-model="showRivers"
                label="Fluesse"
                density="compact"
                hide-details
                class="mt-1"
              />
              <template v-if="showRivers">
                <v-progress-linear
                  v-if="riverLoading"
                  indeterminate
                  color="primary"
                  height="2"
                  class="mt-1"
                />
              </template>
              <template v-if="showRivers">
                <label class="text-caption text-medium-emphasis d-block mb-1">
                  Deckkraft: {{ Math.round(riverOpacity * 100) }}%
                </label>
                <v-slider
                  v-model="riverOpacity"
                  :min="0.05"
                  :max="1"
                  :step="0.05"
                  density="compact"
                  hide-details
                />
              </template>

              <v-checkbox
                v-model="showCities"
                label="Staedte"
                density="compact"
                hide-details
                class="mt-1"
              />
              <template v-if="showCities">
                <label class="text-caption text-medium-emphasis d-block mb-1">
                  Deckkraft: {{ Math.round(cityOpacity * 100) }}%
                </label>
                <v-slider
                  v-model="cityOpacity"
                  :min="0.05"
                  :max="1"
                  :step="0.05"
                  density="compact"
                  hide-details
                />
              </template>

              <v-checkbox
                v-model="showPeaks"
                label="Gipfel"
                density="compact"
                hide-details
                class="mt-1"
              />
              <template v-if="showPeaks">
                <v-progress-linear
                  v-if="peakLoading"
                  indeterminate
                  color="primary"
                  height="2"
                  class="mt-1"
                />
              </template>
              <template v-if="showPeaks">
                <label class="text-caption text-medium-emphasis d-block mb-1">
                  Deckkraft: {{ Math.round(peakOpacity * 100) }}%
                </label>
                <v-slider
                  v-model="peakOpacity"
                  :min="0.05"
                  :max="1"
                  :step="0.05"
                  density="compact"
                  hide-details
                />
              </template>

              <v-divider class="my-2" />

              <v-checkbox
                v-model="showContours"
                label="Hoehenlinien"
                density="compact"
                hide-details
                class="mt-1"
              />
              <template v-if="showContours">
                <v-progress-linear
                  v-if="contourLoading"
                  indeterminate
                  color="primary"
                  height="2"
                  class="mt-1"
                />
                <label class="text-caption text-medium-emphasis d-block mb-1">
                  Deckkraft: {{ Math.round(contourOpacity * 100) }}%
                </label>
                <v-slider
                  v-model="contourOpacity"
                  :min="0.05"
                  :max="0.60"
                  :step="0.05"
                  density="compact"
                  hide-details
                />
                <label class="text-caption text-medium-emphasis d-block mb-1 mt-2">
                  Intervall: {{ contourInterval }}m
                </label>
                <v-slider
                  v-model="contourInterval"
                  :min="25"
                  :max="500"
                  :step="25"
                  density="compact"
                  hide-details
                  thumb-label
                />
                <v-checkbox
                  v-model="contourShowLabels"
                  label="Hoehenbeschriftung"
                  density="compact"
                  hide-details
                  class="mt-1"
                />
              </template>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Marker & Labels (Elevation Profile) -->
        <v-expansion-panel value="markers">
          <v-expansion-panel-title>
            <v-icon start size="small">mdi-map-marker</v-icon>
            Profil Marker & Labels
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="panel-stack">
              <v-checkbox
                v-model="showAreaFill"
                label="Flaeche fuellen"
                density="compact"
                hide-details
                color="primary"
              />
              <v-checkbox
                v-model="showElevationCurveColoring"
                label="Kurve nach Hoehe einfaerben"
                density="compact"
                hide-details
                color="primary"
              />
              <v-checkbox
                v-model="animationShowMarker"
                label="Profil-Marker"
                density="compact"
                hide-details
                color="primary"
              />
              <v-checkbox
                v-model="showElevationLabels"
                label="Hoehenmeter anzeigen"
                density="compact"
                hide-details
                color="primary"
              />
              <v-menu v-if="showElevationLabels" :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: elevationLabelColor }"></div>
                    Hoehenmeter-Farbe
                  </v-btn>
                </template>
                <v-color-picker v-model="elevationLabelColor" mode="hexa" show-swatches />
              </v-menu>
              <v-checkbox
                v-model="showDistanceLabels"
                label="Kilometer anzeigen"
                density="compact"
                hide-details
                color="primary"
                class="mt-2"
              />
              <v-menu v-if="showDistanceLabels" :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                    <div class="color-swatch mr-2" :style="{ backgroundColor: distanceLabelColor }"></div>
                    Kilometer-Farbe
                  </v-btn>
                </template>
                <v-color-picker v-model="distanceLabelColor" mode="hexa" show-swatches />
              </v-menu>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PropType } from 'vue'
import type { PlaybackSpeed } from '../../composables/useChartAnimation'
import { useRouteMapConfig } from '../../composables/useRouteMapConfig'
import { uploadService } from '../../services/upload.service'
import type { RouteMapAnimationConfig } from './RouteMapChartStep.vue'

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
  contourLoading: {
    type: Boolean,
    default: false,
  },
  riverLoading: {
    type: Boolean,
    default: false,
  },
  peakLoading: {
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
}>()

// --- Internal state ---

const controlsCollapsed = computed({
  get: () => props.collapsed,
  set: (val: boolean) => emit('update:collapsed', val),
})
const expandedPanels = ref(['route', 'animation'])
const imageUploading = ref(false)

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
  mapCameraMode,
  mapChaseZoomLevel,
  mapChaseZoomOutStart,
  routeColor,
  routeWidth,
  routeGlow,
  routeGlowColor,
  routeGlowIntensity,
  routeTrailOpacity,
  showMapMarker,
  mapMarkerSize,
  mapMarkerColor,
  showDirection,
  showDistanceMarkers,
  distanceMarkerInterval,
  showStartEndLabels,
  mapHeightRatio,
  showDivider,
  dividerColor,
  showElevationColoring,
  elevationColorIntensity,
  showElevationCurveColoring,
  // Geo Context Layers
  showBorders,
  showRivers,
  showCities,
  borderOpacity,
  riverOpacity,
  cityOpacity,
  // Peaks
  showPeaks,
  peakOpacity,
  // Contour Lines
  showContours,
  contourColor,
  contourOpacity,
  contourInterval,
  contourMajorInterval,
  contourShowLabels,
} = useRouteMapConfig(
  () => props.animationConfig,
  updateAnimationConfig,
)

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
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
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

.settings-panels {
  flex: 1;
}

.settings-panels :deep(.v-expansion-panel--active .v-expansion-panel-title) {
  background: rgba(var(--v-theme-primary), 0.08);
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
