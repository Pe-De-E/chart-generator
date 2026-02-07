<template>
  <v-dialog :model-value="modelValue" persistent max-width="450" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-video-outline</v-icon>
        Video Export
      </v-card-title>
      <v-card-text>
        <v-alert
          v-if="progress.stage === 'error'"
          type="error"
          class="mb-4"
        >
          {{ error }}
        </v-alert>

        <v-alert
          v-else-if="progress.stage === 'done'"
          type="success"
          class="mb-4"
        >
          Export erfolgreich! Die Datei wird heruntergeladen.
        </v-alert>

        <!-- Pay What You Want Section (after successful export) -->
        <div v-if="progress.stage === 'done'" class="support-section mt-4">
          <v-divider class="mb-4" />
          <div class="text-center">
            <v-icon size="32" color="pink-lighten-2" class="mb-2">mdi-heart</v-icon>
            <div class="text-body-1 font-weight-medium mb-2">
              Gefällt dir Altavio?
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Dieses Projekt ist ist noch in der Entwicklung. Wenn es dir gefällt, kannst du mich mit einem kleinen Beitrag unterstützen.
            </div>
            <v-btn
              color="primary"
              variant="flat"
              href="https://paypal.me/handcraftedshops"
              target="_blank"
              prepend-icon="mdi-hand-coin"
            >
              Pay what you want
            </v-btn>
            <div class="text-caption text-medium-emphasis mt-2">
              Jeder Betrag hilft bei der Weiterentwicklung
            </div>
          </div>
        </div>

        <template v-else>
          <div class="text-body-2 mb-2">
            {{ progress.message }}
          </div>
          <v-progress-linear
            :model-value="progress.percent"
            color="deep-purple"
            height="20"
            rounded
          >
            <template v-slot:default>
              <strong>{{ progress.percent }}%</strong>
            </template>
          </v-progress-linear>

          <div class="text-caption text-grey mt-2" v-if="progress.totalFrames > 0">
            Frame {{ progress.currentFrame }} / {{ progress.totalFrames }}
          </div>

          <v-chip
            size="small"
            class="mt-3"
            :color="getStageColor(progress.stage)"
          >
            {{ getStageLabel(progress.stage) }}
          </v-chip>
        </template>

        <v-alert
          v-if="!isSupported"
          type="warning"
          class="mt-4"
          density="compact"
        >
          SharedArrayBuffer wird nicht unterstützt.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="$emit('close')"
          :disabled="isExporting && progress.stage !== 'error'"
        >
          {{ progress.stage === 'done' || progress.stage === 'error' ? 'Schließen' : 'Abbrechen' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
export interface ExportProgress {
  stage: string
  percent: number
  currentFrame: number
  totalFrames: number
  message: string
}

defineProps<{
  modelValue: boolean
  progress: ExportProgress
  error: string | null
  isSupported: boolean
  isExporting: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
}>()

function getStageColor(stage: string): string {
  switch (stage) {
    case 'loading-ffmpeg': return 'blue'
    case 'generating-frames': return 'orange'
    case 'converting-to-png': return 'orange'
    case 'encoding': return 'purple'
    case 'done': return 'green'
    case 'error': return 'red'
    default: return 'grey'
  }
}

function getStageLabel(stage: string): string {
  switch (stage) {
    case 'idle': return 'Bereit'
    case 'loading-ffmpeg': return 'FFmpeg laden...'
    case 'generating-frames': return 'Frames generieren...'
    case 'converting-to-png': return 'Frames rendern...'
    case 'encoding': return 'Video kodieren...'
    case 'done': return 'Fertig!'
    case 'error': return 'Fehler'
    default: return stage
  }
}
</script>
