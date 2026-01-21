<template>
  <v-card flat>
    <v-card-text>
      <div class="text-h5 mb-4">Höhenprofil erstellen</div>

      <!-- Settings Panel -->
      <v-expansion-panels v-model="expandedPanels" multiple class="mb-4">
        <v-expansion-panel value="settings">
          <v-expansion-panel-title>
            <v-icon icon="mdi-cog" class="mr-2"></v-icon>
            Einstellungen
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <ChartSettingsCard
              :chart-title="chartTitle"
              chart-type="elevation"
              :colors="colors"
              :series-config="seriesConfig"
              :silhouette-mode="silhouetteMode"
              @update:chart-title="$emit('update:chartTitle', $event)"
              @update:colors="$emit('update:colors', $event)"
              @update:silhouette-mode="$emit('update:silhouetteMode', $event)"
              @update-series-color="
                (index, color) => $emit('updateSeriesColor', index, color)
              "
              @regenerate-colors="$emit('regenerateColors')"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Animation Preview - PROMINENT -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1 bg-grey-lighten-4 d-flex justify-space-between align-center flex-wrap ga-2">
          <div class="d-flex align-center">
            <v-icon icon="mdi-movie-play" class="mr-2"></v-icon>
            Vorschau
          </div>
          <div class="d-flex align-center flex-wrap ga-2">
            <!-- Layout Mode Toggle -->
            <v-btn-toggle v-model="layoutMode" mandatory density="compact" class="mr-2">
              <v-btn value="silhouette" size="small">
                <v-icon start size="small">mdi-image-filter-hdr</v-icon>
                Silhouette
              </v-btn>
              <v-btn value="free" size="small">
                <v-icon start size="small">mdi-cursor-move</v-icon>
                Frei
              </v-btn>
            </v-btn-toggle>
            <!-- View Mode Toggle -->
            <v-btn-toggle v-model="viewMode" mandatory density="compact" class="mr-2">
              <v-btn value="animate" size="small">
                <v-icon start size="small">mdi-play</v-icon>
                Animation
              </v-btn>
              <v-btn value="static" size="small">
                <v-icon start size="small">mdi-pencil</v-icon>
                Bearbeiten
              </v-btn>
            </v-btn-toggle>
            <v-btn
              icon="mdi-fullscreen"
              size="small"
              variant="text"
              @click="$emit('show-fullscreen')"
            ></v-btn>
          </div>
        </v-card-title>

        <!-- Phone Preview Container -->
        <v-card-text class="d-flex justify-center align-center pa-4 bg-grey-lighten-3">
          <!-- Phone Frame (iPhone 16 / S25 Style) -->
          <div class="phone-frame">
            <!-- Dynamic Island -->
            <div class="dynamic-island"></div>

            <!-- Phone Screen -->
            <div class="phone-screen">
              <!-- Silhouette Mode: Chart at bottom like a horizon -->
              <template v-if="layoutMode === 'silhouette'">
                <div class="silhouette-container">
                  <!-- Gradient background -->
                  <div class="silhouette-background"></div>
                  <!-- Chart at bottom -->
                  <div
                    class="silhouette-chart"
                    :class="{ 'silhouette-chart--editing': viewMode === 'static' }"
                    @click="viewMode === 'static' ? handleChartClick($event) : null"
                    v-html="silhouetteSvg"
                  ></div>
                </div>
              </template>

              <!-- Free Mode: Zoomable and draggable -->
              <template v-else>
                <div
                  class="free-container"
                  @wheel.prevent="onZoom"
                  @mousedown="onDragStart"
                  @mousemove="onDrag"
                  @mouseup="onDragEnd"
                  @mouseleave="onDragEnd"
                >
                  <div
                    class="free-chart"
                    :style="freeChartStyle"
                    :class="{ 'free-chart--editing': viewMode === 'static' }"
                    @click="viewMode === 'static' ? handleChartClick($event) : null"
                    v-html="viewMode === 'animate' ? animationSvg : svgContent"
                  ></div>
                </div>
              </template>
            </div>
          </div>
        </v-card-text>

        <!-- Free Mode Controls -->
        <v-card-text v-if="layoutMode === 'free'" class="pt-0 pb-2">
          <div class="d-flex align-center justify-center ga-2">
            <v-btn icon="mdi-minus" size="small" variant="text" @click="zoomOut" />
            <span class="text-caption" style="min-width: 50px; text-align: center;">{{ Math.round(zoomLevel * 100) }}%</span>
            <v-btn icon="mdi-plus" size="small" variant="text" @click="zoomIn" />
            <v-btn icon="mdi-refresh" size="small" variant="text" @click="resetTransform" class="ml-2">
              Reset
            </v-btn>
          </div>
        </v-card-text>

        <!-- Playback Controls (outside phone) -->
        <v-card-text v-if="viewMode === 'animate'" class="pt-0 pb-2">
          <div class="d-flex align-center justify-center ga-2 mb-3">
            <!-- Play/Pause -->
            <v-btn
              :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
              variant="flat"
              color="primary"
              size="large"
              @click="togglePlayback"
            />
            <!-- Reset -->
            <v-btn
              icon="mdi-replay"
              variant="text"
              size="small"
              @click="resetAnimation"
              :disabled="animationProgress === 0"
            />
            <!-- Progress Slider -->
            <v-slider
              v-model="sliderProgress"
              :min="0"
              :max="100"
              :step="0.1"
              hide-details
              class="flex-grow-1 mx-2"
              style="max-width: 300px;"
              color="primary"
              track-color="grey-lighten-2"
              @update:model-value="onSliderChange"
            />
            <!-- Time -->
            <span class="text-caption" style="min-width: 60px; font-family: monospace;">
              {{ formattedTime }}
            </span>
            <!-- Speed -->
            <v-menu>
              <template v-slot:activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="text" size="small" style="min-width: 48px;">
                  {{ playbackSpeed }}x
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  v-for="speed in speedOptions"
                  :key="speed"
                  :active="playbackSpeed === speed"
                  @click="setSpeed(speed)"
                >
                  <v-list-item-title>{{ speed }}x</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>

          <!-- Animation Settings -->
          <v-row dense>
            <v-col cols="6" sm="3">
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
            </v-col>
            <v-col cols="6" sm="3">
              <v-select
                v-model="animationEasing"
                label="Easing"
                :items="easingOptions"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-switch
                v-model="animationShowMarker"
                label="Marker"
                color="primary"
                hide-details
                density="compact"
              />
            </v-col>
            <v-col cols="6" sm="3" v-if="animationShowMarker">
              <v-text-field
                v-model.number="animationMarkerSize"
                label="Marker-Größe"
                type="number"
                :min="2"
                :max="20"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>

        </v-card-text>

        <!-- Edit Mode Hint -->
        <v-card-text v-else class="pt-0 text-center">
          <div class="text-caption text-grey">
            Klicken Sie auf Elemente zum Bearbeiten
          </div>
        </v-card-text>

        <!-- Instagram Label -->
        <div class="text-center pb-2">
          <span class="text-caption text-grey d-inline-flex align-center">
            <v-icon size="small" class="mr-1">mdi-instagram</v-icon>
            Instagram Story (9:16)
          </span>
        </div>
      </v-card>

      <!-- Element Editor Dialog -->
      <v-dialog v-model="showEditor" max-width="400" persistent>
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ getEditorTitle() }}</span>
            <v-btn icon="mdi-close" variant="text" size="small" @click="closeEditor"></v-btn>
          </v-card-title>
          <v-card-text>
            <!-- Title Editor -->
            <template v-if="selectedElementType === 'title'">
              <v-text-field
                v-model="editingTitle"
                label="Titel-Text"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />
              <v-slider
                v-model="editingFontSize"
                label="Schriftgröße"
                :min="12"
                :max="32"
                :step="1"
                thumb-label
                class="mb-3"
              />
              <v-label class="text-caption mb-1">Ausrichtung</v-label>
              <v-btn-toggle
                v-model="editingAlignment"
                mandatory
                divided
                density="compact"
                class="mb-3"
              >
                <v-btn value="left">
                  <v-icon>mdi-format-align-left</v-icon>
                </v-btn>
                <v-btn value="center">
                  <v-icon>mdi-format-align-center</v-icon>
                </v-btn>
                <v-btn value="right">
                  <v-icon>mdi-format-align-right</v-icon>
                </v-btn>
              </v-btn-toggle>
              <v-label class="text-caption mb-1 d-block">Farbe</v-label>
              <input
                type="color"
                v-model="editingColor"
                class="color-picker-full"
              />
            </template>

            <!-- Data Point Editor (Area for elevation) -->
            <template
              v-else-if="
                ['bar', 'line', 'point', 'slice', 'area'].includes(
                  selectedElementType
                )
              "
            >
              <div class="text-body-2 mb-3">
                <strong>{{ selectedElementLabel || "Datenpunkt" }}</strong>
                <span v-if="selectedElementValue">
                  : {{ selectedElementValue }}</span
                >
              </div>
              <v-label class="text-caption mb-1 d-block">Farbe</v-label>
              <input
                type="color"
                v-model="editingColor"
                class="color-picker-full mb-3"
              />
              <v-switch
                v-model="editingHighlight"
                label="Hervorheben"
                color="primary"
                hide-details
              />
            </template>

            <!-- X-Label Editor -->
            <template v-else-if="selectedElementType === 'x-label'">
              <v-text-field
                v-model="editingLabelText"
                label="Beschriftung"
                variant="outlined"
                density="comfortable"
                class="mb-3"
                disabled
                hint="Label-Text kann derzeit nicht geändert werden"
                persistent-hint
              />
              <v-slider
                v-model="editingRotation"
                label="Rotation"
                :min="-90"
                :max="0"
                :step="5"
                thumb-label
                class="mb-3"
              />
              <v-slider
                v-model="editingXLabelFontSize"
                label="Schriftgröße"
                :min="8"
                :max="16"
                :step="1"
                thumb-label
                class="mb-3"
              />
              <v-label class="text-caption mb-1 d-block">Farbe</v-label>
              <input
                type="color"
                v-model="editingXLabelColor"
                class="color-picker-full"
              />
            </template>

            <!-- Y-Label Editor -->
            <template v-else-if="selectedElementType === 'y-label'">
              <div class="text-body-2 mb-3">
                Wert: <strong>{{ selectedElementValue }}</strong>
              </div>
              <div class="text-caption text-grey">
                Klicken Sie auf die Y-Achse (links), um den Wertebereich anzupassen.
              </div>
            </template>

            <!-- Y-Axis Editor -->
            <template v-else-if="selectedElementType === 'y-axis'">
              <v-text-field
                v-model="editingYAxisTitle"
                label="Y-Achsentitel"
                variant="outlined"
                density="comfortable"
                class="mb-3"
                placeholder="z.B. Höhe (m)"
              />
              <v-text-field
                v-model.number="editingYRangeMin"
                label="Minimum"
                variant="outlined"
                density="comfortable"
                type="number"
                class="mb-3"
                hint="Leer lassen für automatisch"
                persistent-hint
              />
              <v-text-field
                v-model.number="editingYRangeMax"
                label="Maximum"
                variant="outlined"
                density="comfortable"
                type="number"
                hint="Leer lassen für automatisch"
                persistent-hint
              />
            </template>

            <!-- X-Axis Editor -->
            <template v-else-if="selectedElementType === 'x-axis'">
              <v-text-field
                v-model="editingXAxisTitle"
                label="X-Achsentitel"
                variant="outlined"
                density="comfortable"
                placeholder="z.B. Distanz (km)"
              />
            </template>

            <!-- Legend Editor -->
            <template v-else-if="selectedElementType === 'legend'">
              <v-text-field
                v-model="editingLegendLabel"
                label="Anzeigename"
                variant="outlined"
                density="comfortable"
              />
            </template>

            <!-- Background Editor -->
            <template v-else-if="selectedElementType === 'background'">
              <div class="text-body-2 mb-3">
                Hintergrundfarbe kann in den Einstellungen geändert werden.
              </div>
            </template>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" @click="resetElementStyle">
              Zurücksetzen
            </v-btn>
            <v-spacer />
            <v-btn variant="text" @click="closeEditor"> Abbrechen </v-btn>
            <v-btn color="primary" variant="flat" @click="applyElementStyle">
              Anwenden
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card-text>

    <v-card-actions>
      <v-btn variant="text" @click="$emit('back')">
        <v-icon start>mdi-chevron-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn color="secondary" variant="outlined" @click="$emit('reset')">
        Neu starten
      </v-btn>
      <v-btn
        color="success"
        variant="flat"
        prepend-icon="mdi-content-save"
        @click="$emit('save')"
      >
        Speichern
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-download"
        @click="$emit('download')"
      >
        SVG herunterladen
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, watch } from "vue";
import type { PropType } from "vue";
import type { ChartColors } from "../../composables/useChartConfig";
import type {
  SeriesConfig,
  ChartStyleOverrides,
} from "../../utils/chartGenerators/types";
import type { ChartOptions, AnimationOptions } from "@chart-generator/shared";
import { DEFAULT_ANIMATION_OPTIONS } from "@chart-generator/shared";
import ChartSettingsCard from "./ChartCreationStep/ChartSettingsCard.vue";
import { useChartAnimation, type PlaybackSpeed } from "../../composables/useChartAnimation";

