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
              />
            </template>

            <!-- Y-Label Editor -->
            <template v-else-if="selectedElementType === 'y-label'">
              <div class="text-body-2">
                Wert: <strong>{{ selectedElementValue }}</strong>
              </div>
              <div class="text-caption text-grey mt-2">
                Y-Achsen-Werte werden automatisch berechnet.
              </div>
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
import { ref, nextTick } from "vue";
import type { PropType } from "vue";
import type {
  ChartType,
  ChartColors,
} from "../../../composables/useChartConfig";
import type {
  SeriesConfig,
  StatisticalOverlays,
  ChartStyleOverrides,
  TitleStyleOverride,
  DataPointStyleOverride,
} from "../../../utils/chartGenerators/types";
import ChartSettingsCard from "./ChartSettingsCard.vue";
import StatisticalOverlaysCard from "./StatisticalOverlaysCard.vue";

// Both panels expanded by default
const expandedPanels = ref(["settings", "overlays"]);

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

// Style overrides (local state, will be passed up via emit)
const localStyleOverrides = ref<ChartStyleOverrides>({});

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
  const overrides = localStyleOverrides.value;

  switch (elementType) {
    case "title":
      editingTitle.value =
        overrides.title?.text || element.textContent?.trim() || "";
      editingFontSize.value = overrides.title?.fontSize || 20;
      editingAlignment.value = overrides.title?.alignment || "center";
      editingColor.value = overrides.title?.color || "#1F2937";
      break;

    case "bar":
    case "line":
    case "point":
    case "slice":
    case "area":
      const index = selectedElementIndex.value;
      const dpOverride = overrides.dataPoints?.[index];
      editingColor.value =
        dpOverride?.color ||
        element.getAttribute("fill") ||
        element.getAttribute("stroke") ||
        "#4F46E5";
      editingHighlight.value = dpOverride?.highlight || false;
      break;

    case "x-label":
    case "y-label":
      editingLabelText.value =
        element.getAttribute("data-label") || element.textContent?.trim() || "";
      editingRotation.value = -45;
      break;

    case "legend":
      editingLegendLabel.value =
        overrides.legend?.labels?.[selectedElementSeries.value] ||
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

  switch (elementType) {
    case "title":
      localStyleOverrides.value = {
        ...localStyleOverrides.value,
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
      const index = selectedElementIndex.value;
      localStyleOverrides.value = {
        ...localStyleOverrides.value,
        dataPoints: {
          ...localStyleOverrides.value.dataPoints,
          [index]: {
            ...localStyleOverrides.value.dataPoints?.[index],
            color: editingColor.value,
            highlight: editingHighlight.value,
          },
        },
      };
      break;

    case "x-label":
      localStyleOverrides.value = {
        ...localStyleOverrides.value,
        xAxis: {
          ...localStyleOverrides.value.xAxis,
          labels: {
            ...localStyleOverrides.value.xAxis?.labels,
            rotation: editingRotation.value,
          },
        },
      };
      break;

    case "legend":
      localStyleOverrides.value = {
        ...localStyleOverrides.value,
        legend: {
          ...localStyleOverrides.value.legend,
          labels: {
            ...localStyleOverrides.value.legend?.labels,
            [selectedElementSeries.value]: editingLegendLabel.value,
          },
        },
      };
      break;
  }

  // Emit the updated style overrides
  emit("update:styleOverrides", localStyleOverrides.value);
  closeEditor();
}

function resetElementStyle() {
  const elementType = selectedElementType.value;

  switch (elementType) {
    case "title":
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { title: _t, ...restWithoutTitle } = localStyleOverrides.value;
      localStyleOverrides.value = restWithoutTitle;
      break;

    case "bar":
    case "line":
    case "point":
    case "slice":
    case "area":
      const index = selectedElementIndex.value;
      if (localStyleOverrides.value.dataPoints) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [index]: _removed, ...restPoints } =
          localStyleOverrides.value.dataPoints;
        localStyleOverrides.value = {
          ...localStyleOverrides.value,
          dataPoints: restPoints,
        };
      }
      break;
  }

  emit("update:styleOverrides", localStyleOverrides.value);
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
      return "Y-Achsen-Label bearbeiten";
    case "legend":
      return "Legende bearbeiten";
    case "background":
      return "Hintergrund bearbeiten";
    default:
      return "Element bearbeiten";
  }
}

defineProps({
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
});

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
  background: #f5f5f5;
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
