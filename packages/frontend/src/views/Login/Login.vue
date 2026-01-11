<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card elevation="8">
          <v-card-title class="text-h5 text-center pa-6">
            Anmelden
          </v-card-title>

          <v-card-text>
            <v-alert v-if="sessionExpired" type="info" class="mb-4" closable>
              Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.
            </v-alert>

            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="email"
                label="E-Mail"
                type="email"
                variant="outlined"
                required
                :error-messages="emailErrors"
                @blur="validateEmail"
              />

              <v-text-field
                v-model="password"
                label="Passwort"
                type="password"
                variant="outlined"
                required
                :error-messages="passwordErrors"
                @blur="validatePassword"
              />

              <v-alert v-if="errorMessage" type="error" class="mb-4">
                {{ errorMessage }}
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="isLoading"
                :disabled="!isFormValid"
              >
                Anmelden
              </v-btn>
            </v-form>

            <v-divider class="my-6" />

            <div class="text-center">
              <span class="text-body-2">Noch kein Konto?</span>
              <v-btn
                variant="text"
                color="primary"
                size="small"
                @click="goToSignup"
              >
                Registrieren
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { login, isLoading, error } = useAuth()

// Check if user was redirected due to session expiry
const sessionExpired = computed(() => route.query.expired === 'true')

const email = ref('')
const password = ref('')
const emailErrors = ref<string[]>([])
const passwordErrors = ref<string[]>([])
const errorMessage = computed(() => error.value)

const validateEmail = () => {
  emailErrors.value = []
  if (!email.value) {
    emailErrors.value.push('E-Mail ist erforderlich')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailErrors.value.push('Ungültige E-Mail-Adresse')
  }
}

const validatePassword = () => {
  passwordErrors.value = []
  if (!password.value) {
    passwordErrors.value.push('Passwort ist erforderlich')
  }
}

const isFormValid = computed(() => {
  return email.value && password.value && emailErrors.value.length === 0 && passwordErrors.value.length === 0
})

const handleLogin = async () => {
  validateEmail()
  validatePassword()

  if (!isFormValid.value) return

  try {
    await login({
      email: email.value,
      password: password.value,
    })

    // Redirect to home page after successful login
    router.push('/')
  } catch (err) {
    // Error is handled by the composable
  }
}

const goToSignup = () => {
  router.push('/signup')
}
</script>