0// Settings panel expanded by default
const expandedPanels = ref(["settings"]);

// View mode: 'animate' or 'static'
const viewMode = ref<'animate' | 'static'>('animate');

// Layout mode: 'silhouette' or 'free'
const layoutMode = ref<'silhouette' | 'free'>('silhouette');

// Free positioning mode state
const zoomLevel = ref(0.4);
const panX = ref(0);
const panY = ref(0);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);

// Computed style for free chart positioning
const freeChartStyle = computed(() => ({
  transform: `scale(${zoomLevel.value}) translate(${panX.value}px, ${panY.value}px)`,
}));

// Zoom functions
function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value + 0.1, 2);
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.3);
}

function onZoom(event: WheelEvent) {
  const delta = event.deltaY > 0 ? -0.05 : 0.05;
  zoomLevel.value = Math.max(0.3, Math.min(2, zoomLevel.value + delta));
}

// Drag functions
function onDragStart(event: MouseEvent) {
  if (viewMode.value === 'static') return; // Don't drag in edit mode
  isDragging.value = true;
  dragStartX.value = event.clientX - panX.value;
  dragStartY.value = event.clientY - panY.value;
}

function onDrag(event: MouseEvent) {
  if (!isDragging.value) return;
  panX.value = event.clientX - dragStartX.value;
  panY.value = event.clientY - dragStartY.value;
}

