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
      <v-tooltip location="left" text="Kurvenhöhe">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false">
            <v-icon>mdi-arrow-expand-vertical</v-icon>
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
      <v-tooltip location="left" text="Momente">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="text" @click="controlsCollapsed = false; expandedPanels = ['momente']">
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
      <v-tooltip location="left" text="Zurück">
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
          placeholder="z.B. Alpenüberquerung Tag 1"
          prepend-inner-icon="mdi-pencil"
        />
      </div>

      <v-divider class="my-2" />

      <!-- Mode Toggle: Standard / Kamerafahrt -->
      <div class="control-section">
        <v-btn-toggle
          :model-value="panZoomEnabled ? 'kamerafahrt' : 'standard'"
          @update:model-value="panZoomEnabled = $event === 'kamerafahrt'"
          mandatory
          density="compact"
          variant="outlined"
          divided
          class="w-100"
          color="primary"
        >
          <v-btn value="standard" size="small" class="flex-grow-1">
            <v-icon start size="small">mdi-chart-line</v-icon>
            Standard
          </v-btn>
          <v-btn value="kamerafahrt" size="small" class="flex-grow-1">
            <v-icon start size="small">mdi-video-outline</v-icon>
            Kamerafahrt
          </v-btn>
        </v-btn-toggle>
      </div>

      <v-divider class="my-2" />

      <!-- Curve Height Slider -->
      <div class="control-section">
        <div class="section-label">Kurvenhöhe</div>
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
                  Gleichmäßig
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
            <!-- Gradient Sensitivity Slider -->
            <div v-if="animationMode === 'gradient'" class="mt-3">
              <label class="text-caption text-medium-emphasis d-block mb-1">
                Intensität: {{ gradientSensitivity.toFixed(1) }}
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

              <!-- Variable Stroke -->
              <v-checkbox
                v-model="effortVariableStroke"
                label="Linienstärke variiert"
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

              <!-- Color Gradient -->
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

              <!-- Glow Aura -->
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
            <!-- Kamerafahrt Settings (when pan-zoom enabled) -->
            <div v-if="panZoomEnabled" class="mt-3">
              <v-divider class="mb-3" />
              <label class="text-caption text-medium-emphasis d-block mb-1">
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
                @update:model-value="applyTheme"
              >
                <template v-slot:item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template v-slot:prepend>
                      <div
                        class="theme-preview-swatch mr-3"
                        :style="{ background: item.raw.preview }"
                      ></div>
                    </template>
                    <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
                <template v-slot:selection="{ item }">
                  <div class="d-flex align-center">
                    <div
                      class="theme-preview-swatch mr-2"
                      :style="{ background: item.raw.preview }"
                    ></div>
                    {{ item.raw.name }}
                  </div>
                </template>
                <template v-slot:append-item>
                  <v-divider class="my-2" />
                  <v-list-item
                    prepend-icon="mdi-content-save-plus"
                    title="Als Theme speichern"
                    @click="showSaveThemeDialog = true"
                  />
                </template>
              </v-select>

              <v-divider class="my-3" />

              <!-- Curve Color -->
              <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block>
                    <div
                      class="color-swatch mr-2"
                      :style="{ backgroundColor: silhouetteCurveColor }"
                    ></div>
                    Kurve
                  </v-btn>
                </template>
                <v-color-picker
                  v-model="silhouetteCurveColor"
                  mode="hexa"
                  hide-inputs
                />
              </v-menu>

              <!-- Title Color -->
              <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block class="mt-2">
                    <div
                      class="color-swatch mr-2"
                      :style="{ backgroundColor: titleColor }"
                    ></div>
                    Titel
                  </v-btn>
                </template>
                <v-color-picker
                  v-model="titleColor"
                  mode="hexa"
                  hide-inputs
                />
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
                    <div
                      class="color-swatch mr-2"
                      :style="{ backgroundColor: backgroundColor }"
                    ></div>
                    Hintergrundfarbe
                  </v-btn>
                </template>
                <v-color-picker
                  v-model="backgroundColor"
                  mode="hexa"
                  hide-inputs
                />
              </v-menu>

              <!-- Gradient Color -->
              <v-menu v-if="backgroundType === 'gradient'" :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                    <div
                      class="color-swatch mr-2"
                      :style="{ backgroundColor: gradientColor }"
                    ></div>
                    Gradient-Farbe
                  </v-btn>
                </template>
                <v-color-picker
                  v-model="gradientColor"
                  mode="hexa"
                  hide-inputs
                />
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
                      <div
                        class="color-swatch mr-2"
                        :style="{ backgroundColor: patternColor }"
                      ></div>
                      Musterfarbe
                    </v-btn>
                  </template>
                  <v-color-picker
                    v-model="patternColor"
                    mode="hexa"
                    hide-inputs
                  />
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
                <!-- Image Upload / Selection -->
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

                <!-- Image Position -->
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

                <!-- Blur -->
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

                <!-- Brightness -->
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

                <!-- Contrast -->
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

                <!-- Overlay Color -->
                <v-menu v-if="imageOptions?.imageUrl" :close-on-content-click="false">
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-2">
                      <div
                        class="color-swatch mr-2"
                        :style="{ backgroundColor: imageOverlayColor }"
                      ></div>
                      Overlay-Farbe
                    </v-btn>
                  </template>
                  <v-color-picker
                    v-model="imageOverlayColor"
                    mode="hexa"
                    hide-inputs
                  />
                </v-menu>

                <!-- Overlay Opacity -->
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

        <!-- Marker & Labels -->
        <v-expansion-panel value="markers">
          <v-expansion-panel-title>
            <v-icon start size="small">mdi-map-marker</v-icon>
            Marker & Labels
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="panel-stack">
              <v-checkbox
                v-model="showAreaFill"
                label="Fläche füllen"
                density="compact"
                hide-details
                color="primary"
              />
              <v-checkbox
                v-model="animationShowMarker"
                label="Marker anzeigen"
                density="compact"
                hide-details
                color="primary"
              />
              <v-checkbox
                v-model="showElevationLabels"
                label="Höhenmeter anzeigen"
                density="compact"
                hide-details
                color="primary"
              />
              <!-- Elevation Label Color -->
              <v-menu v-if="showElevationLabels" :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                    <div
                      class="color-swatch mr-2"
                      :style="{ backgroundColor: elevationLabelColor }"
                    ></div>
                    Höhenmeter-Farbe
                  </v-btn>
                </template>
                <v-color-picker
                  v-model="elevationLabelColor"
                  mode="hexa"
                  show-swatches
                />
              </v-menu>
              <v-checkbox
                v-model="showDistanceLabels"
                label="Kilometer anzeigen"
                density="compact"
                hide-details
                color="primary"
                class="mt-2"
              />
              <!-- Distance Label Color -->
              <v-menu v-if="showDistanceLabels" :close-on-content-click="false">
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" variant="outlined" block size="small" class="mt-1">
                    <div
                      class="color-swatch mr-2"
                      :style="{ backgroundColor: distanceLabelColor }"
                    ></div>
                    Kilometer-Farbe
                  </v-btn>
                </template>
                <v-color-picker
                  v-model="distanceLabelColor"
                  mode="hexa"
                  show-swatches
                />
              </v-menu>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Momente (Annotations) -->
        <v-expansion-panel value="momente">
          <v-expansion-panel-title>
            <v-icon start size="small">mdi-map-marker-star</v-icon>
            Momente
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="panel-stack">
              <!-- Detection Button -->
              <v-btn
                block
                variant="tonal"
                color="primary"
                prepend-icon="mdi-auto-fix"
                :loading="isDetecting"
                :disabled="chartData.length === 0"
                @click="runDetection"
              >
                Momente erkennen
              </v-btn>

              <!-- Annotation list -->
              <div v-if="annotations && annotations.length > 0" class="annotation-list mt-3">
                <div
                  v-for="annotation in annotations"
                  :key="annotation.id"
                  class="annotation-item"
                >
                  <v-checkbox
                    :model-value="annotation.enabled"
                    density="compact"
                    hide-details
                    color="primary"
                    class="annotation-toggle flex-shrink-0"
                    @update:model-value="toggleAnnotation(annotation.id)"
                  />
                  <v-chip
                    size="x-small"
                    :color="annotationTypeColor(annotation.type)"
                    class="mr-1 flex-shrink-0"
                  >
                    <v-icon size="x-small">{{ annotationTypeIcon(annotation.type) }}</v-icon>
                  </v-chip>
                  <template v-if="editingId === annotation.id">
                    <v-text-field
                      v-model="editingText"
                      density="compact"
                      variant="outlined"
                      hide-details
                      autofocus
                      class="flex-grow-1"
                      @keydown.enter="commitEdit(annotation.id)"
                      @keydown.escape="editingId = null"
                    />
                    <v-btn
                      icon="mdi-check"
                      size="x-small"
                      variant="text"
                      color="success"
                      @click="commitEdit(annotation.id)"
                    />
                  </template>
                  <template v-else>
                    <span
                      class="annotation-text flex-grow-1 text-caption"
                      :class="{ 'text-disabled': !annotation.enabled }"
                    >
                      {{ annotation.text }}
                      <span class="text-grey ml-1">{{ Math.round(annotation.progress * 100) }}%</span>
                    </span>
                    <v-btn
                      icon="mdi-pencil"
                      size="x-small"
                      variant="text"
                      @click="startEdit(annotation)"
                    />
                    <v-btn
                      icon="mdi-delete-outline"
                      size="x-small"
                      variant="text"
                      color="error"
                      @click="deleteAnnotation(annotation.id)"
                    />
                  </template>
                </div>
              </div>

              <!-- Empty state -->
              <div
                v-else
                class="text-caption text-medium-emphasis text-center py-2"
              >
                Keine Momente. Klicke „Momente erkennen" oder füge eigene hinzu.
              </div>

              <v-divider class="my-3" />

              <!-- Add custom annotation -->
              <div class="text-caption text-medium-emphasis mb-1">Eigenen Moment hinzufügen</div>
              <v-text-field
                v-model="newAnnotationText"
                label="Beschriftung"
                density="compact"
                variant="outlined"
                hide-details
                placeholder="z.B. Aussichtspunkt"
                class="mb-2"
              />
              <div class="d-flex align-center gap-2">
                <v-slider
                  v-model="newAnnotationProgress"
                  :min="1"
                  :max="99"
                  :step="1"
                  density="compact"
                  hide-details
                  thumb-label
                  color="primary"
                  class="flex-grow-1"
                />
                <span class="text-caption text-no-wrap ml-2">{{ newAnnotationProgress }}%</span>
              </div>
              <v-btn
                block
                variant="outlined"
                prepend-icon="mdi-plus"
                :disabled="!newAnnotationText.trim()"
                class="mt-2"
                @click="handleAddCustom"
              >
                Hinzufügen
              </v-btn>
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

  <!-- Save Theme Dialog -->
  <SaveThemeDialog
    v-model="showSaveThemeDialog"
    :loading="themesLoading"
    @save="handleSaveTheme"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import type { PropType } from 'vue'
