<template>
  <v-navigation-drawer
    permanent
    :width="280"
    class="step-navigation"
  >
    <v-list density="compact" class="pa-2">
      <v-list-subheader class="text-overline font-weight-bold mb-2">
        Workflow-Schritte
      </v-list-subheader>

      <div v-for="(step, index) in steps" :key="index" class="mb-2">
        <!-- Blocked Step with Tooltip -->
        <v-tooltip v-if="isStepBlocked(step.value)" location="right">
          <template v-slot:activator="{ props: tooltipProps }">
            <v-list-item
              v-bind="tooltipProps"
              :value="step.value"
              :active="currentStep === step.value"
              @click="navigateToStep(step.value)"
              class="step-item step-blocked"
              rounded="lg"
            >
              <template v-slot:prepend>
                <v-avatar color="grey-lighten-2" size="40" class="step-avatar">
                  <v-icon :icon="getStepIcon(step.value)" color="grey"></v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ step.title }}
              </v-list-item-title>

              <v-list-item-subtitle class="text-caption">
                {{ step.description }}
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-icon color="error" size="small">mdi-lock</v-icon>
              </template>
            </v-list-item>
          </template>
          <div class="text-caption">
            <strong>Schritt gesperrt</strong><br>
            Bitte vervollständigen Sie zuerst die vorherigen Schritte.
          </div>
        </v-tooltip>

        <!-- Non-blocked Step -->
        <v-list-item
          v-else
          :value="step.value"
          :active="currentStep === step.value"
          @click="navigateToStep(step.value)"
          class="step-item"
          :class="{
            'step-completed': isStepCompleted(step.value),
            'step-incomplete': isStepIncomplete(step.value),
            'step-current': currentStep === step.value,
            'step-future': isStepFuture(step.value)
          }"
          rounded="lg"
        >
          <template v-slot:prepend>
            <v-avatar
              :color="getStepColor(step.value)"
              size="40"
              class="step-avatar"
            >
              <v-icon
                :icon="getStepIcon(step.value)"
                :color="getStepIconColor(step.value)"
              ></v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium">
            {{ step.title }}
          </v-list-item-title>

          <v-list-item-subtitle class="text-caption">
            {{ step.description }}
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-icon v-if="isStepCompleted(step.value)" color="success" size="small">
              mdi-check-circle
            </v-icon>
            <v-tooltip v-else-if="isStepIncomplete(step.value)" location="right">
              <template v-slot:activator="{ props: tooltipProps2 }">
                <v-icon v-bind="tooltipProps2" color="warning" size="small">
                  mdi-alert-circle
                </v-icon>
              </template>
              <div class="text-caption">
                <strong>Fehlende Aufgaben:</strong>
                <ul class="pl-4 mt-1">
                  <li v-for="(todo, i) in getMissingTodos(step.value)" :key="i">
                    {{ todo }}
                  </li>
                </ul>
              </div>
            </v-tooltip>
          </template>
        </v-list-item>

        <!-- Missing Todos List (collapsed under incomplete steps) -->
        <v-expand-transition>
          <div v-if="!isStepBlocked(step.value) && isStepIncomplete(step.value) && getMissingTodos(step.value).length > 0" class="mt-1 ml-4">
            <v-card variant="tonal" color="warning" density="compact" class="pa-2">
              <div class="text-caption font-weight-bold mb-1">
                <v-icon size="small" class="mr-1">mdi-alert</v-icon>
                Noch zu erledigen:
              </div>
              <ul class="text-caption pl-4 ma-0">
                <li v-for="(todo, i) in getMissingTodos(step.value)" :key="i" class="mb-1">
                  {{ todo }}
                </li>
              </ul>
            </v-card>
          </div>
        </v-expand-transition>
      </div>
    </v-list>

    <!-- Progress Indicator -->
    <v-divider class="my-4"></v-divider>

    <div class="px-4 pb-4">
      <div class="text-caption text-medium-emphasis mb-2">
        Fortschritt
      </div>
      <v-progress-linear
        :model-value="progressPercentage"
        color="primary"
        height="8"
        rounded
      ></v-progress-linear>
      <div class="text-caption text-medium-emphasis mt-1 text-center">
        {{ completedSteps }} von {{ totalSteps }} Schritten abgeschlossen
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Step {
  value: number
  title: string
  description: string
  icon: string
}

interface StepValidation {
  isValid: boolean
  missingTodos: string[]
}

const props = defineProps<{
  currentStep: number
  completedSteps?: number[]
  stepValidations?: Record<number, StepValidation>
}>()

const emit = defineEmits<{
  'update:currentStep': [step: number]
}>()