function onDragEnd() {
  isDragging.value = false;
}

function resetTransform() {
  zoomLevel.value = 0.4;
  panX.value = 0;
  panY.value = 0;
}

// Animation settings state
const animationDuration = ref(5);
const animationEasing = ref<'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'>('ease-in-out');
const animationShowMarker = ref(true);
const animationMarkerSize = ref(6);

// Curve endpoint setting: percentage of screen height where the curve ends (0-100)
// 0 = natural elevation (no stretching), 100 = top of screen
const curveEndpoint = ref<number>(50);  // Start at middle

const easingOptions = [
  { title: 'Linear', value: 'linear' },
  { title: 'Ease In', value: 'ease-in' },
  { title: 'Ease Out', value: 'ease-out' },
  { title: 'Ease In-Out', value: 'ease-in-out' },
];

// Speed options for playback
const speedOptions: PlaybackSpeed[] = [0.25, 0.5, 1, 1.5, 2];

// Slider progress state
const sliderProgress = ref(0);

// ===== Interactive Editing State =====
const showEditor = ref(false);
const selectedElement = ref<Element | null>(null);
const selectedElementType = ref<string>("");
const selectedElementId = ref<string>("");
const selectedElementLabel = ref<string>("");
const selectedElementValue = ref<string>("");
const selectedElementSeries = ref<string>("");
const selectedElementIndex = ref<number>(-1);

