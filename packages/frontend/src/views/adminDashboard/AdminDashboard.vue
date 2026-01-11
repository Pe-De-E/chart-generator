<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">
          <v-icon class="mr-2">mdi-shield-crown</v-icon>
          Admin Dashboard
        </h1>
      </v-col>
    </v-row>

    <!-- Stats Cards -->
    <v-row v-if="overview">
      <v-col cols="12" sm="6" md="3">
        <v-card color="blue-lighten-4">
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon size="48" color="blue">mdi-account-group</v-icon>
              <div class="ml-4">
                <div class="text-h4">{{ overview.users.total }}</div>
                <div class="text-caption">Nutzer gesamt</div>
                <div class="text-caption text-success">+{{ overview.users.newThisMonth }} diesen Monat</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="green-lighten-4">
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon size="48" color="green">mdi-currency-eur</v-icon>
              <div class="ml-4">
                <div class="text-h4">{{ formatCurrency(overview.payments.totalRevenue) }}</div>
                <div class="text-caption">Umsatz gesamt</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="purple-lighten-4">
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon size="48" color="purple">mdi-api</v-icon>
              <div class="ml-4">
                <div class="text-h4">{{ overview.requests.todayRequests }}</div>
                <div class="text-caption">Requests heute</div>
                <div class="text-caption">Ø {{ overview.requests.avgResponseTime }}ms</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card :color="overview.errors.unresolved > 0 ? 'red-lighten-4' : 'grey-lighten-4'">
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon size="48" :color="overview.errors.unresolved > 0 ? 'red' : 'grey'">mdi-alert-circle</v-icon>
              <div class="ml-4">
                <div class="text-h4">{{ overview.errors.unresolved }}</div>
                <div class="text-caption">Offene Fehler</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-tabs v-model="activeTab" color="primary">
            <v-tab value="users"><v-icon start>mdi-account-group</v-icon>Nutzer</v-tab>
            <v-tab value="payments"><v-icon start>mdi-credit-card</v-icon>Zahlungen</v-tab>
            <v-tab value="requests"><v-icon start>mdi-api</v-icon>Requests</v-tab>
            <v-tab value="errors">
              <v-icon start>mdi-alert-circle</v-icon>Fehler
              <v-badge v-if="overview?.errors.unresolved" :content="overview.errors.unresolved" color="error" class="ml-2" />
            </v-tab>
          </v-tabs>

          <v-card-text>
            <v-window v-model="activeTab">
              <!-- Users -->
              <v-window-item value="users">
                <v-text-field v-model="userSearch" label="Suchen..." prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" class="mb-4" @input="loadUsers" />
                <v-data-table :headers="userHeaders" :items="users.items" :loading="loading" density="compact">
                  <template v-slot:item.createdAt="{ item }">{{ formatDate(item.createdAt) }}</template>
                  <template v-slot:item.isAdmin="{ item }">
                    <v-chip :color="item.isAdmin ? 'primary' : 'grey'" size="small">{{ item.isAdmin ? 'Admin' : 'User' }}</v-chip>
                  </template>
                </v-data-table>
              </v-window-item>

              <!-- Payments -->
              <v-window-item value="payments">
                <v-data-table :headers="paymentHeaders" :items="payments.items" :loading="loading" density="compact">
                  <template v-slot:item.amount="{ item }">{{ formatCurrency(item.amount) }}</template>
                  <template v-slot:item.status="{ item }">
                    <v-chip :color="getStatusColor(item.status)" size="small">{{ item.status }}</v-chip>
                  </template>
                  <template v-slot:item.createdAt="{ item }">{{ formatDate(item.createdAt) }}</template>
                </v-data-table>
              </v-window-item>

              <!-- Requests -->
              <v-window-item value="requests">
                <v-data-table :headers="requestHeaders" :items="requestLogs.items" :loading="loading" density="compact">
                  <template v-slot:item.statusCode="{ item }">
                    <v-chip :color="item.statusCode >= 400 ? 'error' : 'success'" size="small">{{ item.statusCode }}</v-chip>
                  </template>
                  <template v-slot:item.responseTime="{ item }">{{ item.responseTime }}ms</template>
                  <template v-slot:item.createdAt="{ item }">{{ formatDateTime(item.createdAt) }}</template>
                </v-data-table>
              </v-window-item>

              <!-- Errors -->
              <v-window-item value="errors">
                <v-data-table :headers="errorHeaders" :items="errorLogs.items" :loading="loading" density="compact">
                  <template v-slot:item.severity="{ item }">
                    <v-chip :color="item.severity === 'critical' ? 'error' : 'warning'" size="small">{{ item.severity }}</v-chip>
                  </template>
                  <template v-slot:item.resolved="{ item }">
                    <v-chip :color="item.resolved ? 'success' : 'error'" size="small">{{ item.resolved ? 'Gelöst' : 'Offen' }}</v-chip>
                  </template>
                  <template v-slot:item.createdAt="{ item }">{{ formatDateTime(item.createdAt) }}</template>
                  <template v-slot:item.actions="{ item }">
                    <v-btn v-if="!item.resolved" size="small" color="success" @click="resolveError(item.id)">Lösen</v-btn>
                  </template>
                </v-data-table>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-overlay :model-value="loading && !overview" class="align-center justify-center">
      <v-progress-circular indeterminate size="64" />
    </v-overlay>
  </v-container>
