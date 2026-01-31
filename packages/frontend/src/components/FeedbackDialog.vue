<template>
  <v-dialog v-model="dialogVisible" max-width="500" persistent>
    <v-card>
      <v-card-title class="d-flex align-center card-header-bg">
        <v-icon icon="mdi-message-text" class="mr-2"></v-icon>
        Feedback senden
      </v-card-title>

      <v-card-text class="pt-6">
        <v-form @submit.prevent="handleSubmit" ref="formRef">
          <v-btn-toggle
            v-model="ticketType"
            mandatory
            divided
            class="mb-4 w-100"
            color="primary"
          >
            <v-btn value="QUESTION" class="flex-grow-1">
              <v-icon start>mdi-help-circle</v-icon>
              Frage
            </v-btn>
            <v-btn value="BUG" class="flex-grow-1">
              <v-icon start>mdi-bug</v-icon>
              Bug
            </v-btn>
            <v-btn value="FEATURE" class="flex-grow-1">
              <v-icon start>mdi-lightbulb</v-icon>
              Feature
            </v-btn>
          </v-btn-toggle>

          <v-text-field
            v-model="subject"
            label="Betreff"
            variant="outlined"
            required
            :rules="[v => !!v || 'Betreff ist erforderlich']"
            class="mb-2"
          />

          <v-textarea
            v-model="message"
            label="Nachricht"
            variant="outlined"
            required
            rows="5"
            :rules="[v => !!v || 'Nachricht ist erforderlich']"
            :hint="ticketType === 'BUG' ? 'Beschreibe bitte was passiert ist und wie wir den Fehler reproduzieren können.' : ''"
            persistent-hint
          />

          <v-alert v-if="errorMessage" type="error" class="mt-4" density="compact">
            {{ errorMessage }}
          </v-alert>

          <v-alert v-if="successMessage" type="success" class="mt-4" density="compact">
            {{ successMessage }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="closeDialog" :disabled="isLoading">
          Abbrechen
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="isLoading"
          :disabled="!isFormValid || !!successMessage"
          @click="handleSubmit"
        >
          Senden
          <v-icon end>mdi-send</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ticketService } from '../services/ticket.service'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formRef = ref()
const ticketType = ref<'BUG' | 'FEATURE' | 'QUESTION'>('QUESTION')
const subject = ref('')
const message = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const isFormValid = computed(() => {
  return subject.value.trim() && message.value.trim() && ticketType.value
})

// Reset form when dialog opens
watch(dialogVisible, (isOpen) => {
  if (isOpen) {
    ticketType.value = 'QUESTION'
    subject.value = ''
    message.value = ''
    errorMessage.value = ''
    successMessage.value = ''
  }
})

async function handleSubmit() {
  if (!isFormValid.value) return

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await ticketService.createTicket({
      subject: subject.value.trim(),
      message: message.value.trim(),
      type: ticketType.value,
    })

    successMessage.value = 'Vielen Dank! Dein Feedback wurde gesendet.'

    // Close dialog after short delay
    setTimeout(() => {
      closeDialog()
    }, 1500)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error?.message || 'Fehler beim Senden'
  } finally {
    isLoading.value = false
  }
}

function closeDialog() {
  dialogVisible.value = false
}
</script>

<style scoped>
.card-header-bg {
  background: var(--color-surface-variant, #f5f5f5);
}

.w-100 {
  width: 100%;
}
</style>