// Editor form state
const editingTitle = ref("");
const editingFontSize = ref(20);
const editingAlignment = ref<"left" | "center" | "right">("center");
const editingColor = ref("#1F2937");
const editingHighlight = ref(false);
const editingLabelText = ref("");
const editingRotation = ref(-45);
const editingLegendLabel = ref("");

// X-Achsen-Label Editor state
const editingXLabelColor = ref("#4B5563");
const editingXLabelFontSize = ref(10);

// Y-Achsen Editor state
const editingYRangeMin = ref<number | undefined>(undefined);
const editingYRangeMax = ref<number | undefined>(undefined);

// Achsentitel Editor state
const editingXAxisTitle = ref("");
const editingYAxisTitle = ref("");

// Handle chart element click
function handleChartClick(event: MouseEvent) {
  const target = event.target as SVGElement;
  const editableElement = target.closest('[data-editable="true"]');

  if (!editableElement) {
    closeEditor();
    return;
  }

  // Get element info from data attributes
  const elementType = editableElement.getAttribute("data-type") || "";
  const elementId = editableElement.id || "";
  const elementLabel = editableElement.getAttribute("data-label") || "";
  const elementValue = editableElement.getAttribute("data-value") || "";
  const elementSeries = editableElement.getAttribute("data-series") || "";
  const elementIndex = parseInt(
    editableElement.getAttribute("data-index") || "-1"
  );

  // Update selection state
  selectedElement.value = editableElement;
  selectedElementType.value = elementType;
  selectedElementId.value = elementId;
  selectedElementLabel.value = elementLabel;
  selectedElementValue.value = elementValue;
  selectedElementSeries.value = elementSeries;
  selectedElementIndex.value = elementIndex;

  // Highlight selected element
  highlightElement(editableElement);

  // Initialize editor form based on element type
  initializeEditorForm(elementType, editableElement);

  nextTick(() => {
    showEditor.value = true;
  });
}

