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
                  class="ma-3"
                >
                  Farben
                </v-btn>
              </template>
              <v-card min-width="200">
                <v-card-text>
                  <div class="mb-3">
                    <v-label class="text-caption">Primär</v-label>
                    <input
                      type="color"
                      v-model="colors.primary"
                      class="color-picker-small"
                    />
                  </div>
                  <div class="mb-3">
                    <v-label class="text-caption">Sekundär</v-label>
                    <input
                      type="color"
                      v-model="colors.secondary"
                      class="color-picker-small"
                    />
                  </div>
                  <div>
                    <v-label class="text-caption">Hintergrund</v-label>
                    <input
                      type="color"
                      v-model="colors.background"
                      class="color-picker-small"
                    />
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
              style="display: none"
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
      <v-card
        elevation="3"
        class="rounded-lg"
        style="height: calc(100vh - 100px)"
      >
        <Splitpanes horizontal class="default-theme" style="height: 100%">
          <!-- Chart Pane -->
          <Pane :size="chartPaneSize">
            <div class="pane-container">
              <v-card-title
                class="bg-grey-lighten-4 d-flex justify-space-between align-center"
              >
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
              <v-card-title
                class="bg-grey-lighten-4 d-flex justify-space-between align-center"
              >
                <div>
                  <v-icon icon="mdi-table" class="mr-2"></v-icon>
                  Daten ({{ tableItems.length }} Zeilen)
                </div>
                <div class="d-flex align-center gap-2">
                  <v-chip
                    :color="getQualityColor(dataQuality.qualityScore)"
                    size="small"
                    variant="flat"
                    @click="showQualityDialog = true"
                    style="cursor: pointer"
                  >
                    <v-icon start icon="mdi-chart-box-outline"></v-icon>
                    {{ getQualityLabel(dataQuality.qualityScore) }} ({{
                      dataQuality.completenessPercentage
                    }}%)
                  </v-chip>
                  <v-btn
                    icon="mdi-information-outline"
                    size="small"
                    variant="text"
                    @click="showQualityDialog = true"
                  />
                  <v-btn
                    icon="mdi-arrow-expand-vertical"
                    size="small"
                    variant="text"
                    @click="maximizeData"
                  />
                </div>
              </v-card-title>
              <v-card-text
                class="pa-0"
                style="height: calc(100% - 64px); overflow: auto"
              >
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

  <!-- Data Quality Dialog -->
  <v-dialog v-model="showQualityDialog" max-width="800" scrollable>
    <v-card>
      <v-card-title
        class="bg-grey-lighten-4 d-flex align-items-center justify-space-between"
      >
        <div>
          <v-icon icon="mdi-clipboard-check-outline" class="mr-2"></v-icon>
          Datenqualitätsanalyse
        </div>
        <v-chip
          :color="getQualityColor(dataQuality.qualityScore)"
          variant="flat"
        >
          {{ getQualityLabel(dataQuality.qualityScore) }}
        </v-chip>
      </v-card-title>

      <v-card-text class="pt-4">
        <!-- Overall Quality Score -->
        <v-card class="mb-4" variant="outlined">
          <v-card-text>
            <div class="text-h6 mb-3">Gesamtbewertung</div>
            <v-row>
              <v-col cols="12" md="6">
                <div class="text-center">
                  <div
                    class="text-h2 font-weight-bold"
                    :style="{
                      color: getQualityColorHex(dataQuality.qualityScore),
                    }"
                  >
                    {{ dataQuality.completenessPercentage }}%
                  </div>
                  <div class="text-caption text-grey">Vollständigkeit</div>
                  <v-progress-linear
                    :model-value="dataQuality.completenessPercentage"
                    :color="getQualityColor(dataQuality.qualityScore)"
                    height="20"
                    class="mt-2"
                  >
                    <template v-slot:default="{ value }">
                      <strong>{{ Math.ceil(value) }}%</strong>
                    </template>
                  </v-progress-linear>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title class="text-caption"
                      >Gesamtzeilen</v-list-item-title
                    >
                    <v-list-item-subtitle class="text-body-1 font-weight-bold">
                      {{ dataQuality.totalRows }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="text-caption"
                      >Gesamtfelder</v-list-item-title
                    >
                    <v-list-item-subtitle class="text-body-1 font-weight-bold">
                      {{ dataQuality.totalFields }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="text-caption"
                      >Gefüllte Felder</v-list-item-title
                    >
                    <v-list-item-subtitle
                      class="text-body-1 font-weight-bold text-success"
                    >
                      {{ dataQuality.filledFields }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="text-caption"
                      >Leere Felder</v-list-item-title
                    >
                    <v-list-item-subtitle
                      class="text-body-1 font-weight-bold text-error"
                    >
                      {{ dataQuality.emptyFields }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Quality Score Explanation -->
        <v-card class="mb-4" variant="outlined">
          <v-card-text>
            <div class="text-h6 mb-3">Was bedeutet die Bewertung?</div>
            <v-list density="compact">
              <v-list-item>
                <template v-slot:prepend>
                  <v-chip color="success" size="small" variant="flat"
                    >Ausgezeichnet</v-chip
                  >
                </template>
                <v-list-item-subtitle class="ml-2">
                  ≥ 95% Vollständigkeit, keine Probleme erkannt
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-chip color="info" size="small" variant="flat">Gut</v-chip>
                </template>
                <v-list-item-subtitle class="ml-2">
                  ≥ 85% Vollständigkeit, maximal 2 kleinere Probleme
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-chip color="warning" size="small" variant="flat"
                    >Befriedigend</v-chip
                  >
                </template>
                <v-list-item-subtitle class="ml-2">
                  ≥ 70% Vollständigkeit, mehrere Probleme vorhanden
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-chip color="error" size="small" variant="flat"
                    >Mangelhaft</v-chip
                  >
                </template>
                <v-list-item-subtitle class="ml-2">
                  &lt; 70% Vollständigkeit oder erhebliche Qualitätsprobleme
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Missing Values by Column -->
        <v-card
          class="mb-4"
          variant="outlined"
          v-if="Object.keys(dataQuality.missingValuesByColumn).length > 0"
        >
          <v-card-text>
            <div class="text-h6 mb-3">Fehlende Werte pro Spalte</div>
            <v-list density="compact">
              <v-list-item
                v-for="([column, missing], index) in Object.entries(
                  dataQuality.missingValuesByColumn
                )"
                :key="index"
              >
                <v-list-item-title>{{ column }}</v-list-item-title>
                <v-list-item-subtitle>
                  <v-progress-linear
                    :model-value="
                      ((dataQuality.totalRows - missing) /
                        dataQuality.totalRows) *
                      100
                    "
                    :color="
                      missing / dataQuality.totalRows > 0.5
                        ? 'error'
                        : missing > 0
                        ? 'warning'
                        : 'success'
                    "
                    height="20"
                    class="mt-1"
                  >
                    <template v-slot:default>
                      <strong
                        >{{ dataQuality.totalRows - missing }} /
                        {{ dataQuality.totalRows }}</strong
                      >
                    </template>
                  </v-progress-linear>
                  <div class="text-caption mt-1" v-if="missing > 0">
                    {{ missing }} fehlend ({{
                      Math.round((missing / dataQuality.totalRows) * 100)
                    }}%)
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Issues Found -->
        <v-card variant="outlined" v-if="dataQuality.issues.length > 0">
          <v-card-text>
            <div class="text-h6 mb-3">
              <v-icon icon="mdi-alert-circle-outline" color="warning"></v-icon>
              Gefundene Probleme ({{ dataQuality.issues.length }})
            </div>
            <v-alert
              v-for="(issue, index) in dataQuality.issues"
              :key="index"
              type="warning"
              variant="tonal"
              density="compact"
              class="mb-2"
            >
              {{ issue }}
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- No Issues -->
        <v-card variant="outlined" v-else>
          <v-card-text class="text-center">
            <v-icon icon="mdi-check-circle" color="success" size="64"></v-icon>
            <div class="text-h6 mt-2">Keine Probleme gefunden!</div>
            <div class="text-caption text-grey">
              Ihre Daten sind in ausgezeichnetem Zustand.
            </div>
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-card-actions class="bg-grey-lighten-4">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="flat"
          @click="showQualityDialog = false"
        >
          Schließen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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

// Data table - central source of truth
const tableHeaders = ref<any[]>([
  { title: "Label", key: "col_0", sortable: true },
  { title: "Wert", key: "col_1", sortable: true },
]);
const tableItems = ref<any[]>([
  { col_0: "Q1", col_1: 30 },
  { col_0: "Q2", col_1: 45 },
  { col_0: "Q3", col_1: 60 },
  { col_0: "Q4", col_1: 55 },
]);

// Derive chart data from tableItems
const data = computed<DataPoint[]>(() => {
  if (tableItems.value.length === 0) return [];

  return tableItems.value.map((row) => ({
    label: String(row.col_0 || ""),
    value:
      typeof row.col_1 === "number"
        ? row.col_1
        : parseFloat(String(row.col_1)) || 0,
  }));
});

// Quality dialog
const showQualityDialog = ref(false);

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

    const lines = text
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    // Detect delimiter: comma or semicolon (common in German CSVs)
    const delimiter = lines[0].includes(";") ? ";" : ",";

    // Check if first line is a header
    const firstLine = lines[0].split(delimiter).map((col) => col.trim());
    const hasHeader =
      firstLine.length > 1 && isNaN(parseFloat(firstLine[1].replace(",", ".")));

    // Generate column headers
    const headers = hasHeader
      ? firstLine
      : firstLine.map((_, i) => `Column ${i + 1}`);
    const dataLines = hasHeader ? lines.slice(1) : lines;

    // Create Vuetify table headers
    tableHeaders.value = headers.map((header, i) => ({
      title: header,
      key: `col_${i}`,
      sortable: true,
    }));

    // Parse data into table format (data for charts is derived automatically)
    const allRows: any[] = [];
    dataLines.forEach((line) => {
      const columns = line.split(delimiter).map((col) => col.trim());

      // Create row for table with all columns
      const row: any = {};
      columns.forEach((col, i) => {
        const normalizedValue = col.replace(",", ".");
        const numValue = parseFloat(normalizedValue);
        row[`col_${i}`] = isNaN(numValue) ? col : numValue;
      });
      allRows.push(row);
    });

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
  // Analyze all columns from tableItems
  if (tableItems.value.length === 0) {
    return analyzeDataQuality([]);
  }

  // Convert tableItems to DataPoint format for analysis
  const fullData = tableItems.value.map((row) => {
    const dataPoint: any = {};
    Object.keys(row).forEach((key) => {
      dataPoint[key] = row[key];
    });
    return dataPoint;
  });

  return analyzeDataQuality(fullData);
});

const getQualityColorHex = (
  score: "excellent" | "good" | "fair" | "poor"
): string => {
  switch (score) {
    case "excellent":
      return "#4CAF50"; // green
    case "good":
      return "#2196F3"; // blue
    case "fair":
      return "#FF9800"; // orange
    case "poor":
      return "#F44336"; // red
  }
};

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
  background-color: #4f46e5;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter) {
  height: 8px;
  cursor: row-resize;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter):before {
  content: "";
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
