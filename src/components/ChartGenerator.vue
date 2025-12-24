<template>
  <!-- Settings Header Bar -->
  <v-card elevation="2" class="mb-4">
    <v-card-text class="pa-4">
      <v-row align="center">
        <!-- Chart Title -->
        <v-col cols="12" md="3">
          <v-text-field
            v-model="chartTitle"
            label="Chart-Titel"
            variant="outlined"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-format-title"
          ></v-text-field>
        </v-col>

        <!-- Chart Type -->
        <v-col cols="12" md="4">
          <v-btn-toggle
            v-model="chartType"
            color="primary"
            mandatory
            divided
            density="compact"
          >
            <v-btn value="bar" size="small">
              <v-icon>mdi-chart-bar</v-icon>
            </v-btn>
            <v-btn value="line" size="small">
              <v-icon>mdi-chart-line</v-icon>
            </v-btn>
            <v-btn value="scatter" size="small">
              <v-icon>mdi-chart-scatter-plot</v-icon>
            </v-btn>
            <v-btn value="pie" size="small">
              <v-icon>mdi-chart-pie</v-icon>
            </v-btn>
          </v-btn-toggle>
        </v-col>

        <!-- Colors & Upload -->
        <v-col cols="12" md="3">
          <div class="d-flex align-center gap-2">
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="small"
                  variant="outlined"
                  prepend-icon="mdi-palette"
                >
                  Farben
                </v-btn>
              </template>
              <v-card min-width="200">
                <v-card-text>
                  <div class="mb-3">
                    <v-label class="text-caption">Primär</v-label>
                    <input type="color" v-model="colors.primary" class="color-picker-small" />
                  </div>
                  <div class="mb-3">
                    <v-label class="text-caption">Sekundär</v-label>
                    <input type="color" v-model="colors.secondary" class="color-picker-small" />
                  </div>
                  <div>
                    <v-label class="text-caption">Hintergrund</v-label>
                    <input type="color" v-model="colors.background" class="color-picker-small" />
                  </div>
                </v-card-text>
              </v-card>
            </v-menu>

            <v-btn
              size="small"
              variant="outlined"
              prepend-icon="mdi-file-upload"
              @click="triggerFileInput"
            >
              CSV
            </v-btn>
            <input
              ref="fileInputRef"
              type="file"
              accept=".csv"
              style="display: none;"
              @change="handleFileChange"
            />
          </div>
        </v-col>

        <!-- Download Button -->
        <v-col cols="12" md="2">
          <v-btn
            block
            color="primary"
            prepend-icon="mdi-download"
            size="small"
            @click="downloadSVG"
          >
            Download
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>

  <!-- Main Chart/Data Area -->
  <v-row>
    <v-col cols="12">
      <v-card elevation="3" class="rounded-lg" style="height: calc(100vh - 100px);">
        <Splitpanes horizontal class="default-theme" style="height: 100%;">
          <!-- Chart Pane -->
          <Pane :size="chartPaneSize">
            <div class="pane-container">
              <v-card-title class="bg-grey-lighten-4 d-flex justify-space-between align-center">
                <div>
                  <v-icon icon="mdi-eye" class="mr-2"></v-icon>
                  Vorschau
                </div>
                <div>
                  <v-btn
                    icon="mdi-arrow-expand-vertical"
                    size="small"
                    variant="text"
                    @click="maximizeChart"
                  ></v-btn>
                </div>
              </v-card-title>
              <v-card-text class="pa-6">
                <div class="preview-container" v-html="svgContent"></div>
              </v-card-text>
            </div>
          </Pane>

          <!-- Data Table Pane -->
          <Pane :size="dataPaneSize" v-if="tableItems.length > 0">
            <div class="pane-container">
              <v-card-title class="bg-grey-lighten-4 d-flex justify-space-between align-center">
                <div>
                  <v-icon icon="mdi-table" class="mr-2"></v-icon>
                  Daten ({{ tableItems.length }} Zeilen)
                </div>
                <div class="d-flex align-center gap-2">
                  <v-chip
                    :color="getQualityColor(dataQuality.qualityScore)"
                    size="small"
                    variant="flat"
                  >
                    <v-icon start icon="mdi-chart-box-outline"></v-icon>
                    {{ getQualityLabel(dataQuality.qualityScore) }} ({{ dataQuality.completenessPercentage }}%)
                  </v-chip>
                  <v-menu>
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-information-outline"
                        size="small"
                        variant="text"
                      ></v-btn>
                    </template>
                    <v-card max-width="400">
                      <v-card-title class="text-subtitle-1">
                        Datenqualitätsanalyse
                      </v-card-title>
                      <v-card-text>
                        <v-list density="compact">
                          <v-list-item>
                            <v-list-item-title class="text-caption text-grey-darken-2">
                              Vollständigkeit
                            </v-list-item-title>
                            <v-list-item-subtitle class="text-body-2 font-weight-bold">
                              {{ dataQuality.completenessPercentage }}%
                            </v-list-item-subtitle>
                          </v-list-item>
                          <v-list-item>
                            <v-list-item-title class="text-caption text-grey-darken-2">
                              Gefüllte Felder
                            </v-list-item-title>
                            <v-list-item-subtitle class="text-body-2">
                              {{ dataQuality.filledFields }} / {{ dataQuality.totalFields }}
                            </v-list-item-subtitle>
                          </v-list-item>
                          <v-list-item>
                            <v-list-item-title class="text-caption text-grey-darken-2">
                              Qualitätsbewertung
                            </v-list-item-title>
                            <v-list-item-subtitle>
                              <v-chip
                                :color="getQualityColor(dataQuality.qualityScore)"
                                size="x-small"
                                variant="flat"
                              >
                                {{ getQualityLabel(dataQuality.qualityScore) }}
                              </v-chip>
                            </v-list-item-subtitle>
                          </v-list-item>
                        </v-list>

                        <v-divider class="my-3"></v-divider>

                        <div v-if="dataQuality.issues.length > 0">
                          <div class="text-caption text-grey-darken-2 mb-2">Gefundene Probleme:</div>
                          <v-chip
                            v-for="(issue, index) in dataQuality.issues"
                            :key="index"
                            size="small"
                            color="warning"
                            variant="outlined"
                            class="mb-1 mr-1"
                          >
                            <v-icon start icon="mdi-alert-circle-outline" size="x-small"></v-icon>
                            {{ issue }}
                          </v-chip>
                        </div>
                        <div v-else class="text-caption text-success">
                          <v-icon icon="mdi-check-circle" size="small"></v-icon>
                          Keine Probleme gefunden
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-menu>
                  <v-btn
                    icon="mdi-arrow-expand-vertical"
                    size="small"
                    variant="text"
                    @click="maximizeData"
                  ></v-btn>
                </div>
              </v-card-title>
              <v-card-text class="pa-0" style="height: calc(100% - 64px); overflow: auto;">
                <v-data-table
                  :headers="tableHeaders"
                  :items="tableItems"
                  :items-per-page="15"
                  density="compact"
                  class="elevation-0"
                  fixed-header
                >
                </v-data-table>
              </v-card-text>
            </div>
          </Pane>
        </Splitpanes>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import {
  generateBarChart,
  generateLineChart,
  generatePieChart,
  generateScatterChart,
} from "../utils/chartGenerators";
import type { DataPoint } from "../utils/chartGenerators";
import {
  analyzeDataQuality,
  getQualityColor,
  getQualityLabel,
} from "../utils/dataQuality";