function highlightElement(element: Element) {
  // Remove previous highlight
  document.querySelectorAll(".chart-element-selected").forEach((el) => {
    el.classList.remove("chart-element-selected");
  });
  // Add highlight to selected element
  element.classList.add("chart-element-selected");
}

function initializeEditorForm(elementType: string, element: Element) {
  const overrides = props.styleOverrides;

  switch (elementType) {
    case "title":
      editingTitle.value =
        overrides?.title?.text || element.textContent?.trim() || "";
      editingFontSize.value = overrides?.title?.fontSize || 20;
      editingAlignment.value = overrides?.title?.alignment || "center";
      editingColor.value = overrides?.title?.color || "#1F2937";
      break;

    case "bar":
    case "line":
    case "point":
    case "slice":
    case "area":
      const seriesNameInit = selectedElementSeries.value;
      if (seriesNameInit) {
        const seriesOverride = overrides?.series?.[seriesNameInit];
        editingColor.value =
          seriesOverride?.color ||
          element.getAttribute("fill") ||
          element.getAttribute("stroke") ||
          "#4F46E5";
        editingHighlight.value = false;
      } else {
        const index = selectedElementIndex.value;
        const dpOverride = overrides?.dataPoints?.[index];
        editingColor.value =
          dpOverride?.color ||
          element.getAttribute("fill") ||
          element.getAttribute("stroke") ||
          "#4F46E5";
        editingHighlight.value = dpOverride?.highlight || false;
      }
      break;

    case "x-label":
      editingLabelText.value =
        element.getAttribute("data-label") || element.textContent?.trim() || "";
      editingRotation.value = overrides?.xAxis?.labels?.rotation ?? -45;
      editingXLabelFontSize.value = overrides?.xAxis?.labels?.fontSize ?? 10;
      editingXLabelColor.value = overrides?.xAxis?.labels?.color ?? "#4B5563";
      break;

    case "y-label":
      editingLabelText.value =
        element.getAttribute("data-label") || element.textContent?.trim() || "";
      break;

    case "y-axis":
      editingYAxisTitle.value = overrides?.yAxis?.title?.text ?? "";
      editingYRangeMin.value = overrides?.yAxis?.range?.min;
      editingYRangeMax.value = overrides?.yAxis?.range?.max;
      break;

    case "x-axis":
      editingXAxisTitle.value = overrides?.xAxis?.title?.text ?? "";
      break;

    case "legend":
      editingLegendLabel.value =
        overrides?.legend?.labels?.[selectedElementSeries.value] ||
        selectedElementSeries.value;
      break;
  }
}

function closeEditor() {
  showEditor.value = false;
  document.querySelectorAll(".chart-element-selected").forEach((el) => {
    el.classList.remove("chart-element-selected");
  });
  selectedElement.value = null;
}

