<template>
  <v-app class="app-layout">
    <!-- Sidebar Navigation -->
    <AppSidebar @new-chart="showChartTypeDialog = true" />
    <ChartTypeDialog v-model="showChartTypeDialog" />

    <!-- Main Content Area -->
    <v-main class="main-content">
      <router-view v-slot="{ Component }">
        <div v-if="Component" class="content-wrapper">
          <component :is="Component" />
        </div>
      </router-view>

      <!-- Minimal Footer -->
      <footer class="app-footer">
        <router-link to="/impressum">Impressum</router-link>
        <span class="divider">·</span>
        <router-link to="/datenschutz">Datenschutz</router-link>
        <span class="divider">·</span>
        <router-link to="/agb">AGB</router-link>
      </footer>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import ChartTypeDialog from './components/ChartTypeDialog.vue'

const showChartTypeDialog = ref(false)
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

/* Minimal Footer */
.app-footer {
  position: fixed;
  bottom: 0;
  right: 0;
  padding: 6px 16px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  display: flex;
  gap: 6px;
  align-items: center;
  z-index: 1;
}

.app-footer a {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s;
}

.app-footer a:hover {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.app-footer .divider {
  opacity: 0.5;
}
</style>
