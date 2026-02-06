<template>
  <v-row>
    <v-col cols="12">
      <v-card class="pa-12 text-center" variant="outlined">
        <v-icon size="120" color="grey-lighten-1" class="mb-6">
          mdi-chart-box-outline
        </v-icon>
        <h2 class="text-h5 mb-4">No charts yet</h2>
        <p class="text-body-1 text-medium-emphasis mb-6">
          Create your first chart by uploading a CSV file
        </p>
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-plus-circle"
          @click="$emit('create')"
        >
          Create Your First Chart
        </v-btn>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
defineEmits<{
  create: []
}>()
</script>
