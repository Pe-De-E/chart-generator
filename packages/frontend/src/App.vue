<template>
  <v-app class="app-layout">
    <!-- Sidebar Navigation -->
    <AppSidebar />

    <!-- Main Content Area -->
    <v-main class="main-content">
      <router-view v-slot="{ Component }">
        <div v-if="Component" class="content-wrapper">
          <component :is="Component" />
        </div>
      </router-view>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'

const theme = useTheme()
const router = useRouter()

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
</script>

<style scoped>
.app-layout {
  background: rgb(var(--v-theme-background));
}

.main-content {
  background: rgb(var(--v-theme-background));
  min-height: 100vh;
}

.content-wrapper {
  padding: 24px;
  height: 100%;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .content-wrapper {
    padding: 16px;
  }
}
</style>