const steps: Step[] = [
  {
    value: 1,
    title: 'Hochladen',
    description: 'CSV-Datei hochladen',
    icon: 'mdi-file-upload'
  },
  {
    value: 2,
    title: 'Konfigurieren',
    description: 'Daten bereinigen',
    icon: 'mdi-cog'
  },
  {
    value: 3,
    title: 'Chart erstellen',
    description: 'Visualisierung generieren',
    icon: 'mdi-chart-bar'
  }
]

const totalSteps = steps.length

const completedSteps = computed(() => {
  // Count only truly completed steps (visited AND valid)
  let count = 0
  for (let i = 1; i <= totalSteps; i++) {
    if (isStepCompleted(i)) {
      count++
    }
  }
  return count
})

const progressPercentage = computed(() => {
  return (completedSteps.value / totalSteps) * 100
})

const hasStepBeenVisited = (stepValue: number): boolean => {
  // A step is considered visited if it's at or before current step
  // OR if it has validation data (meaning user has interacted with it)
  const isAtOrBeforeCurrent = stepValue <= props.currentStep
  const hasValidationData = props.stepValidations?.[stepValue] !== undefined

  return isAtOrBeforeCurrent || hasValidationData
}

const isStepCompleted = (stepValue: number): boolean => {
  // Check if step has been visited
  const hasBeenVisited = hasStepBeenVisited(stepValue)

  // Check if step has valid data
  const isValid = props.stepValidations?.[stepValue]?.isValid ?? false

  // Step is only truly completed if it has been visited AND all validations pass
  return hasBeenVisited && isValid
}

const isStepIncomplete = (stepValue: number): boolean => {
  // Step is incomplete if it has been visited but validations don't pass
  const hasBeenVisited = hasStepBeenVisited(stepValue)
  const isValid = props.stepValidations?.[stepValue]?.isValid ?? false

  return hasBeenVisited && !isValid
}

const isStepFuture = (stepValue: number): boolean => {
  // Step is in the future if it hasn't been visited yet
  return !hasStepBeenVisited(stepValue)
}

const isStepBlocked = (stepValue: number): boolean => {
  // Step is blocked if we can't navigate to it
  return !canNavigateToStep(stepValue)
}

const getMissingTodos = (stepValue: number): string[] => {
  return props.stepValidations?.[stepValue]?.missingTodos ?? []
}

const canNavigateToStep = (stepValue: number): boolean => {
  // Always allow navigation to current step or backwards
  if (stepValue <= props.currentStep) {
    return true
  }

  // For forward navigation, check if previous steps are valid
  for (let i = 1; i < stepValue; i++) {
    const stepValidation = props.stepValidations?.[i]
    if (stepValidation && !stepValidation.isValid) {
      return false
    }
  }

  return true
}

const navigateToStep = (stepValue: number) => {
  if (!canNavigateToStep(stepValue)) {
    // Show a snackbar or alert that previous steps must be completed
    return
  }
  emit('update:currentStep', stepValue)
}

const getStepColor = (stepValue: number): string => {
  if (stepValue === props.currentStep) {
    return 'primary'
  }
  if (isStepCompleted(stepValue)) {
    return 'success'
  }
  if (isStepIncomplete(stepValue)) {
    return 'warning'
  }
  return 'grey-lighten-2'
}

const getStepIconColor = (stepValue: number): string => {
  if (stepValue === props.currentStep) {
    return 'white'
  }
  if (isStepCompleted(stepValue)) {
    return 'white'
  }
  if (isStepIncomplete(stepValue)) {
    return 'white'
  }
  return 'grey'
}

const getStepIcon = (stepValue: number): string => {
  const step = steps.find(s => s.value === stepValue)
  return step?.icon || 'mdi-circle'
}
</script>

<style scoped>
.step-navigation {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.step-item {
  transition: all 0.2s ease;
  cursor: pointer;
}

.step-current {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.step-completed:not(.step-current):hover {
  background-color: rgba(var(--v-theme-success), 0.08);
}

.step-incomplete:not(.step-current) {
  background-color: rgba(var(--v-theme-warning), 0.05);
}

.step-incomplete:not(.step-current):hover {
  background-color: rgba(var(--v-theme-warning), 0.12);
}

.step-future:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.step-blocked {
  opacity: 0.6;
  cursor: not-allowed !important;
}

.step-blocked:hover {
  background-color: rgba(var(--v-theme-error), 0.05);
}

.step-avatar {
  transition: all 0.2s ease;
}

.step-item:hover:not(.step-blocked) .step-avatar {
  transform: scale(1.05);
}
</style>
