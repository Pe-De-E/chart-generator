<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500">
    <v-card>
      <v-card-title class="text-h5">
        Delete Chart?
      </v-card-title>
      <v-card-text>
        Are you sure you want to delete "{{ chart?.title }}"? This action cannot be undone.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="$emit('update:modelValue', false)"
        >
          Cancel
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          @click="$emit('confirm')"
        >
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { SavedChart } from '@chart-generator/shared'

defineProps<{
  modelValue: boolean
  chart: SavedChart | null
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
</script>
