<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card elevation="8">
          <v-card-title class="text-h5 text-center pa-6">
            Registrieren
          </v-card-title>

          <v-card-text>
            <v-form @submit.prevent="handleSignup">
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="firstName"
                    label="Vorname"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="lastName"
                    label="Nachname"
                    variant="outlined"
                  />
                </v-col>
              </v-row>

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

              <v-text-field
                v-model="confirmPassword"
                label="Passwort bestätigen"
                type="password"
                variant="outlined"
                required
                :error-messages="confirmPasswordErrors"
                @blur="validateConfirmPassword"
              />

              <v-alert v-if="errorMessage" type="error" class="mb-4">
                {{ errorMessage }}
              </v-alert>

              <v-alert type="info" density="compact" class="mb-4">
                Das Passwort muss mindestens 8 Zeichen lang sein und einen Großbuchstaben, einen Kleinbuchstaben und eine Zahl enthalten.
              </v-alert>

              <v-checkbox
                v-model="acceptedTerms"
                density="compact"
                hide-details
                class="mb-4"
              >
                <template v-slot:label>
                  <span class="text-body-2">
                    Ich akzeptiere die
                    <router-link to="/agb" target="_blank" class="text-primary">AGB</router-link>
                    und
                    <router-link to="/datenschutz" target="_blank" class="text-primary">Datenschutzerklärung</router-link>
                  </span>
                </template>
              </v-checkbox>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="isLoading"
                :disabled="!isFormValid"
              >
                Registrieren
              </v-btn>
            </v-form>

            <v-divider class="my-6" />

            <div class="text-center">
              <span class="text-body-2">Bereits ein Konto?</span>
              <v-btn
                variant="text"
                color="primary"
                size="small"
                @click="goToLogin"
              >
                Anmelden
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
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { signup, isLoading, error } = useAuth()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptedTerms = ref(false)

const emailErrors = ref<string[]>([])
const passwordErrors = ref<string[]>([])
const confirmPasswordErrors = ref<string[]>([])
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
  } else if (password.value.length < 8) {
    passwordErrors.value.push('Passwort muss mindestens 8 Zeichen lang sein')
  } else if (!/[A-Z]/.test(password.value)) {
    passwordErrors.value.push('Passwort muss mindestens einen Großbuchstaben enthalten')
  } else if (!/[a-z]/.test(password.value)) {
    passwordErrors.value.push('Passwort muss mindestens einen Kleinbuchstaben enthalten')
  } else if (!/\d/.test(password.value)) {
    passwordErrors.value.push('Passwort muss mindestens eine Zahl enthalten')
  }
}

const validateConfirmPassword = () => {
  confirmPasswordErrors.value = []
  if (!confirmPassword.value) {
    confirmPasswordErrors.value.push('Passwortbestätigung ist erforderlich')
  } else if (password.value !== confirmPassword.value) {
    confirmPasswordErrors.value.push('Passwörter stimmen nicht überein')
  }
}

const isFormValid = computed(() => {
  return (
    email.value &&
    password.value &&
    confirmPassword.value &&
    acceptedTerms.value &&
    emailErrors.value.length === 0 &&
    passwordErrors.value.length === 0 &&
    confirmPasswordErrors.value.length === 0
  )
})

const handleSignup = async () => {
  validateEmail()
  validatePassword()
  validateConfirmPassword()

  if (!isFormValid.value) return

  try {
    await signup({
      email: email.value,
      password: password.value,
      firstName: firstName.value || undefined,
      lastName: lastName.value || undefined,
    })

    // Redirect to home page after successful signup
    router.push('/')
  } catch (err) {
    // Error is handled by the composable
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>
