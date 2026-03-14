<template>
  <v-navigation-drawer
    permanent
    :rail="isCollapsed"
    :width="280"
    rail-width="72"
    class="step-navigation"
  >
    <!-- Header with collapse button -->
    <div class="step-nav-header" :class="{ 'collapsed': isCollapsed }">
      <span v-if="!isCollapsed" class="text-overline font-weight-bold">
        Workflow-Schritte
      </span>
      <v-btn
        icon
        variant="text"
        size="small"
        @click="toggleCollapse"
      >
        <v-icon>{{ isCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
      </v-btn>
    </div>

    <v-divider class="step-nav-divider" />

    <!-- Collapsed: Simple centered buttons -->
    <div v-if="isCollapsed" class="step-list-collapsed">
      <div v-for="step in displaySteps" :key="step.value" class="step-wrapper-collapsed">
        <v-tooltip location="right">
          <template v-slot:activator="{ props: tooltipProps }">
            <div
              v-bind="tooltipProps"
              class="step-btn-collapsed"
              :class="{
                'step-btn-current': currentStep === step.value,
                'step-btn-completed': isStepCompleted(step.value) && currentStep !== step.value,
                'step-btn-incomplete': isStepIncomplete(step.value) && currentStep !== step.value,
                'step-btn-blocked': isStepBlocked(step.value)
              }"
              @click="navigateToStep(step.value)"
            >
              <v-avatar
                :color="getStepColor(step.value)"
                :size="36"
              >
                <v-icon
                  :icon="getStepIcon(step.value)"
                  :color="getStepIconColor(step.value)"
                  :size="18"
                ></v-icon>
              </v-avatar>
            </div>
          </template>
          <div class="text-caption">
            <strong>{{ step.title }}</strong>
            <span v-if="isStepCompleted(step.value)" class="text-success ml-1">✓</span>
            <span v-else-if="isStepIncomplete(step.value)" class="text-warning ml-1">!</span>
            <span v-if="isStepBlocked(step.value)" class="text-error ml-1">🔒</span>
            <br>{{ step.description }}
          </div>
        </v-tooltip>
      </div>
    </div>

    <!-- Expanded: Full list items -->
    <v-list v-else density="compact" class="step-list">
      <div v-for="step in displaySteps" :key="step.value" class="step-wrapper">
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
                <v-avatar color="grey-lighten-2" :size="40" class="step-avatar">
                  <v-icon :icon="getStepIcon(step.value)" color="grey" :size="20"></v-icon>
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
            <strong>{{ step.title }}</strong> - Gesperrt<br>
            Bitte vervollständigen Sie zuerst die vorherigen Schritte.
          </div>
        </v-tooltip>

        <!-- Non-blocked Step -->
        <template v-else>
          <v-list-item
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
                :size="40"
                class="step-avatar"
              >
                <v-icon
                  :icon="getStepIcon(step.value)"
                  :color="getStepIconColor(step.value)"
                  :size="20"
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

          <!-- Missing Todos List -->
          <v-expand-transition>
            <div v-if="isStepIncomplete(step.value) && getMissingTodos(step.value).length > 0" class="mt-1 ml-4">
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
        </template>
      </div>
    </v-list>

    <v-spacer />

    <!-- Progress Indicator -->
    <div class="progress-section" :class="{ 'collapsed': isCollapsed }">
      <v-divider class="step-nav-divider mb-3" />

      <template v-if="!isCollapsed">
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
          {{ completedStepsCount }} von {{ totalSteps }} Schritten
        </div>
      </template>

      <!-- Collapsed progress: circular indicator -->
      <template v-else>
        <v-tooltip location="right">
          <template v-slot:activator="{ props }">
            <div v-bind="props" class="collapsed-progress">
              <v-progress-circular
                :model-value="progressPercentage"
                color="primary"
                :size="40"
                :width="4"
              >
                <span class="text-caption font-weight-bold">{{ completedStepsCount }}/{{ totalSteps }}</span>
              </v-progress-circular>
            </div>
          </template>
          <span>{{ completedStepsCount }} von {{ totalSteps }} Schritten abgeschlossen</span>
        </v-tooltip>
      </template>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'

export interface Step {
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
  steps?: Step[]
  completedSteps?: number[]
  stepValidations?: Record<number, StepValidation>
  collapsed?: boolean
}>()

// Collapse state - use prop if provided, otherwise internal state
const internalCollapsed = ref(false)

const isCollapsed = computed({
  get: () => props.collapsed !== undefined ? props.collapsed : internalCollapsed.value,
  set: (val: boolean) => {
    internalCollapsed.value = val
    emit('update:collapsed', val)
  }
})

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

const emit = defineEmits<{
  'update:currentStep': [step: number]
  'update:collapsed': [collapsed: boolean]
}>()

// Drawer width constants
const DRAWER_WIDTH = 280
const RAIL_WIDTH = 72

const defaultSteps: Step[] = [
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

const displaySteps = computed(() => props.steps ?? defaultSteps)

const totalSteps = computed(() => displaySteps.value.length)

const completedStepsCount = computed(() => {
  // Count only truly completed steps (visited AND valid)
  let count = 0
  for (let i = 1; i <= totalSteps.value; i++) {
    if (isStepCompleted(i)) {
      count++
    }
  }
  return count
})

const progressPercentage = computed(() => {
  return (completedStepsCount.value / totalSteps.value) * 100
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
  const step = displaySteps.value.find(s => s.value === stepValue)
  return step?.icon || 'mdi-circle'
}
</script>

<style scoped>
.step-navigation {
  background: rgb(var(--v-theme-surface)) !important;
  border-right: 1px solid rgba(var(--v-border-color), 0.08) !important;
  display: flex;
  flex-direction: column;
}

/* Header */
.step-nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 12px;
  min-height: 56px;
}

.step-nav-header.collapsed {
  justify-content: center;
  padding: 16px 8px;
}

.step-nav-header .text-overline {
  color: rgb(var(--v-theme-on-surface-variant));
  letter-spacing: 0.05em;
}

.step-nav-divider {
  opacity: 0.08;
  margin: 0 12px;
}

/* Step list - Expanded */
.step-list {
  padding: 8px 12px;
  flex: 1;
  overflow-y: auto;
}

.step-wrapper {
  margin-bottom: 8px;
  width: 100%;
}

.step-item {
  transition: all var(--transition-normal, 0.2s ease);
  cursor: pointer;
}

/* Step list - Collapsed */
.step-list-collapsed {
  padding: 12px 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-wrapper-collapsed {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-btn-collapsed {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md, 12px);
  cursor: pointer;
  transition: all var(--transition-normal, 0.2s ease);
  background: transparent;
}

.step-btn-collapsed:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.step-btn-current {
  background: rgba(var(--v-theme-primary), 0.12) !important;
}

.step-btn-completed:hover {
  background: rgba(var(--v-theme-success), 0.12);
}

.step-btn-incomplete {
  background: rgba(var(--v-theme-warning), 0.06);
}

.step-btn-incomplete:hover {
  background: rgba(var(--v-theme-warning), 0.12);
}

.step-btn-blocked {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-btn-blocked:hover {
  background: rgba(var(--v-theme-error), 0.08);
}

.step-current {
  background-color: rgba(var(--v-theme-primary), 0.12) !important;
}

.step-current :deep(.v-list-item-title) {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.step-completed:not(.step-current) {
  background-color: transparent;
}

.step-completed:not(.step-current):hover {
  background-color: rgba(var(--v-theme-success), 0.08);
}

.step-incomplete:not(.step-current) {
  background-color: rgba(var(--v-theme-warning), 0.06);
}

.step-incomplete:not(.step-current):hover {
  background-color: rgba(var(--v-theme-warning), 0.12);
}

.step-future {
  opacity: 0.7;
}

.step-future:hover {
  opacity: 1;
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}

.step-blocked {
  opacity: 0.5;
  cursor: not-allowed !important;
}

.step-blocked:hover {
  background-color: rgba(var(--v-theme-error), 0.05);
}

.step-avatar {
  transition: all var(--transition-normal, 0.2s ease);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(45, 42, 38, 0.06));
}

.step-item:hover:not(.step-blocked) .step-avatar {
  transform: scale(1.05);
  box-shadow: var(--shadow-md, 0 4px 16px rgba(45, 42, 38, 0.08));
}

/* Progress section */
.progress-section {
  padding: 0 16px 16px;
}

.progress-section.collapsed {
  padding: 0 8px 16px;
}

.collapsed-progress {
  display: flex;
  justify-content: center;
}

/* Progress indicator styling */
.step-navigation :deep(.v-progress-linear) {
  border-radius: var(--radius-sm, 8px);
}
</style>
