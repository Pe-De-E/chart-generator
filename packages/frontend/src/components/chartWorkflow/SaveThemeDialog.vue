<template>
  <v-dialog :model-value="modelValue" max-width="400" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>Theme speichern</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="themeName"
          label="Theme Name"
          variant="outlined"
          density="comfortable"
          :rules="[v => !!v || 'Name ist erforderlich']"
          autofocus
          class="mb-2"
        />
        <v-text-field
          v-model="themeDescription"
          label="Beschreibung (optional)"
          variant="outlined"
          density="comfortable"
        />
        <div class="text-caption text-grey mt-2">
          Aktuelle Farben, Animation und Marker-Einstellungen werden gespeichert.
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Abbrechen</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="handleSave"
          :disabled="!themeName.trim()"
          :loading="loading"
        >
          Speichern
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [name: string, description: string]
}>()

const themeName = ref('')
const themeDescription = ref('')

// Reset fields when dialog opens
watch(() => props.modelValue, (open) => {
  if (open) {
    themeName.value = ''
    themeDescription.value = ''
  }
})

function handleSave() {
  if (!themeName.value.trim()) return
  emit('save', themeName.value.trim(), themeDescription.value.trim())
  emit('update:modelValue', false)
}
</script>
