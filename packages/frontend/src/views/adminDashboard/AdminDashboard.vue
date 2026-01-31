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

      <v-col cols="12" sm="6" md="3">
        <v-card :color="ticketStats?.open ? 'orange-lighten-4' : 'grey-lighten-4'">
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon size="48" :color="ticketStats?.open ? 'orange' : 'grey'">mdi-ticket</v-icon>
              <div class="ml-4">
                <div class="text-h4">{{ ticketStats?.open || 0 }}</div>
                <div class="text-caption">Offene Tickets</div>
                <div class="text-caption">{{ ticketStats?.todayTickets || 0 }} heute</div>
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
            <v-tab value="tickets">
              <v-icon start>mdi-ticket</v-icon>Tickets
              <v-badge v-if="ticketStats?.open" :content="ticketStats.open" color="warning" class="ml-2" />
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

              <!-- Tickets -->
              <v-window-item value="tickets">
                <v-row class="mb-4">
                  <v-col cols="12" sm="4">
                    <v-select
                      v-model="ticketStatusFilter"
                      :items="ticketStatusOptions"
                      label="Status"
                      variant="outlined"
                      density="compact"
                      clearable
                      @update:model-value="loadTickets"
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-select
                      v-model="ticketTypeFilter"
                      :items="ticketTypeOptions"
                      label="Typ"
                      variant="outlined"
                      density="compact"
                      clearable
                      @update:model-value="loadTickets"
                    />
                  </v-col>
                </v-row>
                <v-data-table :headers="ticketHeaders" :items="tickets.items" :loading="loading" density="compact">
                  <template v-slot:item.type="{ item }">
                    <v-chip :color="getTicketTypeColor(item.type)" size="small">
                      <v-icon start size="small">{{ item.type === 'BUG' ? 'mdi-bug' : item.type === 'FEATURE' ? 'mdi-lightbulb' : 'mdi-help-circle' }}</v-icon>
                      {{ item.type }}
                    </v-chip>
                  </template>
                  <template v-slot:item.status="{ item }">
                    <v-chip :color="getTicketStatusColor(item.status)" size="small">{{ item.status }}</v-chip>
                  </template>
                  <template v-slot:item.createdAt="{ item }">{{ formatDateTime(item.createdAt) }}</template>
                  <template v-slot:item.actions="{ item }">
                    <v-btn size="small" icon variant="text" @click="openTicketDialog(item)">
                      <v-icon>mdi-eye</v-icon>
                    </v-btn>
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

    <!-- Ticket Detail Dialog -->
    <v-dialog v-model="showTicketDialog" max-width="600">
      <v-card v-if="selectedTicket">
        <v-card-title class="d-flex align-center">
          <v-chip :color="getTicketTypeColor(selectedTicket.type)" size="small" class="mr-2">
            <v-icon start size="small">{{ selectedTicket.type === 'BUG' ? 'mdi-bug' : selectedTicket.type === 'FEATURE' ? 'mdi-lightbulb' : 'mdi-help-circle' }}</v-icon>
            {{ selectedTicket.type }}
          </v-chip>
          {{ selectedTicket.subject }}
        </v-card-title>
        <v-card-text>
          <div class="mb-4">
            <div class="text-caption text-medium-emphasis">Von</div>
            <div>{{ selectedTicket.user?.email }}</div>
          </div>
          <div class="mb-4">
            <div class="text-caption text-medium-emphasis">Nachricht</div>
            <div class="text-body-1" style="white-space: pre-wrap;">{{ selectedTicket.message }}</div>
          </div>
          <div class="mb-4">
            <div class="text-caption text-medium-emphasis">Status</div>
            <v-chip :color="getTicketStatusColor(selectedTicket.status)" size="small">{{ selectedTicket.status }}</v-chip>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">Erstellt am</div>
            <div>{{ formatDateTime(selectedTicket.createdAt) }}</div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn v-if="selectedTicket.status === 'OPEN'" color="info" variant="outlined" @click="updateTicketStatus('IN_PROGRESS')">
            In Bearbeitung
          </v-btn>
          <v-btn v-if="selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED'" color="success" variant="flat" @click="updateTicketStatus('RESOLVED')">
            Als gelöst markieren
          </v-btn>
          <v-btn variant="text" @click="showTicketDialog = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
// TODO Tests schreiben
import { ref, onMounted, watch } from 'vue'
import { adminService } from '../../services/admin.service'
import { ticketService, type Ticket, type TicketStats } from '../../services/ticket.service'

const loading = ref(false)
const activeTab = ref('users')
const userSearch = ref('')

const overview = ref<any>(null)
const users = ref<any>({ items: [], total: 0 })
const payments = ref<any>({ items: [], total: 0 })
const requestLogs = ref<any>({ items: [], total: 0 })
const errorLogs = ref<any>({ items: [], total: 0 })
const tickets = ref<{ items: Ticket[]; total: number }>({ items: [], total: 0 })
const ticketStats = ref<TicketStats | null>(null)
const ticketStatusFilter = ref<string | null>(null)
const ticketTypeFilter = ref<string | null>(null)
const selectedTicket = ref<Ticket | null>(null)
const showTicketDialog = ref(false)

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

const ticketHeaders = [
  { title: 'Betreff', key: 'subject' },
  { title: 'Typ', key: 'type' },
  { title: 'Nutzer', key: 'user.email' },
  { title: 'Status', key: 'status' },
  { title: 'Datum', key: 'createdAt' },
  { title: 'Aktionen', key: 'actions' },
]

const ticketStatusOptions = [
  { title: 'Offen', value: 'OPEN' },
  { title: 'In Bearbeitung', value: 'IN_PROGRESS' },
  { title: 'Gelöst', value: 'RESOLVED' },
  { title: 'Geschlossen', value: 'CLOSED' },
]

const ticketTypeOptions = [
  { title: 'Bug', value: 'BUG' },
  { title: 'Feature', value: 'FEATURE' },
  { title: 'Frage', value: 'QUESTION' },
]

onMounted(async () => {
  loading.value = true
  try {
    overview.value = await adminService.getDashboardOverview()
    ticketStats.value = await ticketService.getTicketStats()
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
    if (tab === 'tickets') await loadTickets()
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

async function loadTickets() {
  tickets.value = await ticketService.getTickets({
    status: ticketStatusFilter.value || undefined,
    type: ticketTypeFilter.value || undefined,
  })
}

function getTicketTypeColor(type: string) {
  const colors: Record<string, string> = {
    BUG: 'error', FEATURE: 'info', QUESTION: 'primary'
  }
  return colors[type] || 'grey'
}

function getTicketStatusColor(status: string) {
  const colors: Record<string, string> = {
    OPEN: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success', CLOSED: 'grey'
  }
  return colors[status] || 'grey'
}

function openTicketDialog(ticket: Ticket) {
  selectedTicket.value = ticket
  showTicketDialog.value = true
}

async function updateTicketStatus(status: string) {
  if (!selectedTicket.value) return
  await ticketService.updateTicketStatus(selectedTicket.value.id, { status })
  showTicketDialog.value = false
  await loadTickets()
  ticketStats.value = await ticketService.getTicketStats()
}
</script>
