<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title class="text-h5 font-weight-bold">
        📊 Chart Generator
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <v-btn
        :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
      ></v-btn>

      <UserMenu />
    </v-app-bar>

    <v-main>
      <router-view v-slot="{ Component }">
        <v-container v-if="Component" fluid class="pa-6">
          <component :is="Component" />
        </v-container>
      </router-view>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTheme } from 'vuetify'
import UserMenu from './components/UserMenu.vue'

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
