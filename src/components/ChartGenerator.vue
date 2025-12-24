<template>
  <v-stepper v-model="currentStep" alt-labels>
    <v-stepper-header>
      <v-stepper-item
        :complete="currentStep > 1"
        :value="1"
        title="Hochladen"
        icon="mdi-file-upload"
      ></v-stepper-item>

      <v-divider></v-divider>

      <v-stepper-item
        :complete="currentStep > 2"
        :value="2"
        title="Inspizieren"
        icon="mdi-table-eye"
      ></v-stepper-item>

      <v-divider></v-divider>

      <v-stepper-item
        :value="3"
        title="Chart erstellen"
        icon="mdi-chart-bar"
      ></v-stepper-item>
    </v-stepper-header>

    <v-stepper-window>
      <!-- Step 1: Upload CSV -->
      <v-stepper-window-item :value="1">
        <v-card flat>
          <v-card-text>
            <div class="text-h5 mb-4">CSV-Datei hochladen</div>

            <v-file-input
              v-model="uploadedFile"
              label="CSV-Datei auswählen"
              accept=".csv"
              variant="outlined"
              prepend-icon="mdi-file-delimited"
              show-size
              @update:model-value="handleFileUpload"
              class="mb-4"
            ></v-file-input>

            <!-- File Preview -->
            <v-card v-if="tableItems.length > 0" variant="outlined" class="mb-4">
              <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                <v-icon icon="mdi-eye" class="mr-2"></v-icon>
                Vorschau (erste 5 Zeilen)
              </v-card-title>
              <v-card-text class="pa-0">
                <v-data-table
                  :headers="tableHeaders"
                  :items="tableItems.slice(0, 5)"
                  density="compact"
                  hide-default-footer
                  class="elevation-0"
                ></v-data-table>
              </v-card-text>
              <v-card-text>
                <v-alert type="info" variant="tonal" density="compact">
                  {{ tableItems.length }} Zeilen geladen
                </v-alert>
              </v-card-text>
            </v-card>

            <!-- Empty State -->
            <v-card v-else variant="outlined" class="text-center pa-8">
              <v-icon icon="mdi-file-upload-outline" size="64" color="grey"></v-icon>
              <div class="text-h6 mt-4 mb-2">Keine Datei ausgewählt</div>
              <div class="text-caption text-grey">Wählen Sie eine CSV-Datei aus, um fortzufahren</div>
            </v-card>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              variant="flat"
              :disabled="tableItems.length === 0"
              @click="currentStep = 2"
            >
              Weiter
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-stepper-window-item>

      <!-- Step 2: Inspect & Configure -->
      <v-stepper-window-item :value="2">
        <v-card flat>
          <v-card-text>
            <div class="text-h5 mb-4">Daten inspizieren & konfigurieren</div>

            <!-- Data Quality Badge -->
            <v-card variant="outlined" class="mb-4">
              <v-card-text>
                <div class="d-flex align-items-center justify-space-between">
                  <div>
                    <div class="text-subtitle-2 text-grey-darken-2 mb-1">Datenqualität</div>
                    <v-chip
                      :color="getQualityColor(dataQuality.qualityScore)"
                      variant="flat"
                      size="large"
                    >
                      <v-icon start icon="mdi-chart-box-outline"></v-icon>
                      {{ getQualityLabel(dataQuality.qualityScore) }} ({{ dataQuality.completenessPercentage }}%)
                    </v-chip>
                  </div>
                  <v-btn
                    variant="outlined"
                    prepend-icon="mdi-information-outline"
                    @click="showQualityDialog = true"
                  >
                    Details anzeigen
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>

            <!-- Column Selection -->
            <v-card variant="outlined" class="mb-4">
              <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                <v-icon icon="mdi-table-column" class="mr-2"></v-icon>
                Spalten für Chart auswählen
              </v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="selectedLabelColumn"
                      :items="columnOptions"
                      label="Label-Spalte (X-Achse)"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-format-text"
                      hint="Wählen Sie die Spalte für Beschriftungen"
                      persistent-hint
                    ></v-select>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="selectedValueColumn"
                      :items="numericColumnOptions"
                      label="Wert-Spalte (Y-Achse)"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-numeric"
                      hint="Wählen Sie die Spalte für numerische Werte"
                      persistent-hint
                    ></v-select>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Grouping Suggestion -->
            <v-card variant="outlined" class="mb-4" v-if="groupingSuggestion.canGroup">
              <v-card-text>
                <div class="d-flex align-items-center justify-space-between">
                  <div class="d-flex align-items-center">
                    <v-icon :icon="getGroupingIcon(groupingSuggestion.type)" :color="getGroupingColor(groupingSuggestion.canGroup)" class="mr-3" size="large"></v-icon>
                    <div>
                      <div class="text-subtitle-2 font-weight-bold">Gruppierung möglich</div>
                      <div class="text-caption text-grey-darken-1">{{ groupingSuggestion.reason }}</div>
                    </div>
                  </div>
                  <v-chip
                    :color="getGroupingColor(groupingSuggestion.canGroup)"
                    variant="flat"
                    size="small"
                  >
                    <v-icon start icon="mdi-lightbulb-on-outline"></v-icon>
                    {{ groupingSuggestion.groupCount ? `${groupingSuggestion.groupCount} Gruppen` : 'Kategorisierbar' }}
                  </v-chip>
                </div>
                <v-divider class="my-3"></v-divider>
                <div class="text-caption text-grey-darken-2 mb-2">Mögliche Gruppierungen:</div>
                <div class="d-flex flex-wrap gap-2">
                  <v-chip
                    v-for="(suggestion, index) in groupingSuggestion.suggestions"
                    :key="index"
                    size="small"
                    variant="outlined"
                    color="info"
                  >
                    {{ suggestion }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>

            <!-- Full Data Table -->
            <v-card variant="outlined">
              <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                <v-icon icon="mdi-table" class="mr-2"></v-icon>
                Vollständige Daten ({{ tableItems.length }} Zeilen)
              </v-card-title>
              <v-card-text class="pa-0">
                <v-data-table
                  :headers="tableHeaders"
                  :items="tableItems"
                  :items-per-page="10"
                  density="compact"
                  class="elevation-0"
                ></v-data-table>
              </v-card-text>
            </v-card>
          </v-card-text>

          <v-card-actions>
            <v-btn
              variant="text"
              @click="currentStep = 1"
            >
              <v-icon start>mdi-chevron-left</v-icon>
              Zurück
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              variant="flat"
              :disabled="!selectedLabelColumn || !selectedValueColumn"
              @click="currentStep = 3"
            >
              Weiter
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-stepper-window-item>

      <!-- Step 3: Create Chart -->
      <v-stepper-window-item :value="3">
        <v-card flat>
          <v-card-text>
            <div class="text-h5 mb-4">Chart erstellen</div>

            <!-- Chart Settings -->
            <v-card variant="outlined" class="mb-4">
              <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                <v-icon icon="mdi-cog" class="mr-2"></v-icon>
                Einstellungen
              </v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="chartTitle"
                      label="Chart-Titel"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-format-title"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="4">
                    <div class="text-caption mb-2">Chart-Typ</div>
                    <v-btn-toggle
                      v-model="chartType"
                      color="primary"
                      mandatory
                      divided
                      class="w-100"
                    >
                      <v-btn value="bar">
                        <v-icon>mdi-chart-bar</v-icon>
                      </v-btn>
                      <v-btn value="line">
                        <v-icon>mdi-chart-line</v-icon>
                      </v-btn>
                      <v-btn value="area">
                        <v-icon>mdi-chart-areaspline</v-icon>
                      </v-btn>
                      <v-btn value="scatter">
                        <v-icon>mdi-chart-scatter-plot</v-icon>
                      </v-btn>
                      <v-btn value="pie">
                        <v-icon>mdi-chart-pie</v-icon>
                      </v-btn>
                    </v-btn-toggle>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-menu>
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          variant="outlined"
                          block
                          prepend-icon="mdi-palette"
                        >
                          Farben anpassen
                        </v-btn>
                      </template>
                      <v-card min-width="200">
                        <v-card-text>
                          <div class="mb-3">
                            <v-label class="text-caption">Primär</v-label>
                            <input type="color" v-model="colors.primary" class="color-picker-full" />
                          </div>
                          <div class="mb-3">
                            <v-label class="text-caption">Sekundär</v-label>
                            <input type="color" v-model="colors.secondary" class="color-picker-full" />
                          </div>
                          <div>
                            <v-label class="text-caption">Hintergrund</v-label>
                            <input type="color" v-model="colors.background" class="color-picker-full" />
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-menu>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Chart Preview -->
            <v-card variant="outlined">
              <v-card-title class="text-subtitle-1 bg-grey-lighten-4 d-flex justify-space-between align-center">
                <div>
                  <v-icon icon="mdi-eye" class="mr-2"></v-icon>
                  Vorschau
                </div>
                <v-btn
                  icon="mdi-fullscreen"
                  size="small"
                  variant="text"
                  @click="showFullscreenPreview = true"
                ></v-btn>
              </v-card-title>
              <v-card-text class="pa-6">
                <div class="preview-container" v-html="svgContent"></div>
              </v-card-text>
            </v-card>
          </v-card-text>

          <v-card-actions>
            <v-btn
              variant="text"
              @click="currentStep = 2"
            >
              <v-icon start>mdi-chevron-left</v-icon>
              Zurück
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="secondary"
              variant="outlined"
              @click="resetWizard"
            >
              Neu starten
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-download"
              @click="downloadSVG"
            >
              SVG herunterladen
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-stepper-window-item>
    </v-stepper-window>
  </v-stepper>

  <!-- Data Quality Dialog -->
  <v-dialog v-model="showQualityDialog" max-width="800" scrollable>
    <v-card>
      <v-card-title class="bg-grey-lighten-4 d-flex align-items-center justify-space-between">
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
                  <div class="text-h2 font-weight-bold" :style="{ color: getQualityColorHex(dataQuality.qualityScore) }">
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
                    <v-list-item-title class="text-caption">Gesamtzeilen</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 font-weight-bold">
                      {{ dataQuality.totalRows }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="text-caption">Gesamtfelder</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 font-weight-bold">
                      {{ dataQuality.totalFields }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="text-caption">Gefüllte Felder</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 font-weight-bold text-success">
                      {{ dataQuality.filledFields }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="text-caption">Leere Felder</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 font-weight-bold text-error">
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
                  <v-chip color="success" size="small" variant="flat">Ausgezeichnet</v-chip>
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
                  <v-chip color="warning" size="small" variant="flat">Befriedigend</v-chip>
                </template>
                <v-list-item-subtitle class="ml-2">
                  ≥ 70% Vollständigkeit, mehrere Probleme vorhanden
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-chip color="error" size="small" variant="flat">Mangelhaft</v-chip>
                </template>
                <v-list-item-subtitle class="ml-2">
                  &lt; 70% Vollständigkeit oder erhebliche Qualitätsprobleme
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Missing Values by Column -->
        <v-card class="mb-4" variant="outlined" v-if="Object.keys(dataQuality.missingValuesByColumn).length > 0">
          <v-card-text>
            <div class="text-h6 mb-3">Fehlende Werte pro Spalte</div>
            <v-list density="compact">
              <v-list-item
                v-for="([column, missing], index) in Object.entries(dataQuality.missingValuesByColumn)"
                :key="index"
              >
                <v-list-item-title>{{ getColumnTitle(column) }}</v-list-item-title>
                <v-list-item-subtitle>
                  <v-progress-linear
                    :model-value="((dataQuality.totalRows - missing) / dataQuality.totalRows) * 100"
                    :color="missing / dataQuality.totalRows > 0.5 ? 'error' : missing > 0 ? 'warning' : 'success'"
                    height="20"
                    class="mt-1"
                  >
                    <template v-slot:default>
                      <strong>{{ dataQuality.totalRows - missing }} / {{ dataQuality.totalRows }}</strong>
                    </template>
                  </v-progress-linear>
                  <div class="text-caption mt-1" v-if="missing > 0">
                    {{ missing }} fehlend ({{ Math.round((missing / dataQuality.totalRows) * 100) }}%)
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
            <div class="text-caption text-grey">Ihre Daten sind in ausgezeichnetem Zustand.</div>
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

  <!-- Fullscreen Preview Dialog -->
  <v-dialog v-model="showFullscreenPreview" fullscreen>
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>
          <v-icon icon="mdi-chart-bar" class="mr-2"></v-icon>
          {{ chartTitle }} ({{ chartType.toUpperCase() }})
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-download"
          @click="downloadSVG"
        ></v-btn>
        <v-btn
          icon="mdi-close"
          @click="showFullscreenPreview = false"
        ></v-btn>
      </v-toolbar>
      <v-card-text class="pa-8 d-flex align-center justify-center" style="height: calc(100vh - 64px); background: #f5f5f5;">
        <div class="fullscreen-preview-container" v-html="svgContent"></div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  generateBarChart,
  generateLineChart,
  generateAreaChart,
  generatePieChart,
  generateScatterChart,
} from "../utils/chartGenerators";
import type { DataPoint } from "../utils/chartGenerators";
import {
  analyzeDataQuality,
  getQualityColor,
  getQualityLabel,
} from "../utils/dataQuality";
import {
  analyzeGroupingPotential,
  getGroupingIcon,
  getGroupingColor,
} from "../utils/groupingAnalysis";

// Stepper state
const currentStep = ref(1);

// File upload
const uploadedFile = ref<File[]>([]);

const chartType = ref<"bar" | "line" | "area" | "pie" | "scatter">("bar");
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

// Column selection
const selectedLabelColumn = ref("col_0");
const selectedValueColumn = ref("col_1");

// Column options for dropdowns
const columnOptions = computed(() => {
  return tableHeaders.value.map(h => ({
    title: h.title,
    value: h.key
  }));
});

const numericColumnOptions = computed(() => {
  if (tableItems.value.length === 0) return [];

  // Find columns that contain mostly numeric values
  return tableHeaders.value
    .filter(h => {
      const sampleValues = tableItems.value.slice(0, 10).map(row => row[h.key]);
      const numericCount = sampleValues.filter(v => typeof v === 'number').length;
      return numericCount > sampleValues.length / 2;
    })
    .map(h => ({
      title: h.title,
      value: h.key
    }));
});

// Dialogs
const showQualityDialog = ref(false);
const showFullscreenPreview = ref(false);

const colors = ref({
  primary: "#4F46E5",
  secondary: "#818CF8",
  background: "#FFFFFF",
});

const handleFileUpload = (files: File | File[] | null) => {
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

    // Parse data into table format (data for charts is derived automatically)
    const allRows: any[] = [];
    dataLines.forEach((line) => {
      const columns = line.split(delimiter).map(col => col.trim());

      // Create row for table with all columns
      const row: any = {};
      columns.forEach((col, i) => {
        // Handle empty cells
        if (!col || col.trim() === '') {
          row[`col_${i}`] = '';
          return;
        }

        // Check if value looks like a date (contains date separators like -, /, or multiple dots)
        const looksLikeDate = /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(col) || // YYYY-MM-DD or DD.MM.YYYY
                              /\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(col)   // MM/DD/YYYY or DD/MM/YY

        // If it looks like a date, keep it as string
        if (looksLikeDate) {
          row[`col_${i}`] = col;
          return;
        }

        // Try to parse as number - handle both comma and dot as decimal separator
        const normalizedValue = col.replace(/,/g, '.');
        const numValue = parseFloat(normalizedValue);

        // Only convert to number if:
        // 1. It's a valid number
        // 2. The string doesn't contain letters (except e/E for scientific notation)
        const hasLetters = /[a-df-zA-DF-Z]/.test(col) // Exclude e/E

        if (!isNaN(numValue) && !hasLetters && normalizedValue.trim() !== '') {
          row[`col_${i}`] = numValue;
        } else {
          row[`col_${i}`] = col;
        }
      });
      allRows.push(row);
    });

    tableItems.value = allRows;

    // Auto-select first column as label and first numeric column (that's NOT the label column) as value
    selectedLabelColumn.value = 'col_0';
    // Find first numeric column that is NOT col_0
    const firstNumeric = numericColumnOptions.value.find(opt => opt.value !== 'col_0') || numericColumnOptions.value[0];
    if (firstNumeric) {
      selectedValueColumn.value = firstNumeric.value;
    }
  };
  reader.readAsText(file);
};

// Derive chart data from tableItems based on selected columns
const data = computed<DataPoint[]>(() => {
  if (tableItems.value.length === 0) return [];

  return tableItems.value.map(row => ({
    label: String(row[selectedLabelColumn.value] || ''),
    value: typeof row[selectedValueColumn.value] === 'number'
      ? row[selectedValueColumn.value]
      : parseFloat(String(row[selectedValueColumn.value])) || 0,
  }));
});

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
    case "area":
      return generateAreaChart(config);
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
  const fullData = tableItems.value.map(row => {
    const dataPoint: any = {};
    Object.keys(row).forEach(key => {
      dataPoint[key] = row[key];
    });
    return dataPoint;
  });

  return analyzeDataQuality(fullData);
});

