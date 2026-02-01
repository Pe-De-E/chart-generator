<template>
  <div class="preset-selector">
    <v-row align="center">
      <v-col cols="12" md="6">
        <v-select
          v-model="selectedPresetId"
          :items="presetItems"
          item-title="name"
          item-value="id"
          label="Preset auswaehlen"
          variant="outlined"
          density="comfortable"
          clearable
          prepend-inner-icon="mdi-palette-swatch"
          :loading="loading"
          @update:model-value="handlePresetSelect"
        >
          <template v-slot:item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <template v-slot:prepend>
                <v-icon v-if="item.raw.isSystem" color="primary">mdi-star</v-icon>
                <v-icon v-else>mdi-account</v-icon>
              </template>
              <template v-slot:append>
                <v-btn
                  v-if="!item.raw.isSystem && !item.raw.disabled"
                  icon="mdi-delete"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click.stop="handleDeletePreset(item.raw.id)"
                />
              </template>
            </v-list-item>
          </template>
        </v-select>
      </v-col>
      <v-col cols="12" md="6">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-content-save-plus"
          @click="showSaveDialog = true"
          :disabled="loading"
        >
          Als Preset speichern
        </v-btn>
      </v-col>
    </v-row>

    <!-- Save Preset Dialog -->
    <v-dialog v-model="showSaveDialog" max-width="400">
      <v-card>
        <v-card-title>Preset speichern</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newPresetName"
            label="Preset Name"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Name ist erforderlich']"
            autofocus
          />
          <div class="text-caption text-grey mt-2">
            Aktuelle Farben, statistische Overlays und Stil-Anpassungen werden fuer {{ props.chartType }}-Charts gespeichert.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showSaveDialog = false">Abbrechen</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="handleSavePreset"
            :disabled="!newPresetName.trim()"
            :loading="loading"
          >
            Speichern
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>Preset loeschen?</v-card-title>
        <v-card-text>
          Moechten Sie dieses Preset wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Abbrechen</v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="confirmDelete"
            :loading="loading"
          >
            Loeschen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { PropType } from 'vue'
import { useChartPresets } from '../../../composables/useChartPresets'
import type {
  StatisticalOverlays,
  ChartStyleOverrides,
  ChartPresetConfig,
} from '@chart-generator/shared'

const props = defineProps({
  chartType: {
    type: String as PropType<'bar' | 'line' | 'scatter' | 'pie' | 'area' | 'elevation'>,
    required: true,
  },
  colors: {
    type: Object as PropType<{ background: string; series: string[] }>,
    required: true,
  },
  statisticalOverlays: {
    type: Object as PropType<StatisticalOverlays>,
    required: true,
  },
  styleOverrides: {
    type: Object as PropType<ChartStyleOverrides>,
    default: () => ({}),
  },
})

const emit = defineEmits<{
  applyPreset: [config: ChartPresetConfig]
}>()

const {
  systemPresets,
  userPresets,
  loading,
  fetchPresets,
  createPresetFromCurrentSettings,
  deletePreset,
  getPresetConfig,
} = useChartPresets()

const selectedPresetId = ref<string | null>(null)
const showSaveDialog = ref(false)
const showDeleteDialog = ref(false)
const newPresetName = ref('')
const presetToDelete = ref<string | null>(null)

// Filter user presets by current chart type (system presets are always shown)
const filteredUserPresets = computed(() =>
  userPresets.value.filter(
    (p) => !p.config.chartType || p.config.chartType === props.chartType
  )
)

// Combined list with group headers
const presetItems = computed(() => {
  const items: { name: string; id: string; isSystem?: boolean; disabled?: boolean; chartType?: string }[] = []

  if (systemPresets.value.length > 0) {
    items.push({
      name: '--- System Presets ---',
      id: 'header-system',
      disabled: true,
    })
    items.push(
      ...systemPresets.value.map((p) => ({
        name: p.name,
        id: p.id,
        isSystem: true,
      }))
    )
  }

  if (filteredUserPresets.value.length > 0) {
    items.push({
      name: '--- Meine Presets ---',
      id: 'header-user',
      disabled: true,
    })
    items.push(
      ...filteredUserPresets.value.map((p) => ({
        name: `${p.name}`,
        id: p.id,
        isSystem: false,
        chartType: p.config.chartType,
      }))
    )
  }

  return items
})

onMounted(() => {
  fetchPresets()
})

function handlePresetSelect(presetId: string | null) {
  if (!presetId || presetId.startsWith('header-')) return

  const config = getPresetConfig(presetId)
  if (config) {
    emit('applyPreset', config)
  }
}

async function handleSavePreset() {
  if (!newPresetName.value.trim()) return

  await createPresetFromCurrentSettings(
    newPresetName.value.trim(),
    props.chartType,
    {
      background: props.colors.background,
      series: props.colors.series || [],
    },
    props.statisticalOverlays,
    props.styleOverrides
  )

  showSaveDialog.value = false
  newPresetName.value = ''
}

function handleDeletePreset(id: string) {
  presetToDelete.value = id
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (presetToDelete.value) {
    await deletePreset(presetToDelete.value)
    if (selectedPresetId.value === presetToDelete.value) {
      selectedPresetId.value = null
    }
  }
  showDeleteDialog.value = false
  presetToDelete.value = null
}
</script>

<style scoped>
.preset-selector {
  margin-bottom: 16px;
}
</style>
