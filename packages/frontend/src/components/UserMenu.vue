<template>
  <div v-if="isAuthenticated">
    <v-menu>
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          variant="text"
        >
          <v-icon>mdi-account-circle</v-icon>
        </v-btn>
      </template>

      <v-list>
        <v-list-item>
          <v-list-item-title class="font-weight-bold">
            {{ userDisplayName }}
          </v-list-item-title>
          <v-list-item-subtitle>
            {{ currentUser?.email }}
          </v-list-item-subtitle>
        </v-list-item>

        <v-divider />

        <v-list-item @click="handleLogout" :disabled="isLoading">
          <template v-slot:prepend>
            <v-icon>mdi-logout</v-icon>
          </template>
          <v-list-item-title>Abmelden</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>

  <div v-else>
    <v-btn
      color="primary"
      variant="outlined"
      @click="goToLogin"
    >
      Anmelden
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { currentUser, isAuthenticated, isLoading, logout } = useAuth()

const userDisplayName = computed(() => {
  if (currentUser.value?.firstName || currentUser.value?.lastName) {
    return `${currentUser.value.firstName || ''} ${currentUser.value.lastName || ''}`.trim()
  }
  return currentUser.value?.email || 'Benutzer'
})

const handleLogout = async () => {
  await logout()
  router.push('/login')
}

const goToLogin = () => {
  router.push('/login')
}
</script>