const groupingSuggestion = computed(() => {
  if (tableItems.value.length === 0) {
    return analyzeGroupingPotential([]);
  }

  // Extract labels from selected label column
  const labels = tableItems.value.map(row => String(row[selectedLabelColumn.value] || ''));
  return analyzeGroupingPotential(labels);
});

const getQualityColorHex = (score: 'excellent' | 'good' | 'fair' | 'poor'): string => {
  switch (score) {
    case 'excellent':
      return '#4CAF50' // green
    case 'good':
      return '#2196F3' // blue
    case 'fair':
      return '#FF9800' // orange
    case 'poor':
      return '#F44336' // red
  }
};

const getColumnTitle = (columnKey: string): string => {
  const header = tableHeaders.value.find(h => h.key === columnKey);
  return header ? header.title : columnKey;
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

const resetWizard = () => {
  currentStep.value = 1;
  uploadedFile.value = [];
  tableItems.value = [
    { col_0: "Q1", col_1: 30 },
    { col_0: "Q2", col_1: 45 },
    { col_0: "Q3", col_1: 60 },
    { col_0: "Q4", col_1: 55 },
  ];
  tableHeaders.value = [
    { title: "Label", key: "col_0", sortable: true },
    { title: "Wert", key: "col_1", sortable: true },
  ];
  selectedLabelColumn.value = "col_0";
  selectedValueColumn.value = "col_1";
  chartTitle.value = "Mein Chart";
  chartType.value = "bar";
};
</script>

<style scoped>
.color-picker-full {
  width: 100%;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

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

.fullscreen-preview-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>
