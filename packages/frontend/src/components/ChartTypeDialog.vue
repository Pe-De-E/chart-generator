<template>
  <v-dialog v-model="dialogVisible" max-width="600" persistent>
    <v-card>
      <v-card-title class="d-flex align-center bg-grey-lighten-4">
        <v-icon icon="mdi-plus-circle" class="mr-2"></v-icon>
        Neuen Chart erstellen
      </v-card-title>

      <v-card-text class="pt-6">
        <div class="text-body-1 mb-4 text-medium-emphasis">
          Wählen Sie den Chart-Typ aus:
        </div>

        <v-row>
          <!-- Elevation Chart Option -->
          <v-col cols="12" sm="6">
            <v-card
              variant="outlined"
              class="chart-type-card pa-4 text-center"
              :class="{ 'selected': selectedType === 'elevation' }"
              @click="selectType('elevation')"
              hover
            >
              <v-icon size="64" color="primary" class="mb-3">
                mdi-terrain
              </v-icon>
              <div class="text-h6 mb-2">Höhenprofil (GPX)</div>
              <div class="text-caption text-medium-emphasis">
                Erstellen Sie ein Höhenprofil aus einer GPX-Datei
              </div>
            </v-card>
          </v-col>

          <!-- Route Map Option -->
          <v-col cols="12" sm="6">
            <v-card
              variant="outlined"
              class="chart-type-card pa-4 text-center"
              :class="{ 'selected': selectedType === 'route-map' }"
              @click="selectType('route-map')"
              hover
            >
              <v-icon size="64" color="primary" class="mb-3">
                mdi-map-marker-path
              </v-icon>
              <div class="text-h6 mb-2">Routenkarte (GPX)</div>
              <div class="text-caption text-medium-emphasis">
                Karte + Hoehenprofil aus einer GPX-Datei
              </div>
            </v-card>
          </v-col>
          <!-- 3D Terrain Option -->
          <v-col cols="12" sm="6">
            <v-card
              variant="outlined"
              class="chart-type-card pa-4 text-center"
              :class="{ 'selected': selectedType === 'terrain' }"
              @click="selectType('terrain')"
              hover
            >
              <v-icon size="64" color="primary" class="mb-3">
                mdi-mountain
              </v-icon>
              <div class="text-h6 mb-2">3D Gelände (GPX)</div>
              <div class="text-caption text-medium-emphasis">
                Echtes 3D-Terrain mit leuchtender Route
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="pa-4 bg-grey-lighten-5">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="closeDialog"
        >
          Abbrechen
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!selectedType"
          @click="confirmSelection"
        >
          Weiter
          <v-icon end>mdi-chevron-right</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const selectedType = ref<'elevation' | 'route-map' | 'terrain' | null>(null)

function selectType(type: 'elevation' | 'route-map' | 'terrain') {
  selectedType.value = type
}

function closeDialog() {
  selectedType.value = null
  dialogVisible.value = false
}

function confirmSelection() {
  // Dispatch so same-route generators (GPX, Elevation) reset their wizard
  window.dispatchEvent(new CustomEvent('chart:new'))
  if (selectedType.value === 'elevation') {
    router.push({ name: 'Elevation' })
  } else if (selectedType.value === 'route-map') {
    router.push({ name: 'GPX', query: { mode: 'route-map' } })
  } else if (selectedType.value === 'terrain') {
    router.push({ name: 'GPX', query: { mode: 'terrain' } })
  }
  closeDialog()
}
</script>

<style scoped>
.chart-type-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.chart-type-card:hover:not(.disabled-card) {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.chart-type-card.selected {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.disabled-card {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
