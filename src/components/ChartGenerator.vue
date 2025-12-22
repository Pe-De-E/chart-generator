<template>
  <v-row>
    <v-col cols="12" lg="5">
      <v-card elevation="3" class="rounded-lg">
        <v-card-title class="bg-grey-lighten-4">
          <v-icon icon="mdi-cog" class="mr-2"></v-icon>
          Einstellungen
        </v-card-title>
        
        <v-card-text class="pt-6">
          <v-text-field
            v-model="chartTitle"
            label="Chart-Titel"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-format-title"
          ></v-text-field>

          <div class="mb-6">
            <div class="text-subtitle-2 mb-2">Chart-Typ</div>
            <v-btn-toggle
              v-model="chartType"
              color="primary"
              mandatory
              divided
              class="w-100"
            >
              <v-btn value="bar" size="large">
                <v-icon>mdi-chart-bar</v-icon>
                <span class="ml-2">Bar</span>
              </v-btn>
              <v-btn value="line" size="large">
                <v-icon>mdi-chart-line</v-icon>
                <span class="ml-2">Line</span>
              </v-btn>
              <v-btn value="pie" size="large">
                <v-icon>mdi-chart-pie</v-icon>
                <span class="ml-2">Pie</span>
              </v-btn>
            </v-btn-toggle>
          </div>

          <div class="mb-6">
            <div class="text-subtitle-2 mb-3">Farben</div>
            <v-row>
              <v-col cols="4">
                <v-label class="text-caption">Primär</v-label>
                <input type="color" v-model="colors.primary" class="color-picker" />
              </v-col>
              <v-col cols="4">
                <v-label class="text-caption">Sekundär</v-label>
                <input type="color" v-model="colors.secondary" class="color-picker" />
              </v-col>
              <v-col cols="4">
                <v-label class="text-caption">Hintergrund</v-label>
                <input type="color" v-model="colors.background" class="color-picker" />
              </v-col>
            </v-row>
          </div>

          <v-file-input
            label="CSV hochladen"
            accept=".csv"
            variant="outlined"
            density="comfortable"
            prepend-icon="mdi-file-upload"
            @change="handleFileUpload"
            class="mb-4"
          ></v-file-input>

          <div class="mb-4">
            <div class="d-flex justify-space-between align-center mb-3">
              <div class="text-subtitle-2">Datenpunkte</div>
              <v-btn
                size="small"
                color="primary"
                variant="tonal"
                @click="addDataPoint"
                prepend-icon="mdi-plus"
              >
                Hinzufügen
              </v-btn>
            </div>

            <div class="data-points-container">
              <v-row v-for="(point, index) in data" :key="index" class="mb-2" no-gutters>
                <v-col cols="6" class="pr-1">
                  <v-text-field
                    v-model="point.label"
                    density="compact"
                    variant="outlined"
                    hide-details
                    placeholder="Label"
                  ></v-text-field>
                </v-col>
                <v-col cols="4" class="px-1">
                  <v-text-field
                    v-model.number="point.value"
                    type="number"
                    density="compact"
                    variant="outlined"
                    hide-details
                    placeholder="Wert"
                  ></v-text-field>
                </v-col>
                <v-col cols="2" class="pl-1">
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    color="error"
                    variant="text"
                    @click="removeDataPoint(index)"
                  ></v-btn>
                </v-col>
              </v-row>
            </div>
          </div>

          <v-btn
            block
            size="x-large"
            color="primary"
            prepend-icon="mdi-download"
            @click="downloadSVG"
            class="mt-4"
          >
            SVG herunterladen
          </v-btn>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" lg="7">
      <v-card elevation="3" class="rounded-lg">
        <v-card-title class="bg-grey-lighten-4">
          <v-icon icon="mdi-eye" class="mr-2"></v-icon>
          Vorschau
        </v-card-title>
        
        <v-card-text class="pa-6">
          <div class="preview-container" v-html="svgContent"></div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { generateBarChart, generateLineChart, generatePieChart } from '../utils/chartGenerators'
import type { DataPoint } from '../utils/chartGenerators'

const chartType = ref<'bar' | 'line' | 'pie'>('bar')
const chartTitle = ref<string>('Mein Chart')
const data = ref<DataPoint[]>([
  { label: 'Q1', value: 30 },
  { label: 'Q2', value: 45 },
  { label: 'Q3', value: 60 },
  { label: 'Q4', value: 55 }
])

const colors = ref({
  primary: '#4F46E5',
  secondary: '#818CF8',
  background: '#FFFFFF'
})

const addDataPoint = () => {
  data.value.push({ label: `Item ${data.value.length + 1}`, value: 0 })
}

const removeDataPoint = (index) => {
  data.value.splice(index, 1)
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target.result
    const lines = text.trim().split('\n')
    const parsed = lines.slice(1).map(line => {
      const [label, value] = line.split(',')
      return { label: label.trim(), value: parseFloat(value) || 0 }
    })
    data.value = parsed
  }
  reader.readAsText(file)
}

const svgContent = computed(() => {
  const config = {
    data: data.value,
    colors: colors.value,
    title: chartTitle.value
  }

  switch (chartType.value) {
    case 'bar':
      return generateBarChart(config)
    case 'line':
      return generateLineChart(config)
    case 'pie':
      return generatePieChart(config)
    default:
      return ''
  }
})

const downloadSVG = () => {
  const blob = new Blob([svgContent.value], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${chartTitle.value.replace(/\s+/g, '_')}_${chartType.value}.svg`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.color-picker {
  width: 100%;
  height: 45px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.data-points-container {
  max-height: 300px;
  overflow-y: auto;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
}
</style>
