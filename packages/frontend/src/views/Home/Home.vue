<template>
  <v-container fluid>
    <!-- Loading State -->
    <v-row v-if="chartsStore.loading.value">
      <v-col cols="12" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <div class="mt-4 text-h6">Loading your charts...</div>
      </v-col>
    </v-row>

    <EmptyState v-else-if="!charts.length" @create="createChart" />

    <ChartsGrid v-else :charts="charts" @edit="loadChart" @delete="confirmDelete" />

    <DeleteChartDialog
      v-model="deleteDialog"
      :chart="chartToDelete"
      @confirm="deleteChart"
    />

    <ChartTypeDialog v-model="showChartTypeDialog" />
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { chartService } from '../../services/chart.service'
import type { SavedChart } from '@chart-generator/shared'
import ChartTypeDialog from '../../components/ChartTypeDialog.vue'
import { UserCharts } from '../../composables/useUserCharts'
import EmptyState from './EmptyState.vue'
import ChartsGrid from './ChartsGrid.vue'
import DeleteChartDialog from './DeleteChartDialog.vue'

// TODO UserCharts um optimistic delete erweitern (fühlt sich mega schnell an)
// TODO AsyncResource so erweitern, dass Delete automatisch den Cache updated

const router = useRouter()

const deleteDialog = ref(false)
const chartToDelete = ref<SavedChart | null>(null)
const showChartTypeDialog = ref(false)

const chartsStore = new UserCharts(true)
const charts = computed(() => {
  const data = chartsStore.data.value
  return Array.isArray(data) ? data : []
})

function createChart() {
  showChartTypeDialog.value = true
}

function loadChart(chartId: string) {
  const chart = charts.value.find(c => c.id === chartId)
  if (chart?.type === 'elevation') {
    router.push({ name: 'Elevation', query: { id: chartId } })
  } else if (chart?.type === 'route-map') {
    router.push({ name: 'GPX', query: { id: chartId, mode: 'route-map' } })
  } else if (chart?.type === 'terrain-3d') {
    router.push({ name: 'GPX', query: { id: chartId, mode: 'terrain' } })
  } else {
    router.push({ name: 'Generator', query: { id: chartId } })
  }
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
