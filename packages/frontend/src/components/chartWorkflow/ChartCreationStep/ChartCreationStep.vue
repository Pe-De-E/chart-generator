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

      <!-- Chart Preview -->
      <!-- ===================================================================
           TODO [3/6]: Click-Handler für interaktive Bearbeitung
           ===================================================================

           Der Preview-Container braucht einen Click-Handler, der erkennt
           welches SVG-Element angeklickt wurde und das passende Editor-Panel öffnet.

           Implementierung:

           1. Click-Handler auf dem Container (Event Delegation):
              @click="handleChartClick"

           2. handleChartClick Funktion:
              function handleChartClick(event: MouseEvent) {
                const target = event.target as SVGElement
                const editableElement = target.closest('[data-editable="true"]')

                if (!editableElement) return

                const elementType = editableElement.getAttribute('data-type')
                const elementId = editableElement.id

                // Passenden Editor öffnen
                switch (elementType) {
                  case 'title':
                    openTitleEditor()
                    break
                  case 'bar':
                  case 'line':
                  case 'point':
                    openDataPointEditor(editableElement)
                    break
                  case 'x-label':
                  case 'y-label':
                    openLabelEditor(editableElement)
                    break
                  case 'legend':
                    openLegendEditor(editableElement)
                    break
                }
              }

           3. Visuelles Feedback bei Hover:
              CSS in <style>:
              .preview-container :deep([data-editable="true"]) {
                cursor: pointer;
                transition: opacity 0.2s;
              }
              .preview-container :deep([data-editable="true"]:hover) {
                opacity: 0.7;
              }

           4. Ausgewähltes Element hervorheben:
              - Beim Klick: Rahmen oder Glow-Effekt um das Element
              - selectedElement ref speichert die aktuelle Auswahl
           =================================================================== -->
      <v-card variant="outlined">
        <v-card-title
          class="text-subtitle-1 bg-grey-lighten-4 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon icon="mdi-eye" class="mr-2"></v-icon>
            Vorschau
          </div>
          <v-btn
            icon="mdi-fullscreen"
            size="small"
            variant="text"
            @click="$emit('show-fullscreen')"
          ></v-btn>
        </v-card-title>
        <v-card-text class="pa-6">
          <!-- TODO: @click="handleChartClick" hinzufügen -->
          <div class="preview-container" v-html="svgContent"></div>
        </v-card-text>
      </v-card>

      <!-- ===================================================================
           TODO [4/6]: Editor-Dialog/Popover für angeklickte Elemente
           ===================================================================

           Ein Vuetify v-menu oder v-dialog, das beim Klick auf ein Element erscheint
           und die passenden Bearbeitungsoptionen anzeigt.

           Komponenten-Struktur:

           <v-menu v-model="showEditor" :activator="editorActivator" location="top">
             <v-card min-width="300">
               <v-card-title>{{ editorTitle }}</v-card-title>
               <v-card-text>

                 <! Titel-Editor >
                 <template v-if="selectedElementType === 'title'">
                   <v-text-field v-model="editingTitle" label="Titel" />
                   <v-slider v-model="editingFontSize" label="Schriftgröße"
                             :min="12" :max="32" />
                   <v-btn-toggle v-model="editingAlignment">
                     <v-btn value="left"><v-icon>mdi-format-align-left</v-icon></v-btn>
                     <v-btn value="center"><v-icon>mdi-format-align-center</v-icon></v-btn>
                     <v-btn value="right"><v-icon>mdi-format-align-right</v-icon></v-btn>
                   </v-btn-toggle>
                   <input type="color" v-model="editingColor" />
                 </template>

                 <! Datenpunkt-Editor (Balken, Linien, Punkte) >
                 <template v-else-if="['bar', 'line', 'point'].includes(selectedElementType)">
                   <div class="text-caption mb-2">
                     {{ selectedElementLabel }}: {{ selectedElementValue }}
                   </div>
                   <v-label class="text-caption">Farbe</v-label>
                   <input type="color" v-model="editingColor" class="color-picker-full" />
                   <v-switch v-model="editingHighlight" label="Hervorheben" />
                 </template>

                 <! Label-Editor (Achsenbeschriftungen) >
                 <template v-else-if="selectedElementType === 'x-label'">
                   <v-text-field v-model="editingLabelText" label="Beschriftung" />
                   <v-slider v-model="editingRotation" label="Rotation"
                             :min="-90" :max="0" />
                 </template>

                 <! Legenden-Editor >
                 <template v-else-if="selectedElementType === 'legend'">
                   <v-text-field v-model="editingLegendLabel" label="Name" />
                 </template>

               </v-card-text>
               <v-card-actions>
                 <v-btn @click="resetElementStyle">Zurücksetzen</v-btn>
                 <v-spacer />
                 <v-btn color="primary" @click="applyElementStyle">Anwenden</v-btn>
               </v-card-actions>
             </v-card>
           </v-menu>

           =================================================================== -->
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
import { ref } from "vue";
import type { PropType } from "vue";
import type {
  ChartType,
  ChartColors,
} from "../../../composables/useChartConfig";
import type {
  SeriesConfig,
  StatisticalOverlays,
} from "../../../utils/chartGenerators/types";
import ChartSettingsCard from "./ChartSettingsCard.vue";
import StatisticalOverlaysCard from "./StatisticalOverlaysCard.vue";

// Both panels expanded by default
const expandedPanels = ref(["settings", "overlays"]);

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

defineEmits<{
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
</style>
