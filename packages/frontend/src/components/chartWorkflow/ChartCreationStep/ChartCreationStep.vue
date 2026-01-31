<template>
  <v-card flat>
    <v-card-text>
      <div class="text-h5 mb-4">Chart erstellen</div>

      <v-expansion-panels v-model="expandedPanels" multiple class="mb-4">
        <!-- Chart Settings -->
        <v-expansion-panel value="settings">
          <v-expansion-panel-title>
            <v-icon icon="mdi-cog" class="mr-2"></v-icon>
            Einstellungen
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <ChartSettingsCard
              :chart-title="chartTitle"
              :chart-type="chartType"
              :colors="colors"
              :series-config="seriesConfig"
              :silhouette-mode="silhouetteMode"
              @update:chart-title="$emit('update:chartTitle', $event)"
              @update:chart-type="$emit('update:chartType', $event)"
              @update:colors="$emit('update:colors', $event)"
              @update:silhouette-mode="$emit('update:silhouetteMode', $event)"
              @update-series-color="
                (index, color) => $emit('updateSeriesColor', index, color)
              "
              @regenerate-colors="$emit('regenerateColors')"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Statistical Overlays (not available for pie charts) -->
        <v-expansion-panel v-if="chartType !== 'pie'" value="overlays">
          <v-expansion-panel-title>
            <v-icon icon="mdi-chart-timeline-variant" class="mr-2"></v-icon>
            Statistische Overlays
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <StatisticalOverlaysCard
              :chart-type="chartType"
              :statistical-overlays="statisticalOverlays"
              :data-extent="dataExtent"
              @update:statistical-overlays="
                $emit('update:statisticalOverlays', $event)
              "
            />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Animation Preview (only for elevation charts) -->
        <v-expansion-panel v-if="chartType === 'elevation'" value="animation">
          <v-expansion-panel-title>
            <v-icon icon="mdi-movie-play" class="mr-2"></v-icon>
            Animation Preview
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <AnimationPreview
              :chart-options="chartOptionsForAnimation"
              :animation-options="animationSettings"
            />
            <v-row class="mt-4">
              <v-col cols="6">
                <v-text-field
                  v-model.number="animationDuration"
                  label="Dauer (Sekunden)"
                  type="number"
                  :min="1"
                  :max="30"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="animationEasing"
                  label="Easing"
                  :items="easingOptions"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
            <v-row class="mt-2">
              <v-col cols="6">
                <v-switch
                  v-model="animationShowMarker"
                  label="Marker anzeigen"
                  color="primary"
                  hide-details
                  density="compact"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-if="animationShowMarker"
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
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Chart Preview with Interactive Editing -->
      <v-card variant="outlined">
        <v-card-title
          class="text-subtitle-1 bg-grey-lighten-4 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon icon="mdi-eye" class="mr-2"></v-icon>
            Vorschau
            <span class="text-caption ml-2 text-grey"
              >(Klicken Sie auf Elemente zum Bearbeiten)</span
            >
          </div>
          <v-btn
            icon="mdi-fullscreen"
            size="small"
            variant="text"
            @click="$emit('show-fullscreen')"
          ></v-btn>
        </v-card-title>
        <v-card-text class="pa-6">
          <div
            class="preview-container"
            @click="handleChartClick"
            v-html="svgContent"
            :key="JSON.stringify(styleOverrides)"
          ></div>
        </v-card-text>
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

            <!-- Data Point Editor (Bars, Lines, Points, Slices) -->
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

            <!-- Y-Label Editor (click on y-axis value) -->
            <template v-else-if="selectedElementType === 'y-label'">
              <div class="text-body-2 mb-3">
                Wert: <strong>{{ selectedElementValue }}</strong>
              </div>
              <div class="text-caption text-grey">
                Klicken Sie auf die Y-Achse (links), um den Wertebereich anzupassen.
              </div>
            </template>

            <!-- Y-Axis Editor (click on y-axis area) -->
            <template v-else-if="selectedElementType === 'y-axis'">
              <v-text-field
                v-model="editingYAxisTitle"
                label="Y-Achsentitel"
                variant="outlined"
                density="comfortable"
                class="mb-3"
                placeholder="z.B. Umsatz in €"
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

            <!-- X-Axis Editor (click on x-axis area) -->
            <template v-else-if="selectedElementType === 'x-axis'">
              <v-text-field
                v-model="editingXAxisTitle"
                label="X-Achsentitel"
                variant="outlined"
                density="comfortable"
                placeholder="z.B. Monat"
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
import { ref, nextTick, computed } from "vue";
import type { PropType } from "vue";
import type {
  ChartType,
  ChartColors,
} from "../../../composables/useChartConfig";
import type {
  SeriesConfig,
  StatisticalOverlays,
  ChartStyleOverrides,
} from "../../../utils/chartGenerators/types";
import type { ChartOptions, AnimationOptions } from "@chart-generator/shared";
import ChartSettingsCard from "./ChartSettingsCard.vue";
import StatisticalOverlaysCard from "./StatisticalOverlaysCard.vue";
import AnimationPreview from "../../AnimationPreview.vue";