function applyElementStyle() {
  const elementType = selectedElementType.value;
  const currentOverrides = props.styleOverrides || {};
  let newOverrides: ChartStyleOverrides;

  switch (elementType) {
    case "title":
      newOverrides = {
        ...currentOverrides,
        title: {
          text: editingTitle.value,
          fontSize: editingFontSize.value,
          alignment: editingAlignment.value,
          color: editingColor.value,
        },
      };
      break;

    case "bar":
    case "line":
    case "point":
    case "slice":
    case "area":
      const seriesName = selectedElementSeries.value;
      if (seriesName) {
        newOverrides = {
          ...currentOverrides,
          series: {
            ...currentOverrides.series,
            [seriesName]: {
              ...currentOverrides.series?.[seriesName],
              color: editingColor.value,
            },
          },
        };
      } else {
        const index = selectedElementIndex.value;
        newOverrides = {
          ...currentOverrides,
          dataPoints: {
            ...currentOverrides.dataPoints,
            [index]: {
              ...currentOverrides.dataPoints?.[index],
              color: editingColor.value,
              highlight: editingHighlight.value,
            },
          },
        };
      }
      break;

    case "x-label":
      newOverrides = {
        ...currentOverrides,
        xAxis: {
          ...currentOverrides.xAxis,
          labels: {
            ...currentOverrides.xAxis?.labels,
            rotation: editingRotation.value,
            fontSize: editingXLabelFontSize.value,
            color: editingXLabelColor.value,
          },
        },
      };
      break;

    case "y-axis":
      newOverrides = {
        ...currentOverrides,
        yAxis: {
          ...currentOverrides.yAxis,
          title: editingYAxisTitle.value
            ? { ...currentOverrides.yAxis?.title, text: editingYAxisTitle.value }
            : currentOverrides.yAxis?.title,
          range:
            editingYRangeMin.value !== undefined || editingYRangeMax.value !== undefined
              ? {
                  min: editingYRangeMin.value,
                  max: editingYRangeMax.value,
                }
              : undefined,
        },
      };
      break;

    case "x-axis":
      newOverrides = {
        ...currentOverrides,
        xAxis: {
          ...currentOverrides.xAxis,
          title: editingXAxisTitle.value
            ? { ...currentOverrides.xAxis?.title, text: editingXAxisTitle.value }
            : currentOverrides.xAxis?.title,
        },
      };
      break;

    case "legend":
      newOverrides = {
        ...currentOverrides,
        legend: {
          ...currentOverrides.legend,
          labels: {
            ...currentOverrides.legend?.labels,
            [selectedElementSeries.value]: editingLegendLabel.value,
          },
        },
      };
      break;

    default:
      newOverrides = currentOverrides;
  }

  emit("update:styleOverrides", newOverrides);
  closeEditor();
}

function resetElementStyle() {
  const elementType = selectedElementType.value;
  const currentOverrides = props.styleOverrides || {};
  let newOverrides: ChartStyleOverrides;

  switch (elementType) {
    case "title":
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { title: _t, ...restWithoutTitle } = currentOverrides;
      newOverrides = restWithoutTitle;
      break;

    case "bar":
    case "line":
    case "point":
    case "slice":
    case "area":
      const index = selectedElementIndex.value;
      if (currentOverrides.dataPoints) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [index]: _removed, ...restPoints } = currentOverrides.dataPoints;
        newOverrides = {
          ...currentOverrides,
          dataPoints: restPoints,
        };
      } else {
        newOverrides = currentOverrides;
      }
      break;

    default:
      newOverrides = currentOverrides;
  }

  emit("update:styleOverrides", newOverrides);
  closeEditor();
}

function getEditorTitle(): string {
  switch (selectedElementType.value) {
    case "title":
      return "Titel bearbeiten";
    case "bar":
      return "Balken bearbeiten";
    case "line":
      return "Linie bearbeiten";
    case "point":
      return "Datenpunkt bearbeiten";
    case "slice":
      return "Segment bearbeiten";
    case "area":
      return "Fläche bearbeiten";
    case "x-label":
      return "X-Achsen-Label bearbeiten";
    case "y-label":
      return "Y-Achsen-Wert";
    case "y-axis":
      return "Y-Achse bearbeiten";
    case "x-axis":
      return "X-Achse bearbeiten";
    case "legend":
      return "Legende bearbeiten";
    case "background":
      return "Hintergrund bearbeiten";
    default:
      return "Element bearbeiten";
  }
}

