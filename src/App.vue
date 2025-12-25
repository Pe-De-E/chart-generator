<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title class="text-h5 font-weight-bold">
        📊 Chart Generator POC
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <v-btn
        :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
      ></v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-6">
        <ChartGenerator />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTheme } from 'vuetify'
import ChartGenerator from './components/ChartGenerator.vue'

const theme = useTheme()

// Load saved theme preference from localStorage
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    theme.global.name.value = savedTheme
  }
})

function toggleTheme() {
  const newTheme = theme.global.current.value.dark ? 'light' : 'dark'
  theme.global.name.value = newTheme
  localStorage.setItem('theme', newTheme)
}
</script>
