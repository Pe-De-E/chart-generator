<template>
  <v-container fluid>
    <!-- Header Section -->
    <v-row>
      <v-col cols="12">
        <v-card class="pa-6" elevation="2">
          <div class="d-flex align-center justify-space-between">
            <div>
              <h1 class="text-h4 font-weight-bold mb-2">
                <v-icon size="40" color="primary" class="mr-2">
                  mdi-chart-box-multiple-outline
                </v-icon>
                Meine Charts
              </h1>
              <p class="text-subtitle-1 text-medium-emphasis">
                Transform your CSV data into beautiful, interactive charts
              </p>
            </div>
            <v-btn
              color="primary"
              size="large"
              prepend-icon="mdi-plus-circle"
              @click="createChart"
            >
              Create New Chart
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <div class="mt-4 text-h6">Loading your charts...</div>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-else-if="charts.length === 0">
      <v-col cols="12">
        <v-card class="pa-12 text-center" variant="outlined">
          <v-icon size="120" color="grey-lighten-1" class="mb-6">
            mdi-chart-box-outline
          </v-icon>
          <h2 class="text-h5 mb-4">No charts yet</h2>
          <p class="text-body-1 text-medium-emphasis mb-6">
            Create your first chart by uploading a CSV file
          </p>
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-plus-circle"
            @click="createChart"
          >
            Create Your First Chart
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Charts Grid -->
    <v-row v-else>
      <v-col
        v-for="chart in charts"
        :key="chart.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card elevation="2" class="chart-card">
          <v-img
            v-if="chart.svgContent"
            :src="'data:image/svg+xml;base64,' + btoa(chart.svgContent)"
            height="200"
            cover
            class="chart-preview"
          ></v-img>
          <div v-else class="chart-preview-placeholder">
            <v-icon size="64" color="grey-lighten-1">
              {{ getChartIcon(chart.type) }}
            </v-icon>
          </div>

          <v-card-title class="text-h6">
            {{ chart.title }}
          </v-card-title>

          <v-card-subtitle>
            <v-chip size="small" :color="getChartColor(chart.type)" class="mr-2">
              {{ chart.type.toUpperCase() }}
            </v-chip>
            <span class="text-caption">
              {{ formatDate(chart.updatedAt) }}
            </span>
          </v-card-subtitle>

          <v-card-actions>
            <v-btn
              color="primary"
              variant="text"
              prepend-icon="mdi-pencil"
              @click="loadChart(chart.id)"
            >
              Edit
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="error"
              variant="text"
              icon="mdi-delete"
              @click="confirmDelete(chart)"
            ></v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          Delete Chart?
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ chartToDelete?.title }}"? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="deleteDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="deleteChart"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { chartService } from '../services/chart.service'
import type { SavedChart } from '@chart-generator/shared'

const router = useRouter()

const charts = ref<SavedChart[]>([])
const loading = ref(true)
const deleteDialog = ref(false)
const chartToDelete = ref<SavedChart | null>(null)

onMounted(async () => {
  await loadCharts()
})

async function loadCharts() {
  try {
    loading.value = true
    charts.value = await chartService.getUserCharts()
  } catch (error) {
    console.error('Error loading charts:', error)
  } finally {
    loading.value = false
  }
}

function createChart() {
  router.push({ name: 'Generator' })
}

function loadChart(chartId: string) {
  // TODO: Implement chart loading
  router.push({ name: 'Generator', query: { id: chartId } })
}

function confirmDelete(chart: SavedChart) {
  chartToDelete.value = chart
  deleteDialog.value = true
}

async function deleteChart() {
  if (!chartToDelete.value) return

  try {
    await chartService.deleteChart(chartToDelete.value.id)
    await loadCharts()
    deleteDialog.value = false
    chartToDelete.value = null
  } catch (error) {
    console.error('Error deleting chart:', error)
    alert('Failed to delete chart')
  }
}

function getChartIcon(type: string): string {
  const icons: Record<string, string> = {
    bar: 'mdi-chart-bar',
    line: 'mdi-chart-line',
    scatter: 'mdi-chart-scatter-plot',
    pie: 'mdi-chart-pie',
    area: 'mdi-chart-areaspline',
  }
  return icons[type] || 'mdi-chart-box'
}

function getChartColor(type: string): string {
  const colors: Record<string, string> = {
    bar: 'blue',
    line: 'green',
    scatter: 'orange',
    pie: 'purple',
    area: 'teal',
  }
  return colors[type] || 'grey'
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
</script>

<style scoped>
.chart-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-preview {
  background: #f5f5f5;
}

.chart-preview-placeholder {
  height: 200px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