const props = defineProps({
  chartTitle: {
    type: String,
    required: true,
  },
  colors: {
    type: Object as PropType<ChartColors>,
    required: true,
  },
  svgContent: {
    type: String,
    required: true,
  },
  seriesConfig: {
    type: Array as PropType<SeriesConfig[]>,
    default: () => [],
  },
  silhouetteMode: {
    type: Boolean,
    default: false,
  },
  styleOverrides: {
    type: Object as PropType<ChartStyleOverrides>,
    default: () => ({}),
  },
  chartData: {
    type: Array as PropType<Array<{ label: string; value: number }>>,
    default: () => [],
  },
});

// Computed properties for animation
// Use layoutMode to determine silhouetteMode so animation matches the UI layout
const chartOptionsForAnimation = computed<ChartOptions>(() => ({
  data: props.chartData,
  colors: {
    // Include primary color from seriesConfig for the animation curve
    primary: props.seriesConfig[0]?.color || '#2E7D32',
    secondary: '#818CF8',
    background: props.colors.background,
  },
  title: props.chartTitle,
  silhouetteMode: layoutMode.value === 'silhouette',
  styleOverrides: props.styleOverrides,
}));

const animationSettings = computed<AnimationOptions>(() => ({
  ...DEFAULT_ANIMATION_OPTIONS,
  enabled: true,
  durationMs: animationDuration.value * 1000,
  fps: 30,
  easing: animationEasing.value,
  showMarker: animationShowMarker.value,
  markerSize: animationMarkerSize.value,
  markerColor: '#ffffff',
  curveEndpoint: curveEndpoint.value,
}));

// Use the animation composable
const animation = useChartAnimation(
  chartOptionsForAnimation,
  animationSettings
);

// Animation controls
const animationSvg = computed(() => animation.currentSvg.value);
const isPlaying = computed(() => animation.isPlaying.value);
const animationProgress = computed(() => animation.progress.value);
const playbackSpeed = computed(() => animation.playbackSpeed.value);
const formattedTime = computed(() => animation.formattedTime.value);


// Silhouette SVG - modified version for silhouette display
const silhouetteSvg = computed(() => {
  // In animation mode with silhouette layout, the animation composable already generates
  // the correct silhouette SVG with clip-path animation - use it directly
  if (viewMode.value === 'animate') {
    return animationSvg.value || '';
  }

  // In static/edit mode, transform the standard SVG for silhouette display
  const baseSvg = props.svgContent;
  if (!baseSvg) return '';

  // Parse the SVG and modify it for silhouette display
  const parser = new DOMParser();
  const doc = parser.parseFromString(baseSvg, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return baseSvg;

  // Hide elements we don't want in silhouette mode
  const elementsToHide = [
    '#x-axis', '#y-axis',
    '#x-axis-title', '#y-axis-title',
    '#chart-title', '#elevation-stats', '#chart-background'
  ];

  elementsToHide.forEach(selector => {
    const el = svg.querySelector(selector);
    if (el) el.setAttribute('opacity', '0');
  });

  // Hide all labels and grid lines
  svg.querySelectorAll('[id^="x-label"], [id^="y-label"], [id^="grid-line"]').forEach(el => {
    el.setAttribute('opacity', '0');
  });

  // Style the elevation curve for silhouette look
  const elevationArea = svg.querySelector('#elevation-area');
  if (elevationArea) {
    elevationArea.setAttribute('fill', 'url(#silhouette-gradient)');
  }

  const elevationLine = svg.querySelector('#elevation-line');
  if (elevationLine) {
    elevationLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.9)');
    elevationLine.setAttribute('stroke-width', '2');
  }

  // Add a gradient definition for the silhouette fill
  const defs = svg.querySelector('defs') || doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
  if (!svg.querySelector('defs')) {
    svg.insertBefore(defs, svg.firstChild);
  }

  // Create silhouette gradient
  const gradient = doc.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.setAttribute('id', 'silhouette-gradient');
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '0%');
  gradient.setAttribute('y2', '100%');

  const stop1 = doc.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', 'rgba(255, 255, 255, 0.3)');

  const stop2 = doc.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', 'rgba(255, 255, 255, 0.05)');

  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);

  // Serialize back to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
});

