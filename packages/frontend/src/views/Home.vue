<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card class="pa-8 text-center" elevation="8">
          <v-icon size="120" color="primary" class="mb-6">
            mdi-chart-box-multiple-outline
          </v-icon>

          <h1 class="text-h2 font-weight-bold mb-4">
            Chart Generator
          </h1>

          <p class="text-h6 text-medium-emphasis mb-8">
            Transform your CSV data into beautiful, interactive charts
          </p>

          <v-row class="mb-8" justify="center">
            <v-col cols="12" sm="6" md="3">
              <v-card class="pa-4" variant="tonal">
                <v-icon size="48" color="primary" class="mb-2">mdi-chart-bar</v-icon>
                <div class="text-subtitle-1 font-weight-bold">Bar Charts</div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card class="pa-4" variant="tonal">
                <v-icon size="48" color="primary" class="mb-2">mdi-chart-line</v-icon>
                <div class="text-subtitle-1 font-weight-bold">Line Charts</div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card class="pa-4" variant="tonal">
                <v-icon size="48" color="primary" class="mb-2">mdi-chart-scatter-plot</v-icon>
                <div class="text-subtitle-1 font-weight-bold">Scatter Plots</div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card class="pa-4" variant="tonal">
                <v-icon size="48" color="primary" class="mb-2">mdi-chart-pie</v-icon>
                <div class="text-subtitle-1 font-weight-bold">Pie Charts</div>
              </v-card>
            </v-col>
          </v-row>

          <v-row justify="center">
            <v-col cols="12" sm="8" md="6">
              <v-btn
                color="primary"
                size="x-large"
                block
                prepend-icon="mdi-plus-circle"
                @click="createChart"
              >
                Create New Chart
              </v-btn>
            </v-col>
          </v-row>

          <v-divider class="my-8"></v-divider>

          <div class="text-body-1 text-medium-emphasis">
            <v-icon class="mr-2">mdi-upload</v-icon>
            Upload CSV files
            <v-icon class="mx-4">mdi-circle-small</v-icon>
            <v-icon class="mr-2">mdi-tune</v-icon>
            Customize appearance
            <v-icon class="mx-4">mdi-circle-small</v-icon>
            <v-icon class="mr-2">mdi-download</v-icon>
            Export as SVG
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function createChart() {
  router.push({ name: 'Generator' })
}
</script>