</template>

<script setup lang="ts">
// TODO Tests schreiben
import { ref, onMounted, watch } from 'vue'
import { adminService } from '../../services/admin.service'

const loading = ref(false)
const activeTab = ref('users')
const userSearch = ref('')

const overview = ref<any>(null)
const users = ref<any>({ items: [], total: 0 })
const payments = ref<any>({ items: [], total: 0 })
const requestLogs = ref<any>({ items: [], total: 0 })
const errorLogs = ref<any>({ items: [], total: 0 })

const userHeaders = [
  { title: 'E-Mail', key: 'email' },
  { title: 'Name', key: 'firstName' },
  { title: 'Rolle', key: 'isAdmin' },
  { title: 'Erstellt', key: 'createdAt' },
]

const paymentHeaders = [
  { title: 'Nutzer', key: 'user.email' },
  { title: 'Betrag', key: 'amount' },
  { title: 'Status', key: 'status' },
  { title: 'Datum', key: 'createdAt' },
]

const requestHeaders = [
  { title: 'Methode', key: 'method' },
  { title: 'Pfad', key: 'path' },
  { title: 'Status', key: 'statusCode' },
  { title: 'Zeit', key: 'responseTime' },
  { title: 'Datum', key: 'createdAt' },
]

const errorHeaders = [
  { title: 'Code', key: 'errorCode' },
  { title: 'Nachricht', key: 'errorMessage' },
  { title: 'Schwere', key: 'severity' },
  { title: 'Status', key: 'resolved' },
  { title: 'Datum', key: 'createdAt' },
  { title: 'Aktionen', key: 'actions' },
]

onMounted(async () => {
  loading.value = true
  try {
    overview.value = await adminService.getDashboardOverview()
    await loadUsers()
  } finally {
    loading.value = false
  }
})

watch(activeTab, async (tab) => {
  loading.value = true
  try {
    if (tab === 'users') await loadUsers()
    if (tab === 'payments') payments.value = await adminService.getPayments()
    if (tab === 'requests') requestLogs.value = await adminService.getRequestLogs()
    if (tab === 'errors') errorLogs.value = await adminService.getErrorLogs()
  } finally {
    loading.value = false
  }
})

async function loadUsers() {
  users.value = await adminService.getUsers({ search: userSearch.value || undefined })
}

async function resolveError(errorId: string) {
  await adminService.resolveError(errorId)
  errorLogs.value = await adminService.getErrorLogs()
  overview.value = await adminService.getDashboardOverview()
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount || 0)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('de-DE')
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('de-DE')
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    COMPLETED: 'success', PENDING: 'warning', FAILED: 'error', REFUNDED: 'info', CANCELLED: 'grey'
  }
  return colors[status] || 'grey'
}
</script>