import type { PlaybackSpeed } from '../../composables/useChartAnimation'
import { useElevationConfig } from '../../composables/useElevationConfig'
import { useElevationThemes } from '../../composables/useElevationThemes'
import { uploadService } from '../../services/upload.service'
import type { ElevationAnimationConfig } from './ElevationChartStep.vue'
import type { Annotation, AnnotationType } from '../../utils/chartGenerators/elevationChart/types'
import { detectAnnotations } from '../../utils/chartGenerators/elevationChart/annotationDetection'
import SaveThemeDialog from './SaveThemeDialog.vue'

const props = defineProps({
  animationConfig: {
    type: Object as PropType<ElevationAnimationConfig>,
    required: true,
  },
  chartTitle: {
    type: String,
    required: true,
  },
  chartData: {
    type: Array as PropType<Array<{ label: string; value: number }>>,
    default: () => [],
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
})

const emit = defineEmits<{
  'update:animationConfig': [value: ElevationAnimationConfig]
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
const expandedPanels = ref(['animation', 'colors', 'markers'])
const selectedThemeId = ref<string | null>(null)
const imageUploading = ref(false)
const showSaveThemeDialog = ref(false)

// --- Annotation local state ---
const isDetecting = ref(false)
const newAnnotationProgress = ref(50)
const newAnnotationText = ref('')
const editingId = ref<string | null>(null)
const editingText = ref('')

// --- Config composable ---

function updateAnimationConfig(partial: Partial<ElevationAnimationConfig>) {
  emit('update:animationConfig', { ...props.animationConfig, ...partial })
}

const {
  animationDuration,
  animationEasing,
  animationShowMarker,
  animationMarkerSize,
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
  annotations,
  toggleAnnotation,
  updateAnnotationText,
  deleteAnnotation,
  addCustomAnnotation,
} = useElevationConfig(
  () => props.animationConfig,
  updateAnimationConfig,
)

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
    showMarker: tokens.marker.show,
    markerSize: tokens.marker.size,
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
  const config = props.animationConfig

  let preview = config.backgroundColor
  if (config.backgroundType === 'gradient') {
    preview = `linear-gradient(180deg, ${config.backgroundColor} 0%, ${config.gradientColor} 100%)`
  } else if (config.backgroundType === 'mesh') {
    preview = `linear-gradient(135deg, ${config.meshColor1} 0%, ${config.meshColor2} 50%, ${config.meshColor3} 100%)`
  }

  await createThemeFromCurrentSettings(
    name,
    description || 'Eigenes Theme',
    preview,
    {
      curve: { color: config.curveColor, strokeWidth: 6 },
      marker: { size: config.markerSize, color: config.curveColor, show: config.showMarker },
      background: {
        type: (['solid', 'gradient', 'mesh'].includes(config.backgroundType)
          ? config.backgroundType
          : 'solid') as 'solid' | 'gradient' | 'mesh',
        color: config.backgroundColor,
        gradientColor: config.gradientColor,
        meshColors: [config.meshColor1, config.meshColor2, config.meshColor3],
      },
      labels: {
        elevationColor: config.elevationLabelColor,
        distanceColor: config.distanceLabelColor,
        showElevation: config.showElevationLabels,
        showDistance: config.showDistanceLabels,
      },
      pattern: { color: config.patternColor, opacity: config.patternOpacity },
      animation: { duration: config.duration, easing: config.easing },
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

// --- Annotations ---

async function runDetection() {
  if (props.chartData.length === 0) return
  isDetecting.value = true
  await nextTick()
  const detected = detectAnnotations(props.chartData)
  // Preserve user-edited texts for matching types, keep existing custom annotations
  const existingByType = new Map(
    (annotations.value ?? [])
      .filter(a => a.isAutoGenerated)
      .map(a => [a.type, a])
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
  if (editingText.value.trim()) {
    updateAnnotationText(id, editingText.value.trim())
  }
  editingId.value = null
}

function annotationTypeIcon(type: AnnotationType): string {
  const icons: Record<AnnotationType, string> = {
    summit: 'mdi-triangle',
    steepest_climb: 'mdi-trending-up',
    steepest_descent: 'mdi-trending-down',
    longest_descent: 'mdi-ski-water',
    custom: 'mdi-map-marker',
  }
  return icons[type] ?? 'mdi-map-marker'
}

function annotationTypeColor(type: AnnotationType): string {
  const colors: Record<AnnotationType, string> = {
    summit: 'amber',
    steepest_climb: 'red-lighten-1',
    steepest_descent: 'blue-lighten-1',
    longest_descent: 'cyan-lighten-1',
    custom: 'grey',
  }
  return colors[type] ?? 'grey'
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
/* Sidebar header */
.sidebar-header {
  display: flex;
  align-items: center;
  padding: 12px;
  min-height: 52px;
}

.sidebar-header.collapsed {
  justify-content: center;
}

/* Collapsed controls - icon buttons */
.collapsed-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  flex: 1;
}

/* Expanded controls - scrollable settings area */
.expanded-controls {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* Fixed bottom section for playback + actions */
.sidebar-bottom {
  flex-shrink: 0;
  padding: 0 12px 12px;
}

/* Playback section */
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

/* Action buttons */
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

/* Expansion Panels */
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
  border-radius: var(--radius-sm, 8px);
  border: 1px solid rgba(var(--v-border-color), 0.2);
  flex-shrink: 0;
}

/* Image background preview */
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

/* Navigation drawer content layout */
.controls-sidebar :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