const chartType = ref<"bar" | "line" | "pie" | "scatter">("bar");
const chartTitle = ref<string>("Mein Chart");
const data = ref<DataPoint[]>([
  { label: "Q1", value: 30 },
  { label: "Q2", value: 45 },
  { label: "Q3", value: 60 },
  { label: "Q4", value: 55 },
]);

// Data table
const tableHeaders = ref<any[]>([]);
const tableItems = ref<any[]>([]);

// Splitpane sizes
const chartPaneSize = ref(60);
const dataPaneSize = ref(40);

// File input ref
const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    handleFileUpload(file);
  }
};

const maximizeChart = () => {
  if (chartPaneSize.value === 90) {
    chartPaneSize.value = 60;
    dataPaneSize.value = 40;
  } else {
    chartPaneSize.value = 90;
    dataPaneSize.value = 10;
  }
};

const maximizeData = () => {
  if (dataPaneSize.value === 90) {
    chartPaneSize.value = 60;
    dataPaneSize.value = 40;
  } else {
    chartPaneSize.value = 10;
    dataPaneSize.value = 90;
  }
};

const colors = ref({
  primary: "#4F46E5",
  secondary: "#818CF8",
  background: "#FFFFFF",
});

const handleFileUpload = (files: File | File[] | null | File) => {
  const file = Array.isArray(files) ? files[0] : files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result as string;
    if (!text) return;

    const lines = text.trim().split("\n").filter(line => line.trim());

    // Detect delimiter: comma or semicolon (common in German CSVs)
    const delimiter = lines[0].includes(';') ? ';' : ',';

    // Check if first line is a header
    const firstLine = lines[0].split(delimiter).map(col => col.trim());
    const hasHeader = firstLine.length > 1 && isNaN(parseFloat(firstLine[1].replace(',', '.')));

    // Generate column headers
    const headers = hasHeader ? firstLine : firstLine.map((_, i) => `Column ${i + 1}`);
    const dataLines = hasHeader ? lines.slice(1) : lines;

    // Create Vuetify table headers
    tableHeaders.value = headers.map((header, i) => ({
      title: header,
      key: `col_${i}`,
      sortable: true,
    }));

    // Parse data for both chart and table
    const allRows: any[] = [];
    const parsed = dataLines.map((line) => {
      const columns = line.split(delimiter).map(col => col.trim());

      // Create row for table with all columns
      const row: any = {};
      columns.forEach((col, i) => {
        const normalizedValue = col.replace(',', '.');
        const numValue = parseFloat(normalizedValue);
        row[`col_${i}`] = isNaN(numValue) ? col : numValue;
      });
      allRows.push(row);

      // Use first column as label
      const label = columns[0];

      // Find first numeric column for value (skip first column)
      let value = 0;
      for (let i = 1; i < columns.length; i++) {
        const normalizedValue = columns[i].replace(',', '.');
        const parsedValue = parseFloat(normalizedValue);
        if (!isNaN(parsedValue)) {
          value = parsedValue;
          break;
        }
      }

      return { label, value };
    });

    data.value = parsed;
    tableItems.value = allRows;
  };
  reader.readAsText(file);
};

const svgContent = computed(() => {
  const config = {
    data: data.value,
    colors: colors.value,
    title: chartTitle.value,
  };

  switch (chartType.value) {
    case "bar":
      return generateBarChart(config);
    case "line":
      return generateLineChart(config);
    case "scatter":
      return generateScatterChart(config);
    case "pie":
      return generatePieChart(config);
    default:
      return "";
  }
});

const dataQuality = computed(() => {
  return analyzeDataQuality(data.value);
});

const downloadSVG = () => {
  const blob = new Blob([svgContent.value], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chartTitle.value.replace(/\s+/g, "_")}_${
    chartType.value
  }.svg`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<style scoped>
.color-picker-small {
  width: 100%;
  height: 35px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
}

.pane-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.splitpanes__splitter) {
  background-color: #e0e0e0;
  position: relative;
}

:deep(.splitpanes__splitter:hover) {
  background-color: #4F46E5;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter) {
  height: 8px;
  cursor: row-resize;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter):before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 3px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}
</style>
