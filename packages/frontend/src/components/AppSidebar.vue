<template>
  <v-navigation-drawer
    permanent
    :rail="isCollapsed"
    :width="240"
    rail-width="72"
    class="app-sidebar"
  >
    <!-- Logo Section -->
    <div class="sidebar-header" :class="{ 'collapsed': isCollapsed }">
      <div class="logo-container" @click="router.push('/')">
        <img src="/Logo.png" alt="Altavio" class="logo-image" />
        <span v-if="!isCollapsed" class="logo-text">Altavio</span>
      </div>
      <v-btn
        v-if="!isCollapsed"
        icon
        variant="text"
        size="small"
        class="collapse-btn"
        @click="toggleCollapse"
      >
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
    </div>

    <!-- Expand button below logo when collapsed -->
    <div v-if="isCollapsed" class="expand-btn-container">
      <v-btn
        icon
        variant="text"
        size="small"
        class="expand-btn"
        @click="toggleCollapse"
      >
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
    </div>

    <v-divider class="sidebar-divider" />

    <!-- Navigation Items -->
    <v-list nav density="compact" class="sidebar-nav">
      <v-list-item
        v-if="isAuthenticated"
        prepend-icon="mdi-plus-circle"
        :title="isCollapsed ? '' : 'New Chart'"
        @click="handleNewChart"
        class="nav-item"
        rounded="lg"
      >
        <v-tooltip v-if="isCollapsed" activator="parent" location="right">
          New Chart
        </v-tooltip>
      </v-list-item>

      <v-list-item
        prepend-icon="mdi-view-dashboard"
        :title="isCollapsed ? '' : 'Dashboard'"
        @click="router.push('/')"
        :active="isActiveRoute('/')"
        class="nav-item"
        rounded="lg"
      >
        <v-tooltip v-if="isCollapsed" activator="parent" location="right">
          Dashboard
        </v-tooltip>
      </v-list-item>

      <v-list-item
        v-if="isAdmin"
        prepend-icon="mdi-shield-crown"
        :title="isCollapsed ? '' : 'Admin'"
        @click="router.push('/admin')"
        :active="isActiveRoute('/admin')"
        class="nav-item"
        rounded="lg"
      >
        <v-tooltip v-if="isCollapsed" activator="parent" location="right">
          Admin
        </v-tooltip>
      </v-list-item>
    </v-list>

    <v-spacer />

    <!-- Bottom Section -->
    <div class="sidebar-footer">
      <v-divider class="sidebar-divider mb-2" />

      <!-- Theme Toggle -->
      <v-list-item
        :prepend-icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        :title="isCollapsed ? '' : (isDark ? 'Light Mode' : 'Dark Mode')"
        @click="toggleTheme"
        class="nav-item"
        rounded="lg"
      >
        <v-tooltip v-if="isCollapsed" activator="parent" location="right">
          {{ isDark ? 'Light Mode' : 'Dark Mode' }}
        </v-tooltip>
      </v-list-item>

      <!-- User Section -->
      <div v-if="isAuthenticated" class="user-section" :class="{ 'collapsed': isCollapsed }">
        <v-menu location="top end">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              class="user-item"
              :class="{ 'user-item-collapsed': isCollapsed }"
              :rounded="isCollapsed ? 'circle' : 'lg'"
            >
              <template v-slot:prepend>
                <v-avatar color="primary" size="32">
                  <span class="text-body-2 font-weight-bold">
                    {{ userInitials }}
                  </span>
                </v-avatar>
              </template>
              <template v-if="!isCollapsed" v-slot:title>
                <span class="user-name">{{ userDisplayName }}</span>
              </template>
              <template v-if="!isCollapsed" v-slot:subtitle>
                <span class="user-email">{{ currentUser?.email }}</span>
              </template>
            </v-list-item>
          </template>

          <v-list class="user-menu" rounded="lg">
            <v-list-item>
              <v-list-item-title class="font-weight-bold">
                {{ userDisplayName }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ currentUser?.email }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider />
            <v-list-item @click="handleLogout" prepend-icon="mdi-logout">
              <v-list-item-title>Abmelden</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <!-- Login Button -->
      <v-list-item
        v-else
        prepend-icon="mdi-login"
        :title="isCollapsed ? '' : 'Anmelden'"
        @click="router.push('/login')"
        class="nav-item login-item"
        rounded="lg"
      >
        <v-tooltip v-if="isCollapsed" activator="parent" location="right">
          Anmelden
        </v-tooltip>
      </v-list-item>
    </div>
  </v-navigation-drawer>

  <!-- Chart Type Selection Dialog -->
  <ChartTypeDialog v-model="showChartTypeDialog" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuth } from '../composables/useAuth'
