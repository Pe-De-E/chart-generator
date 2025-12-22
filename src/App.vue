<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title class="text-h5 font-weight-bold">
        📊 Chart Generator POC
      </v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-6">
        <ChartGenerator />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import ChartGenerator from './components/ChartGenerator.vue'
</script>