// Sync slider with animation progress
watch(() => animation.progress.value, (newProgress) => {
  sliderProgress.value = newProgress * 100;
});

function togglePlayback() {
  animation.toggle();
}

function resetAnimation() {
  animation.reset();
}

function onSliderChange(value: number) {
  animation.seekTo(value / 100);
}

function setSpeed(speed: PlaybackSpeed) {
  animation.setSpeed(speed);
}

const emit = defineEmits<{
  back: [];
  reset: [];
  download: [];
  save: [];
  "show-fullscreen": [];
  "update:chartTitle": [value: string];
  "update:colors": [value: ChartColors];
  "update:silhouetteMode": [value: boolean];
  "update:styleOverrides": [value: ChartStyleOverrides];
  updateSeriesColor: [index: number, color: string];
  regenerateColors: [];
}>();
</script>

<style scoped>
/* iPhone 16 / Samsung S25 Style Phone Frame */
.phone-frame {
  position: relative;
  width: 240px; /* Scaled for preview */
  height: 520px; /* ~19.5:9 aspect ratio like modern phones */
  background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
  border-radius: 44px;
  padding: 4px;
  box-shadow:
    0 0 0 1px #444,
    0 20px 60px rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* Dynamic Island (iPhone 16 style) */
.dynamic-island {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 28px;
  background: #000;
  border-radius: 20px;
  z-index: 10;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.dynamic-island::before {
  content: '';
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  background: radial-gradient(circle, #1a3a1a 0%, #0a1a0a 100%);
  border-radius: 50%;
  box-shadow: 0 0 2px 1px rgba(0, 100, 0, 0.3);
}

.phone-screen {
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 40px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ===== Silhouette Mode ===== */
.silhouette-container {
  flex: 1;
  position: relative;
  margin: 2px;
  border-radius: 38px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.silhouette-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    #0f0c29 0%,
    #302b63 50%,
    #24243e 100%
  );
  z-index: 0;
}


.silhouette-chart {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 0;
  /* Add bottom margin to leave space for Instagram menu */
  margin-bottom: 40px;
}

.silhouette-chart :deep(svg) {
  width: 100% !important;
  height: auto !important;
  display: block;
}

.silhouette-chart--editing :deep([data-editable="true"]) {
  cursor: pointer;
}

.silhouette-chart--editing :deep([data-editable="true"]:hover) {
  opacity: 0.8;
}

/* ===== Free Mode ===== */
.free-container {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 2px;
  border-radius: 38px;
  overflow: hidden;
  background: #f5f5f5;
  cursor: grab;
}

.free-container:active {
  cursor: grabbing;
}

.free-chart {
  transition: transform 0.1s ease-out;
  will-change: transform;
  display: flex;
  justify-content: center;
  align-items: center;
}

.free-chart :deep(svg) {
  max-width: none !important;
  width: auto !important;
  height: auto !important;
}

.free-chart--editing {
  cursor: default;
}

.free-chart--editing :deep([data-editable="true"]) {
  cursor: pointer;
}

.free-chart--editing :deep([data-editable="true"]:hover) {
  opacity: 0.8;
}

/* ===== Legacy Preview Container ===== */
.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
}

.preview-container :deep(svg) {
  width: 100% !important;
  height: auto !important;
  max-height: 100%;
}

/* Interactive editing styles */
.preview-container :deep([data-editable="true"]) {
  cursor: pointer;
  transition: opacity 0.2s, filter 0.2s;
}

.preview-container :deep([data-editable="true"]:hover) {
  opacity: 0.7;
}

.preview-container :deep(.chart-element-selected) {
  filter: drop-shadow(0 0 4px rgba(33, 150, 243, 0.8));
  opacity: 1 !important;
}

/* Color picker styling */
.color-picker-full {
  width: 100%;
  height: 40px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
}

.color-picker-full::-webkit-color-swatch-wrapper {
  padding: 4px;
}

.color-picker-full::-webkit-color-swatch {
  border-radius: 2px;
  border: none;
}
</style>