import ChartTypeDialog from './ChartTypeDialog.vue'

const router = useRouter()
const route = useRoute()
const theme = useTheme()
const { currentUser, isAuthenticated, isAdmin, logout } = useAuth()

const isCollapsed = ref(false)
const showChartTypeDialog = ref(false)

const isDark = computed(() => theme.global.current.value.dark)

const userDisplayName = computed(() => {
  if (currentUser.value?.firstName || currentUser.value?.lastName) {
    return `${currentUser.value.firstName || ''} ${currentUser.value.lastName || ''}`.trim()
  }
  return currentUser.value?.email?.split('@')[0] || 'Benutzer'
})

const userInitials = computed(() => {
  if (currentUser.value?.firstName && currentUser.value?.lastName) {
    return `${currentUser.value.firstName[0]}${currentUser.value.lastName[0]}`.toUpperCase()
  }
  return currentUser.value?.email?.[0]?.toUpperCase() || 'U'
})

function isActiveRoute(path: string): boolean {
  return route.path === path
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function toggleTheme() {
  const newTheme = theme.global.current.value.dark ? 'light' : 'dark'
  theme.change(newTheme)
  localStorage.setItem('theme', newTheme)
}

function handleNewChart() {
  showChartTypeDialog.value = true
}

async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<style scoped>
.app-sidebar {
  background: rgb(var(--v-theme-surface)) !important;
  border-right: 1px solid rgba(var(--v-border-color), 0.08) !important;
}

/* Dark theme specific styles */
:root .v-theme--dark .app-sidebar {
  background: #1E1C1A !important;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  min-height: 64px;
}

.sidebar-header.collapsed {
  justify-content: center;
  padding: 16px 12px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.sidebar-header.collapsed .logo-container {
  justify-content: center;
}

.logo-container:hover {
  opacity: 0.8;
}

.logo-image {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.02em;
}

.collapse-btn {
  color: rgb(var(--v-theme-on-surface-variant)) !important;
}

.expand-btn-container {
  display: flex;
  justify-content: center;
  padding: 4px 12px 8px;
}

.expand-btn {
  color: rgb(var(--v-theme-on-surface-variant)) !important;
}

.expand-btn:hover {
  background: rgba(var(--v-theme-primary), 0.08) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.sidebar-divider {
  opacity: 0.08;
  margin: 0 12px;
}

.sidebar-nav {
  padding: 8px 12px;
}

.nav-item {
  margin-bottom: 4px;
  color: rgb(var(--v-theme-on-surface-variant)) !important;
  transition: all var(--transition-fast);
}

.nav-item:hover {
  background: rgba(var(--v-theme-primary), 0.08) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.nav-item.v-list-item--active {
  background: rgba(var(--v-theme-primary), 0.12) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.nav-item :deep(.v-icon) {
  opacity: 0.8;
}

.nav-item:hover :deep(.v-icon),
.nav-item.v-list-item--active :deep(.v-icon) {
  opacity: 1;
  color: rgb(var(--v-theme-primary));
}

.sidebar-footer {
  padding: 8px 12px 16px;
}

.user-section {
  margin-top: 8px;
}

.user-section.collapsed {
  display: flex;
  justify-content: center;
}

.user-item {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  transition: all var(--transition-fast);
}

.user-item:hover {
  background: rgba(var(--v-theme-surface-variant), 0.8);
}

.user-item-collapsed {
  background: transparent !important;
  padding: 8px !important;
  min-height: auto !important;
}

.user-item-collapsed:hover {
  background: rgba(var(--v-theme-primary), 0.08) !important;
}

.user-item-collapsed :deep(.v-list-item__prepend) {
  margin: 0 !important;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu {
  min-width: 200px;
}

.login-item {
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary)) !important;
}

.login-item:hover {
  background: rgba(var(--v-theme-primary), 0.16) !important;
}
</style>
