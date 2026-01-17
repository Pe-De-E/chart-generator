<template>
  <v-container fluid>
    <!-- TODO Home braucht eine eigene Route, weil ich später ja noch eine Landingpage brauche -->

    <!-- Loading State -->
    <v-row v-if="chartsStore.loading.value">
      <v-col cols="12" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <div class="mt-4 text-h6">Loading your charts...</div>
      </v-col>
    </v-row>

    <!-- Empty State - No Charts yet -->
     <!-- TODO bitte in eine eigene komponente auslagern -->
    <v-row v-else-if="!charts.length">

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
    <template v-else>
      <v-row class="mb-4">
        <v-col cols="12" class="d-flex justify-end">
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="createChart"
          >
            Neuen Chart anlegen
          </v-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-col
          v-for="chart in charts"
          :key="chart.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <ChartCard
          :chart="chart"
          @edit="loadChart"
          @delete="confirmDelete"
        />
        </v-col>
      </v-row>
    </template>

    <!-- Delete Confirmation Dialog -->
     <!-- TODO sollte in eine eigene komponente -->
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { chartService } from '../../services/chart.service'
import type { SavedChart } from '@chart-generator/shared'
import ChartCard from '../../components/ChartCard.vue'
import { UserCharts } from '../../composables/useUserCharts'

// TODO UserCharts um optimistic delete erweitern (fühlt sich mega schnell an)
// TODO AsyncResource so erweitern, dass Delete automatisch den Cache updated
// TODO Home.vue weiter entschlacken (≤ 100 Zeilen Ziel)

const router = useRouter()

const deleteDialog = ref(false)
const chartToDelete = ref<SavedChart | null>(null)
  
const chartsStore = new UserCharts(true)
const charts = computed(() => {
  const data = chartsStore.data.value
  return Array.isArray(data) ? data : []
})

function createChart() {
  router.push({ name: 'Generator' })
}

function loadChart(chartId: string) {
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
    await chartsStore.load()
    deleteDialog.value = false
    chartToDelete.value = null
  } catch (error) {
    console.error('Error deleting chart:', error)
    alert('Failed to delete chart')
  }
}

</script>