// Both panels expanded by default
const expandedPanels = ref(["settings", "overlays"]);

// Animation settings state
const animationDuration = ref(5);
const animationEasing = ref<'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'>('ease-in-out');
const animationShowMarker = ref(true);
const animationMarkerSize = ref(6);

const easingOptions = [
  { title: 'Linear', value: 'linear' },
  { title: 'Ease In', value: 'ease-in' },
  { title: 'Ease Out', value: 'ease-out' },
  { title: 'Ease In-Out', value: 'ease-in-out' },
];

// ===== Interactive Editing State =====
const showEditor = ref(false);
const editorPosition = ref({ x: 0, y: 0 });
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

// Use props.styleOverrides directly, emit changes to parent

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

  // Position and show editor
  const rect = editableElement.getBoundingClientRect();
  editorPosition.value = {
    x: rect.left + rect.width / 2,
    y: rect.top,
  };

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
      // Check if this is a multi-series element
      const seriesNameInit = selectedElementSeries.value;
      if (seriesNameInit) {
        // Multi-series mode: read from series[seriesName]
        const seriesOverride = overrides?.series?.[seriesNameInit];
        editingColor.value =
          seriesOverride?.color ||
          element.getAttribute("fill") ||
          element.getAttribute("stroke") ||
          "#4F46E5";
        editingHighlight.value = false;
      } else {
        // Single-series mode: read from dataPoints[index]
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
  // Remove highlight
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
      // Check if this is a multi-series element (has series name)
      const seriesName = selectedElementSeries.value;
      if (seriesName) {
        // Multi-series mode: store under series[seriesName]
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
        // Single-series mode: store under dataPoints[index]
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

  // Emit the updated style overrides
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

// Get editor title based on element type
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
  chartType: {
    type: String as PropType<ChartType>,
    required: true,
  },
  colors: {
    type: Object as PropType<ChartColors>,
    required: true,
  },
  statisticalOverlays: {
    type: Object as PropType<StatisticalOverlays>,
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
  dataExtent: {
    type: Array as PropType<[number, number]>,
    default: () => [0, 100],
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
const chartOptionsForAnimation = computed<ChartOptions>(() => ({
  data: props.chartData,
  colors: props.colors,
  title: props.chartTitle,
  silhouetteMode: props.silhouetteMode,
  styleOverrides: props.styleOverrides,
  statisticalOverlays: props.statisticalOverlays,
}));

const animationSettings = computed<AnimationOptions>(() => ({
  enabled: true,
  durationMs: animationDuration.value * 1000,
  fps: 30,
  easing: animationEasing.value,
  showMarker: animationShowMarker.value,
  markerSize: animationMarkerSize.value,
  markerColor: '#ffffff',
}));

const emit = defineEmits<{
  back: [];
  reset: [];
  download: [];
  save: [];
  "show-fullscreen": [];
  "update:chartTitle": [value: string];
  "update:chartType": [value: ChartType];
  "update:colors": [value: ChartColors];
  "update:statisticalOverlays": [value: StatisticalOverlays];
  "update:silhouetteMode": [value: boolean];
  "update:styleOverrides": [value: ChartStyleOverrides];
  updateSeriesColor: [index: number, color: string];
  regenerateColors: [];
}>();

</script>

<style scoped>
.preview-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  min-height: 400px;
  background: var(--color-surface-variant, #f5f5f5);
  border-radius: 8px;
  padding: 20px;
  overflow-x: auto;
  overflow-y: hidden;
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
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));
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
