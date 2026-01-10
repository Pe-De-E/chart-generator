<template>
  <v-card flat>
    <v-card-text>
      <div class="text-h5 mb-4">Datei hochladen</div>

      <v-file-input
        v-model="uploadedFile"
        label="CSV- oder GPX-Datei auswählen"
        accept=".csv,.gpx"
        variant="outlined"
        prepend-icon="mdi-file-delimited"
        show-size
        :hint="fileTypeHint"
        persistent-hint
        @update:model-value="handleFileUpload"
        class="mb-4"
      ></v-file-input>

      <!-- File Preview -->
      <v-card v-if="tableItems.length > 0" variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
          <v-icon icon="mdi-eye" class="mr-2"></v-icon>
          Vorschau (erste 5 Zeilen)
        </v-card-title>
        <v-card-text class="pa-0">
          <v-data-table
            :headers="tableHeaders"
            :items="tableItems.slice(0, 5)"
            density="compact"
            hide-default-footer
            class="elevation-0"
          ></v-data-table>
        </v-card-text>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact">
            {{ tableItems.length }} Zeilen geladen
          </v-alert>
        </v-card-text>
      </v-card>

      <!-- Empty State -->
      <v-card v-else variant="outlined" class="text-center pa-8">
        <v-icon icon="mdi-file-upload-outline" size="64" color="grey"></v-icon>
        <div class="text-h6 mt-4 mb-2">Keine Datei ausgewählt</div>
        <div class="text-caption text-grey">CSV-Datei für Diagramme oder GPX-Datei für Höhenprofile</div>
      </v-card>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        variant="flat"
        :disabled="tableItems.length === 0"
        @click="$emit('next')"
      >
        Weiter
        <v-icon end>mdi-chevron-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import type { TableHeader, TableItem } from '../../composables/useCSVParser'

const props = defineProps({
  tableHeaders: {
    type: Array as PropType<TableHeader[]>,
    required: true
  },
  tableItems: {
    type: Array as PropType<TableItem[]>,
    required: true
  },
  parseCSV: {
    type: Function as PropType<(text: string) => void>,
    required: true
  },
  parseGPX: {
    type: Function as PropType<(text: string) => void>,
    required: true
  }
})

const emit = defineEmits<{
  next: []
  'gpx-loaded': []
}>()

const uploadedFile = ref<File[]>([])

const fileTypeHint = computed(() => {
  const file = uploadedFile.value?.[0]
  if (!file) return 'CSV für allgemeine Daten, GPX für GPS-Tracks'
  if (file.name.toLowerCase().endsWith('.gpx')) {
    return 'GPX-Datei erkannt - wird als Höhenprofil geladen'
  }
  return 'CSV-Datei erkannt'
})

const handleFileUpload = (files: File | File[] | null) => {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (!text) return

    if (file.name.toLowerCase().endsWith('.gpx')) {
      props.parseGPX(text)
      emit('gpx-loaded')
    } else {
      props.parseCSV(text)
    }
  }
  reader.readAsText(file)
}
</script>
