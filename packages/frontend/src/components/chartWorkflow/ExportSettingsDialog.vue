<template>
  <v-dialog :model-value="modelValue" max-width="400" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-cog</v-icon>
        Export-Einstellungen
      </v-card-title>
      <v-card-text>
        <v-select
          v-model="exportSettings.resolution"
          :items="resolutionOptions"
          item-title="title"
          item-value="value"
          label="Auflösung"
          variant="outlined"
          density="comfortable"
          class="mb-3"
        />
        <v-select
          v-model="exportSettings.fps"
          :items="fpsOptions"
          item-title="title"
          item-value="value"
          label="Bildrate"
          variant="outlined"
          density="comfortable"
          class="mb-3"
        />
        <v-select
          v-model="exportSettings.quality"
          :items="qualityOptions"
          item-title="title"
          item-value="value"
          label="Qualität"
          variant="outlined"
          density="comfortable"
        />
        <v-alert
          type="info"
          density="compact"
          variant="tonal"
          class="mt-4"
        >
          <div class="text-caption">
            Geschätzte Frames: {{ estimatedFrames }}
          </div>
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          Abbrechen
        </v-btn>
        <v-btn color="deep-purple" variant="flat" @click="handleStartExport">
          <v-icon start>mdi-export</v-icon>
          Exportieren
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { TITLE_CARD_DURATION_MS } from '../../utils/titleCardGenerator'

export interface ExportSettings {
  resolution: '1080x1920' | '720x1280' | '540x960'
  fps: 24 | 30 | 60
  quality: 'low' | 'medium' | 'high'
}

const props = defineProps<{
  modelValue: boolean
  animationDuration: number
  chartTitle: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'start-export': [settings: ExportSettings]
}>()

const exportSettings = ref<ExportSettings>({
  resolution: '1080x1920',
  fps: 30,
  quality: 'high',
})

const resolutionOptions = [
  { title: '1080 x 1920 (Full HD)', value: '1080x1920' },
  { title: '720 x 1280 (HD)', value: '720x1280' },
  { title: '540 x 960 (SD)', value: '540x960' },
]

const fpsOptions = [
  { title: '24 fps (Cinematic)', value: 24 },
  { title: '30 fps (Standard)', value: 30 },
  { title: '60 fps (Smooth)', value: 60 },
]

const qualityOptions = [
  { title: 'Niedrig (kleine Datei)', value: 'low' },
  { title: 'Mittel', value: 'medium' },
  { title: 'Hoch (beste Qualität)', value: 'high' },
]

const estimatedFrames = computed(() => {
  const titleDuration = props.chartTitle.trim() ? TITLE_CARD_DURATION_MS / 1000 : 0
  return Math.ceil((props.animationDuration + titleDuration) * exportSettings.value.fps) + 1
})

function handleStartExport() {
  emit('update:modelValue', false)
  emit('start-export', { ...exportSettings.value })
}
</script>
