<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title class="text-h5 font-weight-bold" style="cursor: pointer" @click="router.push('/')">
        📊 Chart Generator
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <v-btn
        v-if="isAuthenticated"
        variant="text"
        prepend-icon="mdi-plus-circle"
        @click="router.push('/generator')"
      >
        New Chart
      </v-btn>

      <v-btn
        v-if="isAdmin"
        variant="text"
        prepend-icon="mdi-shield-crown"
        @click="router.push('/admin')"
      >
        Admin
      </v-btn>

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
import { computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import UserMenu from './components/UserMenu.vue'
import { useAuth } from './composables/useAuth'

const theme = useTheme()
const router = useRouter()
const { isAdmin } = useAuth()

const isAuthenticated = computed(() => {
  return !!sessionStorage.getItem('accessToken')
})

// Load saved theme preference from localStorage
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    theme.change(savedTheme)
  }

  // Listen for auth logout events (token expiry)
  window.addEventListener('auth:logout', () => {
    // Redirect to login page
    router.push({ name: 'Login', query: { expired: 'true' } })
  })
})

function toggleTheme() {
  const newTheme = theme.global.current.value.dark ? 'light' : 'dark'
  theme.change(newTheme)
  localStorage.setItem('theme', newTheme)
}
</script>
